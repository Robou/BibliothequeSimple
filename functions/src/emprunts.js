/**
 * @file Emprunts.gs
 * @description Logique métier pour la gestion des emprunts.
 */

const EMPRUNTS_SHEET_NAME_INTERNAL = "Emprunts";
const JOURNAL_SHEET_NAME_INTERNAL = "Journal"; // Assurez-vous que ce nom est correct

/**
 * Enregistre un nouvel emprunt.
 * @param {string} bookId L'ID du livre à emprunter.
 * @param {string} borrowerName Le nom de l'emprunteur.
 * @param {string} borrowerContact Le contact de l'emprunteur.
 * @param {string} [comments=""] Commentaires optionnels sur l'emprunt.
 * @return {Object} Un objet avec { success: boolean, message: string, returnDate: Date|null }.
 */
function registerBorrowInternal(bookId, borrowerName, borrowerContact, comments = "") {
  info("Emprunts: registerBorrowInternal - Tentative d'enregistrement.", { bookId: bookId, borrowerName: borrowerName });
  try {
    // const empruntsSheet = getSheet(EMPRUNTS_SHEET_NAME_INTERNAL); // Via SpreadsheetUtils
    // const journalSheet = getSheet(JOURNAL_SHEET_NAME_INTERNAL); // Via SpreadsheetUtils
    // if (!empruntsSheet || !journalSheet) {
    //   error("Emprunts: registerBorrowInternal - Feuille Emprunts ou Journal non trouvée.");
    //   return { success: false, message: "Erreur de configuration serveur (feuilles manquantes).", returnDate: null };
    // }

    // 1. Vérifier la disponibilité du livre (utilise Livres.gs)
    const bookDetails = getBookDetailsInternal(bookId);
    if (!bookDetails) {
      warn("Emprunts: registerBorrowInternal - Livre non trouvé.", { bookId: bookId });
      return { success: false, message: "Livre non trouvé.", returnDate: null };
    }
    if (bookDetails.Est_Disponible === false || bookDetails.Est_Disponible === 'FALSE') { // Gérer booléen et chaîne
      info("Emprunts: registerBorrowInternal - Tentative d'emprunt d'un livre non disponible.", bookDetails);
      return { success: false, message: "Ce livre n'est pas disponible actuellement.", returnDate: null };
    }

    // 2. Récupérer la durée d'emprunt depuis la configuration (utilise Config.gs)
    const empruntDureeJours = getBorrowDurationDays();
    debug("Emprunts: registerBorrowInternal - Durée d'emprunt récupérée (jours):", {duration: empruntDureeJours});

    // 3. Mettre à jour la disponibilité du livre (utilise Livres.gs)
    const availabilityUpdated = updateBookAvailabilityInternal(bookId, false);
    if (!availabilityUpdated) {
      error("Emprunts: registerBorrowInternal - Échec de la mise à jour de la disponibilité du livre.", {bookId: bookId});
      throw new Error("Impossible de mettre à jour la disponibilité du livre.");
    }

    // 4. Générer un ID pour l'emprunt
    // Supposons que la colonne ID_Emprunt est la première (index 1)
    const ID_EMPRUNT_COLUMN_INDEX = 1;
    const newEmpruntId = getNextSequentialId(EMPRUNTS_SHEET_NAME_INTERNAL, "E", ID_EMPRUNT_COLUMN_INDEX, 3);
    if (!newEmpruntId) {
      error("Emprunts: registerBorrowInternal - Impossible de générer un ID pour l'emprunt.");
      // Rollback de la disponibilité du livre
      updateBookAvailabilityInternal(bookId, true);
      throw new Error("Impossible de générer un ID pour le nouvel emprunt.");
    }
    debug("Emprunts: registerBorrowInternal - Nouvel ID généré pour l'emprunt:", {newEmpruntId: newEmpruntId});
    
    // 5. Calculer les dates
    const today = new Date();
    const returnDate = new Date();
    returnDate.setDate(today.getDate() + empruntDureeJours);

    // 6. Ajouter l'emprunt à la feuille "Emprunts"
    // L'ordre des colonnes doit correspondre à la feuille "Emprunts"
    // ID_Emprunt, ID_Livre, Nom_Emprunteur, Contact_Emprunteur, Date_Emprunt, Date_Retour_Prevue, Est_Rendu, Date_Retour_Effective, Commentaires
    const newRowEmprunt = [
      newEmpruntId,
      bookId,
      borrowerName,
      borrowerContact,
      today,
      returnDate,
      false, // Est_Rendu
      null, // Date_Retour_Effective (null au début)
      comments
    ];
    
    if (!appendRowData(EMPRUNTS_SHEET_NAME_INTERNAL, newRowEmprunt)) {
      error("Emprunts: registerBorrowInternal - Échec de l'ajout de la ligne d'emprunt.", {data: newRowEmprunt});
      updateBookAvailabilityInternal(bookId, true); // Rollback
      throw new Error("Échec de l'écriture des données d'emprunt.");
    }
    info("Emprunts: registerBorrowInternal - Emprunt ajouté à la feuille.", {id: newEmpruntId});

    // 7. Ajouter une entrée au journal
    const journalEntry = [
      today,
      "Emprunt",
      borrowerName,
      `Emprunt: "${bookDetails.Titre}" (Livre ID: ${bookId}, Emprunt ID: ${newEmpruntId})`
    ];
    if (!appendRowData(JOURNAL_SHEET_NAME_INTERNAL, journalEntry)) {
      warn("Emprunts: registerBorrowInternal - Échec de l'écriture dans le journal pour l'emprunt.", {entry: journalEntry});
      // Ne pas considérer comme une erreur bloquante pour l'emprunt lui-même
    } else {
      info("Emprunts: registerBorrowInternal - Entrée ajoutée au journal pour l'emprunt.");
    }

    return {
      success: true,
      message: `Emprunt enregistré avec succès. À retourner avant le ${returnDate.toLocaleDateString('fr-FR')}.`,
      returnDate: returnDate.toISOString() // Convertir en chaîne ISO pour le client
    };

  } catch (e) {
    error("Emprunts: registerBorrowInternal - Erreur majeure.", { bookId: bookId, borrowerName: borrowerName, message: e.message, stack: e.stack });
    // Si une erreur s'est produite après avoir marqué le livre comme non disponible, il faut essayer de le remettre disponible.
    // C'est une gestion de "rollback" simplifiée. Idéalement, utiliser des transactions si le SGBD le permettait.
    // Tentative de rollback si bookId est défini et que l'erreur n'est pas due à la non-disponibilité initiale
    if (bookId && !(e.message && e.message.includes("disponibilité du livre"))) {
        warn("Emprunts: registerBorrowInternal - Tentative de rollback de la disponibilité du livre suite à une erreur.", {bookId: bookId});
        updateBookAvailabilityInternal(bookId, true);
    }
    return { success: false, message: "Erreur serveur : " + e.message, returnDate: null };
  }
}

/**
 * Enregistre le retour d'un livre.
 * @param {string} borrowId L'ID de l'emprunt à retourner.
 * @return {Object} Un objet avec { success: boolean, message: string }.
 */
function registerReturnInternal(borrowId) {
  info("Emprunts: registerReturnInternal - Tentative d'enregistrement d'un retour.", { borrowId: borrowId });
  try {
    // const empruntsSheet = getSheet(EMPRUNTS_SHEET_NAME_INTERNAL); // Via SpreadsheetUtils
    // const journalSheet = getSheet(JOURNAL_SHEET_NAME_INTERNAL); // Via SpreadsheetUtils
    // if (!empruntsSheet || !journalSheet) {
    //   error("Emprunts: registerReturnInternal - Feuille Emprunts ou Journal non trouvée.");
    //   return { success: false, message: "Erreur de configuration serveur (feuilles manquantes)." };
    // }
    
    // 1. Rechercher l'emprunt et son index de ligne
    // Supposons que ID_Emprunt est en colonne 1
    const ID_EMPRUNT_COLUMN_INDEX_FOR_FIND = 1;
    const empruntRowIndex = findRowIndex(EMPRUNTS_SHEET_NAME_INTERNAL, ID_EMPRUNT_COLUMN_INDEX_FOR_FIND, borrowId);

    if (empruntRowIndex === -1) {
      warn("Emprunts: registerReturnInternal - Emprunt non trouvé.", { borrowId: borrowId });
      return { success: false, message: "Emprunt non trouvé." };
    }
    debug("Emprunts: registerReturnInternal - Emprunt trouvé à la ligne:", { borrowId: borrowId, rowIndex: empruntRowIndex });

    // Récupérer les détails de l'emprunt pour vérification et journalisation
    // Il faut connaître la structure de la feuille Emprunts pour les index de colonnes.
    // ID_Emprunt (1), ID_Livre (2), Nom_Emprunteur (3), ..., Est_Rendu (7), Date_Retour_Effective (8)
    // ATTENTION: Ces index de colonnes doivent être exacts.
    const COL_ID_LIVRE_INDEX = 2;
    const COL_NOM_EMPRUNTEUR_INDEX = 3;
    const COL_EST_RENDU_INDEX = 7;
    const COL_DATE_RETOUR_EFFECTIVE_INDEX = 8;

    const empruntRowValues = getRowValues(EMPRUNTS_SHEET_NAME_INTERNAL, empruntRowIndex);
    if (!empruntRowValues) {
        error("Emprunts: registerReturnInternal - Impossible de lire les détails de l'emprunt trouvé.", { borrowId: borrowId, rowIndex: empruntRowIndex });
        return { success: false, message: "Erreur serveur lors de la lecture des détails de l'emprunt." };
    }
    
    const isAlreadyReturned = empruntRowValues[COL_EST_RENDU_INDEX - 1]; // -1 car getRowValues retourne un tableau base 0
    const bookId = empruntRowValues[COL_ID_LIVRE_INDEX - 1];
    const borrowerName = empruntRowValues[COL_NOM_EMPRUNTEUR_INDEX - 1];

    if (isAlreadyReturned === true || String(isAlreadyReturned).toUpperCase() === "TRUE") {
      info("Emprunts: registerReturnInternal - Tentative de retour d'un livre déjà rendu.", { borrowId: borrowId });
      return { success: false, message: "Ce livre a déjà été rendu." };
    }

    // 3. Mettre à jour l'emprunt (Est_Rendu = true, Date_Retour_Effective = aujourd'hui)
    const today = new Date();
    let successUpdateReturnStatus = updateCellValue(EMPRUNTS_SHEET_NAME_INTERNAL, empruntRowIndex, COL_EST_RENDU_INDEX, true);
    let successUpdateReturnDate = updateCellValue(EMPRUNTS_SHEET_NAME_INTERNAL, empruntRowIndex, COL_DATE_RETOUR_EFFECTIVE_INDEX, today);

    if (!successUpdateReturnStatus || !successUpdateReturnDate) {
        error("Emprunts: registerReturnInternal - Échec de la mise à jour du statut/date de retour de l'emprunt.", { borrowId: borrowId });
        // Ne pas bloquer, mais logguer. Le livre pourrait ne pas être remis disponible.
    } else {
        debug("Emprunts: registerReturnInternal - Emprunt mis à jour comme 'rendu'.", { borrowId: borrowId });
    }
    

    // 4. Mettre à jour la disponibilité du livre (utilise Livres.gs)
    const availabilityUpdated = updateBookAvailabilityInternal(bookId, true);
    if (!availabilityUpdated) {
      error("Emprunts: registerReturnInternal - L'emprunt a été marqué comme rendu, mais la MAJ de disponibilité du livre a échoué.", { borrowId: borrowId, bookId: bookId });
      // On continue quand même pour ne pas bloquer l'utilisateur, mais on logue une erreur grave.
    } else {
      info("Emprunts: registerReturnInternal - Disponibilité du livre mise à jour.", {bookId: bookId});
    }

    // 5. Ajouter une entrée au journal
    const bookDetails = getBookDetailsInternal(bookId);
    const bookTitle = bookDetails ? bookDetails.Titre : "Titre inconnu";
    const journalEntry = [
      today,
      "Retour",
      borrowerName, // Récupéré des détails de l'emprunt
      `Retour: "${bookTitle}" (Livre ID: ${bookId}, Emprunt ID: ${borrowId})`
    ];
    if (!appendRowData(JOURNAL_SHEET_NAME_INTERNAL, journalEntry)) {
        warn("Emprunts: registerReturnInternal - Échec de l'écriture dans le journal pour le retour.", {entry: journalEntry});
    } else {
        info("Emprunts: registerReturnInternal - Entrée ajoutée au journal pour le retour.");
    }

    return { success: true, message: "Retour enregistré avec succès." };

  } catch (e) {
    error("Emprunts: registerReturnInternal - Erreur majeure.", { borrowId: borrowId, message: e.message, stack: e.stack });
    return { success: false, message: "Erreur serveur : " + e.message };
  }
}

/**
 * Récupère tous les emprunts actifs.
 * Un emprunt est actif si "Est_Rendu" est false.
 * @return {Array<Object>} Un tableau d'objets représentant les emprunts actifs, enrichis avec les détails du livre.
 */
function getActiveBorrowsInternal() {
  info("Emprunts: getActiveBorrowsInternal - Récupération des emprunts actifs.");
  try {
    const allBorrowsData = getAllDataObjects(EMPRUNTS_SHEET_NAME_INTERNAL); // Utilise SpreadsheetUtils

    if (!allBorrowsData) {
      error("Emprunts: getActiveBorrowsInternal - Erreur lors de la récupération des données de la feuille Emprunts.");
      return [];
    }
    
    if (allBorrowsData.length === 0) {
      info("Emprunts: getActiveBorrowsInternal - Aucun emprunt trouvé dans la feuille.");
      return [];
    }
    
    debug(`Emprunts: getActiveBorrowsInternal - ${allBorrowsData.length} emprunts bruts récupérés.`);

    const activeBorrows = [];
    for (const borrow of allBorrowsData) {
      // La colonne "Est_Rendu" peut être un booléen ou une chaîne "TRUE"/"FALSE"
      const isReturned = borrow.Est_Rendu === true || String(borrow.Est_Rendu).toUpperCase() === "TRUE";

      if (!isReturned) {
        const processedBorrow = { ...borrow }; // Copie pour éviter de modifier l'original si réutilisé

        // Conversion des dates en ISOString si elles sont des objets Date
        if (processedBorrow.Date_Emprunt instanceof Date) {
          processedBorrow.Date_Emprunt = processedBorrow.Date_Emprunt.toISOString();
        }
        if (processedBorrow.Date_Retour_Prevue instanceof Date) {
          processedBorrow.Date_Retour_Prevue = processedBorrow.Date_Retour_Prevue.toISOString();
        }
        // Date_Retour_Effective sera souvent null/vide pour les actifs, mais on gère au cas où
        if (processedBorrow.Date_Retour_Effective instanceof Date) {
          processedBorrow.Date_Retour_Effective = processedBorrow.Date_Retour_Effective.toISOString();
        }
        
        // Enrichir avec les détails du livre
        const bookDetails = getBookDetailsInternal(processedBorrow.ID_Livre);
        processedBorrow.BookTitle = bookDetails ? bookDetails.Titre : "Livre inconnu";
        processedBorrow.BookAuthor = bookDetails ? bookDetails.Auteur : "Auteur inconnu";
        // Ajouter d'autres détails du livre si nécessaire pour l'affichage (ex: ISBN pour code-barre)
        processedBorrow.BookISBN = bookDetails ? bookDetails.ISBN : "";

        activeBorrows.push(processedBorrow);
      }
    }
    info(`Emprunts: getActiveBorrowsInternal - ${activeBorrows.length} emprunts actifs trouvés.`);
    return activeBorrows;
  } catch (e) {
    error("Emprunts: getActiveBorrowsInternal - Erreur majeure.", { message: e.message, stack: e.stack });
    return [];
  }
}