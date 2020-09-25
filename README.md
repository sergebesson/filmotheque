# filmotheque

Présentation de mes films

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
  - [www le front](#www-le-front)
    - [L'arborescence des sources](#larborescence-des-sources-1)
    - [Structure de la page](#structure-de-la-page)
    - [Les stores](#les-stores-1)

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
1. Gestion de l'arrêt du serveur sur SIGINT

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
* **\<store>** : Accès à l'instance des stores.

### www le front

#### L'arborescence des sources

* **common** : module vuejs commun à tous
* **modules** : module vuejs
* **stores** : les stores
* **app.mjs** : le module de lancement de l'application et lancement vuejs
* **error.html** : page d'erreur principal
* **eventBus.mjs** : Bus d'événement global à toute l'application
* **filmotheque.ico** : Icône de l'application
* **index.html** : Page principal de l'application

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

Se sont des simples object (singleton) de données récupérer via l'api rest du back.
Ils sont généralement référencés dans le `data` d'un module vuejs, ce qui permet de mettre à jour l'affichage dès qu'une donnée change. Principe expliqué [ici](https://fr.vuejs.org/v2/guide/state-management.html#Gestion-d%E2%80%99etat-simple-a-partir-de-rien).
