# Todo Amélioré

Application web permettant aux parents de créer et suivre des tâches quotidiennes pour leurs enfants. Le projet comprend :

- **Un back-end Node.js** léger qui expose des endpoints REST (inscription/connexion, gestion des tâches, suivi quotidien).
- **Un front-end React sans bundler** (chargé depuis des CDN) qui propose une interface moderne pour les parents et les enfants.

## Aperçu fonctionnel

### Côté parents
- Inscription / connexion.
- Ajout d'enfants (lors de l'inscription d'un enfant, on saisit l'identifiant du parent).
- Création de tâches quotidiennes pour chacun des enfants.
- Visualisation de l'état d'avancement de la journée pour tous les enfants.
- Notification (console du serveur) lorsque toutes les tâches d'un enfant sont complétées dans la journée.

### Côté enfants
- Inscription / connexion.
- Liste des tâches du jour attribuées par leurs parents.
- Possibilité de marquer une tâche comme terminée (mise à jour en temps réel côté parent après rafraîchissement des données).

### Réinitialisation quotidienne
Les tâches sont automatiquement considérées comme « à faire » chaque jour. Les statuts sont enregistrés avec la date du jour, ce qui permet de repartir d'une feuille blanche à minuit.

## Lancement du projet

Ouvrez deux terminaux :

### 1. API Node.js (port 4000)
```bash
cd backend
npm run start
```
L'API s'exécute avec les endpoints décrits plus bas. Les données sont stockées en mémoire (idéal pour le prototypage).

### 2. Front-end React (port 5173)
```bash
cd frontend
npm run start
```
Le serveur statique intégré diffuse `public/index.html`. L'interface charge React et Babel via CDN, il suffit ensuite d'ouvrir [http://localhost:5173](http://localhost:5173).

## Endpoints principaux

| Méthode | Endpoint | Rôle | Description |
| ------- | -------- | ---- | ----------- |
| POST | `/auth/register` | parent/enfant | Inscription avec rôle (`parent` ou `child`). Les enfants doivent fournir `parentId`. |
| POST | `/auth/login` | parent/enfant | Connexion, renvoie un token à utiliser dans le header `Authorization`. |
| GET | `/auth/me` | authentifié | Retourne l'utilisateur courant. |
| GET | `/mock-parents` | public | Liste des parents existants (pratique pour récupérer un `parentId` lors d'un test). |
| GET | `/children` | parent | Liste les enfants rattachés au parent connecté. |
| GET | `/tasks` | parent/enfant | Liste des tâches visibles par l'utilisateur (ses enfants ou lui-même).
| POST | `/tasks` | parent | Création d'une nouvelle tâche pour l'un de ses enfants. |
| PATCH | `/tasks/:taskId` | enfant | Marque une tâche comme complétée pour la journée. |
| GET | `/progress` | parent/enfant | Vue synthétique de la progression quotidienne. |

## Structure du dépôt

```
backend/
  src/
    dataStore.js      # gestion in-memory des utilisateurs, tâches et statuts
    server.js         # serveur HTTP (auth, tâches, progression)
frontend/
  public/
    app.js            # composition de l'UI React
    styles.css        # styles modernes pour l'interface
    hooks/useAuth.js  # gestion de l'auth côté front
    components/       # formulaires d'auth, tableaux de bord parent/enfant
  server.js           # serveur statique simple
```

## Limitations et prochaines étapes
- Les données sont volatiles (stockées en mémoire). Pour un environnement de production, ajoutez une base de données persistante.
- L'authentification utilise des tokens en mémoire. Un passage à JWT ou à une solution de session sécurisée est recommandé.
- Les notifications sont actuellement des logs serveur. Il est possible de les transformer en e-mails, SMS ou notifications push.

Ce squelette fournit une base fonctionnelle pour itérer rapidement sur les fonctionnalités demandées.
