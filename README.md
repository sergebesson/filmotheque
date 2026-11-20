# filmotheque

Présentation de mes films

Les [choix d’architecture et limites connues](docs/architecture.md) complètent
les commandes et la documentation de développement ci-dessous.

La [procédure de sauvegarde et de reprise LMDB](docs/reprise-lmdb.md) décrit
la protection des données, la restauration et le retour au stockage JSON.

<!-- TOC -->

- [Documentation sur le développement](#documentation-sur-le-développement)
  - [L'arborescence de 1er niveau](#larborescence-de-1er-niveau)
  - [Le serveur](#le-serveur)
    - [L'arborescence des sources](#larborescence-des-sources)
    - [server.js](#serverjs)
    - [Les stores](#les-stores)
    - [l'API](#lapi)
      - [l'arborescence](#larborescence)
      - [api.js](#apijs)
      - [module API](#module-api)
    - [le context](#le-context)
  - [www le client Vue 3 compilé](#www-le-client-vue-3-compilé)
    - [L'arborescence des sources](#larborescence-des-sources-1)
    - [Structure de la page](#structure-de-la-page)
    - [Les stores](#les-stores-1)
    - [Installation et démarrage](#installation-et-démarrage)
    - [Vérifications](#vérifications)

<!-- /TOC -->

## Documentation sur le développement

### L'arborescence de 1er niveau

* **data** : Contient les données de base (fichier de conf, certificat ssl de test, etc ...). n'est pas utilisé en production
* **scripts** : contient les scripts par exemple de migration.
* **server** : contient le code source du serveur (backend)
* **www** : contient le code source de l'interface utilisateur (frontend)

l'`index.js` ne fait que lancer le serveur.

### Le serveur

Les sources du serveurs se trouve donc dans le répertoire `server`.

#### L'arborescence des sources

* **api** : Contient les sources de l'api url `/api`
* **authentification** : router express gérant l'authentification
* **public** : router express gérant les pages publiques (ne réclamant pas d'authentification)
* **services** : Services générales
* **static** : router express délivrant les pages statiques du site (il faut être authentifié pour recevoir ces pages)
* **stores** : Gestion des différents store de donnée.

#### server.js

Démarre le serveur après l'avoir initialisé.

Pour cela voici les actions qu'il effectue :

1. Initialisation du context
    * Chargement de la configuration
    * Initialisation le logger
    * Ouverture de l’environnement LMDB partagé
    * Initialisation des stores
1. Initialisation de middleware ou router
    * compression des réponses
    * Validation de l'url d'appel
    * gestion du favicon
    * gestion des pages publiques
    * authentification
    * gestion des pages statiques
    * gestion de l'API
    * gestion des erreurs
1. Lancement du serveur
1. Gestion de l'arrêt HTTP puis de LMDB sur SIGINT et SIGTERM ; SIGUSR1 redémarre seulement HTTP

#### Les stores

On trouve les stores dans le répertoire `/stores`.

Le nom du fichier javascript doit d'être du style `<name>.store.js` et doit exporter une class du même nom (`<name>Store`) mais avec la 1ere lettre en majuscule.

Exemple, pour le store `movies` le fichier source est `movies.store.js` et export la class `MoviesStore`.

Cette class recevra, lors de son constructeur, le context (avec la configuration et le logger) et devra contenir une méthode `initialize()` permettant d'initialiser le store.

Les stores seront instanciés automatiquement par `server.js` et leur méthode `initialize()` sera exécutée.

L'instance sera ensuite mis dans le context.

#### l'API

##### l'arborescence

* **modules** : contient le code d'un module
* **openapi** : Fichier yml d'openapi globale à l'API
* **services** : service général de l'API

##### api.js

Génère le router express de l'api.

Pour cela il met en place les routes suivantes pour le chemin `/api` :

* **\<all>** : contrôle api via openapi (utilisation de `express-openapi-validator`, `swagger-parser`)
* **/** : Accès à la documentation openapi (utilisation de `swagger-ui-express`)
* **/\<modules>** : Mise en place du router des modules avec le control des droits admin
* **Gestion d'erreur** : Mise en place des middleware d'erreur (erreur openapi et générale)

##### module API

Un module API correspond aux routes du chemin `/api/<module>`.

Les sources des modules se trouve dans le répertoire `server/api/modules/<module>`

On doit trouver à la racine du répertoire du module un fichier `<module>.module.js`

Ce dernier doit exporter deux propriétés :

* **authorizedRoutes** : doit être un object contenant deux propriétés :
  * **admin** : array de regExp des routes accessible que par l'admin
  * **all** : array de regExp des routes accessible par tous les utilisateurs
* **routerFactory** : function recevant le context et retournant un router express contenant les routes du module.

On doit trouver également à la racine du module un répertoire `openapi` qui devra contenir au moins le fichier `openapi.yml` qui devra contenir les `tags` et `paths` spécifique au module.

#### le context

Le context contient :

* **configLoader** : object de type ConfigLoader (`@sbesson/configuration-loader`) permettant de récupérer les options de configuration.
* **logger** : logger (`winston`)
* **database** : environnement LMDB partagé par les stores.
* **\<store>** : Accès à l'instance des stores.

### www le client Vue 3 compilé

Le serveur sert uniquement le client compilé dans `www/dist`.

Le client utilise Vue 3, Vue Router 5, Vuetify et Vuelidate 2, avec des composants
`.vue` compilés par Vite. Les templates ne sont plus compilés dans le navigateur.
L'Options API (`data`, `computed`, `watch`, `methods`) est conservée. Les styles
propres aux composants sont dans leurs `.vue` ; les styles communs restent dans
`modules/filmotheque/filmotheque.css`.

#### L'arborescence des sources

* **common** : module vuejs commun à tous
* **modules** : module vuejs
* **stores** : les stores
* **app.js** : le module de lancement de l'application et lancement vuejs
* **eventBus.js** : Bus d'événement global à toute l'application, utilisant mitt
* **public** : page d'erreur et icône de l'application, copiées à la racine de `dist`
* **index.html** : Page principal de l'application
* **dist** : client compilé servi par Express, non versionné

#### Structure de la page

```text
----------------------------------------------------
| ------- ---------------------------- ----------- |
| | nav | |   tools bar route view   | | profile | |
| ------- ---------------------------- ----------- |
|                                                  |
| ------------------------------------------------ |
| |                                              | |
| |                                              | |
| |                                              | |
| |                                              | |
| |               main route view                | |
| |                                              | |
| |                                              | |
| |                                              | |
| ------------------------------------------------ |
----------------------------------------------------
```

Cette structure est géré par le module principal `filmotheque`.
Chaque route doit définir une tools bar de la rubrique et bien-sur l'affichage principal de la rubrique dans le main route view.

#### Les stores

Les stores restent des objets singletons de données récupérées via l'API REST,
avec un `state` rendu réactif par `reactive()`. Ils sont référencés dans le `data`
des composants pour mettre à jour l'affichage dès qu'une donnée change.

#### Installation et démarrage

Le développement (installation, lint, compilation et tests) utilise **Node 24 ≥24.11** ;
`.nvmrc` permet de sélectionner cette branche avec `nvm use` après `nvm install`.
Le manifeste client exige **22.x à partir de 22.22, ou ≥24.11**, conformément aux
dépendances d'outillage de Vue Router 5. Le manifeste du serveur conserve
**20.x à partir de 20.19, ou ≥22.12** pour servir un client déjà compilé ;
`npm start` reconstruit le client et nécessite donc le Node d'outillage.
Le client dispose de ses propres dépendances et de son propre `package-lock.json`,
dans `www`, séparément des dépendances du serveur à la racine.

```sh
npm install
npm start
```

`npm install` (ou `npm i`) à la racine installe aussi les dépendances de `www`
grâce au script `postinstall`. `npm ci` à la racine déclenche également ce script,
qui exécute `npm install` dans `www`. Pour réinstaller le client strictement à
partir de son verrou, utiliser `npm run client:install` (`npm --prefix www ci`).
L'option `--ignore-scripts` désactive l'installation automatique du client.

`npm start` compile le client avant de démarrer Express sur `http://localhost:8080`,
avec l'authentification existante. Pour utiliser une configuration spécifique,
exécuter `npm run build` puis `URL_SERVER=localhost node index.js chemin/configuration.json`.

Le stockage est désormais dans le sous-répertoire `filmotheque-lmdb` du
`storage.databaseDirectory` configuré ; ce répertoire est exclu de Git.
**Aucune bascule des données habituelles n’est automatique.** Le démarrage ne
cherche ni ne lit les anciens fichiers JSON des comptes. Si la base de comptes
LMDB est vide, le compte initial existant est créé avec son index dans une
transaction, même si cette base a déjà été utilisée puis vidée. Un échec avant
commit laisse la base vide et permet une reprise au démarrage suivant ; une base
non vide est conservée sans modification.

Le catalogue démarre **vide**. Aucun catalogue JSON n’est lu et aucun
répertoire de vidéos n’est parcouru au démarrage. L’import se déclenche uniquement
par l’opération administrateur `POST /api/movies/initialize`, accessible dans la
documentation interactive `/api` ; le client Vue n’a pas de bouton d’import.
Cet import remplace le catalogue entier, atomiquement : TMDB est
obligatoire et devient aussi `_id`, le premier fichier valide dans l’ordre
lexicographique est retenu en cas de doublon et un inventaire sans film valide
est refusé sans vider la base. L’import différentiel n’est pas implémenté.
Les anciens liens de téléchargement JSON ne sont pas repris.
Les redémarrages conservent le catalogue LMDB existant.

Dans un deuxième terminal, `npm run build:watch` reconstruit le client à chaque
modification. Recharger le navigateur pour voir le résultat ; aucun autre serveur
web n'est nécessaire. Les URL avec hash (`#/movies`, `#/users/list`, etc.) sont conservées.

#### Migration ponctuelle des comptes JSON

Exécuter le script **application arrêtée** sur la destination choisie.
`--config` désigne la configuration de cette destination,
avec les mêmes surcharges d’environnement que l’application, notamment `DB_DIR`.
`--file` désigne le fichier `users.documents.json` au format `json-db` : un objet
indexé par login dont chaque document contient le même `name` et son `password`.
L’ancien format historique avec `passwd` n’est plus pris en charge.

```sh copy Copy User Migration
node scripts/migration_users.js --config /chemin/configuration.json --file /chemin/source/users.documents.json
```

La migration suppose une destination cohérente entre comptes et index, comme le
garantissent les transactions du store ; elle ne réalise pas d’audit préalable de
l’index. Le contrôle préalable compte uniquement les comptes : la base doit être
vide, avec une seule exception pour le compte initial `serge`, strictement inchangé,
qui peut être remplacé après un premier démarrage. Tous ses champs doivent
correspondre aux valeurs initiales, mot de passe compris. Le script
supprime ce compte et son index puis importe les comptes JSON dans la même
transaction ; un échec avant commit restaure l’état initial. Le compte importé
reçoit un nouvel UUID, comme les autres comptes migrés.

Tout compte modifié ou autre compte entraîne un refus, sans fusion ni écrasement.
Dans ce cas, choisir une nouvelle destination vide ; ne pas
vider une base existante pour contourner le refus. Les films LMDB présents ne sont
pas modifiés. Aucun marqueur ne prouve l’historique du compte initial : si une
migration produit uniquement un compte identique aux valeurs initiales, une relance
reste autorisée et lui attribue un nouvel UUID. Cette exception ne doit donc pas
être utilisée comme mécanisme de mise à jour récurrente.

Le script valide toute la source, conserve exactement noms, mots de passe,
profils, avatars et état actif, sans reprendre `__private__`. Il attribue les UUID
et construit l’index SHA-256 dans une transaction globale, attend la
synchronisation disque puis vérifie les comptes et les comptages des comptes et de
l’index avant de confirmer la réussite. Une source vide, invalide ou incohérente est refusée ;
un échec d’exécution renvoie un code de sortie non nul. Une erreur de confirmation
disque après commit ne signifie pas que les écritures ont été annulées : vérifier
la destination avant toute nouvelle tentative.

**Les fichiers JSON restent inchangés.** Le script ne lit pas le fichier de
structure, ne supprime aucun fichier et n’a aucune option de suppression. Un
éventuel nettoyage est manuel et distinct, après validation de la bascule et
conservation des sauvegardes nécessaires au retour arrière.

Avant le premier import, vérifier que le compte administrateur migré peut se
connecter et que `/api/infos` annonce zéro film sur une destination neuve.
Lancer ensuite l’import manuellement dans `/api`. Comparer le catalogue à
l’inventaire retenu, pas à l’ancien JSON : `date_added` est le jour UTC du `mtime`
courant. Un rapport `success: false` peut accompagner un remplacement effectivement
commité si des films ont été retenus. Vérifier les téléchargements par TMDB.
Voir la [procédure de sauvegarde et de reprise](docs/reprise-lmdb.md) avant toute
intervention sur les données habituelles.

#### Reconstruction de l’index des comptes

`users` reste la source de vérité. En cas d’index `usersByLogin` incomplet ou
incorrect, l’administrateur peut appeler **`POST /api/users/index/rebuild`**, sans
corps de requête, depuis la documentation interactive `/api`. La réponse contient
`number_indexed_users`. Les accès anonymes ou non administrateurs sont refusés.
Le contrôle d’accès utilise le compte identifié par l’authentification de chaque
requête, indépendamment des autres requêtes reçues pendant la lecture du corps JSON.
`GET /api/users/me` utilise aussi cette identité propre à la requête, sans utilisateur
connecté partagé dans le store. Si le compte est supprimé avant la lecture de ses
informations, la réponse est 401, sans divulgation d’un autre compte.

Si l’entrée de l’administrateur est elle-même défectueuse, l’authentification HTTP
ne permet plus cette opération. Utiliser alors le script **application arrêtée** :

```sh copy Copy Login Index Rebuild
node scripts/rebuild_users_login_index.js --config /chemin/configuration.json
```

Vérifier la destination choisie et les surcharges d’environnement, notamment
`DB_DIR`, comme pour la migration. L’arrêt de l’application est un prérequis
opérateur, pas un arrêt effectué par le script. Aucune authentification HTTP n’est
requise par le script ; son exécution exige l’accès local aux fichiers LMDB.

Les deux accès appellent `UsersStore.rebuildLoginIndex()` : vidage de l’index puis
reconstruction depuis les noms exacts et UUID existants, dans une transaction
unique. Une entrée absente, incorrecte ou orpheline est réparée ; aucun compte,
film ou JSON n’est modifié. Une base de comptes vide donne un index vide, sans
création du compte initial. Aucun traitement automatique n’est ajouté au démarrage.

Un compte invalide, deux comptes au même login, une collision d’empreinte ou une
erreur d’écriture avant commit annulent toute la reconstruction et conservent
l’ancien index. Le succès attend la synchronisation disque ; le script confirme
ensuite la fermeture et renvoie un code non nul en cas d’échec. Une erreur de
confirmation après commit ne signifie pas que l’ancien index a été restauré :
vérifier la destination avant de conclure à un échec de la réparation. Cette
opération ne répare pas les documents des comptes eux-mêmes.

#### Vérifications

```sh
npm run lint
npx --prefix www playwright install chromium
npm test
```

Le lint utilise ESLint 10 et deux configurations flat indépendantes :
`eslint.config.js` (serveur/scripts CommonJS) et `www/eslint.config.js` (JS/CJS/Vue).
Les commandes et exclusions historiques sont conservées, y compris les deux
configurations elles-mêmes ; `data`, les fichiers cachés ordinaires et
les sorties générées ne sont pas ajoutés au contrôle. Les globals Node des tests
et de Playwright restent limités aux fichiers concernés, pas aux composants Vue.
Les presets récents sont ajustés pour conserver les anciennes règles et leurs
sévérités, dont `vue/no-mutating-props` avec `shallowOnly: true`. Le durcissement
accepté de `no-shadow-restricted-names` contrôle aussi les noms de classes/imports ;
une classe nommée `Infinity` est désormais refusée. Il ne s'agit pas d'un typage.

Pour VS Code, utiliser une extension ESLint compatible avec ESLint 10.
Réglages locaux utilisés dans ce checkout (`.vscode` est ignoré par Git) :

```json copy Copy ESLint Settings
{
  "eslint.runtime": "node",
  "eslint.workingDirectories": [".", "./www"],
  "eslint.validate": ["javascript", "vue"]
}
```

Le binaire `node` vient du `PATH`. Ouvrir l'éditeur depuis un environnement Node 24
(après `nvm use`), puis redémarrer son serveur ESLint si l'éditeur était déjà lancé
avec un autre Node. Aucune CI ni correction automatique à l'enregistrement n'est activée.

Le contrôle de types **ciblé sur la recherche** se lance séparément sous Node 24 :

```sh copy Copy Search Typecheck
npm run typecheck:search
```

Il utilise TypeScript **6.0.3** et les versions verrouillées de `vue-tsc` et
`@types/lodash` installées par `npm run client:install`. TypeScript 7 n'est pas
utilisé : son compilateur natif ne fournit pas l'API attendue par `vue-tsc` 3.3.14.
Ce contrôle n'est appelé ni par `npm test`, ni par le build ou le lint, et n'active
aucune CI. Il n'émet aucun fichier JavaScript.

`www/tsconfig.search.json` énumère trois entrées : le store de films,
`search.vue` (script et expressions du template), et
`tests/search-contract.check.js`. Ce dernier vérifie que le vrai store satisfait
le contrat de recherche et que son action renvoie `Promise<void>` ; ce n'est
pas un scénario Playwright ni un module chargé par l'application. Les annotations
restent en JavaScript/JSDoc, sans conversion TypeScript ou Composition API.

Les imports HTTP, bus d'événements, configuration et infos sont chargés pour
leurs types/signatures, **sans contrôle de leurs corps**. L'inventaire observé
est de sept sources et 88 déclarations, pas de 95 fichiers applicatifs vérifiés.
Pour voir le graphe effectivement chargé après une évolution :

```sh copy Copy Search Typecheck Graph
npm --prefix www run typecheck:search -- --listFilesOnly
```

Le périmètre est activé par `@ts-check` avec `checkJs: false` ; `strict: true`
et `noImplicitAny: true` sont activés, et `skipLibCheck: true` ne revalide pas les
déclarations des dépendances. Des types `any` restent possibles, notamment sur
les paramètres de watchers et les réponses JSON. Le contexte `this` local déclaré
en JSDoc doit rester cohérent avec le composant ; il ne vérifie pas son cycle de vie.
Les paramètres HTTP de la recherche déclarent `search` facultatif ; seule la forme
`{number_of_movies?: number}` des informations utilisées par le store films est
précisée, pour conserver leur état initial vide. Ce n'est pas une validation du JSON.
Les clés textuelles des watchers, les props des composants globaux (dont Spinner),
le câblage de la toolbar, Vuetify et les autres consommateurs ne sont pas couverts.
Ce garde-fou ne valide ni les réponses réseau, ni le succès HTTP, ni la concurrence.
Les tests de comportement restent nécessaires.

Cette configuration dédiée est choisie par la commande avec `--project` ; elle
n'est pas automatiquement sélectionnée par VS Code comme un `jsconfig.json` ou
`tsconfig.json`. L'alignement du projet actif de l'éditeur n'est pas configuré ici.

`npm test` compile le client, lance les tests serveur LMDB, puis les suites
Playwright ordinaires et catalogue vide, successivement. `npm run test:server`
utilise de vraies bases LMDB dans des répertoires temporaires et le vrai serveur
HTTP sur 4173 ; `npm run test:client` et `npm run test:client:empty` réutilisent la
dernière compilation. Ne pas lancer ces trois commandes en parallèle : elles
partagent le port 4173. Les tests serveur, comme les autres outils de développement,
s’exécutent sous Node 24 ≥24.11 ; les exigences du serveur livré restent inchangées.

Les tests Playwright démarrent le vrai serveur Express sur le port **4173**, avec
des bases et des fichiers de films temporaires supprimés à l'arrêt. Ils couvrent
les parcours films et utilisateurs sans utiliser les données de `data`. Le port
4173 doit être libre ; un serveur déjà lancé n'est pas réutilisé. Ne pas lancer
ces tests contre l'application normale de `npm start` sur 8080. Les deux serveurs
servent toutefois le même `www/dist`, reconstruit par `npm test`.

Pour utiliser le Chromium déjà installé sur ce runner plutôt que le télécharger :

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm test
```

Les projets `desktop` (1280 × 800) et `mobile` (390 × 844, `isMobile` et tactile)
utilisent tous les deux **Chromium**. Ce n'est ni Safari/iOS, ni Firefox, ni un
appareil physique. Les parcours navigateur, y compris le lecteur non administrateur,
utilisent la page du projet ; le lecteur surcharge seulement l'authentification.
Les tests HTTP, stores et configuration s'exécutent dans Node avec `fetch` simulé :
leur répétition sous les deux projets ne vérifie pas un rendu mobile.

Dans `client.spec.js`, une fixture automatique surveille les exceptions JavaScript
non interceptées de toutes les pages du contexte, avant navigation et jusqu'à la
fin du scénario. Aucun message n'est exempté, même dans les scénarios d'erreurs API
volontaires : ceux-ci vérifient leurs dialogues et leur récupération, sans autoriser
de rejet non géré. Les diagnostics `console.error` ne sont pas assimilés à des
exceptions ; une réponse HTTP refusée peut en produire sans erreur JavaScript.
Le contrôle d'absence du dialogue ERREUR en fin de scénario reste en place.

Cette surveillance ne voit pas une erreur consommée par le gestionnaire Vue : elle
passe alors par le dialogue commun, qui ignore les erreurs suivantes tant qu'il est
ouvert. Elle ne promet pas de détecter toutes les erreurs internes. Le flash automatique
est neutralisé dans les parcours ordinaires par `last_version = '999.0.0'` ; des
scénarios dédiés vérifient sa politique de versions major/minor, l’exclusion des
patchs, sa persistance et son ouverture manuelle. La priorité de requêtes réordonnées
n'est pas garantie par cette suite. Hors du contrat de recherche contrôlé séparément par
`typecheck:search`, les commentaires de contrats ne sont pas vérifiés par un outil
de typage.

La compilation et les résultats des tests ne sont pas versionnés. Après une
modification des dépendances du client, utiliser `npm --prefix www install` pour
mettre à jour son verrou, puis reconstruire le client.
