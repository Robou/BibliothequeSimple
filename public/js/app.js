/**
 * Point d'entrée principal de l'application Bibliothèque Club Alpin
 * 
 * Ce fichier initialise l'application et configure les écouteurs d'événements.
 */

// Attendre que le DOM soit chargé
document.addEventListener('DOMContentLoaded', function() {
  // Initialiser l'application
  AppController.init();
  
  console.log("Application Bibliothèque Club Alpin initialisée");
});

// Écouter les événements d'authentification
document.addEventListener('userAuthStateChanged', function(event) {
  const { user, isAdmin } = event.detail;
  
  // Mettre à jour l'interface utilisateur en fonction de l'état d'authentification
  if (user && isAdmin) {
    // L'utilisateur est connecté en tant qu'administrateur
    UIManager.toggleAdminView(true);
  } else {
    // L'utilisateur n'est pas connecté ou n'est pas administrateur
    UIManager.toggleAdminView(false);
  }
});

// Gestion des erreurs globales
window.addEventListener('error', function(event) {
  console.error('Erreur globale:', event.error);
  
  // Afficher un message d'erreur à l'utilisateur
  UIManager.showToast('Erreur', 'Une erreur est survenue: ' + event.error.message, 'danger');
  
  // Empêcher l'affichage de l'erreur dans la console du navigateur
  event.preventDefault();
});

// Gestion des promesses rejetées non gérées
window.addEventListener('unhandledrejection', function(event) {
  console.error('Promesse rejetée non gérée:', event.reason);
  
  // Afficher un message d'erreur à l'utilisateur
  UIManager.showToast('Erreur', 'Une erreur est survenue: ' + event.reason.message, 'danger');
  
  // Empêcher l'affichage de l'erreur dans la console du navigateur
  event.preventDefault();
});

// Gestion de l'état de connexion
window.addEventListener('online', function() {
  console.log('Application en ligne');
  UIManager.showToast('Connexion', 'Vous êtes de nouveau en ligne', 'success');
  
  // Synchroniser les données
  AppController.syncData();
});

window.addEventListener('offline', function() {
  console.log('Application hors ligne');
  UIManager.showToast('Connexion', 'Vous êtes hors ligne. Les modifications seront synchronisées lorsque vous serez de nouveau en ligne.', 'warning');
});

// Vérifier l'état de connexion au chargement
if (navigator.onLine) {
  console.log('Application en ligne au chargement');
} else {
  console.log('Application hors ligne au chargement');
  UIManager.showToast('Connexion', 'Vous êtes hors ligne. Certaines fonctionnalités peuvent être limitées.', 'warning');
}