/**
 * Modèle de données de l'application Bibliothèque Club Alpin
 * 
 * Ce module gère l'état de l'application côté client et stocke les données
 * en mémoire pour un accès rapide.
 */

const AppState = {
  // Données de l'application
  _books: [],
  _categories: [],
  _activeBorrows: [],
  
  // Getters et setters pour les livres
  getBooks: function() { 
    return this._books; 
  },
  
  setBooks: function(newBooks) {
    this._books = newBooks || [];
    // Déclencher un événement personnalisé pour informer les composants du changement
    document.dispatchEvent(new CustomEvent('booksUpdated', { 
      detail: { books: this._books } 
    }));
  },
  
  // Getters et setters pour les catégories
  getCategories: function() { 
    return this._categories; 
  },
  
  setCategories: function(newCategories) {
    this._categories = newCategories || [];
    // Déclencher un événement personnalisé pour informer les composants du changement
    document.dispatchEvent(new CustomEvent('categoriesUpdated', { 
      detail: { categories: this._categories } 
    }));
  },
  
  // Getters et setters pour les emprunts actifs
  getActiveBorrows: function() { 
    return this._activeBorrows; 
  },
  
  setActiveBorrows: function(newBorrows) {
    this._activeBorrows = newBorrows || [];
    // Déclencher un événement personnalisé pour informer les composants du changement
    document.dispatchEvent(new CustomEvent('borrowsUpdated', { 
      detail: { borrows: this._activeBorrows } 
    }));
  },
  
  // Méthodes utilitaires pour manipuler les données
  
  /**
   * Trouve un livre par son ID.
   * @param {string} bookId L'ID du livre à trouver.
   * @return {Object|null} Le livre trouvé ou null si non trouvé.
   */
  findBookById: function(bookId) {
    return this._books.find(book => book.id === bookId) || null;
  },
  
  /**
   * Trouve un emprunt par son ID.
   * @param {string} borrowId L'ID de l'emprunt à trouver.
   * @return {Object|null} L'emprunt trouvé ou null si non trouvé.
   */
  findBorrowById: function(borrowId) {
    return this._activeBorrows.find(borrow => borrow.id === borrowId) || null;
  },
  
  /**
   * Trouve une catégorie par son nom.
   * @param {string} categoryName Le nom de la catégorie à trouver.
   * @return {Object|null} La catégorie trouvée ou null si non trouvée.
   */
  findCategoryByName: function(categoryName) {
    return this._categories.find(category => category.nom === categoryName) || null;
  },
  
  /**
   * Filtre les livres selon des critères.
   * @param {Object} criteria Les critères de filtrage.
   * @param {string} [criteria.query] Terme de recherche.
   * @param {string} [criteria.category] Catégorie pour filtrer.
   * @param {boolean} [criteria.available] Disponibilité pour filtrer.
   * @return {Array} Les livres filtrés.
   */
  filterBooks: function(criteria = {}) {
    return this._books.filter(book => {
      // Filtre par disponibilité
      if (criteria.available !== undefined && book.estDisponible !== criteria.available) {
        return false;
      }
      
      // Filtre par catégorie
      if (criteria.category && book.categorie !== criteria.category) {
        return false;
      }
      
      // Filtre par terme de recherche
      if (criteria.query) {
        const query = criteria.query.toLowerCase();
        const searchableFields = [
          book.titre || '',
          book.auteur || '',
          book.description || '',
          book.motsCles ? book.motsCles.join(' ') : '',
          book.isbn || ''
        ];
        
        // Vérifier si le terme de recherche est présent dans au moins un des champs
        const matchesQuery = searchableFields.some(field => 
          field.toLowerCase().includes(query)
        );
        
        if (!matchesQuery) {
          return false;
        }
      }
      
      // Si tous les filtres sont passés, inclure le livre
      return true;
    });
  },
  
  /**
   * Met à jour un livre dans la liste.
   * @param {string} bookId L'ID du livre à mettre à jour.
   * @param {Object} updates Les mises à jour à appliquer.
   * @return {boolean} True si la mise à jour a réussi, false sinon.
   */
  updateBook: function(bookId, updates) {
    const index = this._books.findIndex(book => book.id === bookId);
    if (index === -1) {
      return false;
    }
    
    // Créer une copie du livre avec les mises à jour
    this._books[index] = { ...this._books[index], ...updates };
    
    // Déclencher un événement pour informer les composants du changement
    document.dispatchEvent(new CustomEvent('booksUpdated', { 
      detail: { books: this._books } 
    }));
    
    return true;
  },
  
  /**
   * Met à jour un emprunt dans la liste.
   * @param {string} borrowId L'ID de l'emprunt à mettre à jour.
   * @param {Object} updates Les mises à jour à appliquer.
   * @return {boolean} True si la mise à jour a réussi, false sinon.
   */
  updateBorrow: function(borrowId, updates) {
    const index = this._activeBorrows.findIndex(borrow => borrow.id === borrowId);
    if (index === -1) {
      return false;
    }
    
    // Créer une copie de l'emprunt avec les mises à jour
    this._activeBorrows[index] = { ...this._activeBorrows[index], ...updates };
    
    // Déclencher un événement pour informer les composants du changement
    document.dispatchEvent(new CustomEvent('borrowsUpdated', { 
      detail: { borrows: this._activeBorrows } 
    }));
    
    return true;
  },
  
  /**
   * Ajoute un nouveau livre à la liste.
   * @param {Object} book Le livre à ajouter.
   */
  addBook: function(book) {
    this._books.push(book);
    
    // Déclencher un événement pour informer les composants du changement
    document.dispatchEvent(new CustomEvent('booksUpdated', { 
      detail: { books: this._books } 
    }));
  },
  
  /**
   * Ajoute un nouvel emprunt à la liste.
   * @param {Object} borrow L'emprunt à ajouter.
   */
  addBorrow: function(borrow) {
    this._activeBorrows.push(borrow);
    
    // Déclencher un événement pour informer les composants du changement
    document.dispatchEvent(new CustomEvent('borrowsUpdated', { 
      detail: { borrows: this._activeBorrows } 
    }));
  },
  
  /**
   * Supprime un emprunt de la liste des emprunts actifs.
   * @param {string} borrowId L'ID de l'emprunt à supprimer.
   * @return {boolean} True si la suppression a réussi, false sinon.
   */
  removeBorrow: function(borrowId) {
    const index = this._activeBorrows.findIndex(borrow => borrow.id === borrowId);
    if (index === -1) {
      return false;
    }
    
    // Supprimer l'emprunt de la liste
    this._activeBorrows.splice(index, 1);
    
    // Déclencher un événement pour informer les composants du changement
    document.dispatchEvent(new CustomEvent('borrowsUpdated', { 
      detail: { borrows: this._activeBorrows } 
    }));
    
    return true;
  }
};