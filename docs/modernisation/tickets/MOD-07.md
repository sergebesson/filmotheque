# MOD-07 Couleurs, portée CSS et surcharges Vuetify

[EPIC : état, dépendances et thread](../EPIC.md) · [Revue : R07](../REVUE.md)

## Objectif et origine

Rendre les styles plus faciles à faire évoluer avec Vuetify en explicitant les styles globaux et les surcharges nécessaires, sans changement visuel.

Sources à relire : [thème](../../../www/app.js), [styles principaux](../../../www/modules/filmotheque/filmotheque.css), [flash](../../../www/modules/flash/flash.css), [navigation](../../../www/modules/navigation/navigation.css), [recherche](../../../www/modules/common/search/search.css), [spinner](../../../www/modules/common/spinner/spinner.css), [liste films](../../../www/modules/movie-list/movie-list.css), [liste utilisateurs](../../../www/modules/users/components/user-list.css), [formulaire](../../../www/modules/users/components/user-detail.css).

## Périmètre et exclusions

- Centraliser les couleurs identiques, clarifier les styles globaux assumés et réduire les dépendances à la structure interne lorsque l’API publique donne un rendu équivalent.
- Documenter les surcharges internes encore nécessaires ; le renommage de la variable historique du spinner est possible avec ses références.
- Ne pas ajouter `scoped` systématiquement ni casser les dialogues téléportés. Ne pas supprimer une surcharge validée sans preuve d’équivalence.
- Ne pas redessiner l’interface, modifier les breakpoints, le contraste, les durées, le défilement ou l’accessibilité sous couvert de nettoyage.

## Critères d’acceptation

- [x] Les constantes identiques et la portée des styles modifiés ont une source et une responsabilité claires.
- [x] Les surcharges Vuetify conservées sont justifiées ; les remplacements utilisent les API publiques lorsqu’elles permettent le même rendu.
- [x] Films au repos et survol, listes utilisateurs avec/sans fiche et avec défilement, menu, formulaire, flash et erreur gardent leur présentation sur les états contrôlés ci-dessous.
- [x] Les contrôles visuels et fonctionnels montrent l’équivalence dans les états et largeurs concernés, sans suppression des assertions d’alignement ou de fondu.

Ces cases constatent les contrôles techniques. L’utilisateur a explicitement accepté MOD-07 le 16 novembre 2026 et autorisé son commit et sa clôture dans le suivi.

## Vérifications exécutées le 16 novembre 2026

Capturer et inspecter avant/après sur ordinateur et mobile, et sur la largeur intermédiaire concernée par les colonnes utilisateurs. Vérifier dialogues téléportés, champs dirty, obligatoire/facultatif, scrollbar, ancre Changelog et animation survol/retrait. Exécuter `npm run lint` et `npm test`. Conserver seulement les comparaisons utiles à la validation.

- `npm run lint` : réussi sur les changements finaux.
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm test` : build de production réussi et **60 tests réussis en 3,5 min**, après la synchronisation de test décrite ci-dessous. Les assertions d’alignement, de fondu, de chargement différé et d’historique n’ont pas été retirées ou affaiblies.
- Avant commit, sans nouvelle modification applicative : `npm run lint` à nouveau réussi ; `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:client -- --grep 'administration : scripts|fondu du fond|en-têtes alignés'` : **6 tests réussis**, ordinateur et mobile.
- Référence capturée et inspectée avant modification applicative, puis mêmes scénarios après, via `www/tests/server.cjs` : vrai backend et bases/comptes/films temporaires, aucune mutation de `data/`. Avatars réutilisés entre les deux builds pour neutraliser leur génération aléatoire.
- Ordinateur 1280 × 800, mobile simulé 390 × 844, largeur intermédiaire 800 × 800 ; hauteur temporairement réduite à 230 px pour forcer la scrollbar des utilisateurs. Entrée films froide, navigation vers utilisateurs, accès utilisateurs direct dans une nouvelle page, puis retour aux films sans rechargement : les feuilles administratives restent différées et leur présence après visite ne change pas la cascade des films.
- États inspectés : films repos/survol/retrait avant et après administration ; listes utilisateurs avec/sans fiche et avec défilement ; menus avec chacune des routes actives ; édition, création, champs dirty, obligatoire/facultatif, erreurs de validation, sélecteur Genre téléporté ; confirmation de suppression ; informations, ancre Changelog sans changement d’URL et bouton OK visible ; erreur API ; flash de ligne après modification réelle de la description d’Alice, restaurée dans la fixture ensuite.
- La première comparaison a montré des écarts d’instant d’animation (ouverture de dialogue, snackbar, retrait du survol). Une seconde comparaison utilise un build exact du départ extrait avec `git archive HEAD www` dans un répertoire ignoré, sans réécrire les sources de travail. Captures stabilisées après `networkidle`, polices prêtes, fin des animations finies et délai de stabilisation ; **62 couples natifs identiques pixel par pixel** avec Pillow `ImageChops.difference`, et aucun écart dans les relevés géométriques/CSS. Les planches réduites ont aussi été inspectées.
- Échantillons des vraies transitions à 250 ms avant/après : fondu des films de **500 ms**, flash de ligne de **1 000 ms** et opacité 0 à cet instant. Le flash n’est pas exigé sur mobile lorsque la liste est masquée. Aucun changement à animate.css, aux classes d’animation ni aux clés de contenu.
- Configuration retenue avant montage : loader toujours brun `rgb(139, 69, 19)`, animation 1,5 s ; spinners de recherche et de liste encore bruns pendant une requête retenue. Les captures du loader animé ont des différences de peinture résiduelles et ne sont pas incluses dans les 62 comparaisons pixel-identiques ; aucune identité pixel n’est revendiquée pour ce loader.
- `git diff --check` : réussi. Aucun changement dans `www.vue2`, le backend, les dépendances ou les contrats HTTP.

### Synchronisation du test de validation

La première suite MOD-07 a donné 59 réussites et un échec sur « délai du nom ». La trace montre une recherche `search=abcd` : l’autofocus tardif de la toolbar a repris la saisie destinée au mot de passe. Le même échec a été reproduit sur le build MOD-06 inchangé : 4 réussites et 1 échec sur 5 répétitions. Le test attend désormais le focus initial de la recherche, puis vérifie la valeur réellement saisie dans le mot de passe. Les 5 répétitions passent ensuite sur l’ancien build ; la suite finale passe sur MOD-07. Aucun comportement applicatif ni délai de validation n’a été corrigé dans ce ticket.

### Preuves et limites

- [Dossier de validation avec comparaisons](https://ampcode.com/artifacts/validation-mod-07-39c82e57-6e01-4e0c-b3cb-1b5699a24521).
- Planches durables : [ordinateur avant](../preuves/MOD-07-avant-ordinateur.png) / [après](../preuves/MOD-07-apres-ordinateur.png), [mobile avant](../preuves/MOD-07-avant-mobile.png) / [après](../preuves/MOD-07-apres-mobile.png), [800 px avant](../preuves/MOD-07-avant-intermediaire.png) / [après](../preuves/MOD-07-apres-intermediaire.png). Seules ces synthèses sont ajoutées au dépôt ; pas de résultats Playwright complets.
- Relevés et journaux ignorés dans `.amp/in/artifacts/mod07/` et `.amp/in/artifacts/mod07-*.log`. Les scripts temporaires de capture et la copie de build de référence sont supprimés après vérification ; méthodes et scénarios sont conservés ici.
- Chromium 157.0.8103.50 sur Linux ; pas de validation Safari, Firefox ou mobile physique. Les contrôles existants de focus, clavier, mots de passe, champs requis et actions de dialogues passent ; pas de nouvel audit exhaustif d’accessibilité, de réduction du mouvement ou d’impression.

## Décisions

### Palette commune, disponible avant et après montage

`filmotheque.css` possède le brun primaire, le rouge partagé entre erreur/secondaire/administrateur, le gris clair et le noir à 60 %. `app.js` lit une fois les deux couleurs du thème dans ces propriétés CSS après chargement de la configuration ; pas de nouvelle création anticipée de l’application. Le fond de survol utilise les canaux RGB publics du thème avec l’alpha historique de 20 %. Le spinner utilise directement le brun commun, même avant installation du thème : le nom hérité `--md-theme-default-primary` disparaît avec ses références dans `www`.

Le rose de sélection `#ff00001a` n’est pas une variante transparente de `#ff5252` : il reste inchangé, ainsi que les autres opacités, fonds neutres et ombres de responsabilités distinctes. Pas de normalisation de couleurs seulement proches.

### API publiques et portée explicite

- Avatar : prop `size` transmise à `VAvatar`, 40 px par défaut et 30 px dans les lignes ; suppression des deux dimensions `!important`. Le remplissage de l’image native est local au composant avec un style scoped, sans toucher à l’infobulle téléportée.
- Dialogues : defaults publics de `VDialog` pour `contentClass="filmotheque-dialog"` et de ses `VCard` pour `rounded="15px"`. Plus de règle d’arrondi visant toutes les cartes de tous les overlays. Le style de titre reste global pour la téléportation, mais limité à cette classe de contenu de dialogue.
- Les règles de cadre, boutons et sous-en-têtes partagés restent globales, chargées initialement. Les cartes flash/erreur gardent leur classe propre et leur contraste. Les styles utilisateurs restent dans les feuilles différées ; leurs classes de masquage responsive sont explicitement limitées à `.users`. Aucun scoped systématique, déplacement d’animate.css ou objectif quantitatif de suppression.

### Surcharges conservées

| Zone | Justification du maintien |
| --- | --- |
| Wrap interne de VApp | Sa hauteur/min-height laisse défiler les listes plutôt que la page ; aucune prop dédiée ne restitue ce contrat de hauteur. |
| Boutons du cadre | Casse et espacement typographique historiques, sans prop équivalente ; les boutons téléportés conservent leurs styles spécifiques. |
| Titres et texte des cartes flash/dialogues | Retour à la ligne, padding, séparateur et typographie des éléments générés ; les props de couleur/taille globales ne reproduisent pas ces réglages. |
| Navigation | Typographie des titres générés et overlay nul seulement pour la route active. `variant="plain"` atténue aussi les liens inactifs et retire leur retour de focus/survol : pas équivalent. |
| Recherche | Largeur minimale et réserve interne pour le spinner ; ne pas remplacer par une autre disposition d’icônes ou réduire la zone de saisie. |
| Films | Géométrie compacte, boutons d’images et fondu du fond indépendamment de l’overlay Vuetify ; la densité ne remplace pas ces mesures exactes. |
| Lignes utilisateurs | Padding nul, hauteur 40 px, sélection lisible sans atténuation `disabled`, gouttière stable et colonnes ; conserver aussi les priorités administrateur/masquage plutôt que supprimer des `!important` sans objectif d’équivalence. |
| Formulaire | Champ de création rétractable dans la toolbar ; texte noir distinct de l’accent `color` Vuetify ; gras dirty des inputs et labels flottants. |

## Résultat et reprise

Simplification réalisée, vérifiée et acceptée sur le périmètre ci-dessus, intégrée localement sur `dev` par le présent commit « Simplifier les styles partagés et les surcharges Vuetify (MOD-07) ». Aucun push ni déploiement effectué ou autorisé. Aucune reprise nécessaire sur ce ticket ; tout autre ticket attend une demande explicite. Aucun COR ou autre ticket n’a été commencé.

## Traçabilité et livraison

- [Thread d’implémentation MOD-07](https://ampcode.com/threads/T-01a1e464-8f33-71c3-ac94-86f4b60e61ac) ; [préparation précédente](https://ampcode.com/threads/T-01a1e3c6-1ac1-705a-99df-57d8444e9bd1).
- Départ réel vérifié : checkout demandé sur le runner `762e9de5-10f1-47ab-8ece-60cbd5bd060c`, branche `dev`, arbre/index propres, HEAD `c043221e0b3da4a282522fb7cd6bfe35686376d5` (« Différer le chargement de l’administration (MOD-06) »). Trois commits d’avance sur la référence locale `origin/dev`, aucun contrôle du distant.
- Acceptation et autorisation explicites de commit le 16 novembre 2026 : « Je valide MOD-07, commit et note MOD-07 comme terminé ». Présent commit local sur la branche de référence `dev`, sans push, contrôle du distant ou déploiement ; l’EPIC seul porte l’état courant.
- Sur demande distincte de l’utilisateur, `npm start` reste lancé sur le port 8080 avec les données existantes de `data/`. Les tests automatisés utilisent toujours leurs bases temporaires séparées ; aucune mutation automatisée de `data/`.
