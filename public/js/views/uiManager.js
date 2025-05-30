/**
 * Gestionnaire d'interface utilisateur pour l'application Bibliothèque Club Alpin
 * 
 * Ce module gère l'affichage et les interactions avec le DOM.
 */

const UIManager = {
  // Éléments du DOM fréquemment utilisés
  elements: {
    booksContainer: null,
    bookSelect: null,
    categoryFilter: null,
    bookCategory: null,
    activeBorrowsContainer: null,
    borrowSelect: null,
    searchInput: null,
    searchButton: null,
    availabilityFilter: null,
    borrowForm: null,
    returnForm: null,
    addBookForm: null,
    adminLoginForm: null,
    adminContent: null,
    adminEmail: null,
    adminPassword: null,
    adminLoginButton: null,
    toastEl: null,
    toastTitle: null,
    toastMessage: null,
    isbnInput: null,
    isbnSearchButton: null,
    selectedBookId: null,
    selectedBookInfo: null,
    selectedBookDetails: null,
    borrowTab: null
  },

  /**
   * Initialise les références aux éléments du DOM.
   */
  initDOMElements: function() {
    this.elements.booksContainer = document.getElementById('booksContainer');
    this.elements.bookSelect = document.getElementById('bookSelect');
    this.elements.categoryFilter = document.getElementById('categoryFilter');
    this.elements.bookCategory = document.getElementById('bookCategory');
    this.elements.activeBorrowsContainer = document.getElementById('activeBorrowsContainer');
    this.elements.borrowSelect = document.getElementById('borrowSelect');
    this.elements.searchInput = document.getElementById('searchInput');
    this.elements.searchButton = document.getElementById('searchButton');
    this.elements.availabilityFilter = document.getElementById('availabilityFilter');
    this.elements.borrowForm = document.getElementById('borrowForm');
    this.elements.returnForm = document.getElementById('returnForm');
    this.elements.addBookForm = document.getElementById('addBookForm');
    this.elements.adminLoginForm = document.getElementById('adminLoginForm');
    this.elements.adminContent = document.getElementById('adminContent');
    this.elements.adminEmail = document.getElementById('adminEmail');
    this.elements.adminPassword = document.getElementById('adminPassword');
    this.elements.adminLoginButton = document.getElementById('adminLoginButton');
    this.elements.toastEl = document.getElementById('appToast');
    this.elements.toastTitle = document.getElementById('toastTitle');
    this.elements.toastMessage = document.getElementById('toastMessage');
    this.elements.isbnInput = document.getElementById('isbnInput');
    this.elements.isbnSearchButton = document.getElementById('isbnSearchButton');
    this.elements.selectedBookId = document.getElementById('selectedBookId');
    this.elements.selectedBookInfo = document.getElementById('selectedBookInfo');
    this.elements.selectedBookDetails = document.getElementById('selectedBookDetails');
    this.elements.borrowTab = document.getElementById('borrow-tab');
  },

  /**
   * Formate une date pour l'affichage.
   * @param {Date} date La date à formater.
   * @return {string} La date formatée.
   */
  formatDate: function(date) {
    if (!date) return 'N/A';
    
    // Si la date est une chaîne ISO, la convertir en objet Date
    if (typeof date === 'string') {
      date = new Date(date);
    }
    
    // Vérifier si la date est valide
    if (isNaN(date.getTime())) {
      return 'N/A';
    }
    
    return date.toLocaleDateString('fr-FR');
  },

  /**
   * Affiche les livres dans le conteneur.
   * @param {Array} booksToDisplay Les livres à afficher.
   */
  displayBooks: function(booksToDisplay) {
    const container = this.elements.booksContainer;
    container.innerHTML = '';

    if (!booksToDisplay || booksToDisplay.length === 0) {
      container.innerHTML = '<div class="col-12 text-center"><p>Aucun livre trouvé.</p></div>';
      return;
    }

    booksToDisplay.forEach(book => {
      const bookCard = document.createElement('div');
      bookCard.className = 'col-md-4 col-lg-3 mb-4';

      const availability = book.estDisponible ?
        '<span class="badge bg-success">Disponible</span>' :
        '<span class="badge bg-danger">Emprunté</span>';

      // Convertir la catégorie en classe CSS valide (minuscules, sans accents)
      const categoryClass = book.categorie ? 
        book.categorie.toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Supprimer les accents
          .replace(/[^a-z0-9]/g, '-') : // Remplacer les caractères non alphanumériques par des tirets
        'default';

      bookCard.innerHTML = `
        <div class="card book-card h-100">
          <!-- Zone d'image ou couleur par catégorie -->
          <div class="card-img-top category-color-${categoryClass} text-center py-3 position-relative">
            ${book.categorie || 'Non catégorisé'}
            ${book.typePhysique ? `<span class="badge badge-bookType position-absolute" style="top: 10px; right: 10px;">${book.typePhysique}</span>` : ''}
          </div>
          
          <!-- En-tête avec titre -->
          <div class="card-header border-0 pb-0">
            <h5 class="card-title mb-0">${book.titre || 'Sans titre'}</h5>
          </div>
          
          <!-- Corps de la carte avec informations principales -->
          <div class="card-body d-flex flex-column pt-2">
            <!-- Auteur et éditeur/année -->
            <div class="d-flex justify-content-between align-items-center mb-2">
              <h6 class="card-subtitle mb-0">${book.auteur || 'Auteur inconnu'}</h6>
              <div class="text-end text-muted small">
                ${book.editeur ? `${book.editeur}` : ''}
                ${book.annee ? ` (${book.annee})` : ''}
              </div>
            </div>
            
            <!-- Badge de catégorie -->
            <div class="badges-container mb-2">
              <span class="badge badge-category">${book.categorie || 'Non catégorisé'}</span>
            </div>
            
            <!-- Description avec troncature -->
            <div class="description-container">
              <p class="card-text small">${book.description ? book.description.substring(0, 100) : ''}
                ${book.description && book.description.length > 100 ?
                  `<span>...</span>
                  <button class="btn btn-link btn-sm p-0 show-more">voir plus</button>` : ''}
              </p>
            </div>
            
            <!-- Spacer pour pousser le bouton vers le bas -->
            <div class="flex-grow-1"></div>

            <!-- Métadonnées techniques avec icônes -->
            <div class="metadata-container small text-muted mt-2">
              ${book.isbn ? `<div><i class="fas fa-barcode me-1"></i>ISBN: ${book.isbn}</div>` : ''}
            </div>
            
            <!-- Bouton d'action (disponible ou non) -->
            <button class="btn ${book.estDisponible ? 'btn-borrow' : 'btn-unavailable'} mt-3 borrow-book-btn"
                    data-book-id="${book.id}"
                    ${!book.estDisponible ? 'disabled' : ''}>
              <i class="fas fa-hand-holding"></i> ${book.estDisponible ? 'Emprunter' : 'Non disponible'}
            </button>
          </div>
          
          <!-- Pied de carte avec date d'ajout -->
          <div class="card-footer text-muted small">
            <div class="d-flex justify-content-between">
              <span><i class="fas fa-calendar-plus me-1"></i>${this.formatDate(book.dateAjout)}</span>
              <span><i class="fas fa-map-marker-alt me-1"></i>${book.lieuStockage ? `Caisse ${book.lieuStockage}` : 'Non spécifié'}</span>
            </div>
          </div>
        </div>
      `;
      container.appendChild(bookCard);
    });
  },

  /**
   * Remplit la liste déroulante des livres.
   */
  populateBookDropdown: function() {
    const select = this.elements.bookSelect;
    select.innerHTML = '<option value="">Sélectionnez un livre</option>';

    const allBooks = AppState.getBooks();
    const availableBooks = allBooks.filter(book => book.estDisponible);

    availableBooks.forEach(book => {
      const option = document.createElement('option');
      option.value = book.id;
      option.textContent = `${book.titre} (${book.auteur || 'Auteur inconnu'})`;
      select.appendChild(option);
    });
  },

  /**
   * Remplit les listes déroulantes des catégories.
   */
  populateCategoryDropdowns: function() {
    const categoryFilter = this.elements.categoryFilter;
    const bookCategory = this.elements.bookCategory;

    categoryFilter.innerHTML = '<option value="">Toutes les catégories</option>';
    if (bookCategory) {
      bookCategory.innerHTML = '';
    }

    AppState.getCategories().forEach(category => {
      const filterOption = document.createElement('option');
      filterOption.value = category.nom;
      filterOption.textContent = category.nom;
      categoryFilter.appendChild(filterOption);

      if (bookCategory) {
        const addOption = document.createElement('option');
        addOption.value = category.nom;
        addOption.textContent = category.nom;
        bookCategory.appendChild(addOption);
      }
    });
  },

  /**
   * Affiche les emprunts actifs.
   */
  displayActiveBorrows: function() {
    const container = this.elements.activeBorrowsContainer;
    container.innerHTML = '';

    const borrows = AppState.getActiveBorrows();
    if (borrows.length === 0) {
      container.innerHTML = '<div class="alert alert-info">Aucun emprunt actif.</div>';
      return;
    }

    const table = document.createElement('table');
    table.className = 'table table-striped table-sm';

    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr>
        <th>Livre</th>
        <th>Emprunteur</th>
        <th>Date d'emprunt</th>
        <th>Date de retour prévue</th>
      </tr>
    `;

    const tbody = document.createElement('tbody');
    borrows.forEach(borrow => {
      const row = document.createElement('tr');
      const today = new Date();
      const returnDate = borrow.dateRetourPrevue ? new Date(borrow.dateRetourPrevue) : null;

      let isOverdue = false;
      let formattedReturnDate = "N/A";

      if (returnDate && !isNaN(returnDate.getTime())) {
        isOverdue = today > returnDate;
        formattedReturnDate = this.formatDate(returnDate);
      }

      row.innerHTML = `
        <td data-label="Livre">${borrow.BookTitle || 'Titre inconnu'}</td>
        <td data-label="Emprunteur">${borrow.nomEmprunteur || 'Emprunteur inconnu'}</td>
        <td data-label="Date d'emprunt">${borrow.dateEmprunt ? this.formatDate(borrow.dateEmprunt) : 'N/A'}</td>
        <td data-label="Date de retour prévue" class="${isOverdue ? 'text-danger fw-bold' : ''}">${formattedReturnDate}</td>
      `;
      tbody.appendChild(row);
    });

    table.appendChild(thead);
    table.appendChild(tbody);
    container.appendChild(table);
  },

  /**
   * Remplit la liste déroulante des emprunts.
   */
  populateBorrowDropdown: function() {
    const select = this.elements.borrowSelect;
    select.innerHTML = '<option value="">Sélectionnez un emprunt à retourner</option>';

    AppState.getActiveBorrows().forEach(borrow => {
      const option = document.createElement('option');
      option.value = borrow.id;
      option.textContent = `${borrow.BookTitle || 'Titre inconnu'} - ${borrow.nomEmprunteur || 'Emprunteur inconnu'} (${borrow.dateEmprunt ? this.formatDate(borrow.dateEmprunt) : 'N/A'})`;
      select.appendChild(option);
    });
  },

  /**
   * Affiche un toast de notification.
   * @param {string} title Le titre du toast.
   * @param {string} message Le message du toast.
   * @param {string} type Le type de toast (primary, success, danger, etc.).
   */
  showToast: function(title, message, type = 'primary') {
    const toastEl = this.elements.toastEl;
    const toastTitleEl = this.elements.toastTitle;
    const toastMessageEl = this.elements.toastMessage;

    if (!toastEl || !toastTitleEl || !toastMessageEl) {
      console.error("Éléments du Toast non trouvés. Assurez-vous que initDOMElements a été appelé.");
      console.log(`Toast [${type.toUpperCase()}] ${title}: ${message}`);
      return;
    }

    toastTitleEl.textContent = title;
    toastMessageEl.textContent = message;

    // Gérer les classes de couleur de Bootstrap pour le toast
    const validTypes = ['primary', 'secondary', 'success', 'danger', 'warning', 'info', 'light', 'dark'];
    if (!validTypes.includes(type)) {
      type = 'primary';
    }
    
    // Supprimer les anciennes classes de couleur avant d'ajouter la nouvelle
    validTypes.forEach(vt => toastEl.classList.remove('border-' + vt, 'text-bg-' + vt));
    toastEl.classList.add('border-' + type);

    try {
      const toast = new bootstrap.Toast(toastEl);
      toast.show();
    } catch (e) {
      console.error("Erreur lors de l'affichage du toast Bootstrap:", e);
      alert(`${title}: ${message}`);
    }
  },

  /**
   * Met à jour l'état d'un bouton (chargement/normal).
   * @param {HTMLElement} buttonElement Le bouton à mettre à jour.
   * @param {boolean} isLoading Indique si le bouton est en état de chargement.
   * @param {string} loadingText Le texte à afficher pendant le chargement.
   * @param {string} defaultHTML Le HTML par défaut du bouton.
   */
  updateButtonState: function(buttonElement, isLoading, loadingText = "Traitement...", defaultHTML) {
    if (!buttonElement) return;
    
    if (isLoading) {
      buttonElement.disabled = true;
      buttonElement.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> ${loadingText}`;
    } else {
      buttonElement.disabled = false;
      buttonElement.innerHTML = defaultHTML || buttonElement.getAttribute('data-original-html') || "Submit";
    }
  },

  /**
   * Affiche ou masque la vue d'administration.
   * @param {boolean} isLoggedIn Indique si l'utilisateur est connecté en tant qu'admin.
   */
  toggleAdminView: function(isLoggedIn) {
    if (isLoggedIn) {
      this.elements.adminLoginForm.style.display = 'none';
      this.elements.adminContent.style.display = 'block';
    } else {
      this.elements.adminLoginForm.style.display = 'block';
      this.elements.adminContent.style.display = 'none';
      
      // Vider les champs de connexion
      if (this.elements.adminEmail) {
        this.elements.adminEmail.value = '';
      }
      if (this.elements.adminPassword) {
        this.elements.adminPassword.value = '';
      }
    }
  },

  /**
   * Affiche les détails d'un livre sélectionné.
   * @param {Object} book Le livre à afficher.
   */
  displaySelectedBook: function(book) {
    if (!book) {
      this.elements.selectedBookInfo.classList.add('d-none');
      this.elements.selectedBookId.value = '';
      return;
    }

    // Afficher les détails du livre sélectionné
    this.elements.selectedBookInfo.classList.remove('d-none');
    this.elements.selectedBookId.value = book.id;

    // Convertir la catégorie en classe CSS valide
    const categoryClass = book.categorie ? 
      book.categorie.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, '-') : 
      'default';

    this.elements.selectedBookDetails.innerHTML = `
      <div class="position-relative mb-3 py-2 text-center category-color-${categoryClass}">
        ${book.categorie || 'Non catégorisé'}
        ${book.typePhysique ? `<span class="badge badge-bookType position-absolute" style="top: 10px; right: 10px;">${book.typePhysique}</span>` : ''}
      </div>
      <h5>${book.titre || 'Sans titre'}</h5>
      <div class="d-flex justify-content-between align-items-center mb-2">
        <h6 class="text-muted mb-0">${book.auteur || 'Auteur inconnu'}</h6>
        <div class="text-end text-muted small">
          ${book.editeur ? `${book.editeur}` : ''}
          ${book.annee ? ` (${book.annee})` : ''}
        </div>
      </div>
      <p>
        <span class="badge badge-category">${book.categorie || 'Non catégorisé'}</span>
      </p>
      <p>${book.description ? book.description.substring(0, 150) + (book.description.length > 150 ? '...' : '') : ''}</p>
      ${book.isbn ? `<p class="small text-muted"><i class="fas fa-barcode me-1"></i> ISBN: ${book.isbn}</p>` : ''}
      ${book.lieuStockage ? `<p class="small text-muted"><i class="fas fa-map-marker-alt me-1"></i> Caisse ${book.lieuStockage}</p>` : ''}
    `;
  },

  /**
   * Affiche un indicateur de chargement dans un conteneur.
   * @param {HTMLElement} container Le conteneur où afficher l'indicateur.
   */
  showLoadingIndicator: function(container) {
    // Sauvegarder le contenu original du conteneur
    container.setAttribute('data-original-content', container.innerHTML);
    
    // Afficher l'indicateur de chargement
    container.innerHTML = `
      <div class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Chargement...</span>
        </div>
        <p class="mt-2">Chargement en cours...</p>
      </div>
    `;
  },

  /**
   * Masque l'indicateur de chargement et restaure le contenu original.
   * @param {HTMLElement} container Le conteneur où masquer l'indicateur.
   */
  hideLoadingIndicator: function(container) {
    // Restaurer le contenu original si disponible
    const originalContent = container.getAttribute('data-original-content');
    if (originalContent) {
      container.innerHTML = originalContent;
      container.removeAttribute('data-original-content');
    }
  }
};