/**
 * Service Firebase pour l'application Bibliothèque
 * 
 * Ce service gère toutes les interactions avec Firebase (Firestore, Auth, Functions)
 * et remplace l'ancien ApiClient qui utilisait google.script.run.
 */

const FirebaseService = {
  // --- Livres ---

  /**
   * Récupère tous les livres de la bibliothèque.
   * @return {Promise<Array>} Une promesse qui résout avec un tableau d'objets représentant les livres.
   */
  getAllBooks: async function() {
    try {
      const snapshot = await db.collection('livres').get();
      return snapshot.docs.map(doc => doc.data());
    } catch (error) {
      console.error("Erreur lors de la récupération des livres:", error);
      throw error;
    }
  },

  /**
   * Récupère les détails d'un livre par son ID.
   * @param {string} bookId L'ID du livre.
   * @return {Promise<Object|null>} Une promesse qui résout avec l'objet livre ou null si non trouvé.
   */
  getBookDetails: async function(bookId) {
    try {
      const doc = await db.collection('livres').doc(bookId).get();
      return doc.exists ? doc.data() : null;
    } catch (error) {
      console.error("Erreur lors de la récupération des détails du livre:", error);
      throw error;
    }
  },

  /**
   * Recherche des livres en fonction d'une requête.
   * @param {Object} params Les paramètres de recherche.
   * @param {string} params.query Le terme de recherche.
   * @param {string} params.categorie La catégorie pour filtrer (optionnel).
   * @param {boolean} params.disponible Filtre sur la disponibilité (optionnel).
   * @return {Promise<Array>} Une promesse qui résout avec un tableau de livres correspondant à la recherche.
   */
  searchBooks: async function(params) {
    try {
      // Utiliser la fonction Cloud Function pour la recherche avancée
      const rechercherLivres = firebase.functions().httpsCallable('rechercherLivres');
      const result = await rechercherLivres(params);
      return result.data.results;
    } catch (error) {
      console.error("Erreur lors de la recherche de livres:", error);
      throw error;
    }
  },

  /**
   * Récupère un livre par son ISBN.
   * @param {string} isbn Le code ISBN du livre à rechercher.
   * @return {Promise<Object|null>} Une promesse qui résout avec l'objet livre ou null si non trouvé.
   */
  getBookByISBN: async function(isbn) {
    try {
      // Normaliser l'ISBN en supprimant les tirets et espaces
      const normalizedISBN = isbn.trim().replace(/[-\s]/g, '');
      
      // Rechercher dans Firestore
      const snapshot = await db.collection('livres')
        .where('isbn', '==', normalizedISBN)
        .limit(1)
        .get();
      
      return snapshot.empty ? null : snapshot.docs[0].data();
    } catch (error) {
      console.error("Erreur lors de la recherche par ISBN:", error);
      throw error;
    }
  },

  /**
   * Ajoute un nouveau livre.
   * @param {Object} bookData Les données du livre.
   * @return {Promise<Object>} Une promesse qui résout avec un objet contenant le statut de l'opération.
   */
  addNewBook: async function(bookData) {
    try {
      // Vérifier si l'utilisateur est connecté et est un administrateur
      const isAdmin = await isCurrentUserAdmin();
      if (!isAdmin) {
        throw new Error("Vous n'avez pas les droits d'administration nécessaires.");
      }
      
      // Générer un nouvel ID séquentiel
      const genererIdSequentiel = firebase.functions().httpsCallable('genererIdSequentiel');
      const idResult = await genererIdSequentiel({ collection: 'livres', prefix: 'L', padLength: 3 });
      const newId = idResult.data.id;
      
      // Préparer les données du livre
      const livre = {
        id: newId,
        titre: bookData.titre,
        auteur: bookData.auteur,
        categorie: bookData.categorie,
        editeur: bookData.editeur || "",
        annee: bookData.annee ? String(bookData.annee) : "",
        estDisponible: true,
        dateAjout: firebase.firestore.Timestamp.now(),
        description: bookData.description || "",
        motsCles: bookData.motsCles ? bookData.motsCles.split(',').map(mot => mot.trim()) : [],
        isbn: bookData.isbn || "",
        typePhysique: bookData.typePhysique || "",
        lieuStockage: bookData.lieu || ""
      };
      
      // Ajouter le livre à Firestore
      await db.collection('livres').doc(newId).set(livre);
      
      // Ajouter une entrée au journal
      await db.collection('journal').add({
        date: firebase.firestore.Timestamp.now(),
        type: 'AjoutLivre',
        utilisateur: auth.currentUser ? auth.currentUser.email : 'Admin',
        description: `Ajout du livre: "${livre.titre}" (ID: ${newId})`,
        livreId: newId
      });
      
      return { 
        success: true, 
        message: `Livre "${livre.titre}" ajouté avec succès.`, 
        bookId: newId 
      };
    } catch (error) {
      console.error("Erreur lors de l'ajout du livre:", error);
      return { 
        success: false, 
        message: "Erreur: " + error.message, 
        bookId: null 
      };
    }
  },

  // --- Catégories ---

  /**
   * Récupère toutes les catégories de livres.
   * @return {Promise<Array>} Une promesse qui résout avec un tableau d'objets représentant les catégories.
   */
  getAllCategories: async function() {
    try {
      const snapshot = await db.collection('categories').get();
      return snapshot.docs.map(doc => doc.data());
    } catch (error) {
      console.error("Erreur lors de la récupération des catégories:", error);
      throw error;
    }
  },

  // --- Emprunts ---

  /**
   * Enregistre un nouvel emprunt de livre.
   * @param {string} bookId L'ID du livre emprunté.
   * @param {string} borrowerName Le nom de l'emprunteur.
   * @param {string} borrowerContact Les coordonnées de l'emprunteur.
   * @param {string} comments Commentaires optionnels sur l'emprunt.
   * @return {Promise<Object>} Une promesse qui résout avec un objet contenant le statut de l'opération.
   */
  registerBorrow: async function(bookId, borrowerName, borrowerContact, comments) {
    try {
      // Utiliser la fonction Cloud Function pour l'emprunt
      const emprunterLivre = firebase.functions().httpsCallable('emprunterLivre');
      const result = await emprunterLivre({
        livreId: bookId,
        nomEmprunteur: borrowerName,
        contactEmprunteur: borrowerContact,
        commentaires: comments || ""
      });
      
      return result.data;
    } catch (error) {
      console.error("Erreur lors de l'enregistrement de l'emprunt:", error);
      return { 
        success: false, 
        message: "Erreur: " + error.message
      };
    }
  },

  /**
   * Enregistre le retour d'un livre emprunté.
   * @param {string} borrowId L'ID de l'emprunt à clôturer.
   * @return {Promise<Object>} Une promesse qui résout avec un objet contenant le statut de l'opération.
   */
  registerReturn: async function(borrowId) {
    try {
      // Utiliser la fonction Cloud Function pour le retour
      const retournerLivre = firebase.functions().httpsCallable('retournerLivre');
      const result = await retournerLivre({
        empruntId: borrowId
      });
      
      return result.data;
    } catch (error) {
      console.error("Erreur lors de l'enregistrement du retour:", error);
      return { 
        success: false, 
        message: "Erreur: " + error.message
      };
    }
  },

  /**
   * Récupère tous les emprunts actifs.
   * @return {Promise<Array>} Une promesse qui résout avec un tableau d'objets représentant les emprunts actifs.
   */
  getActiveBorrows: async function() {
    try {
      const snapshot = await db.collection('emprunts')
        .where('estRendu', '==', false)
        .get();
      
      const emprunts = snapshot.docs.map(doc => doc.data());
      
      // Enrichir les emprunts avec les détails des livres
      const empruntsEnrichis = await Promise.all(emprunts.map(async (emprunt) => {
        try {
          const livreDoc = await db.collection('livres').doc(emprunt.livreId).get();
          const livre = livreDoc.exists ? livreDoc.data() : null;
          
          return {
            ...emprunt,
            BookTitle: livre ? livre.titre : "Livre inconnu",
            BookAuthor: livre ? livre.auteur : "Auteur inconnu",
            BookISBN: livre ? livre.isbn : ""
          };
        } catch (error) {
          console.error("Erreur lors de l'enrichissement de l'emprunt:", error);
          return {
            ...emprunt,
            BookTitle: "Erreur de chargement",
            BookAuthor: "Erreur de chargement",
            BookISBN: ""
          };
        }
      }));
      
      return empruntsEnrichis;
    } catch (error) {
      console.error("Erreur lors de la récupération des emprunts actifs:", error);
      throw error;
    }
  },

  // --- Admin ---

  /**
   * Connecte un administrateur.
   * @param {string} email L'email de l'administrateur.
   * @param {string} password Le mot de passe de l'administrateur.
   * @return {Promise<Object>} Une promesse qui résout avec un objet contenant le statut de l'opération.
   */
  adminLogin: async function(email, password) {
    try {
      // Connecter l'utilisateur
      await auth.signInWithEmailAndPassword(email, password);
      
      // Vérifier si l'utilisateur est un administrateur
      const isAdmin = await isCurrentUserAdmin();
      
      if (!isAdmin) {
        // Déconnecter l'utilisateur s'il n'est pas administrateur
        await auth.signOut();
        return { 
          success: false, 
          message: "Vous n'avez pas les droits d'administration nécessaires." 
        };
      }
      
      return { 
        success: true, 
        message: "Connexion administrateur réussie." 
      };
    } catch (error) {
      console.error("Erreur lors de la connexion admin:", error);
      return { 
        success: false, 
        message: "Erreur: " + error.message 
      };
    }
  },

  /**
   * Déconnecte l'utilisateur actuel.
   * @return {Promise<Object>} Une promesse qui résout avec un objet contenant le statut de l'opération.
   */
  logout: async function() {
    try {
      await auth.signOut();
      return { 
        success: true, 
        message: "Déconnexion réussie." 
      };
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
      return { 
        success: false, 
        message: "Erreur: " + error.message 
      };
    }
  }
};
