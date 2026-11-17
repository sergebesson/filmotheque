# MOD-08 Contrats documentés et garde-fous d’outillage

[EPIC : état, dépendances et thread](../EPIC.md) · [Revue : R06 et R08](../REVUE.md)

## Objectif et origine

Détecter plus tôt les régressions de contrats et rendre les vérifications reproductibles, sans convertir tout le client à une nouvelle pile technique.

Sources à relire : [scripts racine](../../../package.json), [scripts client](../../../www/package.json), [lint client](../../../www/.eslintrc.cjs), [tests](../../../www/tests/client.spec.js), [configuration Playwright](../../../www/playwright.config.js), [serveur de test](../../../www/tests/server.cjs), [recherche](../../../www/modules/common/search/search.vue), [liste infinie](../../../www/modules/common/infinite-list/infinite-list.vue).

## Périmètre et exclusions

- Cadrer les contrats documentaires et contrôles statiques utiles après stabilisation des interfaces concernées ; JSDoc est une option, pas une obligation de TypeScript.
- Améliorer la détection des erreurs JavaScript inattendues et préciser ce que les projets Playwright couvrent réellement, notamment leur contexte lecteur.
- Examiner une automatisation des commandes existantes et les besoins de maintenance du lint comme sous-périmètres explicitement choisis, pas une migration générale automatique.
- Ne pas retarder ici les tests nécessaires aux autres tickets. Ne pas traiter COR-01/COR-03 par simple ajout d’assertions, ni affirmer une couverture Safari ou appareil réel inexistante.
- Ne pas déclencher ni modifier de déploiement. Toute automatisation externe et ses effets doivent être examinés avant activation.

## Critères d’acceptation

- [x] Les contrats ciblés sont documentés à leur source et les contrôles retenus détectent une erreur plausible sans reproduire l’implémentation.
- [x] Les erreurs de page non attendues sont distinguées des scénarios d’erreur volontaires, sans faux résultat vert par filtrage excessif.
- [x] Les commandes et environnements nécessaires sont explicites et reproductibles ; la couverture ordinateur/mobile/lecteur est décrite honnêtement.
- [x] L’outillage ajouté répond à un besoin constaté, sans réécriture fonctionnelle ni duplication des tests de parcours existants.

Ces cases consignent les vérifications techniques ci-dessous. L’utilisateur a explicitement accepté le résultat et demandé son commit et sa clôture le 16 novembre 2026. Le statut courant reste uniquement dans l’EPIC.

## Vérifications prévues

Relancer `npm run lint` et `npm test`. Pour un contrôle statique ou de test ajouté, utiliser une faute temporaire représentative pour vérifier sa détection, puis retirer la faute. Examiner les workflows présents avant tout ajout de CI et vérifier qu’aucun déclencheur ne publie ou déploie implicitement. Ne pas provoquer une exécution distante sans autorisation.

Pour l’implémentation ultérieure, utiliser `npm run lint` puis `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm test`. Réutiliser `www/tests/server.cjs` : vrai Express sur 4173, bases, films et configuration dans un répertoire temporaire, suppression à la sortie, `reuseExistingServer: false`. Ne pas diriger les tests vers l’application normale de `npm start` sur 8080 avec `data/`, ni arrêter celle-ci. La compilation des tests écrit toutefois dans le même `www/dist` : éviter de la confondre avec une livraison ou une session manuelle stable.

### Contrôles du cadrage du 16 novembre 2026

- `git status --short --branch`, `git rev-parse HEAD`, journal local et `git rev-list --left-right --count origin/dev...HEAD` : même checkout, branche `dev`, HEAD `dacb011d48a1c44522538d8ab374b37a1bdf2ccf`, arbre et index propres au départ ; quatre commits d’avance sur la référence locale `origin/dev` (`82f17e51191b2f11bce35ee5a095185aa106152d`). Aucun fetch ni contrôle du distant.
- AGENTS racine et parent `@sbesson`, EPIC, présente fiche, R06/R08 et sources actuelles relus ; aucun AGENTS supplémentaire trouvé sous `www` ou `docs`. Aucun outil GX/Phabricator utilisé.
- Lecture des quatre fichiers `www/tests/*.spec.js`, du serveur/configuration Playwright, des scripts et du lint ; aucune configuration de workflow `.github` versionnée trouvée. Node 24.19.0, npm 11.17.0, Chromium 157 disponible à `/usr/bin/chromium` ; versions installées : Playwright 1.65.1, ESLint 8.57.1 racine/client, eslint-plugin-vue 9.33.0, eslint-plugin-node 11.1.0.
- `npm --prefix www test -- --list` : 60 cas collectés dans quatre fichiers, sans exécution des scénarios, compilation ni démarrage de serveur. Ce résultat n’atteste pas leur réussite. Les tests HTTP/stores/configuration tournent dans le processus Node et sont eux aussi déclinés sous les deux projets : leur étiquette mobile ne prouve aucun rendu mobile.
- `ss` et `ps` : application normale `node index.js` déjà en écoute sur 127.0.0.1:8080 ; aucune écoute sur 4173 lors du contrôle. Aucun arrêt, redémarrage ou appel de test sur 8080.
- Relecture documentaire et `git diff --check` avant restitution. Aucun lint ni scénario applicatif exécuté pour ce cadrage ; aucune faute injectée. Les réussites lint/60 tests de MOD-07 restent historiques.

### Vérifications de l’implémentation du 16 novembre 2026

Même référence `dev` à `dacb011d48a1c44522538d8ab374b37a1bdf2ccf`, avec les seules modifications documentaires du cadrage déjà présentes et l’index vide au démarrage. Le pilotage actualise uniquement la ligne MOD-08 de l’EPIC ; aucun changement extérieur embarqué ni autre ticket commencé.

| Contrôle réellement exécuté | Résultat |
| --- | --- |
| `npm run lint` après les modifications, puis relancé avant la suite complète | Succès, sans modification des règles ni des dépendances |
| `npm run build` pour les sondes | Succès ; mêmes noms de contenu des assets avant/après, dont les CSS ; aucun changement d’apparence |
| `node .amp/in/mod08-probe.mjs` : copies temporaires des hooks et parcours films/lecteur de HEAD puis des sources modifiées, mêmes fautes et vrai serveur de test | Sans le nouveau contrôle : 8 réussites malgré les fautes. Avec le contrôle : 8 échecs attendus, exclusivement sur « Exceptions JavaScript non interceptées », avec URL et pile ; toutes les assertions métier aboutissent avant ces échecs |
| Sondes lecteur avant/après ; reprise ciblée `node .amp/in/mod08-probe.mjs after-contexts` après rectification de l’attente initiale | 2 réussites avant et 2 après : desktop 1280 × 800 sans tactile, mobile 390 × 844 avec tactile, films accessibles et menu administrateur absent. L’ancien défaut d’héritage supposé est réfuté, pas corrigé artificiellement |
| Comparaison des tokens exécutables des fichiers applicatifs modifiés et de la configuration avec HEAD, via Espree/vue-eslint-parser | Identiques pour les 9 sources applicatives et `playwright.config.js` : seuls les tests changent de comportement. Aucun style ou template modifié |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm test` après retrait des injections des parcours exécutés | Build réussi, 60 tests réussis en 3,5 minutes, aucun échec ni test ignoré ; dialogue final et scénarios d’erreurs HTTP volontaires conservés |
| `git diff --check`, relecture du diff et de l’index, contrôle des ports après nettoyage | Succès ; index vide, application 8080 toujours sur son PID initial, serveur de test 4173 arrêté par Playwright |

Les quatre cas de faute sont déclinés sur desktop/mobile : exception dans un timer après affichage des films, rejet de promesse non géré, exception au premier script d’une nouvelle page du même contexte (fermée avant l’assertion finale), et exception de timer dans la page lecteur. Les sondes attendent la réception de l’événement pour éviter une course, mais ne l’assertent pas absent : sans fixture commune, les mêmes assertions métier passent malgré ces erreurs. Les huit échecs après ajout proviennent uniquement du teardown du garde-fou, pas de la synchronisation ou du serveur. Les copies de tests, configurations de sonde et script temporaire sont supprimés ; aucun point d’injection, variable de mode ou exemption ne reste dans les sources. Les sorties de mesure/diagnostic restent locales sous `.amp/in/artifacts/mod08/` ; les scénarios et conclusions durables sont consignés ici.

La suite finale repart des sources sans faute et réutilise exclusivement `www/tests/server.cjs`, son vrai backend et ses données temporaires, jamais `data/` ou le port 8080. Les tests existants de recherche, CRUD, récupération, alignement, fondu 500 ms et assets JS/CSS différés sont conservés. Aucun nouveau parcours métier dupliqué ; les 60 cas sont les mêmes, avec surveillance navigateur renforcée. Aucun essai manuel utilisateur ni nouveau rendu visuel inspecté : seuls commentaires et logique de tests changent, les propriétés DOM et de contexte sont exercées. Chromium Linux uniquement ; limites Vue/dialogue unique, flash automatique et concurrence conservées. Les avertissements de couleur `NO_COLOR`/`FORCE_COLOR` viennent de l’environnement d’exécution, sans assouplissement de validation.

## Décisions

### Sous-périmètre accepté après MOD-01 à MOD-07

Le 16 novembre 2026, l’utilisateur accepte le noyau **documentation ciblée à la source, surveillance commune des exceptions navigateur et contexte lecteur cohérent avec les projets**, puis demande son implémentation « sans CI, migration ESLint ni typage vérifié ». Dépendances, scripts de validation et règles ESLint restent inchangés. Cette acceptation de périmètre ne vaut ni validation du résultat ni autorisation de livraison Git.

### Contrats déjà présents et compléments utiles

| Source actuelle | Acquis conservé | Complément documentaire réalisé à la source |
| --- | --- | --- |
| `www/stores/movie-list.store.js`, `user-list.store.js` ; `search.vue`, `infinite-list.vue` | MOD-02/MOD-03 documentent lecture sous `state`, actions `Promise<void>`, lectures consommant ERROR, `update()` rejetant et absence de priorité entre requêtes ; commentaires des props déjà présents | Préciser seulement les bords encore implicites : `.cancel()` annule les callbacks debounce/throttle, pas les requêtes parties ; délais 1000/50 ms ; prop fournie par les singletons et non mutée par les composants. Ne pas inventer une garantie de concurrence (COR-01) ni créer un store/interface générique |
| `www/common/call-api-backend.js` | Résultat `{ status, data }`, corps vide `""`, `error.response` HTTP, réseau/JSON propagés sans présentation déjà décrits et testés dans `http.spec.js` | Préciser paramètres d’entrée/defaults, URL relative à `document.baseURI`, query via URLSearchParams, corps JSON seulement si `data !== undefined`, décodage selon Content-Type et portée de `validateStatus`. Ne pas dupliquer les schémas backend |
| `www/modules/users/services/user.service.js` | Réponses complètes, payloads explicitement énumérés et rejet sans affichage déjà documentés ; tests exacts POST/PATCH/HEAD/DELETE existants | Documenter retours `Promise<User>` (même instance), `Promise<boolean>` et 204/404 pour `userExists`, `isDeleted` local après succès, `isAdmin` issu de `is_admin`. Conserver pseudo vide accepté côté formulaire et repris de la réponse serveur, sans nouvelle validation |
| `www/modules/users/components/user-detail.vue`, `www/modules/users/users.vue` | `emits` et commentaires MOD-03 décrivent déjà la séparation mutation/rafraîchissement ; règles Vuelidate désormais au formulaire | Documenter payload `updated: { type, user }` avec type parmi `created`, `updated`, `deleted` ; `dirty: boolean`, `exit` sans payload, `error` pour sortie après échec de chargement ; l’émission n’attend pas le parent. Ne pas transformer l’événement en callback/promesse |
| `www/modules/common/field-vuelidate/field-vuelidate.vue` | Import local au formulaire ; `$model` et `$dirty` utilisés, classe `dirty` protégeant le gras ; plus de validation dans `User` | Expliquer que `field` est un champ Vuelidate, transmis tel quel au slot, avec mutations de `$model` par le contrôle et portée visuelle de `$dirty`. `Object` seul ne décrit pas ce contrat ; pas de validateur runtime nouveau |
| `www/eventBus.js`, `www/app.js`, `www/modules/error/error.vue` | Gestionnaire Vue de recours et payload ERROR `{ message, error }` ; dialogue ignorant les erreurs suivantes tant qu’il est ouvert | Documenter le payload, son propriétaire de présentation et la limite du dialogue unique ; aucun changement du bus, de la politique d’erreur ou du démarrage |

Ces commentaires préviennent des contresens de maintenance ; **ils ne constituent pas une vérification statique**. Les tests `configuration.spec.js`, `stores.spec.js`, `http.spec.js` et les parcours existants protègent déjà taille de page tardive, promesses de liste, erreurs consommées/propagées, payloads et états du formulaire. Pas de nouveaux tests de ces mêmes contrats à l’identique, pas de nouvelle couche DTO ni fichier de types central.

### Garde-fous retenus et erreurs plausibles détectées

| Choix du noyau | Lacune constatée et erreur plausible | Scénario de vérification retenu |
| --- | --- | --- |
| Une surveillance commune, installée avant navigation et vérifiée en fin de chaque scénario navigateur, pour les exceptions non interceptées et rejets non gérés (`pageerror`, ou événement de contexte équivalent couvrant aussi les nouvelles pages) | Des collecteurs locaux existent seulement dans certains scénarios. Une exception dans un timer après affichage des films peut laisser les assertions métier vertes et ne pas ouvrir de dialogue | Injecter temporairement un `throw new Error` dans un timer d’un parcours sans collecteur local, puis un rejet de promesse non géré ; chacun doit faire échouer le contrôle avec son diagnostic. Retirer les fautes et rejouer les mêmes scénarios. Couvrir aussi le lecteur ; aucune liste blanche globale de messages |
| Faire passer le scénario lecteur par la fixture `page` avec seules les credentials lecteur surchargées, au lieu de `browser.newContext()` manuel | Les anciens `beforeEach`/`afterEach` portent sur une autre page que celle du lecteur ; une erreur lecteur peut échapper aux contrôles. Contrairement à l’hypothèse initiale, les options mobiles sont déjà transmises par Playwright 1.65.1 (voir vérification ci-dessous) | Vérifier viewport 1280 × 800 pour desktop, 390 × 844 et tactile pour mobile sur la page réellement parcourue, ainsi que l’accès lecteur sans menu administrateur. Une faute temporaire sur la page lecteur doit faire échouer le garde-fou commun. Préserver les assertions de droits existantes |

Les erreurs API JSON/HTML/réseau injectées volontairement restent traitées par l’application, avec dialogues, textes, fermeture et récupération explicitement attendus : **elles n’autorisent pas des `pageerror`**. Maintenir ces scénarios comme contrôles négatifs du nouveau garde-fou. Ne pas ignorer tous les événements d’un test marqué « erreur attendue » et ne pas accepter un événement seulement parce que son texte contient « Failed to fetch ».

Conserver l’assertion commune d’absence du dialogue ERREUR en fin de scénario et les assertions précises des scénarios d’erreur. Limite explicite : Vue peut consommer une exception dans `app.config.errorHandler` et présenter un dialogue sans `pageerror` ; `error.vue` peut ignorer un second ERROR pendant qu’un dialogue est ouvert. Le noyau ne promet donc pas de détecter toute erreur interne. Ne pas ajouter d’instrumentation applicative ou modifier cette politique pour les besoins du test. Une surveillance globale de `console.error` n’est pas retenue : les échecs HTTP volontaires peuvent produire des diagnostics réseau ; filtrer largement ces messages masquerait aussi des erreurs. Toute extension de cette frontière demande un besoin et un cadrage distincts.

### Couverture à décrire honnêtement

`desktop` et `mobile` utilisent Chromium, pas deux moteurs : 1280 × 800 et 390 × 844 avec `isMobile`/`hasTouch`. Aucun Safari, Firefox, appareil physique ou preuve iOS. Le lecteur utilise désormais directement la fixture du projet, avec seulement les credentials surchargées ; il bénéficie des mêmes hooks et du même garde-fou.

**Rectification du cadrage initial et du constat historique R08 :** les sondes sur le scénario lecteur de HEAD, avant adaptation, mesurent déjà 1280 × 800 sans tactile et 390 × 844 avec tactile. Dans la version installée Playwright 1.65.1, `www/node_modules/playwright/lib/index.js`, `runBeforeCreateBrowserContext`, complète les options absentes avec `_combinedContextOptions` ; l’instrumentation prend aussi en charge les artefacts des contextes manuels. La déduction d’absence d’héritage viewport/tactile/baseURL/traces à partir du seul appel `newContext` était donc incorrecte sur cet environnement. La sonde initiale attendait à tort un échec et s’est arrêtée sur ces deux réussites ; son attente a été corrigée après examen des mesures et de la source Playwright, sans changer l’application. Le bénéfice de l’adaptation lecteur est la page commune aux hooks et à la surveillance, pas l’ajout d’une émulation auparavant inexistante. Les mêmes mesures restent conformes après adaptation.

Les contrôles HTTP/stores/configuration avec `fetch` simulé s’exécutent dans Node, pas dans les pages Chromium. Le flash automatique reste neutralisé par `last_version = '999.0.0'`, avec ouverture manuelle couverte ; politique de versions et requêtes réordonnées restent hors MOD-08 (COR-03/COR-01). Préserver intégralement les assertions d’alignement, de fondu 500 ms et de chargement différé JS/CSS, ainsi que les autres parcours : aucune assertion retirée pour obtenir une suite verte.

### Options indépendantes, non retenues par défaut

| Option | Besoin et erreur plausible visée | Décision proposée |
| --- | --- | --- |
| CI des commandes existantes | Détecter un commit livré sans lint/tests ou une installation non reproductible. Aucun workflow `.github` versionné observé ; `npm ci` racine/client et installation Chromium seraient nécessaires. Examiner aussi l’accès aux dépendances `@sbesson` et les droits/déclencheurs avant conception | Différer. Aucun workflow ajouté, activé ou lancé, aucun déploiement implicite ; demander une acceptation séparée de son périmètre et de ses effets externes |
| Maintenance ESLint | Outils ESLint 8 et configuration historique ; préserver par exemple la détection d’un identifiant non défini ou d’une prop directement réaffectée. Ces erreurs sont déjà visées par les règles actuelles : une migration n’ajoute pas à elle seule de garde-fou utile démontré | Différer migration majeure/flat config et changement de règles ; aucun assouplissement, mise à jour de verrou ni reformatage global. Ne pas confondre ancienneté et panne constatée |
| Typage documentaire vérifié | Un contrôle limité pourrait détecter un appel à `setSearch(42)`, un `nextPage` absent ou une mauvaise forme de payload `updated`, contrairement à des commentaires seuls. La valeur dépend de la prise en charge réelle des `.vue` et de leur inférence | Différer ajout de checker et typedefs systématiques. Commentaires ciblés possibles dans le noyau, sans prétendre qu’ESLint les contrôle. Si choisi séparément : petite preuve sur frontière réelle et faute temporaire qui échoue, pas de `checkJs`/TypeScript général |

### Réalisation du noyau accepté

Les compléments de contrats ci-dessus sont placés dans les fichiers qui possèdent leurs comportements, sans typedefs systématiques ni nouveau contrôle statique. Le README et les commentaires de configuration explicitent commandes, contextes et limites.

La fixture automatique `browserErrors` reste dans `client.spec.js`, seul fichier de parcours navigateur. Elle écoute `context.on('weberror')` avant la page/navigation, conserve URL et pile de chaque erreur sans filtre, puis vérifie la collection dans son teardown `finally`. Les six collecteurs locaux redondants sont supprimés ; les assertions métier, d’alignement, de fondu et de chargement différé sont inchangées. Aucun nouveau fichier de fixture ou framework de test. Les contrôles Node des autres fichiers n’ont pas besoin de contexte navigateur et restent inchangés.

Le lecteur passe par un `describe` qui surcharge uniquement l’authentification avec les mêmes identifiants de fixture. Il réutilise le `beforeEach` (flash neutralisé), l’assertion finale de dialogue et le garde-fou du même contexte ; son accès aux films et l’absence de menu administrateur restent vérifiés. Aucun comportement applicatif ou apparence changé : hors tests, seules des explications sont ajoutées. CI, maintenance ESLint, typage, COR, autres tickets, `www.vue2`, backend et livraison distante restent exclus.

## Résultat et reprise

Le noyau accepté est réalisé, vérifié et accepté par l’utilisateur : contrats complétés à la source, exceptions non interceptées surveillées dans tous les parcours navigateur, lecteur utilisant la page commune, couverture et limites explicites. Les preuves de faute et la suite finale sont distinguées ci-dessus. Intégration dans la référence locale `dev` par le présent commit « Documenter les contrats et renforcer les garde-fous navigateur (MOD-08) », sans push ni déploiement. Aucune reprise nécessaire sur MOD-08 ; aucun travail CI, migration ESLint, typage vérifié ou correction COR à lancer implicitement.

## Traçabilité et livraison

- Thread de cadrage et d’implémentation : [MOD-08 dans le checkout local](https://ampcode.com/threads/T-01a1e4ba-96e3-7508-938a-9d902e0cb385), après la [préparation de reprise MOD-07](https://ampcode.com/threads/T-01a1e464-8f33-71c3-ac94-86f4b60e61ac).
- Référence vérifiée pour cadrage et implémentation : `dev` à `dacb011d48a1c44522538d8ab374b37a1bdf2ccf` ; MOD-01 à MOD-07 acceptés dans le suivi. Même checkout et documents exacts disponibles. Ailleurs, transférer explicitement ces changements et les commits/documents locaux, ne pas repartir d’`origin/dev` plus ancien.
- Livraison réelle : changements applicatifs limités aux commentaires, tests navigateur adaptés, README et configuration commentés, présente fiche et seule ligne MOD-08 de l’EPIC intégrés par le présent commit local sur `dev`. Tableau coordonné avec le [pilotage](https://ampcode.com/threads/T-01a1de9e-73bf-7283-bf9f-cf7dc98d6085), seul emplacement des statuts. Aucun nouveau fichier suivi ni modification de script/lock/dépendance dans ce commit ; aucun push, contrôle du distant, déploiement ou workflow distant.
- Acceptation du sous-périmètre : obtenue le 16 novembre 2026, avec demande explicite de réalisation sans les trois options. Acceptation du résultat et autorisation de commit/clôture obtenues ensuite : « ok je valide MOD-08, commit et note le ticket comme terminé ». La demande suivante de création d’un ticket CSS est distincte et n’en autorise pas l’implémentation.
- Contrôle avant commit : `npm run lint` réussi ; `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:client -- --grep 'lecteur|administration : scripts|fondu du fond|en-têtes alignés'` : 8 tests réussis en 19,9 s, sans changement de la logique validée. Les retouches extérieures de mise en forme et le commentaire `//` initial dans `call-api-backend.js` sont laissés hors du commit ; seuls les compléments de contrat MOD-08 y sont indexés. L’application 8080 reste sur son PID initial ; les tests utilisent toujours le serveur temporaire 4173.
