/**
 * @file Categories.gs
 * @description Logique métier pour la gestion des catégories de livres.
 */

const CATEGORIES_SHEET_NAME_INTERNAL = "Categories"; // Pour éviter conflit avec la globale de app.js

/**
 * Récupère toutes les catégories de la feuille "Categories".
 * @return {Array<Object>} Un tableau d'objets représentant les catégories.
 * Chaque objet aura les propriétés correspondant aux en-têtes de la feuille "Categories".
 */
function getAllCategoriesInternal() {
  info("Categories: getAllCategoriesInternal - Récupération de toutes les catégories.");
  try {
    const categoriesData = getAllDataObjects(CATEGORIES_SHEET_NAME_INTERNAL); // Utilise SpreadsheetUtils

    if (!categoriesData) {
      error("Categories: getAllCategoriesInternal - Erreur lors de la récupération des données de la feuille Catégories.");
      return [];
    }

    if (categoriesData.length === 0) {
      info("Categories: getAllCategoriesInternal - Aucune catégorie trouvée dans la feuille.");
      // Il est normal de ne pas avoir de catégories, donc on retourne un tableau vide.
    }
    
    // Pas de traitement additionnel spécifique pour les catégories pour l'instant.
    // getAllDataObjects retourne directement les objets.

    info(`Categories: getAllCategoriesInternal - ${categoriesData.length} catégories récupérées.`);
    return categoriesData;
  } catch (e) {
    error("Categories: getAllCategoriesInternal - Erreur inattendue.", { message: e.message, stack: e.stack });
    return [];
  }
}

// Si d'autres fonctions spécifiques aux catégories sont nécessaires (ajout, suppression, modification),
// elles seraient ajoutées ici. Pour l'instant, seule la lecture est implémentée.