# Filmotheque

## nouvelle version 1.4.x

Cette nouvelle version apporte :

* Modification de la page de chargement
* La mise en place de la documentation (openapi) de l'api
* La déconnexion de l'utilisateur
* le profile : une nouvelle icône apparaît en haut à droite et représente l'utilisateur connecté. depuis cette icône, on peut se déconnecter, consulter la documentation api ou revoir la page flash (à propos)
* La gestion des utilisateurs (accessible que par moi)

Pour plus d'information voir le [Changelog](#Changelog)

## Informations

Suite à un problème de disque dur, j'ai perdu le site.

Le site est en cours de réécriture avec l'aide de mon fils :-)

Le site est écrit en [nodejs](https://nodejs.org/fr/) pour la partie serveur et pour la partie IHM avec [vuejs](https://fr.vuejs.org/index.html) et [vue material](https://vuematerial.io/).

Vous trouverez une première version minimaliste qui vous permettra de télécharger le film et d'afficher la page du film sur [themoviedb](https://www.themoviedb.org/), [allocine](http://www.allocine.fr/) et [imdb](https://www.imdb.com/).  
La liste des films est triée par ordre d'ajout des films.

Fonctionnalités en place :

* Recherche dans la liste des films
* Mise en place d'un certificat signé et gratuit

Les fonctionnalités qui seront développées sont :

* Développement adaptatif du site web ([responsive web design](https://fr.wikipedia.org/wiki/Site_web_adaptatif))
* Gestion de compte utilisateur (ajout / modification / suppression) (que pour moi)
* Liste des films affichable au format `vignettes`
* Trier la liste par le titre du film
* Trier la liste par la date de sortie du film
* Fiche du film avec les infos de [themoviedb](https://www.themoviedb.org/)
* Commenter un film
* Noter sur 10 un film
* Visualisation de la bande annonce d'un film
* Streaming du film
* Gestion du compte utilisateur :
  * déconnexion
  * Changement du mot de passe
  * Changement du pseudo
  * Statistique de téléchargement
  * Avatar
* Mise en place d'une API documentée.

Si vous avez d'autres idées d'évolution, n'hésitez pas à m'en faire part.

## Sources

Pour ceux que ça intéresse les sources sont sur [github](https://github.com/sergebesson/filmotheque)

## Changelog <a id="Changelog"></a>

### 1.4.5

* Passage à node 16.13 TLS

### 1.4.4

* suppression du préfixe `sb-` dans les variables css

### 1.4.3

* renommage du projet de `sb-filmotheque` à `@sbesson/filmotheque`
* utilisation de `@sbesson/configuration-loader` au lieu de `sb-configuration-loader`
* utilisation de `@sbesson/json-db` au lieu de `sb-collection-file`

### 1.4.2

* correction sur l'affichage du spinner

### 1.4.1

* Correction d'un bug lors du chargement de vue-router avec debug à false

### 1.4.0

* La recherche des films recherche maintenant aussi dans les catégories du film. Les catégories sont récupérées dans le nom du fichier (SciActAve par exemple).
* Réécriture du code, avec un développement plus en module fonctionnelle (back and front)
* Mise en place de la déconnexion de l'utilisateur
* Mise en place d'openapi avec contrôle des requêtes api
* Ajout de la documentation api (openapi)
* Ajout du profile utilisateur permettant de se déconnecter, d'acceder à la documentation api et de revoir la page flash (a propos)
* Ajout de la navigation (menu sur plusieurs rubriques) actuellement que pour l'admin
* Ajout de la gestion des utilisateurs (accessible que par l'admin)
* Revu de la page chargement en cours
* Ajout d'une favicon

### 1.3.7

* Changement du logo de TMDB et ajout de tooltip
* Mise en place d'un certificat signé et gratuit

### 1.3.6

* Correction du trie de la liste.

### 1.3.5

* Refactoring du scroll de la liste avec une pagination au nivea de l'api

### 1.3.4

* Ajout d'une animation lors de la mise à jour de la liste suite au scroll

### 1.3.3

* Amélioration du download
* Ajout d'une log au téléchargement
* Correction animation chargement de la liste

### 1.3.2

* Ajustement de la recherche pour une meilleure expérience utilisateur

### 1.3.1

* Ajout d'une animation pendant le chargement de la liste

### 1.3.0

* Optimisation de la lecture de la liste des films
* Ajout de la recherche

### 1.2.8

* Ajout d'un titre sur la page avec le n° de version et le nombre de films

### 1.2.7

* Bug lors du lancement de l'application sans fichier de configuration
* Petite correction pour le scroll de la liste

### 1.2.6

* Correction du index.html

### 1.2.5

* Mise à jour du flash

### 1.2.4

* Correction path du flash

### 1.2.3

* Correction path du fichier de configuration

### 1.2.2

* Correction gestion des répertoires des routes static

### 1.2.1

* Modification du format de user.json (ajout d'une description)

### 1.2.0

* mise en place d'une list `infinite scroll`
* Revu css, revu css error, ajout de transition

### 1.1.0

* 1ere version utilisable

### 1.0.0

* Initialisation
