/**
 * Contrôleur principal de l'application Bibliothèque Club Alpin
 * 
 * Ce contrôleur gère la logique métier côté client et coordonne les interactions
 * entre les différents composants (AppState, UIManager, FirebaseService).
 */

const AppController = {
  /**
   * Initialise l'application.
   */
  init: function() {
    // Initialiser les éléments du DOM
    UIManager.initDOMElements();
    
    // Charger les données initiales
    this.loadInitialData();
    
    // Configurer les écouteurs d'événements
    this.setupEventListeners();
    
    console.log("AppController initialisé");
  },

  /**
   * Charge les données initiales de l'application.
   */
  loadInitialData: function() {
    // Charger les livres
    FirebaseService.getAllBooks()
      .then(books => {
        AppState.setBooks(books);
        UIManager.displayBooks(AppState.getBooks());
        UIManager.populateBookDropdown();
      })
      .catch(error => {
        console.error("Erreur de chargement des livres:", error);
        UIManager.showToast('Erreur', 'Impossible de charger les livres: ' + error.message, 'danger');
      });

    // Charger les catégories
    FirebaseService.getAllCategories()
      .then(categories => {
        AppState.setCategories(categories);
        UIManager.populateCategoryDropdowns();
      })
      .catch(error => {
        console.error("Erreur de chargement des catégories:", error);
        UIManager.showToast('Erreur', 'Impossible de charger les catégories: ' + error.message, 'danger');
      });

    // Charger les emprunts actifs
    FirebaseService.getActiveBorrows()
      .then(borrows => {
        AppState.setActiveBorrows(borrows);
        UIManager.displayActiveBorrows();
        UIManager.populateBorrowDropdown();
      })
      .catch(error => {
        console.error("Erreur de chargement des emprunts:", error);
        UIManager.showToast('Erreur', 'Impossible de charger les emprunts: ' + error.message, 'danger');
      });
  },

  /**
   * Configure les écouteurs d'événements pour les interactions utilisateur.
   */
  setupEventListeners: function() {
    // Recherche de livres
    UIManager.elements.searchButton.addEventListener('click', this.handleSearch.bind(this));
    UIManager.elements.searchInput.addEventListener('keyup', event => {
      if (event.key === 'Enter') {
        this.handleSearch();
      }
    });

    // Filtrage des livres
    UIManager.elements.categoryFilter.addEventListener('change', this.handleFilterChange.bind(this));
    UIManager.elements.availabilityFilter.addEventListener('change', this.handleFilterChange.bind(this));

    // Emprunt de livre
    UIManager.elements.borrowForm.addEventListener('submit', this.handleBorrowSubmit.bind(this));
    
    // Recherche par ISBN
    UIManager.elements.isbnSearchButton.addEventListener('click', this.handleISBNSearch.bind(this));
    UIManager.elements.isbnInput.addEventListener('keyup', event => {
      if (event.key === 'Enter') {
        this.handleISBNSearch();
      }
    });
    
    // Sélection de livre dans la liste déroulante
    UIManager.elements.bookSelect.addEventListener('change', this.handleBookSelectChange.bind(this));

    // Retour de livre
    UIManager.elements.returnForm.addEventListener('submit', this.handleReturnSubmit.bind(this));

    // Administration
    UIManager.elements.adminLoginButton.addEventListener('click', this.handleAdminLoginClick.bind(this));
    UIManager.elements.addBookForm.addEventListener('submit', this.handleAddBookSubmit.bind(this));

    // Délégation d'événements pour les boutons "Emprunter" sur les cartes de livres
    UIManager.elements.booksContainer.addEventListener('click', event => {
      if (event.target.classList.contains('borrow-book-btn') ||
          event.target.parentElement.classList.contains('borrow-book-btn')) {
        const button = event.target.classList.contains('borrow-book-btn') ?
          event.target :
          event.target.parentElement;
        const bookId = button.getAttribute('data-book-id');
        this.handleBorrowBookClick(bookId);
      }
    });

    // Gestion du bouton "voir plus..." sur une carte de livre
    UIManager.elements.booksContainer.addEventListener('click', event => {
      if (event.target.classList.contains('show-more')) {
        const descriptionContainer = event.target.closest('.description-container');
        const bookId = event.target.closest('.book-card').querySelector('.borrow-book-btn').getAttribute('data-book-id');
        const book = AppState.getBooks().find(b => b.id === bookId);

        if (book && book.description) {
          // Remplacer le contenu tronqué par la description complète
          const fullDescription = document.createElement('p');
          fullDescription.className = 'card-text small';
          fullDescription.textContent = book.description;

          // Ajouter un bouton pour revenir à la version tronquée
          const showLessBtn = document.createElement('button');
          showLessBtn.className = 'btn btn-link btn-sm p-0 show-less';
          showLessBtn.textContent = 'voir moins';
          showLessBtn.addEventListener('click', function() {
            descriptionContainer.innerHTML = `
              <p class="card-text small">${book.description.substring(0, 100)}
                <span>...</span>
                <button class="btn btn-link btn-sm p-0 show-more">voir plus</button>
              </p>
            `;
          });

          // Vider et remplir le conteneur
          descriptionContainer.innerHTML = '';
          descriptionContainer.appendChild(fullDescription);
          descriptionContainer.appendChild(showLessBtn);
        }
      }
    });
  },

  /**
   * Gère la recherche de livres.
   */
  handleSearch: function() {
    const query = UIManager.elements.searchInput.value;
    const categorie = UIManager.elements.categoryFilter.value;
    const disponible = UIManager.elements.availabilityFilter.value ? 
      UIManager.elements.availabilityFilter.value === 'true' : null;
    
    // Si la recherche est vide et pas de filtres, afficher tous les livres
    if (!query && !categorie && disponible === null) {
      UIManager.displayBooks(AppState.getBooks() || []);
      return;
    }
    
    // Paramètres de recherche
    const searchParams = {
      query: query,
      categorie: categorie,
      disponible: disponible
    };
    
    // Afficher un indicateur de chargement
    UIManager.showLoadingIndicator(UIManager.elements.booksContainer);
    
    // Effectuer la recherche
    FirebaseService.searchBooks(searchParams)
      .then(results => {
        UIManager.hideLoadingIndicator(UIManager.elements.booksContainer);
        UIManager.displayBooks(results || []);
      })
      .catch(error => {
        UIManager.hideLoadingIndicator(UIManager.elements.booksContainer);
        UIManager.showToast('Erreur', 'Erreur lors de la recherche: ' + error.message, 'danger');
      });
  },

  /**
   * Gère le changement des filtres.
   */
  handleFilterChange: function() {
    // Déclencher la recherche avec les nouveaux filtres
    this.handleSearch();
  },

  /**
   * Gère le clic sur un bouton "Emprunter" d'une carte de livre.
   * @param {string} bookId L'ID du livre.
   */
  handleBorrowBookClick: function(bookId) {
    // Trouver le livre dans la liste
    const book = AppState.getBooks().find(b => b.id === bookId);
    if (!book) {
      UIManager.showToast('Erreur', 'Livre non trouvé', 'danger');
      return;
    }

    // Activer l'onglet Emprunter
    const borrowTab = new bootstrap.Tab(UIManager.elements.borrowTab);
    borrowTab.show();

    // Afficher les détails du livre dans le formulaire d'emprunt
    UIManager.displaySelectedBook(book);
  },

  /**
   * Gère la recherche par ISBN.
   */
  handleISBNSearch: function() {
    const isbn = UIManager.elements.isbnInput.value.trim();
    if (!isbn) {
      UIManager.showToast('Attention', 'Veuillez saisir un ISBN', 'warning');
      return;
    }

    // Désactiver le bouton pendant la recherche
    UIManager.updateButtonState(UIManager.elements.isbnSearchButton, true, "Recherche...");

    FirebaseService.getBookByISBN(isbn)
      .then(book => {
        // Réactiver le bouton
        UIManager.updateButtonState(UIManager.elements.isbnSearchButton, false, "", '<i class="fas fa-search"></i>');

        // Vider le champ de recherche ISBN pour une prochaine recherche
        UIManager.elements.isbnInput.value = '';

        if (book) {
          if (book.estDisponible) {
            UIManager.displaySelectedBook(book);
            UIManager.showToast('Succès', 'Livre trouvé : ' + book.titre, 'success');
          } else {
            UIManager.showToast('Information', 'Ce livre est déjà emprunté', 'warning');
          }
        } else {
          UIManager.showToast('Information', 'Aucun livre trouvé avec cet ISBN', 'info');
        }
      })
      .catch(error => {
        // Réactiver le bouton
        UIManager.updateButtonState(UIManager.elements.isbnSearchButton, false, "", '<i class="fas fa-search"></i>');
        UIManager.showToast('Erreur', 'Erreur lors de la recherche par ISBN: ' + error.message, 'danger');
      });
  },

  /**
   * Gère le changement de sélection dans la liste déroulante des livres.
   */
  handleBookSelectChange: function() {
    const bookId = UIManager.elements.bookSelect.value;
    if (!bookId) {
      UIManager.displaySelectedBook(null);
      return;
    }

    const book = AppState.getBooks().find(b => b.id === bookId);
    if (book) {
      UIManager.displaySelectedBook(book);
    }
  },

  /**
   * Gère la soumission du formulaire d'emprunt.
   * @param {Event} event L'événement de soumission.
   */
  handleBorrowSubmit: function(event) {
    event.preventDefault();
    const form = UIManager.elements.borrowForm;
    const bookId = UIManager.elements.selectedBookId.value || UIManager.elements.bookSelect.value;
    const borrowerName = form.elements['borrowerName'].value;
    const borrowerContact = form.elements['borrowerContact'].value;
    const comments = form.elements['borrowComments'].value;

    if (!bookId) {
      UIManager.showToast('Attention', 'Veuillez sélectionner un livre (par ISBN ou dans la liste)', 'warning');
      return;
    }
    if (!borrowerName || !borrowerContact) {
      UIManager.showToast('Attention', 'Veuillez remplir tous les champs obligatoires', 'warning');
      return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    const originalButtonHTML = submitButton.innerHTML;
    UIManager.updateButtonState(submitButton, true, "Traitement...");

    FirebaseService.registerBorrow(bookId, borrowerName, borrowerContact, comments)
      .then(result => {
        UIManager.updateButtonState(submitButton, false, "", originalButtonHTML);
        if (result.success) {
          UIManager.showToast('Succès', result.message, 'success');
          form.reset();
          // Effacer la sélection du livre
          UIManager.displaySelectedBook(null);
          // Recharger les données affectées
          this.refreshBooksAndBorrows();
        } else {
          UIManager.showToast('Erreur', result.message || "Erreur inconnue lors de l'emprunt.", 'danger');
        }
      })
      .catch(error => {
        UIManager.updateButtonState(submitButton, false, "", originalButtonHTML);
        UIManager.showToast('Erreur', 'Erreur lors de l\'emprunt: ' + error.message, 'danger');
      });
  },

  /**
   * Rafraîchit les livres et les emprunts après une modification.
   */
  refreshBooksAndBorrows: function() {
    // Recharger les livres
    FirebaseService.getAllBooks()
      .then(books => {
        AppState.setBooks(books);
        UIManager.displayBooks(AppState.getBooks());
        UIManager.populateBookDropdown();
      })
      .catch(error => {
        UIManager.showToast('Erreur', 'Impossible de recharger les livres: ' + error.message, 'danger');
      });

    // Recharger les emprunts actifs
    FirebaseService.getActiveBorrows()
      .then(borrows => {
        AppState.setActiveBorrows(borrows);
        UIManager.displayActiveBorrows();
        UIManager.populateBorrowDropdown();
      })
      .catch(error => {
        UIManager.showToast('Erreur', 'Impossible de recharger les emprunts: ' + error.message, 'danger');
      });
  },

  /**
   * Gère la soumission du formulaire de retour.
   * @param {Event} event L'événement de soumission.
   */
  handleReturnSubmit: function(event) {
    event.preventDefault();
    const form = UIManager.elements.returnForm;
    const borrowId = UIManager.elements.borrowSelect.value;

    if (!borrowId) {
      UIManager.showToast('Attention', 'Veuillez sélectionner un emprunt à retourner', 'warning');
      return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    const originalButtonHTML = submitButton.innerHTML;
    UIManager.updateButtonState(submitButton, true, "Traitement...");

    FirebaseService.registerReturn(borrowId)
      .then(result => {
        UIManager.updateButtonState(submitButton, false, "", originalButtonHTML);
        if (result.success) {
          UIManager.showToast('Succès', result.message, 'success');
          // Recharger les données affectées
          this.refreshBooksAndBorrows();
        } else {
          UIManager.showToast('Erreur', result.message || "Erreur inconnue lors du retour.", 'danger');
        }
      })
      .catch(error => {
        UIManager.updateButtonState(submitButton, false, "", originalButtonHTML);
        UIManager.showToast('Erreur', 'Erreur lors du retour: ' + error.message, 'danger');
      });
  },

  /**
   * Gère le clic sur le bouton de connexion administrateur.
   */
  handleAdminLoginClick: function() {
    const email = UIManager.elements.adminEmail.value;
    const password = UIManager.elements.adminPassword.value;
    
    if (!email || !password) {
      UIManager.showToast('Attention', 'Veuillez saisir votre email et votre mot de passe', 'warning');
      return;
    }

    UIManager.updateButtonState(UIManager.elements.adminLoginButton, true, "Connexion...");

    FirebaseService.adminLogin(email, password)
      .then(result => {
        UIManager.updateButtonState(UIManager.elements.adminLoginButton, false, "", '<i class="fas fa-sign-in-alt"></i> Se connecter');
        
        if (result.success) {
          UIManager.showToast('Succès', result.message, 'success');
          // L'interface sera mise à jour via l'événement userAuthStateChanged
        } else {
          UIManager.showToast('Erreur', result.message, 'danger');
        }
      })
      .catch(error => {
        UIManager.updateButtonState(UIManager.elements.adminLoginButton, false, "", '<i class="fas fa-sign-in-alt"></i> Se connecter');
        UIManager.showToast('Erreur', 'Erreur lors de la connexion: ' + error.message, 'danger');
      });
  },

  /**
   * Gère la soumission du formulaire d'ajout de livre.
   * @param {Event} event L'événement de soumission.
   */
  handleAddBookSubmit: function(event) {
    event.preventDefault();
    const form = UIManager.elements.addBookForm;
    
    const bookData = {
      titre: form.elements['bookTitle'].value,
      auteur: form.elements['bookAuthor'].value,
      categorie: form.elements['bookCategory'].value,
      editeur: form.elements['bookEditor'].value,
      annee: form.elements['bookYear'].value,
      description: form.elements['bookDescription'].value,
      motsCles: form.elements['bookKeywords'].value,
      isbn: form.elements['bookIsbn'] ? form.elements['bookIsbn'].value : "",
      typePhysique: form.elements['bookType'] ? form.elements['bookType'].value : "",
      lieu: form.elements['bookLocation'] ? form.elements['bookLocation'].value : ""
    };

    const submitButton = form.querySelector('button[type="submit"]');
    const originalButtonHTML = submitButton.innerHTML;
    UIManager.updateButtonState(submitButton, true, "Ajout...");

    FirebaseService.addNewBook(bookData)
      .then(result => {
        UIManager.updateButtonState(submitButton, false, "", originalButtonHTML);
        
        if (result.success) {
          UIManager.showToast('Succès', result.message, 'success');
          form.reset();
          // Recharger uniquement les livres
          FirebaseService.getAllBooks()
            .then(books => {
              AppState.setBooks(books);
              UIManager.displayBooks(AppState.getBooks());
              UIManager.populateBookDropdown();
            })
            .catch(error => {
              UIManager.showToast('Erreur', 'Impossible de recharger les livres après ajout: ' + error.message, 'danger');
            });
        } else {
          UIManager.showToast('Erreur', result.message || "Erreur inconnue lors de l'ajout du livre.", 'danger');
        }
      })
      .catch(error => {
        UIManager.updateButtonState(submitButton, false, "", originalButtonHTML);
        UIManager.showToast('Erreur', 'Erreur lors de l\'ajout du livre: ' + error.message, 'danger');
      });
  },

  /**
   * Synchronise les données avec le serveur.
   * Utile après une reconnexion Internet.
   */
  syncData: function() {
    // Recharger toutes les données
    this.loadInitialData();
  }
};