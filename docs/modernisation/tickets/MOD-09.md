# MOD-09 Regrouper les CSS des composants dans les .vue

[EPIC : état et dépendances](../EPIC.md) · [Précédent : MOD-07](MOD-07.md)

## Objectif et origine

Rapprocher les styles propres à un composant de son script et de son template, dans un bloc `<style>` de son fichier `.vue`, sans modifier leur portée globale ni la présentation. Garder les styles communs dans une feuille séparée.

Demande explicite du 16 novembre 2026 après acceptation de MOD-08 : créer ce ticket « sans ajouter scoped et en gardant les styles communs séparés ». La création documentaire n’autorisait pas le démarrage ; l’utilisateur demande ensuite explicitement « Implémente ticket MOD-09 » dans le [thread d’implémentation](https://ampcode.com/threads/T-01a1e519-e2ed-75c6-af4e-5682e54d5e43).

## Sources actuelles à relire au démarrage

- [Styles partagés](../../../www/modules/filmotheque/filmotheque.css), [racine](../../../www/modules/filmotheque/filmotheque.vue), [démarrage et palette avant montage](../../../www/app.js), [loader HTML initial](../../../www/index.html).
- Composants et CSS voisins : `www/modules/common/{spinner,search,infinite-list}`, `www/modules/{loader,navigation,error,flash,movie-list}`, `www/modules/users/users.*`, `www/modules/users/components/{user-list,user-detail}.*`.
- [Avatar](../../../www/modules/avatar/avatar.vue), dont le style scoped préexistant n’est pas à changer.
- [Tests navigateur](../../../www/tests/client.spec.js), [serveur temporaire](../../../www/tests/server.cjs), [configuration Playwright](../../../www/playwright.config.js), [Vite](../../../www/vite.config.js).
- [Décisions et preuves MOD-07](MOD-07.md) pour les surcharges Vuetify, dialogues téléportés et comparaisons visuelles ; [MOD-06](MOD-06.md) pour le chargement différé ; [MOD-08](MOD-08.md) pour les garde-fous navigateur et les limites réelles des contextes.

## Périmètre

- Remplacer les imports des CSS propres aux composants par leur contenu dans un bloc `<style>` **sans `scoped`**, dans le `.vue` propriétaire. Les styles restent globaux : la colocalisation n’est pas une isolation CSS.
- Candidats actuels : `spinner.css`, `search.css`, `infinite-list.css`, `loader.css`, `navigation.css`, `error.css`, `flash.css`, `movie-list.css`, `users.css`, `user-list.css` et `user-detail.css`, chacun dans le composant voisin du même nom. Relire les consommateurs avant suppression d’une feuille ; ne pas éclater les styles d’une liste entre ses sous-composants sans nécessité.
- Conserver `filmotheque.css` séparé : palette `:root`, règles de document et de cadre, toolbars/boutons/sous-en-têtes partagés et titres `.filmotheque-dialog`. Garder sa disponibilité au chargement initial, notamment avant `getComputedStyle` dans `app.js` et pour le loader HTML avant montage.
- Les règles propres aux cartes erreur et flash peuvent rejoindre leurs `.vue` : un `<style>` non scoped continue de couvrir leurs éléments téléportés. Les règles communes des dialogues restent dans la feuille partagée.
- Préserver sélecteurs, déclarations, media queries, priorités et commentaires justifiant les surcharges. Vérifier l’ordre effectif de cascade après extraction Vite ; ne pas supposer qu’un simple déplacement conserve l’ordre des CSS émis.
- Préserver les URL d’images des films et le chargement différé des styles utilisateurs. Supprimer uniquement les imports et fichiers devenus inutiles à ce déplacement ; pas de regroupement global des styles administratifs dans le bundle initial.

## Exclusions et invariants

- Aucun ajout de `scoped`, `:deep`, CSS Modules, préprocesseur ou nouvelle dépendance ; style scoped existant de l’avatar inchangé.
- Aucun redesign, renommage de classes, changement de palette, breakpoint, priorité, géométrie, accessibilité ou animation. Pas de nouvelle réduction des surcharges Vuetify : MOD-07 les a déjà arbitrées.
- Préserver notamment alignements avec scrollbar, dirty/gras et champs obligatoires, masquage responsive, dialogues téléportés, fondu des films de 500 ms et flash de ligne utilisateur de 1 000 ms.
- Aucun changement fonctionnel, COR, backend, `www.vue2`, outillage de typage, lint ou CI. Préserver les garde-fous MOD-08 et toutes les assertions d’alignement, de fondu et de chargement différé ; ne pas les affaiblir pour obtenir un résultat vert.

## Critères d’acceptation

- [x] Les styles propres aux composants concernés se trouvent dans leurs `.vue`, sans ajout de `scoped` et sans ancien import/fichier inutilisé.
- [x] Les styles communs restent séparés et disponibles au bon moment, y compris pour le thème et le loader avant montage.
- [x] Aucun changement de présentation ou de comportement sur les états inspectés ; ordre de cascade, images et overlays restent corrects après visite de l’administration et accès direct à celle-ci.
- [x] Les styles administratifs restent différés ; le lint et la suite de tests passent sans retrait ni affaiblissement des assertions existantes.

## Vérifications prévues pour l’implémentation

1. Établir une référence avant déplacement sur le code exact de départ, avec `www/tests/server.cjs` et ses bases/films/configuration temporaires sur 4173. Ne pas utiliser `data/`, lancer des tests sur 8080 ou interrompre l’application normale. Les builds reconstruisent le même `www/dist` : en tenir compte pour les sessions manuelles.
2. Comparer et inspecter les rendus avant/après : ordinateur 1280 × 800, mobile Chromium émulé 390 × 844, largeur intermédiaire 800 px et hauteur réduite pour forcer la scrollbar. Films repos/survol/retrait et images externes ; utilisateurs avec/sans fiche et défilement ; création/édition dirty, requis/facultatif et sélecteur téléporté ; menu, erreur, flash et ancre Changelog ; loader/configuration retenue avant montage. Réutiliser les scénarios documentés par MOD-07, stabiliser les captures et contrôler les transitions séparément.
3. Vérifier entrée films froide, navigation vers utilisateurs, accès administratif direct et retour aux films : absence de CSS administratif initial, disponibilité des styles à l’ouverture et absence de régression de cascade après chargement différé.
4. Exécuter `npm run lint` puis `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm test`, et `git diff --check`. La référence des 60 tests MOD-08 n’est pas une validation du futur déplacement. Inspecter les captures obtenues, pas seulement les enregistrer. Chromium Linux et émulation mobile ne prouvent pas Safari/iOS ni un appareil réel.

Pas de nouveau garde-fou imposé : conserver les contrôles existants. Si un contrôle est ajouté, vérifier sa détection par une faute temporaire représentative puis retirer la faute.

## Réalisation et vérifications du 16 novembre 2026

### Référence et décisions

Départ réel : même checkout local, branche `dev` à `19291594d19822278aacb32fb148d0fac948908c` (MOD-08), index vide. Seules l’inscription de MOD-09 dans l’EPIC et la présente fiche non suivie préexistaient ; elles sont conservées et complétées. MOD-06, MOD-07 et MOD-08 acceptés et intégrés localement. AGENTS parent/racine, EPIC, fiche, sources actuelles et bilans des trois dépendances relus ; méthode de capture MOD-07 retrouvée via son commit et son thread. Aucun outil GX/Phabricator utilisé.

- Les **onze CSS** du périmètre ont rejoint le bloc `<style>` global de leur composant voisin ; onze imports et onze anciennes feuilles supprimés après vérification de leur consommateur unique. Aucun éclatement entre sous-composants.
- Contenus CSS conservés, y compris sélecteurs, commentaires, URL relatives, media queries et priorités. Une sonde avec le parseur SFC Vue compare les onze blocs aux feuilles de HEAD : égalité du contenu hors blancs de bord, templates strictement identiques, scripts identiques après retrait du seul import CSS.
- `filmotheque.css` et son import initial restent inchangés ; `animate.css` reste importé par `users.vue`. Les trois composants administratifs restent derrière les imports différés existants. Avatar et son style scoped inchangés ; aucun autre `scoped`, `:deep` ou nouveau mécanisme ajouté.
- Aucun changement de comportement, test, manifeste, verrou, réglage Vite, backend ou `www.vue2`. Aucun nouveau garde-fou permanent : il s’agit d’un déplacement, les assertions existantes sont conservées intégralement.

### Build, cascade et chargement

Environnement : Linux x64, Node **24.19.0**, npm **11.17.0**, Chromium **157.0.8103.50** à `/usr/bin/chromium`, mêmes dépendances installées avant/après. Build initial par `npm test`, sauvegardé avant les modifications. Build après dans un répertoire temporaire distinct, puis build normal par `npm run build` pour les rendus. `diff -rq` confirme **l’identité octet pour octet de tout le dist**, pas seulement l’égalité des tailles. Le CSS émis conserve donc également l’ordre exact des règles ; aucune compensation de cascade n’a été nécessaire.

| CSS final, même nom et même contenu avant/après | Octets | Première disponibilité observée |
| --- | ---: | --- |
| `index-PcSR9xCb.css` | 267 956 | Films froids |
| `VOverlay-C-pHaLN2.css` | 27 265 | Films froids, partagé |
| `users-5KoSDZVM.css` | 30 546 | Navigation vers utilisateurs |
| `user-detail-Dy0_rTIZ.css` | 28 092 | Formulaire |

Les trois icônes films sont identiques aussi, avec les mêmes URL émises ; leurs neuf boutons ont des images de fond dans les sondes. Relevés réseau sur les trois largeurs : **5 assets JS/CSS** à l’entrée films, **4 supplémentaires** à l’ouverture de la liste. Aucun sélecteur `.user-detail` ou `.users-list-panel` dans les feuilles locales accessibles à froid sur films. Accès directs création/édition dans de nouveaux documents, navigation liste, retour films et overlays vérifiés. Le test existant de CSS administrative retenue reste le contrôle du non-montage et de l’absence de requête utilisateurs avant arrivée de la feuille ; ne pas déduire cela d’une capture statique.

### Rendus et animations

Serveur réel `www/tests/server.cjs` sur **4173**, bases/films/configuration temporaires, trois utilisateurs, 24 films, pagination 3. Aucune sonde sur `data/` ou 8080. L’application normale reste sur son PID initial **1988288** ; les compilations utilisent toutefois son même répertoire `www/dist`, sans constituer un déploiement.

Même sonde temporaire avant/après, avec **1280 × 800**, **390 × 844 tactile émulé** et **800 × 800**, puis hauteur **230 px** pour provoquer le défilement. Captures : films froids et retour, chacun repos/survol/retrait ; menus films/utilisateurs ; liste, liste réduite, édition, dirty, confirmation de suppression ; flash et Changelog ; erreur API ; création directe, validation, Genre ouvert, édition directe ; flash de ligne sur ordinateur/intermédiaire. La liste est normalement masquée pendant la fiche sur mobile.

Stabilisation reprise de MOD-07 : vrais SVG d’avatars mémorisés et resservis à l’identique, `networkidle`, `document.fonts.ready`, attente des animations finies et délai de 1 100 ms, caret caché et pointeur retiré hors captures de survol. Flash automatique neutralisé par `last_version = "999.0.0"` ; informations ouvertes manuellement. Polices externes attendues mais non remplacées par des fixtures locales.

**62 couples de PNG natifs identiques pixel pour pixel** avec Pillow `ImageChops.difference(...).getbbox()`, sans masque ni tolérance : **21 ordinateur, 20 mobile, 21 intermédiaire**. Mesures JSON de géométrie et styles calculés identiques sur tous les états. Les planches avant et après ont été inspectées, avec contrôles natifs ciblés (dirty, liste à hauteur réduite, Genre mobile et loader). Le cliché court de défilement est volontaire ; les assertions de la suite contrôlent l’alignement effectif, y compris avec scrollbar, indépendamment de sa peinture dans Chromium.

- Fond des films : vraies transitions survol/retrait, à froid et au retour, **500 ms**, pause à **250 ms** : `rgba(139, 69, 19, 0.16)` puis `rgba(139, 69, 19, 0.04)` sur les trois largeurs, avant et après.
- Flash de ligne : mutation et rafraîchissement HTTP simulés, sans écriture persistante pour la sonde ; description modifiée sans changer le nom, animation **1 000 ms**, opacité **0 à 250 ms**, ordinateur/intermédiaire. Les tests CRUD existants utilisent, eux, les écritures réelles dans leurs bases temporaires.
- Loader HTML : configuration retenue, loader visible avant montage sur les trois largeurs, cadre plein écran, point brun `rgb(139, 69, 19)`, animation **1,5 s**, puis films après libération. Ces **trois captures animées sont exclues du décompte pixel-identique** : la position du point varie avec la phase du balayage. Les mesures stables avant/après sont identiques.

Planches durables : [avant ordinateur](../preuves/MOD-09-avant-ordinateur.png), [après ordinateur](../preuves/MOD-09-apres-ordinateur.png), [avant mobile](../preuves/MOD-09-avant-mobile.png), [après mobile](../preuves/MOD-09-apres-mobile.png), [avant intermédiaire](../preuves/MOD-09-avant-intermediaire.png), [après intermédiaire](../preuves/MOD-09-apres-intermediaire.png). Les planches sont réduites pour la revue ; les comparaisons sont faites sur les originaux. Logs, PNG natifs et JSON locaux dans `.amp/in/artifacts/mod09/` et `.amp/in/artifacts/mod09-*.log`, ignorés par Git.

### Commandes et résultats

| Contrôle exécuté | Résultat |
| --- | --- |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm test` sur le code de départ | Build et **60 tests réussis en 3,5 min** |
| `npm run lint` après déplacement | Succès, aucune règle modifiée |
| `npm --prefix www run build -- --outDir ../.amp/in/mod09-dist-after`, puis `npm run build` | Succès ; deux comparaisons `diff -rq` avec le dist initial sans différence |
| `node .amp/in/mod09-visual.mjs before`, puis `after` sur les deux builds | Succès des sondes finales, aucune exception navigateur ; comparaison 62/62 et mesures identiques |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm test` après déplacement | Build et **60 tests réussis en 3,5 min**, aucune assertion retirée, modifiée ou ignorée |
| Relecture du diff et de l’index, `git diff --check` | Succès ; seuls les onze déplacements et le suivi MOD-09, index vide |
| Après acceptation, avant commit : `npm run lint`, `npm run build`, puis `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:client -- --grep 'administration : scripts\|fondu du fond\|en-têtes alignés'` | Lint et build réussis, **6 tests réussis en 17,8 s** ; onze déplacements revérifiés par le parseur SFC et 17 fichiers compilés toujours identiques aux empreintes validées |

Empreintes SHA-256 des **17 fichiers** du dist final également comparées à la référence après la reconstruction de `npm test` : identiques (`dist-files.json`). Script de capture et deux copies temporaires de build supprimés après consignation ; seuls les résultats de mesure/captures restent sous `.amp/in/artifacts/`. Serveur autonome 4173 arrêté avant la suite, serveur de suite arrêté par Playwright ; 8080 reste sur son PID initial. Les avertissements `NO_COLOR`/`FORCE_COLOR` ne sont pas des échecs et n’ont donné lieu à aucun assouplissement.

Mise au point des sondes, non présentée comme succès : premier parcours arrêté lors du passage de l’erreur vers la création ; la sonde ferme désormais le dialogue et impose un nouveau document pour les accès directs. Une tentative suivante détecte deux `SecurityError` de la sonde elle-même : son initScript accédait au localStorage de documents sans origine accessible. L’initialisation est limitée à l’origine 4173, sans filtrer les exceptions. Les deux séries finales utilisent exactement cette même sonde corrigée ; aucun code applicatif ni assertion permanente adapté pour ces essais.

Limites : Chromium Linux, mobile émulé, pas de Safari/Firefox ni appareil réel. Aucune promesse de compatibilité nouvelle, de gain de poids ou de performance : les fichiers compilés sont inchangés. Les cas limites COR et les risques de sécurité restent hors périmètre. Les cases techniques ne valent pas acceptation utilisateur.

## Décisions, livraison et prochaine action

- [Thread de création](https://ampcode.com/threads/T-01a1e4ba-96e3-7508-938a-9d902e0cb385) et [thread d’implémentation](https://ampcode.com/threads/T-01a1e519-e2ed-75c6-af4e-5682e54d5e43). Le [pilotage](https://ampcode.com/threads/T-01a1de9e-73bf-7283-bf9f-cf7dc98d6085) conserve la responsabilité de la ligne de l’EPIC, seul emplacement du statut courant.
- Acceptation du résultat, autorisation de commit et demande de clôture obtenues explicitement le **16 novembre 2026** : « Je valide MOD-09, commit et note le ticket comme terminé ».
- Livraison réelle : intégration sur la branche de référence locale **`dev`** par le présent commit **« Regrouper les styles dans les composants Vue (MOD-09) »**, après MOD-08. Il contient les onze déplacements (onze `.vue` et onze suppressions CSS), la fiche, la ligne MOD-09 de l’EPIC et les six planches, y compris les documents préexistants de création du ticket. **Aucun push, merge supplémentaire, déploiement ou publication**. Avant une reprise ailleurs, transférer le code et les documents exacts : un commit local ou un lien de thread ne transmettent pas les fichiers.
- Résultat accepté : colocalisation réalisée et vérifiée à présentation et comportement constants sur les contrôles exécutés, sans ajout de scoped et sans modification des fichiers compilés. Aucune reprise nécessaire sur ce ticket ; tout autre ticket attend une demande explicite. Aucun COR commencé.
