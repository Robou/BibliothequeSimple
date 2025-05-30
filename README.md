# Bibliothèque Club Alpin - Application Firebase

Cette application de gestion de bibliothèque pour le Club Alpin est une migration de l'application originale Google Apps Script vers Firebase. Elle permet aux membres du club de consulter le catalogue de livres, d'emprunter et de retourner des ouvrages, et aux administrateurs de gérer le catalogue.

## Fonctionnalités

- Consultation du catalogue de livres
- Recherche et filtrage des livres
- Emprunt de livres (sans création de compte utilisateur)
- Retour de livres
- Administration du catalogue (protégée par mot de passe)
- Fonctionnement hors ligne (grâce à la persistance Firestore)

## Structure du projet

```
├── firebase.json           # Configuration Firebase
├── firestore.rules         # Règles de sécurité Firestore
├── firestore.indexes.json  # Index Firestore
├── storage.rules           # Règles de sécurité Storage
├── functions/              # Cloud Functions
│   └── index.js            # Fonctions Cloud
└── public/                 # Application web
    ├── index.html          # Page principale
    ├── css/
    │   └── style.css       # Styles CSS
    └── js/
        ├── app.js          # Point d'entrée de l'application
        ├── firebaseConfig.js # Configuration Firebase
        ├── controllers/
        │   └── appController.js # Contrôleur principal
        ├── models/
        │   └── appState.js # Modèle de données
        ├── services/
        │   └── firebaseService.js # Service Firebase
        └── views/
            └── uiManager.js # Gestionnaire d'interface utilisateur
```

## Prérequis

- Node.js et npm
- Firebase CLI (`npm install -g firebase-tools`)
- Un compte Firebase avec un projet créé

## Installation

1. Clonez ce dépôt :
   ```bash
   git clone https://github.com/votre-utilisateur/bibliotheque-club-alpin.git
   cd bibliotheque-club-alpin
   ```

2. Installez les dépendances :
   ```bash
   # Pour les Cloud Functions
   cd functions
   npm install
   cd ..
   ```

3. Configurez Firebase :
   - Créez un projet Firebase dans la [console Firebase](https://console.firebase.google.com/)
   - Connectez-vous à Firebase CLI :
     ```bash
     firebase login
     ```
   - Initialisez le projet avec votre projet Firebase :
     ```bash
     firebase use --add
     ```
   - Modifiez le fichier `public/js/firebaseConfig.js` avec les informations de votre projet Firebase

## Migration des données

Pour migrer les données de Google Sheets vers Firebase, utilisez le script de migration fourni :

1. Créez un dossier pour le script de migration :
   ```bash
   mkdir migration-script
   cd migration-script
   npm init -y
   npm install firebase-admin googleapis
   ```

2. Copiez le contenu du fichier `SCRIPT_MIGRATION.md` dans un fichier `migration.js`

3. Obtenez une clé de service Firebase :
   - Allez dans la console Firebase > Paramètres du projet > Comptes de service
   - Cliquez sur "Générer une nouvelle clé privée"
   - Enregistrez le fichier JSON sous le nom `serviceAccountKey.json` dans le même dossier que le script

4. Configurez l'accès à l'API Google Sheets :
   - Allez dans la console Google Cloud > APIs & Services > Credentials
   - Créez une clé d'API ou un compte de service avec accès à l'API Google Sheets
   - Enregistrez les credentials sous le nom `google-credentials.json` dans le même dossier que le script

5. Modifiez la variable `spreadsheetId` dans le script pour correspondre à l'ID de votre feuille Google Sheets

6. Exécutez le script :
   ```bash
   node migration.js
   ```

## Déploiement

1. Déployez les règles et index Firestore :
   ```bash
   firebase deploy --only firestore:rules
   firebase deploy --only firestore:indexes
   ```

2. Déployez les Cloud Functions :
   ```bash
   firebase deploy --only functions
   ```

3. Déployez l'application web :
   ```bash
   firebase deploy --only hosting
   ```

4. Ou déployez tout en une seule commande :
   ```bash
   firebase deploy
   ```

## Développement local

1. Lancez les émulateurs Firebase :
   ```bash
   firebase emulators:start
   ```

2. Accédez à l'application à l'adresse [http://localhost:5000](http://localhost:5000)

## Configuration de l'authentification administrateur

1. Créez un utilisateur administrateur dans Firebase Authentication :
   - Allez dans la console Firebase > Authentication > Users
   - Cliquez sur "Add user" et créez un utilisateur avec email et mot de passe

2. Attribuez le rôle d'administrateur à l'utilisateur :
   - Allez dans la console Firebase > Functions > Logs
   - Exécutez la fonction suivante dans les logs (remplacez l'email par celui de votre administrateur) :
     ```javascript
     const addAdminRole = firebase.functions().httpsCallable('addAdminRole');
     addAdminRole({ email: 'admin@example.com' }).then(result => {
       console.log(result);
     });
     ```
   - Ou utilisez Firebase Admin SDK pour définir les claims utilisateur manuellement

## Personnalisation

- Modifiez les fichiers HTML, CSS et JavaScript dans le dossier `public/` pour personnaliser l'interface utilisateur
- Modifiez les Cloud Functions dans le dossier `functions/` pour personnaliser la logique métier
- Modifiez les règles de sécurité dans `firestore.rules` pour personnaliser les autorisations

## Licence

Ce projet est sous licence MIT. Voir le fichier LICENSE pour plus de détails.