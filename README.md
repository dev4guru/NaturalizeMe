# NaturalizeMe - Plateforme de Préparation à la Naturalisation Française

## 🇫🇷 Description

NaturalizeMe est une plateforme web moderne et interactive conçue pour aider les candidats à se préparer efficacement aux 200 questions officielles de l'entretien de naturalisation française. 

## ✨ Fonctionnalités

### 🎯 Quiz Interactifs
- **200 questions officielles** organisées par catégories
- **Modes de quiz variés** : entraînement, examen, révision
- **Feedback immédiat** avec explications détaillées
- **Timer optionnel** pour simuler les conditions d'examen
- **Progression en temps réel** avec indicateurs visuels

### 📊 Suivi Personnalisé
- **Dashboard complet** avec statistiques détaillées
- **Analyse par catégorie** (Institutions, Histoire, Géographie, Culture)
- **Graphiques de progression** sur 7 jours
- **Badges et achievements** pour la motivation
- **Système de favoris** pour marquer les questions importantes

### 🎨 Design Moderne
- **Interface épurée** et intuitive
- **Design responsive** optimisé mobile/tablet/desktop
- **Mode sombre/clair** avec basculement automatique
- **Animations fluides** et micro-interactions
- **Palette de couleurs** inspirée du drapeau français

### 🔐 Fonctionnalités Avancées
- **Authentification sécurisée** avec JWT
- **Progression sauvegardée** automatiquement
- **Mode offline** avec Service Worker
- **Progressive Web App** (installable)
- **Analytics détaillés** pour optimiser l'apprentissage

## 🛠️ Technologies

### Frontend
- **HTML5** - Structure sémantique
- **CSS3** - Animations et layouts modernes
- **Tailwind CSS** - Framework utility-first
- **JavaScript ES6+** - Logique métier
- **Alpine.js** - Réactivité légère
- **Vite** - Build tool ultra-rapide

### Backend
- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web minimaliste
- **MongoDB** - Base de données NoSQL
- **Mongoose** - ODM pour MongoDB
- **JWT** - Authentification stateless
- **Winston** - Logging professionnel

### Sécurité & Performance
- **Helmet.js** - Headers de sécurité
- **Rate limiting** - Protection contre les abus
- **CORS** - Gestion des origines
- **Compression** - Optimisation des réponses
- **Validation** - Joi pour la validation des données

## 🚀 Installation et Démarrage

### Prérequis
- Node.js (v18+ recommandé)
- MongoDB (local ou MongoDB Atlas)
- Git

### Installation
```bash
# Cloner le repository
git clone https://github.com/votre-username/naturalizeme.git
cd naturalizeme

# Installer toutes les dépendances
npm run install:all

# Copier les variables d'environnement
cp backend/.env.example backend/.env
# Éditer backend/.env avec vos configurations
```

### Configuration
1. **Base de données** : Configurez `MONGODB_URI` dans `.env`
2. **JWT Secret** : Générez une clé secrète forte pour `JWT_SECRET`
3. **URLs** : Ajustez `FRONTEND_URL` et `BACKEND_URL` selon vos besoins

### Développement
```bash
# Démarrer en mode développement (frontend + backend)
npm run dev

# Ou séparément :
npm run dev:frontend  # Frontend sur http://localhost:3000
npm run dev:backend   # Backend sur http://localhost:5000
```

### Production
```bash
# Build du frontend
npm run build

# Démarrer le serveur
npm start
```

## 📁 Structure du Projet

```
naturalizeme/
├── frontend/                 # Application frontend
│   ├── index.html           # Point d'entrée HTML
│   ├── js/
│   │   └── app.js          # Logique Alpine.js
│   ├── assets/
│   │   └── styles/
│   │       └── main.css    # Styles Tailwind
│   ├── vite.config.js      # Configuration Vite
│   └── package.json        # Dépendances frontend
│
├── backend/                  # API Backend
│   ├── src/
│   │   ├── server.js       # Point d'entrée serveur
│   │   ├── models/         # Modèles Mongoose
│   │   ├── routes/         # Routes Express
│   │   ├── middleware/     # Middlewares personnalisés
│   │   ├── validations/    # Schémas de validation Joi
│   │   ├── services/       # Services métier
│   │   └── utils/          # Utilitaires
│   ├── data/               # Données initiales
│   └── package.json        # Dépendances backend
│
└── package.json             # Scripts de gestion globale
```

## 🎮 Utilisation

### 🏠 Page d'Accueil
- **Statistiques générales** du site
- **Call-to-action** pour commencer un quiz
- **Présentation** des fonctionnalités

### 🎯 Système de Quiz
- **Sélection des questions** par catégorie/difficulté
- **Interface question/réponse** intuitive
- **Navigation** fluide entre les questions
- **Résultats détaillés** à la fin

### 📈 Tableau de Bord
- **Cartes statistiques** : questions répondues, taux de réussite, temps moyen
- **Graphique de progression** des 7 derniers jours
- **Progression par catégorie** avec détails
- **Badges obtenus** et objectifs

### ⚙️ Fonctionnalités Utilisateur
- **Profil personnalisable** avec informations
- **Préférences** de quiz et d'affichage
- **Questions favorites** sauvegardées
- **Historique** des sessions

## 🔧 API Endpoints

### Authentification
```
POST /api/auth/register     # Inscription
POST /api/auth/login        # Connexion
GET  /api/auth/profile      # Profil utilisateur
PUT  /api/auth/profile      # Mise à jour profil
POST /api/auth/logout       # Déconnexion
```

### Quiz
```
GET  /api/quiz/questions    # Liste des questions
GET  /api/quiz/categories   # Catégories disponibles
POST /api/quiz/session      # Créer une session
POST /api/quiz/answer       # Soumettre une réponse
GET  /api/quiz/stats        # Statistiques globales
```

### Utilisateur
```
GET  /api/user/progress     # Progression utilisateur
POST /api/user/favorites    # Gérer les favoris
GET  /api/user/statistics   # Statistiques détaillées
```

## 🎨 Design System

### Couleurs
- **Primaire** : Bleu (#3b82f6) - Inspiré du drapeau français
- **Accent** : Rouge (#ef4444) - Pour les actions importantes
- **Neutre** : Grays (#f9fafb à #111827) - Textes et backgrounds
- **Sémantique** : Vert (succès), Orange (attention), Rouge (erreur)

### Typographie
- **Famille** : Inter (moderne et lisible)
- **Échelle** : 0.75rem à 2.25rem
- **Poids** : 300 à 700

### Composants
- **Boutons** : 4 variantes (primary, secondary, outline, ghost)
- **Cards** : Design avec ombres subtiles et bordures arrondies
- **Inputs** : States focus/error avec transitions
- **Badges** : Couleurs sémantiques
- **Progress bars** : Animations fluides

## 📱 Responsive Design

### Breakpoints
- **Mobile** : 320px - 768px (design mobile-first)
- **Tablet** : 768px - 1024px
- **Desktop** : 1024px+

### Optimisations Mobile
- **Navigation hamburger** sur mobile
- **Swipe gestures** pour la navigation
- **Touch-friendly** boutons et zones tactiles
- **PWA** installable sur mobile

## 🔒 Sécurité

### Authentification
- **JWT tokens** avec expiration
- **Bcrypt** pour le hashing des mots de passe
- **Rate limiting** sur les tentatives de connexion
- **Validation** stricte des inputs

### Protection
- **Helmet.js** pour les headers de sécurité
- **CORS** configuré restrictif
- **Validation** côté serveur avec Joi
- **Sanitisation** des données utilisateur

## 📊 Performance

### Frontend
- **Lazy loading** des ressources
- **Code splitting** avec Vite
- **Compression** des assets
- **Cache** stratégique

### Backend
- **Connection pooling** MongoDB
- **Compression** gzip
- **Caching** des réponses fréquentes
- **Optimisation** des requêtes DB

## 🧪 Tests

```bash
# Tests backend
cd backend && npm test

# Tests avec coverage
cd backend && npm run test:coverage

# Tests en mode watch
cd backend && npm run test:watch
```

## 🚀 Déploiement

### Frontend (Vercel/Netlify)
```bash
npm run build
# Déployer le dossier frontend/dist
```

### Backend (Heroku/Railway)
```bash
# Configurer les variables d'environnement
# Déployer le dossier backend
```

### Base de Données (MongoDB Atlas)
- Créer un cluster MongoDB Atlas
- Configurer les règles de sécurité
- Importer les données initiales

## 🤝 Contribution

1. **Fork** le projet
2. **Créer** une branche feature (`git checkout -b feature/AmazingFeature`)
3. **Commit** vos changements (`git commit -m 'Add some AmazingFeature'`)
4. **Push** vers la branche (`git push origin feature/AmazingFeature`)
5. **Ouvrir** une Pull Request

## 📄 License

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 👥 Équipe

- **Développement Frontend** : HTML/CSS/JS + Tailwind
- **Développement Backend** : Node.js + Express + MongoDB
- **Design UX/UI** : Interface moderne et intuitive
- **DevOps** : Déploiement et monitoring

## 📞 Support

- **Email** : support@naturalizeme.fr
- **Documentation** : [docs.naturalizeme.fr](https://docs.naturalizeme.fr)
- **Issues** : [GitHub Issues](https://github.com/votre-username/naturalizeme/issues)

## 🎯 Roadmap

### Version 1.1
- [ ] Mode multijoueur avec classements
- [ ] Questions audio pour la compréhension orale
- [ ] Système de parrainage
- [ ] Application mobile native

### Version 1.2
- [ ] Intelligence artificielle pour suggestions personnalisées
- [ ] Intégration calendrier pour planification
- [ ] Mode coach virtuel
- [ ] Statistiques avancées avec ML

---

**🎉 Bonne préparation pour votre naturalisation française !**
