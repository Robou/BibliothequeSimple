const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();

// Fonction pour emprunter un livre
exports.emprunterLivre = functions.https.onCall(async (data, context) => {
  try {
    // Vérifier les données requises
    if (!data.livreId || !data.nomEmprunteur || !data.contactEmprunteur) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Les informations d\'emprunt sont incomplètes'
      );
    }

    // Récupérer le livre
    const livreRef = db.collection('livres').doc(data.livreId);
    const livreDoc = await livreRef.get();

    if (!livreDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'Le livre demandé n\'existe pas'
      );
    }

    const livreData = livreDoc.data();
    if (!livreData.estDisponible) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Ce livre n\'est pas disponible actuellement'
      );
    }

    // Récupérer la durée d'emprunt depuis la configuration
    const configRef = db.collection('config').doc('config');
    const configDoc = await configRef.get();
    const configData = configDoc.exists ? configDoc.data() : { dureeEmpruntJours: 30 };
    const dureeEmpruntJours = configData.dureeEmpruntJours || 30;

    // Calculer les dates
    const dateEmprunt = admin.firestore.Timestamp.now();
    const dateRetourPrevue = new Date();
    dateRetourPrevue.setDate(dateRetourPrevue.getDate() + dureeEmpruntJours);
    const dateRetourPrevueTimestamp = admin.firestore.Timestamp.fromDate(dateRetourPrevue);

    // Générer un ID pour l'emprunt
    const empruntsRef = db.collection('emprunts');
    const snapshot = await empruntsRef.orderBy('id', 'desc').limit(1).get();
    
    let nextId = 'E001';
    if (!snapshot.empty) {
      const lastId = snapshot.docs[0].data().id;
      const lastNumber = parseInt(lastId.substring(1), 10);
      nextId = `E${String(lastNumber + 1).padStart(3, '0')}`;
    }

    // Transaction pour assurer la cohérence des données
    await db.runTransaction(async (transaction) => {
      // Créer l'emprunt
      const empruntRef = empruntsRef.doc(nextId);
      transaction.set(empruntRef, {
        id: nextId,
        livreId: data.livreId,
        livreRef: livreRef,
        nomEmprunteur: data.nomEmprunteur,
        contactEmprunteur: data.contactEmprunteur,
        dateEmprunt: dateEmprunt,
        dateRetourPrevue: dateRetourPrevueTimestamp,
        estRendu: false,
        dateRetourEffective: null,
        commentaires: data.commentaires || ''
      });

      // Mettre à jour la disponibilité du livre
      transaction.update(livreRef, { estDisponible: false });

      // Ajouter une entrée au journal
      const journalRef = db.collection('journal').doc();
      transaction.set(journalRef, {
        date: dateEmprunt,
        type: 'Emprunt',
        utilisateur: data.nomEmprunteur,
        description: `Emprunt: "${livreData.titre}" (Livre ID: ${data.livreId}, Emprunt ID: ${nextId})`,
        livreId: data.livreId,
        empruntId: nextId
      });
    });

    // Retourner la confirmation
    return {
      success: true,
      message: `Emprunt enregistré avec succès. À retourner avant le ${dateRetourPrevue.toLocaleDateString('fr-FR')}.`,
      empruntId: nextId,
      dateRetourPrevue: dateRetourPrevueTimestamp.toDate().toISOString()
    };
  } catch (error) {
    console.error('Erreur lors de l\'emprunt:', error);
    throw new functions.https.HttpsError(
      'internal',
      error.message || 'Une erreur est survenue lors de l\'emprunt'
    );
  }
});

// Fonction pour retourner un livre
exports.retournerLivre = functions.https.onCall(async (data, context) => {
  try {
    // Vérifier les données requises
    if (!data.empruntId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'L\'ID de l\'emprunt est requis'
      );
    }

    // Récupérer l'emprunt
    const empruntRef = db.collection('emprunts').doc(data.empruntId);
    const empruntDoc = await empruntRef.get();

    if (!empruntDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'L\'emprunt demandé n\'existe pas'
      );
    }

    const empruntData = empruntDoc.data();
    if (empruntData.estRendu) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Ce livre a déjà été rendu'
      );
    }

    // Récupérer le livre
    const livreRef = db.collection('livres').doc(empruntData.livreId);
    const livreDoc = await livreRef.get();

    if (!livreDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'Le livre associé à cet emprunt n\'existe pas'
      );
    }

    const livreData = livreDoc.data();
    const dateRetour = admin.firestore.Timestamp.now();

    // Transaction pour assurer la cohérence des données
    await db.runTransaction(async (transaction) => {
      // Mettre à jour l'emprunt
      transaction.update(empruntRef, {
        estRendu: true,
        dateRetourEffective: dateRetour
      });

      // Mettre à jour la disponibilité du livre
      transaction.update(livreRef, { estDisponible: true });

      // Ajouter une entrée au journal
      const journalRef = db.collection('journal').doc();
      transaction.set(journalRef, {
        date: dateRetour,
        type: 'Retour',
        utilisateur: empruntData.nomEmprunteur,
        description: `Retour: "${livreData.titre}" (Livre ID: ${empruntData.livreId}, Emprunt ID: ${data.empruntId})`,
        livreId: empruntData.livreId,
        empruntId: data.empruntId
      });
    });

    // Retourner la confirmation
    return {
      success: true,
      message: 'Retour enregistré avec succès.',
      dateRetour: dateRetour.toDate().toISOString()
    };
  } catch (error) {
    console.error('Erreur lors du retour:', error);
    throw new functions.https.HttpsError(
      'internal',
      error.message || 'Une erreur est survenue lors du retour'
    );
  }
});

// Fonction pour rechercher des livres
exports.rechercherLivres = functions.https.onCall(async (data, context) => {
  try {
    const query = data.query || '';
    const categorie = data.categorie || '';
    const disponible = data.disponible !== undefined ? data.disponible : null;
    
    let livresRef = db.collection('livres');
    
    // Appliquer les filtres
    if (categorie) {
      livresRef = livresRef.where('categorie', '==', categorie);
    }
    
    if (disponible !== null) {
      livresRef = livresRef.where('estDisponible', '==', disponible);
    }
    
    // Exécuter la requête
    const snapshot = await livresRef.get();
    
    // Filtrer les résultats par la recherche textuelle si nécessaire
    let results = [];
    if (query.trim() === '') {
      // Pas de recherche textuelle, retourner tous les résultats
      results = snapshot.docs.map(doc => doc.data());
    } else {
      // Recherche textuelle simple côté client
      // Note: Pour une recherche plus avancée, considérer Algolia ou ElasticSearch
      const queryLower = query.toLowerCase();
      results = snapshot.docs
        .map(doc => doc.data())
        .filter(livre => {
          return (
            (livre.titre && livre.titre.toLowerCase().includes(queryLower)) ||
            (livre.auteur && livre.auteur.toLowerCase().includes(queryLower)) ||
            (livre.description && livre.description.toLowerCase().includes(queryLower)) ||
            (livre.motsCles && livre.motsCles.some(mot => mot.toLowerCase().includes(queryLower))) ||
            (livre.isbn && livre.isbn.includes(query))
          );
        });
    }
    
    return { results };
  } catch (error) {
    console.error('Erreur lors de la recherche:', error);
    throw new functions.https.HttpsError(
      'internal',
      error.message || 'Une erreur est survenue lors de la recherche'
    );
  }
});

// Trigger pour mettre à jour le champ de recherche d'un livre
exports.updateSearchField = functions.firestore
  .document('livres/{livreId}')
  .onWrite((change, context) => {
    // Si le document a été supprimé, ne rien faire
    if (!change.after.exists) {
      return null;
    }

    // Récupérer les nouvelles données
    const livre = change.after.data();
    
    // Créer le champ de recherche
    const recherche = [
      livre.titre || '',
      livre.auteur || '',
      livre.description || '',
      ...(livre.motsCles || [])
    ].join(' ').toLowerCase();
    
    // Si le champ de recherche n'a pas changé, ne rien faire
    if (livre.recherche === recherche) {
      return null;
    }
    
    // Mettre à jour le champ de recherche
    return change.after.ref.update({ recherche });
  });

// Fonction pour générer un ID séquentiel
exports.genererIdSequentiel = functions.https.onCall(async (data, context) => {
  try {
    // Vérifier les données requises
    if (!data.collection || !data.prefix) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'La collection et le préfixe sont requis'
      );
    }

    // Vérifier l'authentification pour les collections sensibles
    const collectionsSecurisees = ['livres', 'categories'];
    if (collectionsSecurisees.includes(data.collection)) {
      if (!context.auth || !context.auth.token.admin) {
        throw new functions.https.HttpsError(
          'permission-denied',
          'Vous n\'avez pas les droits pour générer un ID pour cette collection'
        );
      }
    }

    const padLength = data.padLength || 3;
    const collectionRef = db.collection(data.collection);
    
    // Récupérer le dernier ID
    const snapshot = await collectionRef
      .orderBy('id', 'desc')
      .where('id', '>=', data.prefix)
      .where('id', '<', data.prefix + '\uf8ff') // Pour filtrer par préfixe
      .limit(1)
      .get();
    
    let nextId;
    if (snapshot.empty) {
      // Aucun document trouvé, commencer à 1
      nextId = `${data.prefix}${String(1).padStart(padLength, '0')}`;
    } else {
      // Extraire le numéro du dernier ID et l'incrémenter
      const lastId = snapshot.docs[0].data().id;
      const lastNumber = parseInt(lastId.substring(data.prefix.length), 10);
      nextId = `${data.prefix}${String(lastNumber + 1).padStart(padLength, '0')}`;
    }
    
    return { id: nextId };
  } catch (error) {
    console.error('Erreur lors de la génération d\'ID:', error);
    throw new functions.https.HttpsError(
      'internal',
      error.message || 'Une erreur est survenue lors de la génération d\'ID'
    );
  }
});