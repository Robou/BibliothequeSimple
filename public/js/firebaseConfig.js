/**
 * Configuration Firebase pour l'application Bibliothèque
 * 
 * Ce fichier contient la configuration Firebase et initialise les services Firebase nécessaires.
 * Remplacez les valeurs de configuration par celles de votre projet Firebase.
 */

// Configuration Firebase
// Remplacez ces valeurs par celles de votre projet Firebase
// Vous pouvez trouver ces valeurs dans la console Firebase > Paramètres du projet > Général > Vos applications
const firebaseConfig = {
  apiKey: "AIzaSyCbis9w1QKy7sRaxIro6KFgCUrxmAegY1M",
  authDomain: "bibliothequesimple.firebaseapp.com",
  projectId: "bibliothequesimple",
  storageBucket: "bibliothequesimple.appspot.com",
  messagingSenderId: "187222591594",
  appId: "1:187222591594:web:0bcfc4fc64c4ac9a4b6213"
};

// Initialiser Firebase
firebase.initializeApp(firebaseConfig);

// Initialiser les services Firebase
const auth = firebase.auth();
const db = firebase.firestore();
const functions = firebase.functions();

// Configuration de Firestore
db.settings({
  cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
});

// Activer la persistance hors ligne pour Firestore
db.enablePersistence({ synchronizeTabs: true })
  .then(() => {
    console.log("Persistance Firestore activée");
  })
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      // Plusieurs onglets ouverts, la persistance ne peut être activée que dans un seul onglet
      console.warn("La persistance ne peut être activée que dans un seul onglet à la fois");
    } else if (err.code === 'unimplemented') {
      // Le navigateur ne prend pas en charge la persistance
      console.warn("Ce navigateur ne prend pas en charge la persistance hors ligne");
    } else {
      console.error("Erreur lors de l'activation de la persistance:", err);
    }
  });

// Configuration de l'authentification
auth.useDeviceLanguage(); // Utiliser la langue du navigateur

// Vérifier si l'utilisateur est connecté
let currentUser = null;
auth.onAuthStateChanged((user) => {
  currentUser = user;
  if (user) {
    console.log("Utilisateur connecté:", user.email);
    // Vérifier si l'utilisateur est un administrateur
    user.getIdTokenResult()
      .then((idTokenResult) => {
        const isAdmin = idTokenResult.claims.admin === true;
        if (isAdmin) {
          console.log("L'utilisateur est un administrateur");
        } else {
          console.log("L'utilisateur n'est pas un administrateur");
        }
        // Déclencher un événement personnalisé pour informer l'application du changement d'état
        document.dispatchEvent(new CustomEvent('userAuthStateChanged', { 
          detail: { user, isAdmin } 
        }));
      });
  } else {
    console.log("Utilisateur déconnecté");
    // Déclencher un événement personnalisé pour informer l'application du changement d'état
    document.dispatchEvent(new CustomEvent('userAuthStateChanged', { 
      detail: { user: null, isAdmin: false } 
    }));
  }
});

// Fonction pour vérifier si l'utilisateur actuel est un administrateur
function isCurrentUserAdmin() {
  return new Promise((resolve, reject) => {
    const user = auth.currentUser;
    if (!user) {
      resolve(false);
      return;
    }
    
    user.getIdTokenResult()
      .then((idTokenResult) => {
        resolve(idTokenResult.claims.admin === true);
      })
      .catch((error) => {
        console.error("Erreur lors de la vérification des droits admin:", error);
        resolve(false);
      });
  });
}
