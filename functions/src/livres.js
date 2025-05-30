/**
 * @file Livres.gs
 * @description Logique métier pour la gestion des livres.
 */

const LIVRES_SHEET_NAME_INTERNAL = "Livres"; // Pour éviter conflit avec la globale de app.js

/**
 * Récupère tous les livres de la feuille "Livres".
 * @return {Array<Object>} Un tableau d'objets représentant les livres.
 */
function getAllBooksInternal() {
  debug("Livres: getAllBooksInternal - Début de la récupération des livres.");
  try {
    const booksData = getAllDataObjects(LIVRES_SHEET_NAME_INTERNAL); // Utilise SpreadsheetUtils

    if (!booksData) {
      error("Livres: getAllBooksInternal - Erreur lors de la récupération des données de la feuille Livres.");
      return [];
    }

    if (booksData.length === 0) {
      info("Livres: getAllBooksInternal - Pas de données trouvées dans la feuille Livres.");
      return [];
    }

    // Traitement additionnel si nécessaire (ex: conversion de types spécifiques non gérés par getAllDataObjects)
    // Pour l'instant, getAllDataObjects devrait suffire si les dates sont bien formatées ou gérées comme chaînes.
    // Cependant, assurons la conversion des dates en ISOString si elles sont des objets Date.
    // Et 'Annee' en string.
    const books = booksData.map(book => {
      const processedBook = { ...book };
      if (processedBook.Date_Ajout instanceof Date) {
        processedBook.Date_Ajout = processedBook.Date_Ajout.toISOString();
      }
      // La colonne Annee peut être une date ou un nombre. On la veut en string.
      if (processedBook.Annee instanceof Date) {
        processedBook.Annee = processedBook.Annee.getFullYear().toString(); // Prend l'année d'une date
      } else if (typeof processedBook.Annee === 'number') {
        processedBook.Annee = String(processedBook.Annee);
      }
      // Est_Disponible est souvent true/false mais peut être une string "TRUE" / "FALSE" depuis sheets
      if (typeof processedBook.Est_Disponible === 'string') {
        processedBook.Est_Disponible = processedBook.Est_Disponible.toUpperCase() === 'TRUE';
      }

      return processedBook;
    });

    info(`Livres: getAllBooksInternal - ${books.length} livres récupérés et traités.`);
    return books;
  } catch (e) {
    error("Livres: getAllBooksInternal - Erreur inattendue.", { message: e.message, stack: e.stack });
    return [];
  }
}

/**
 * Récupère les détails d'un livre par son ID.
 * @param {string} bookId L'ID du livre.
 * @return {Object|null} L'objet livre ou null si non trouvé.
 */
function getBookDetailsInternal(bookId) {
  info("Livres: getBookDetailsInternal - Recherche des détails pour le livre ID:", { bookId: bookId });
  const books = getAllBooksInternal(); // Pourrait être optimisé en lisant directement la ligne si performance devient un enjeu

  if (!books) { // getAllBooksInternal peut retourner null en cas d'erreur grave
    error("Livres: getBookDetailsInternal - Impossible de récupérer la liste des livres.");
    return null;
  }

  const book = books.find(b => b.ID === bookId);

  if (book) {
    debug("Livres: getBookDetailsInternal - Livre trouvé:", book);
    return book;
  } else {
    warn("Livres: getBookDetailsInternal - Livre non trouvé avec ID:", { bookId: bookId });
    return null;
  }
}

/**
 * Ajoute un nouveau livre à la bibliothèque.
 * Nécessite une vérification des droits admin en amont (gérée par le point d'entrée API).
 * @param {Object} bookData Les données du livre à ajouter.
 *   Doit contenir: titre, auteur, categorie, editeur, annee, description, motsCles.
 *   Les nouvelles propriétés (ISBN, typePhysique, lieuStockage) seront aussi attendues.
 * @return {string} Le nouvel ID du livre ajouté.
 * @throws {Error} Si l'ajout échoue.
 */
function addNewBookInternal(bookData) {
  info("Livres: addNewBookInternal - Tentative d'ajout d'un nouveau livre:", bookData);
  try {
    // Colonne ID est supposée être la première (index 1)
    const ID_COLUMN_INDEX = 1;
    const newId = getNextSequentialId(LIVRES_SHEET_NAME_INTERNAL, "L", ID_COLUMN_INDEX, 3);

    if (!newId) {
      error("Livres: addNewBookInternal - Impossible de générer un nouvel ID pour le livre.");
      throw new Error("Impossible de générer un ID pour le nouveau livre.");
    }
    debug("Livres: addNewBookInternal - Nouvel ID généré pour le livre:", { newId: newId });

    // L'ordre des colonnes ici DOIT correspondre à l'ordre dans votre feuille "Livres"
    // ID, Titre, Auteur, Categorie, Editeur, Annee, Est_Disponible, Date_Ajout, Description, Mots_Cles, ISBN, Type_Physique, Lieu_Stockage
    const newRowData = [
      newId,
      bookData.titre,
      bookData.auteur,
      bookData.categorie,
      bookData.editeur || "",
      bookData.annee ? String(bookData.annee) : "", // S'assurer que l'année est une chaîne
      true, // Est_Disponible par défaut
      new Date(), // Date_Ajout
      bookData.description || "",
      bookData.motsCles || "",
      bookData.isbn || "",
      bookData.typePhysique || "",
      bookData.lieu || ""
    ];

    const success = appendRowData(LIVRES_SHEET_NAME_INTERNAL, newRowData);
    if (!success) {
      error("Livres: addNewBookInternal - Échec de l'ajout de la ligne à la feuille de calcul pour le livre:", newRowData);
      throw new Error("Échec de l'écriture des données du livre dans la feuille de calcul.");
    }

    info("Livres: addNewBookInternal - Nouveau livre ajouté avec succès.", { id: newId, titre: bookData.titre });

    // La journalisation de l'action "Ajout" pourrait être faite ici ou dans Emprunts.gs si on crée un service Journal.gs
    // Pour l'instant, on suppose que le module Emprunts gère le journal principal.
    // Alternativement, ajouter une entrée spécifique ici :
    // appendRowData(JOURNAL_SHEET_NAME_INTERNAL, [new Date(), "AjoutLivre", "Admin", `Livre: ${bookData.titre} (ID: ${newId})`]);

    return newId;
  } catch (e) {
    error("Livres: addNewBookInternal - Erreur lors de l'ajout du livre.", { bookData: bookData, message: e.message, stack: e.stack });
    throw new Error("Impossible d'ajouter le livre : " + e.message);
  }
}

/**
 * Met à jour la disponibilité d'un livre.
 * @param {string} bookId L'ID du livre.
 * @param {boolean} disponible True si le livre devient disponible, false sinon.
 * @return {boolean} True si la mise à jour a réussi, false sinon.
 */
function updateBookAvailabilityInternal(bookId, disponible) {
  info(`Livres: updateBookAvailabilityInternal - Mise à jour de la disponibilité pour le livre ID: ${bookId} à ${disponible}`);
  try {
    // Supposons que la colonne ID est la première (index 1)
    const ID_COLUMN_INDEX = 1;
    const bookRowIndex = findRowIndex(LIVRES_SHEET_NAME_INTERNAL, ID_COLUMN_INDEX, bookId);

    if (bookRowIndex === -1) {
      warn("Livres: updateBookAvailabilityInternal - Livre non trouvé, ID:", { bookId: bookId });
      return false;
    }

    // Définition des indices de colonnes comme constantes pour une meilleure maintenance
    const COL_EST_DISPONIBLE_INDEX = 7; // Index de la colonne "Est_Disponible"
    
    // Note: Dans une future version, on pourrait implémenter une fonction qui récupère
    // dynamiquement l'index des colonnes à partir des en-têtes, par exemple:
    // const COL_EST_DISPONIBLE_INDEX = getColumnIndexByHeader(LIVRES_SHEET_NAME_INTERNAL, "Est_Disponible");

    const success = updateCellValue(LIVRES_SHEET_NAME_INTERNAL, bookRowIndex, COL_EST_DISPONIBLE_INDEX, disponible);

    if (success) {
      info(`Livres: updateBookAvailabilityInternal - Disponibilité du livre ${bookId} mise à jour avec succès à ${disponible}.`);
    } else {
      error(`Livres: updateBookAvailabilityInternal - Échec de la mise à jour de la disponibilité pour le livre ${bookId}.`);
    }
    return success;
  } catch (e) {
    error(`Livres: updateBookAvailabilityInternal - Erreur lors de la mise à jour de la disponibilité du livre ${bookId}.`, { message: e.message, stack: e.stack });
    return false;
  }
}

/**
 * Recherche des livres en fonction d'une requête.
 * La recherche s'effectue sur le titre, l'auteur, la description, les mots-clés et la catégorie.
 * @param {string} query Le terme de recherche.
 * @return {Array<Object>} Un tableau de livres correspondant à la recherche.
 */
function searchBooksInternal(query) {
  info("Livres: searchBooksInternal - Recherche de livres avec la requête:", { query: query });
  const allBooks = getAllBooksInternal();

  if (!allBooks) {
    error("Livres: searchBooksInternal - Impossible de récupérer la liste des livres pour la recherche.");
    return []; // Retourner un tableau vide en cas d'erreur de chargement des livres
  }

  if (!query || query.trim() === "") {
    debug("Livres: searchBooksInternal - Requête de recherche vide, retour de tous les livres.");
    return allBooks;
  }

  const lowerCaseQuery = String(query).toLowerCase(); // Assurer que query est une chaîne
  const results = allBooks.filter(book => {
    // S'assurer que les champs existent et sont des chaînes avant d'appeler toLowerCase()
    const titre = book.Titre ? String(book.Titre).toLowerCase() : "";
    const auteur = book.Auteur ? String(book.Auteur).toLowerCase() : "";
    const description = book.Description ? String(book.Description).toLowerCase() : "";
    const motsCles = book.Mots_Cles ? String(book.Mots_Cles).toLowerCase() : "";
    const categorie = book.Categorie ? String(book.Categorie).toLowerCase() : "";
    const isbn = book.ISBN ? String(book.ISBN).toLowerCase() : "";
    const type = book.Type ? String(book.Type).toLowerCase() : "";
    const lieu = book.Lieu ? String(book.Lieu).toLowerCase() : "";

    return titre.includes(lowerCaseQuery) ||
      auteur.includes(lowerCaseQuery) ||
      description.includes(lowerCaseQuery) ||
      motsCles.includes(lowerCaseQuery) ||
      categorie.includes(lowerCaseQuery) ||
      isbn.includes(lowerCaseQuery) ||
      type.includes(lowerCaseQuery) ||
      lieu.includes(lowerCaseQuery);
  });

  info(`Livres: searchBooksInternal - Recherche terminée. ${results.length} livres trouvés pour la requête: "${query}"`);
  return results;
}

/**
 * Récupère un livre par son ISBN.
 * Cette fonction normalise l'ISBN fourni (supprime les tirets et espaces)
 * avant de faire la comparaison pour une recherche plus robuste.
 * @param {string} isbn Le code ISBN du livre à rechercher.
 * @return {Object|null} L'objet livre ou null si non trouvé.
 */
function getBookByISBNInternal(isbn) {
  info("Livres: getBookByISBNInternal - Recherche d'un livre par ISBN:", { isbn: isbn });
  
  if (!isbn || isbn.trim() === "") {
    warn("Livres: getBookByISBNInternal - ISBN vide fourni.");
    return null;
  }
  
  const books = getAllBooksInternal();
  
  if (!books) {
    error("Livres: getBookByISBNInternal - Impossible de récupérer la liste des livres.");
    return null;
  }
  
  const normalizedISBN = isbn.trim().replace(/[-\s]/g, ''); // Normalise l'ISBN en supprimant tirets et espaces
  const book = books.find(b => {
    // Normalise également l'ISBN du livre pour la comparaison
    const bookISBN = b.ISBN ? String(b.ISBN).trim().replace(/[-\s]/g, '') : "";
    return bookISBN === normalizedISBN;
  });
  
  if (book) {
    debug("Livres: getBookByISBNInternal - Livre trouvé par ISBN:", book);
    return book;
  } else {
    warn("Livres: getBookByISBNInternal - Aucun livre trouvé avec ISBN:", { isbn: isbn });
    return null;
  }
}