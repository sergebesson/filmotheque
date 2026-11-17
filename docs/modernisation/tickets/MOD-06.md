# MOD-06 Chargement différé de l’administration

[EPIC : état, dépendances et thread](../EPIC.md) · [Revue : R02, R03 et R06](../REVUE.md)

## Objectif et origine

Éviter de charger la partie administration dans l’entrée films quand elle n’est pas utilisée, en s’appuyant sur l’initialisation explicite et les mesures des tickets préalables.

Sources à relire : [routeur](../../../www/router.js), [démarrage](../../../www/app.js), [bouton de création](../../../www/modules/users/components/user-create.vue), [toolbar utilisateurs](../../../www/modules/users/components/user-tools-bar.vue), [module utilisateurs](../../../www/modules/users/users.vue), [store utilisateurs](../../../www/stores/user-list.store.js).

## Périmètre et exclusions

- Différer les composants et dépendances propres à l’administration ; examiner les imports globaux susceptibles de les ramener dans le chunk initial.
- Conserver routes hash, vues nommées, accès directs, historique, configuration de pagination et présentation au chargement des styles.
- Ne pas ajouter de nouvelles règles d’autorisation : cacher ou différer l’interface ne remplace pas les contrôles backend.
- Ne pas changer le comportement en cas d’échec de chunk sans décision séparée, ni reprendre les remplacements de dépendances déjà traités par MOD-05.

## Critères d’acceptation

- [x] Le chargement initial des films n’inclut plus le sous-ensemble administratif identifié, avec une preuve de build et réseau.
- [x] Accès direct à liste, création et édition utilisateurs, navigation aller/retour et confirmation d’abandon restent fonctionnels.
- [x] La taille de page configurée est respectée après import différé ; les styles et composants métier sont disponibles au bon moment.
- [x] Les mesures restent comparables au bilan de MOD-05 ; les tests et rendus concernés ne régressent pas dans les contrôles exécutés.

Ces cases consignent les contrôles techniques, pas l’acceptation utilisateur. Le statut courant reste uniquement dans l’EPIC.

## Vérifications prévues

Comparer build et requêtes réseau en entrant par films puis utilisateurs. `npm run lint` et `npm test`. Contrôler les accès directs aux routes enfants, le premier chargement de l’administration, le retour aux films et le profil lecteur. Inspecter les états ordinateur/mobile affectés par l’ordre de chargement CSS.

### Référence et conditions du 16 novembre 2026

Checkout demandé, branche locale `dev`, HEAD **`c1ee6693313852229eb3139c7f580204c3aec964`**, arbre et index propres au départ. MOD-01 à MOD-05, EPIC et revue présents ; `dev` a deux commits d’avance sur la référence locale `origin/dev` à `82f17e51191b2f11bce35ee5a095185aa106152d`. Aucun fetch ni assertion sur le serveur distant. AGENTS applicables, EPIC, bilans MOD-01/MOD-05, R02/R03/R06 et sources actuelles relus ; protocole de mesure du [thread MOD-05](https://ampcode.com/threads/T-01a1e394-8694-73aa-954f-b6716597c434) repris.

Même environnement et mêmes dépendances avant/après : Linux x64, Node **24.19.0**, npm **11.17.0**, Vite **8.3.8**, plugin Vue **6.0.11**, Vue **3.5.45**, Vuetify **4.3.3**, vue-router **4.6.5**, Playwright **1.65.1**, Chromium **157.0.8103.50** (`/usr/bin/chromium`). Vuelidate core/validators **2.0.3 / 2.0.4**, object-hash **3.0.0**, animate.css **4.1.1**, Lodash **4.18.1**. Aucun manifeste, verrou ni réglage Vite modifié.

Ports **8080 et 4173 libres au départ**. Serveur réel `www/tests/server.cjs`, bases et films temporaires, utilisateurs serge/alice/bruno et 24 films, `pageSize: 3`. Aucun lancement sur les bases locales de `data`, aucun outil GX. Contextes Chromium neufs à chaque entrée froide, sans cache partagé, administrateur de test, **1280 × 800** et **390 × 844 tactile**. Flash neutralisé par `last_version = "999.0.0"` pour le réseau et les captures ; contrôlé séparément sans neutralisation dans les sondes de démarrage.

### Build : la référence MOD-05 est reproduite

Mesures avant le **16 novembre à 11:02 CET**, après à **11:10 CET**. Avant : code applicatif inchangé à HEAD. Après : même HEAD avec les cinq fichiers applicatifs MOD-06 modifiés (imports du routeur, enregistrements globaux/locaux et emplacement d’animate.css). Les tests et le suivi ne sont pas dans le bundle.

`npm run build` exécuté par les deux suites complètes ; instrumentation indépendante avec l’API `build({ root: "www", plugins: [...] })` de Vite, sans modifier les sources/options de compilation. Le hook `generateBundle` relève `chunk.fileName`, `isEntry`, `imports`, `dynamicImports` et `chunk.modules[id].renderedLength`. Les tailles et gzip sont lus **sur les fichiers finaux écrits**, après minification CSS : le CSS observé trop tôt dans `generateBundle` n’est pas la taille livrée. Même noms de contenu dans les builds normaux et instrumentés.

Commandes des sondes temporaires effectivement exécutées : `node .amp/in/mod06-build.mjs before` puis `after`, `node .amp/in/mod06-proof.mjs before` puis `after`, et `node .amp/in/mod06-startup.mjs` sur le build final. Serveur autonome lancé par `node www/tests/server.cjs` entre les suites, disponibilité vérifiée sur `/logout`, redémarré entre avant/après et arrêté après les sondes. Les sondes complémentaires de graphe, en-têtes HTTP, accès directs, ouverture du menu et comparaison des géométries ont été exécutées via `node --input-type=module` ; les images de comparaison utilisent ImageMagick `montage` et `compare -metric AE`.

Reproduction des tailles à partir d’un build, indépendante du reporter Vite :

```sh
node --input-type=module <<'JS'
import { readdirSync, readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
for (const name of readdirSync("www/dist/assets")) {
  if (!/\.(js|css)$/.test(name)) continue;
  const data = readFileSync(`www/dist/assets/${name}`);
  console.log(name, data.length, gzipSync(data).length);
}
JS
```

Tailles exactes en **octets** ; gzip **Node/zlib `gzipSync(buffer)` par défaut, niveau 6**. Les phases désignent le premier chargement effectif observé depuis films, pas simplement un nom de chunk.

| Fichier final sous `dist/assets/` | Minifié | Gzip Node | Première phase |
| --- | ---: | ---: | --- |
| `index-DuMCtmDr.js` | 192 335 | 62 725 | Films |
| `VOverlay-BDh18j4s.js` | 135 855 | 47 952 | Films, partagé |
| `_plugin-vue_export-helper-By4ta0nr.js` | 70 020 | 27 035 | Films, partagé |
| `VOverlay-C-pHaLN2.css` | 27 265 | 4 636 | Films, partagé |
| `index-DdoI56YL.css` | 267 702 | 38 720 | Films |
| `user-tools-bar-Cjv4FmhF.js` | 762 | 472 | Liste utilisateurs |
| `user-list.store-oVQjsogB.js` | 1 514 | 628 | Liste utilisateurs |
| `users-C-4NUTfp.js` | 45 266 | 15 172 | Liste utilisateurs |
| `users-B3VPH2FT.css` | 30 578 | 4 951 | Liste utilisateurs |
| `user-detail-DgM3K8ty.js` | 71 731 | 24 240 | Création/édition |
| `user-detail-s1bawAyj.css` | 28 049 | 4 611 | Création/édition |

Avant : **JS 509 034 / gzip 170 034**, **CSS 353 330 / gzip 50 756**, noms `index-C4mAdK9F.js` et `index-bTd8vvE7.css`, exactement comme à la fin de MOD-05. Après, somme de **tous** les chunks : **JS 517 483 / gzip 178 224**, **CSS 353 594 / gzip 52 918**. Total **862 364 → 871 077 minifiés** (+8 713), **220 790 → 231 142 gzip Node** (+10 352). Le découpage réduit l’entrée, pas la somme de tous les fichiers ; les imports inter-chunks, le découpage automatique et la compression séparée ont un coût.

Le reporter Vite reste distinct : après, JS par fichier **63,20 / 48,38 / 27,35 / 0,47 / 0,62 / 15,24 / 24,51 kB gzip** (entrée, VOverlay, helper, toolbar, store, users, détail) ; CSS **38,79 / 4,63 / 4,96 / 4,59 kB** (entrée, VOverlay, users, détail). L’avertissement JS > 500 kB disparaît naturellement, sans relèvement du seuil. Aucun gain de latence n’en est déduit.

### Le graphe et le réseau confirment un report réel

La fermeture transitive des imports **statiques** de l’entrée ne contient que les trois chunks JS initiaux du tableau. Une assertion sur ses modules confirme l’absence de tous les modules `modules/users`, `user-list.store`, `FieldVuelidate`, VSelect/VSwitch/VSnackbar, **object-hash et Vuelidate**. Les noms des chunks partagés sont générés par Vite : le « helper » de 70 kB n’est pas du code administratif, et le gros VOverlay reste initial car également utilisé par le profil, le flash, les dialogues et la navigation.

- `users-C-4NUTfp.js` : liste, mot de passe de ligne, parent utilisateurs, VSnackbar, **object-hash 47 933 octets de modules rendus**. Les styles utilisateurs et **tout animate.css inchangé** sont dans `users-B3VPH2FT.css`.
- `user-detail-DgM3K8ty.js` : User, formulaire, FieldVuelidate, VSelect/VSwitch et dépendances propres, **Vuelidate core 20 596 + validators 8 847 octets rendus**. Ces chiffres précèdent la minification finale : ils ne s’additionnent pas aux octets gzip du tableau.
- `user-tools-bar` contient UserCreate ; le singleton `user-list.store` est partagé entre les deux imports administratifs, mais n’est pas initial sur films.

Réseau relevé avec `performance.getEntriesByType("resource")` après premier contenu et `networkidle`, URL locales `/assets/*.(js|css)`, `decodedBodySize`, `encodedBodySize`, `transferSize`. Même sonde avant/après : entrée films froide, navigation par le menu vers `/users` redirigé sur `/users/list`, première édition, création, retour et historique ; contextes distincts pour les accès directs à la liste/création/édition. Les ressources initiales suivantes ont été retrouvées sur les deux viewports.

| Étape depuis films | Nouveaux fichiers | Nouveaux octets décodés | Gzip Node de ces fichiers | Corps HTTP réellement reçus |
| --- | ---: | ---: | ---: | ---: |
| Films avant | 2 | 862 364 | 220 790 | 220 038 |
| Films après | 5 | 693 177 | 181 068 | 183 384 |
| Premier accès liste après | +4 | +78 120 | +21 223 | +21 592 |
| Premier formulaire après | +2 | +99 780 | +28 851 | +29 784 |
| Retour films puis aller/retour historique après | +0 | +0 | +0 | +0 |

Entrée films : **−169 187 octets décodés (−19,62 %)** et **−36 654 octets de corps HTTP (−16,66 %)**. Le JS initial seul est **398 210** octets, le CSS initial **294 967**. Rien des quatre chunks de liste ni des deux ressources de détail n’est demandé avec les films ; aucune récupération anticipée en ouvrant le menu. Le détail/Vuelidate n’est pas non plus demandé avec la seule liste.

Accès directs froids : `/users/list` charge **771 297 décodés / 204 976 HTTP**, `/users/create` et `/users/edit/alice` **871 077 / 234 760**, contre **862 364 / 220 038** pour chacun avant. Charger toute l’administration coûte ainsi **14 722 octets HTTP supplémentaires (+6,69 %)** ; c’est la contrepartie mesurée du report, pas une réduction globale. Les totaux cumulés du parcours depuis films sont identiques aux accès directs correspondants.

Compression vérifiée sur les en-têtes des ressources servies et leur contenu : **Brotli qualité 4**, sauf `user-tools-bar` (**762 octets**, non compressé sous le seuil du middleware). Ne pas appeler ces corps HTTP « gzip ». `transferSize` ajoute ici 300 octets par ressource : films **220 638 → 184 884** ; liste après **207 676** ; administration complète après **238 060**. Les totaux excluent **HTML, favicon, icônes films, avatars, API, Google Fonts et polices externes**, comme MOD-05. Aucun débit, coût CPU, temps de rendu ni gain de latence mesuré.

### Vérifications exécutées

| Commande / contrôle | Résultat réel |
| --- | --- |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm test`, avant modification applicative | Build de référence et **58 tests réussis, 3,3 min** |
| Nouveau garde-fou sur ce build : `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:client -- --grep 'administration : scripts'` | **Deux échecs attendus** : aucune CSS différée à la navigation, tout est déjà initial |
| `npm run lint`, puis `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm test`, après modification | **Lint réussi, build final et 60 tests réussis, 3,4 min**, dont 58 réutilisés sans assouplissement et deux exécutions du nouveau contrat |
| Analyse Vite par chunk + fermeture statique + ressources réellement reçues | Sous-ensemble administratif absent des films ; Brotli/identity concordants avec les tailles observées |
| Sonde identique avant/après, backend temporaire | Deux viewports, focus recherche, `page_size=3`, première navigation, formulaire, création, genre ouvert, retour et historique ; géométrie/couleur/display des conteneurs **strictement identiques** |
| Six rendus d’accès directs après, liste/création/édition × deux viewports | Géométries identiques à celles obtenues via navigation ; champs noirs et mots de passe masqués ; captures inspectées |
| Sondes de démarrage après sur les deux viewports | **28 cas réussis** détaillés ci-dessous ; aucune erreur JavaScript inattendue |
| `git diff --check`, relecture de tout le diff et des dépendances | Succès ; pas de backend, manifeste/verrou, configuration Vite ou autre ticket modifié |
| Avant commit, après acceptation : `npm run lint`, `npm run build`, puis `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:client -- --grep 'administration : scripts\|configuration :'` | Lint et build réussis, **4 tests réussis en 10,6 s** ; mêmes fichiers compilés, aucun changement applicatif depuis les 60 réussites |

Le garde-fou conservé dans [client.spec.js](../../../www/tests/client.spec.js) retient la CSS **après** l’entrée films : aucune liste utilisateurs n’est montée ni requête de liste émise tant que ses styles ne sont pas arrivés ; après libération, vraie liste/configuration à trois éléments, JS/CSS effectivement additionnels, focus, retour et historique sans ressource supplémentaire. Il ne dépend pas des noms hachés des chunks. Les tests existants couvrent accès directs, CRUD, validation/pending/sending/dirty, abandon refusé puis accepté, reset entre utilisateurs, protections administrateur, erreurs, notifications, rafraîchissement, recherches à 999/1 000 ms, pagination, chargement complet des films, téléchargement, alignements et profil lecteur.

Les **28 sondes de démarrage** utilisent les vrais composants et retiennent seulement les réponses HTTP :

- **16 cas** : quatre entrées (films/liste/création/édition) × deux ordres infos/profil × deux viewports. Configuration retenue : seul loader HTML, aucune API. Puis configuration simulée à **2** : listes à deux éléments même en import tardif, infos/profil indépendants, loader applicatif tant que le profil manque ; flash visible dès les informations, titre `filmothèque 1.4.14 - 24 films`, persistance, fermeture et pas de réouverture au rechargement (configuration réelle à trois).
- **12 cas** : films/liste × configuration/infos/profil en 503 × deux viewports. Configuration : redirection d’erreur et aucune API. Informations : dialogue attendu, profil disponible, titre non enrichi, aucune nouvelle version persistée. Profil : dialogue attendu, loader maintenu et bouton profil absent. Aucun mécanisme de récupération ajouté.

### Rendus et déroulement des animations

Captures réalisées sur le build de production, vrais composants Vuetify et backend temporaire. Les six états **films froids, première liste, édition, création, genre ouvert, retour films** ont été inspectés avant/après, sur ordinateur/mobile ; accès directs inspectés séparément. Le test de CSS retenue vérifie le non-montage sans styles ; une capture seule ne démontrerait pas cette absence d’état intermédiaire.

- Ordinateur : colonnes/en-têtes, volet droit, switch actif, menu Genre, champs noirs et gras dirty, cartes et largeurs conservés. Mobile : liste masquée pendant le détail, formulaire dans la largeur disponible, options sans débordement. Alignements avec scroll et vue à 800 px également revérifiés dans la suite.
- Différences de pixels inspectées : **avatars générés aléatoirement par la fixture** (`server/stores/user.js`) et **notification de deux secondes encore visible sur une capture de création** après la mutation simulée. Les masques de différence confirment ces seules zones ; aucune différence de formulaire ou de disposition n’est revendiquée « identique pixel pour pixel ».
- Une sonde `animationstart` prélève la **vraie animation** à 250 ms, puis reprend sa lecture ; les captures attendent la fin des animations finies. Sur desktop et mobile : `bounceInRight` **1 000 ms**, opacité **0,705611 à 250 ms** ; `bounceOutRight` **1 000 ms**, **0,954425**. Desktop : flash d’Alice après changement de **description sans changer de nom**, **1 000 ms**, opacité **0 à 250 ms**. PATCH et contenu de rafraîchissement simulés, aucune écriture persistante pour cette sonde ; CRUD réel couvert par la suite. En mobile, la liste est masquée pendant le détail, donc aucun flash visible n’est exigé avant sa fermeture.
- Après retour aux films : transition de fond réelle dans les deux sens **500 ms**, prélèvement à 250 ms **rgba(139, 69, 19, 0.16)** puis **rgba(139, 69, 19, 0.04)**, fin de transition vérifiée. Les échantillons complets de géométrie et d’animation sont égaux avant/après ; la suite vérifie aussi le fondu sur les deux projets. Pas de preuve d’animation tirée d’une image statique.

Captures synthétiques durables, dans l’ordre de lecture ci-dessus : [avant ordinateur](../preuves/MOD-06-avant-ordinateur.png), [après ordinateur](../preuves/MOD-06-apres-ordinateur.png), [avant mobile](../preuves/MOD-06-avant-mobile.png), [après mobile](../preuves/MOD-06-apres-mobile.png). Les originaux, JSON de build/graphe/réseau/démarrage et logs restent dans `.amp/in/artifacts/mod06-*`, ignoré par Git ; les scripts temporaires de mesure sont supprimés après consignation. Les contrôles décisifs se relancent avec la suite et le test de chargement différé.

Limites : Chromium desktop/mobile simulés, pas de Safari/Firefox ni appareil réel. Ni test de latence, ni panne de chunk simulée, ni nouveau comportement de reprise ; aucun changement des règles d’autorisation. Le CSS fournisseur d’animation (y compris réduction du mouvement/print) est déplacé intact, non remplacé ; pas de nouvelle sonde dédiée de ces media queries.

Incidents de mise au point, non présentés comme succès : lecture des tailles CSS instrumentées déplacée après écriture/minification ; première sonde lancée avant disponibilité du serveur (connexion refusée) relancée après contrôle ; exigence de flash visible sur la liste mobile masquée retirée de la sonde de caractérisation **avant** la comparaison finale identique. Première suite après découpage : 58 réussites et deux erreurs du **nouveau test**, qui libérait ses routes CSS après `unroute()` (déjà libérées par Playwright). Ordre corrigé dans le test seul, puis lint et suite complète relancés avec 60 réussites. Aucun comportement applicatif adapté pour faire passer ces sondes.

## Décisions

### Trois points d’entrée de routes, sans couche supplémentaire

Les trois composants de route administratifs utilisent directement les fonctions `() => import(...)` de Vue Router : vues nommées **Users / UserToolsBar**, puis **UserDetail** commun à création/édition. Pas de `defineAsyncComponent`, agrégateur, découpage manuel de vendor ou nouveau registre. Le bundler partage automatiquement le store et le code commun. Différer seulement le parent n’aurait pas suffi : toolbar et détail étaient aussi importés par le routeur.

`UserCreate` passe de global à local dans sa toolbar ; `FieldVuelidate` devient local au formulaire. `VSelect`/`VSwitch` sont locaux au détail, `VSnackbar` au parent utilisateurs. Les autres composants Vuetify restent globaux car employés par les parties partagées ; les **defaults de VSelect**, le thème, la locale et les icônes restent dans l’unique instance Vuetify et s’appliquent aux composants locaux. Aucun template, sélecteur CSS ni durée changé.

**animate.css est importé intact par users.vue**, propriétaire commun des animations liste/détail ; Vite attend ses styles avant de résoudre la route. Il reste en place après retour films, sans changement observé sur le fondu. Ce déplacement relève du chargement, pas du remplacement refusé en MOD-05. **object-hash et sa clé de contenu complète restent inchangés** ; aucune identité réduite au nom.

### MOD-01 reste la barrière d’initialisation

`await configurationStore.load()` précède toujours création de l’application et installation du routeur. Les routes utilisateurs froides se résolvent donc après la configuration ; le store tardif lit toujours le getter `configuration.pageSize`, sans copie ni abonnement ajouté. Profil, flash, informations et loaders restent dans la racine partagée, avec les mêmes propriétaires et leur parallélisme. Aucun store, transport HTTP, bus d’erreur ou garde de navigation modifié.

Le périmètre est le **sous-ensemble administratif identifié**, pas toute la bibliothèque UI ni les données du profil partagé. Pas de récupération automatique ou écran d’échec de chunk ajouté. Aucun COR, backend, autorisation, remplacement d’object-hash/animate.css, virtualisation ou suppression de `www.vue2`.

## Résultat et reprise

Résultat présenté pour validation le **16 novembre 2026** : administration effectivement absente du chargement initial films, **−16,66 % de corps HTTP JS/CSS initiaux**, avec coût global du découpage explicité et contrôles ci-dessus. Aucun gain de latence annoncé. L’EPIC est mis à jour directement, sans pilotage actif distinct établi pour cette reprise.

Le **16 novembre 2026**, après l’explication de `router.js`, l’utilisateur valide explicitement la modification et demande le commit ainsi que la clôture de MOD-06. Le code, le test, le suivi et les quatre captures synthétiques sont regroupés dans le présent commit local **« Différer le chargement de l’administration (MOD-06) »** sur `dev`, branche de référence convenue. Les critères vérifiés, l’acceptation et l’intégration locale permettent la clôture dans l’EPIC. Aucun push autorisé ni effectué.

Aucun autre ticket démarré. Pour reprendre le chantier : même checkout, vérifier `git status`, la présence de ce commit et les documents du prochain ticket explicitement autorisé. Dans un autre checkout, transférer les commits locaux ou utiliser une référence rendue accessible après autorisation de push : un lien de thread ou un SHA non poussé ne transmet pas ces fichiers.

## Traçabilité et livraison

- Thread d’implémentation : [MOD-06 dans le checkout local](https://ampcode.com/threads/T-01a1e3c6-1ac1-705a-99df-57d8444e9bd1), reprise du [thread MOD-05](https://ampcode.com/threads/T-01a1e394-8694-73aa-954f-b6716597c434).
- Référence de départ : `dev` à `c1ee6693313852229eb3139c7f580204c3aec964`, propre ; MOD-04 et MOD-05 déjà intégrés localement, non poussés.
- Livraison réelle MOD-06 : présent commit local **« Différer le chargement de l’administration (MOD-06) »**, contenant les douze fichiers attendus (cinq fichiers applicatifs, test client, fiche/EPIC et quatre captures synthétiques), intégré sur `dev`. Aucun changement extérieur constaté à la relecture du diff et de l’index avant commit.
- Acceptation et autorisation de commit obtenues explicitement le 16 novembre 2026 dans ce thread ; lint, build et quatre tests ciblés revérifiés avant commit, sans changement applicatif depuis les 60 tests réussis.
- Aucun push, merge supplémentaire, déploiement ou publication. `dev` contient MOD-04, MOD-05 et MOD-06 en avance sur la référence locale `origin/dev` à `82f17e5`, sans assertion sur le serveur distant.
