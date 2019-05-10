# Information

Suite à un problème de disque dur, j'ai perdu le site.

Le site est en cours de réécriture avec l'aide de mon fils :-)

Le site est écrit en [nodejs](https://nodejs.org/fr/) pour la partie serveur et pour la partie IHM avec [vuejs](https://fr.vuejs.org/index.html) et [vue material](https://vuematerial.io/).

Vous trouverez une première version minimaliste qui vous permettra de télécharger le film et d'afficher la page du film sur [themoviedb](https://www.themoviedb.org/), [allocine](http://www.allocine.fr/) et [imdb](https://www.imdb.com/).  
La liste des films est triée par ordre d'ajout des films.

Les fonctionnalités qui seront développées sont :

* Développement adaptatif du site web ([responsive web design](https://fr.wikipedia.org/wiki/Site_web_adaptatif))
* Recherche dans la liste des films
* Mise en place d'un certificat signé et gratuit
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

Pour ceux que ça intéresse les sources sont sur [github](https://github.com/sergebesson/sb-filmotheque)

## Changelog

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
