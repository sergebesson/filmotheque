# COR-01 Priorité des requêtes et propriété du chargement

[EPIC : état, dépendances et thread](../EPIC.md) · [Revue : A01](../REVUE.md)

## Décision d’abandon du 17 novembre 2026

Après examen du résultat, l’utilisateur juge la complexité disproportionnée pour une liste rarement mise à jour et accepte qu’elle puisse être ponctuellement inexacte. Il demande explicitement : « Retire COR-01 et ses tests, conserve les autres travaux et documente l’abandon, sans commit ni push ».

La correction et ses seuls tests ont été retirés localement, y compris le complément sur la liste vide. Les deux stores et les deux fichiers de tests sont rétablis exactement à la base après COR-04 ; les autres travaux sont conservés. Aucune solution de concurrence de remplacement n’est introduite. Le cadrage, les choix et les preuves ci-dessous restent une mémoire historique de l’implémentation retirée, pas des garanties du code actuel ni une acceptation du résultat.

Les limites antérieures restent donc acceptées : réponses et indicateurs éventuellement obsolètes lors de lectures concurrentes, absence de priorité commune entre recherche, pagination, chargement complet et rafraîchissement. Le cas d’un nouveau rafraîchissement après une liste vide peut à nouveau calculer `page_size = 0` ; aucune correction isolée n’est conservée implicitement. La récupération après mutation réussie de COR-04 reste acquise.

## Objectif et origine

Empêcher une requête devenue obsolète de publier résultats, erreur ou fin de chargement à la place de la requête courante. Il s’agit d’une correction de comportement, pas d’un refactoring MOD. Le 17 novembre 2026, après le cadrage ci-dessous, l’utilisateur autorise explicitement « Implémente COR-01 selon cette proposition, y compris le cas vide, sans commit ni push ». Cette autorisation ne vaut pas acceptation du résultat.

Sources à relire : [store films](../../../www/stores/movie-list.store.js), [store utilisateurs](../../../www/stores/user-list.store.js), [recherche](../../../www/modules/common/search/search.vue), [liste infinie](../../../www/modules/common/infinite-list/infinite-list.vue), [tests](../../../www/tests/client.spec.js).

## Périmètre et exclusions

- Cadrer une politique cohérente pour recherche, pagination, chargement complet des films et rafraîchissement utilisateurs, qui écrivent les mêmes états.
- Les sondes de revue confirment le cas A, B, A, la libération prématurée de loading et un écrasement par chargement complet au niveau des stores. Le contrôle navigateur décrit plus bas établit aussi une concurrence accessible après navigation pendant le chargement complet.
- Ne pas modifier délai de recherche, endpoints, format de pagination, messages ou fonctionnalités. L’annulation réseau éventuelle ne remplace pas le contrôle de publication.
- Ne pas réaliser la correction avant demande explicite, même si un ticket MOD touche ces lignes.

## Critères historiques de l’implémentation retirée

Les coches indiquent les vérifications techniques locales de l’implémentation avant son retrait, pas des garanties actuelles, une acceptation utilisateur ou une intégration Git. Ces critères ne sont plus à réaliser sans nouvelle demande explicite.

- [x] Le plus récent A reste affiché lorsque les réponses de A, B, A arrivent dans un ordre différent.
- [x] Une réponse ou erreur obsolète ne libère pas le chargement d’une requête encore courante et n’affiche pas d’erreur de recherche devenue sans objet.
- [x] Les interactions avec pagination, chargement complet et rafraîchissement ne créent ni écrasement obsolète, ni doublon, ni chargement bloqué ; les cas autorisés sont documentés.
- [x] Des régressions reproduisent le défaut avant correction et passent après ; les parcours normaux et la récupération après erreur courante restent couverts.

## Vérifications initialement prévues

Ordonner explicitement les réponses des vrais stores pour A, B, A ; retarder un succès obsolète puis une erreur obsolète pendant une requête courante ; vérifier résultats, dialogue et indicateurs. Ajouter un parcours navigateur représentatif si l’interface permet l’entrelacement. Distinguer preuves module et UI. Exécuter `npm run lint` et `npm test` après correction autorisée.

Les sondes initiales sont décrites dans la revue, pas présentées comme un test de correction. Les exécutions propres à COR-01 sont consignées plus bas.

## Autorisation d’implémentation antérieure à l’abandon

La politique de concurrence et sa traduction technique ci-dessous, y compris la profondeur minimale pour une liste vide, avaient été acceptées pour implémentation par la demande explicite du 17 novembre 2026. Cette autorisation a ensuite été remplacée par la demande de retrait. L’implémentation n’a été ni acceptée ni intégrée.

## Historique de la politique de concurrence retenue le 17 novembre 2026

**Recommandation : une seule opération possède le droit de publier dans chaque liste ; une nouvelle demande de remplacement lui reprend ce droit, tandis que la pagination attend une base compatible.** La priorité dépend du démarrage de l'action du store, pas de l'ordre des réponses ni d'une hiérarchie permanente entre recherche et rafraîchissement.

Le cadrage initial répondait à la demande « Détaillons les choix de concurrence de COR-01 », sans autorisation de correction à ce stade. La demande ultérieure d’implémentation accepte cette politique. Les constats initiaux venaient de la lecture des sources sur `dev`, base `0e10db2ae04310a5718e45f04dbc32bc7c58f38f` (COR-04 intégré localement) ; les vérifications de la correction sont distinguées plus bas.

### La propriété couvre résultats, erreurs et indicateurs

- Un propriétaire distinct par store : les films n'invalident pas les utilisateurs, et inversement. Tous les chemins qui écrivent une même liste participent au contrôle, y compris chargement initial, recherche, effacement, chargement complet et rafraîchissement.
- Chaque opération acceptée reçoit une identité unique, même si son texte de recherche est identique à celui d'une ancienne opération. Dans A1, B2, A3, seul A3 reste autorisé à publier après son démarrage. Comparer seulement le texte laisse A1 passer ; un compteur séparé pour chaque méthode laisserait aussi deux méthodes concurrentes publier dans la même liste.
- Le propriétaire publie ensemble lignes et métadonnées de pagination, puis termine ses indicateurs. Une opération remplacée ne modifie plus rien : ni lignes, ni pagination, ni recherche, ni `loading`, `updating`, `updateFailed`, ni présentation d'erreur. Cette règle couvre succès, `catch` et `finally`.
- À la fin de l'opération courante, les indicateurs s'arrêtent même si d'anciennes requêtes réseau restent pendantes. Une ancienne opération ne redevient jamais propriétaire, même si la nouvelle échoue. Conserver les anciennes lignes à l'écran pendant une recherche ne leur donne pas le droit d'accepter une nouvelle page d'un autre contexte.
- Le délai de recherche reste de 1000 ms. Une saisie encore dans le debounce n'a pas encore changé le contexte du store ; la correction ne promet donc pas d'invalider une réponse dès chaque frappe. Le démontage conserve les stores singleton et n'annule pas implicitement leurs requêtes.

### Les remplacements passent avant l'ajout d'une page

| Opération en cours, puis nouvelle demande | Arbitrage proposé |
| --- | --- |
| Recherche A, puis B, puis A | Chaque recherche remplace la précédente ; le dernier A possède résultats, erreur et fin de chargement |
| Pagination, puis recherche ou effacement | La recherche repart en page 1 ; la page ancienne ne peut plus être concaténée, même avec un texte redevenu identique |
| Recherche ou pagination, puis « Tout charger » | Si l'action du store est appelée, elle devient propriétaire ; elle conserve l'effacement immédiat des films et du filtre |
| « Tout charger », puis recherche | Si l'action de recherche est appelée, elle devient propriétaire ; la réponse complète tardive ne remplace pas ses résultats |
| Lecture utilisateurs, puis `update()` après mutation réussie | `update()` invalide la lecture antérieure et relit le filtre actuellement demandé, en adaptant la profondeur comme précisé ci-dessous |
| `update()`, puis nouvelle recherche | La recherche gagne et repart en page 1 ; un ancien succès ou échec de rafraîchissement n'affecte plus la liste ni l'avertissement |
| `update()`, puis autre `update()` | Le dernier rafraîchissement gagne ; le premier ne termine pas `updating` à sa place |
| Lecture ou rafraîchissement en cours, puis scroll | Aucune nouvelle pagination ; pas de mise en file du scroll. Une prochaine demande de scroll pourra charger la suite après stabilisation |

Les lignes « Tout charger » décrivent la robustesse des actions du store, pas une ouverture des boutons : aujourd'hui le bouton est désactivé pendant `loading`, et le champ de recherche est désactivé pendant un chargement qui n'est pas une recherche. La navigation peut recréer un composant sur une liste vide et rappeler une lecture ; son entrelacement réel devra être testé, sans déclarer la portée UI déjà prouvée.

### La pagination exige une base du même contexte

`nextPage()` doit ajouter uniquement la page suivante d'une liste effectivement publiée pour le contexte courant. Une seule page supplémentaire est admise à la fois ; elle capture son filtre, son numéro et sa base de concaténation avant l'attente réseau. Un remplacement ultérieur invalide cet ajout, et deux appels rapprochés ne doivent pas charger deux fois la même page.

Le cas à ne pas oublier est une recherche qui échoue : les lignes de l'ancien filtre peuvent rester affichées, comme aujourd'hui, mais elles ne deviennent pas la page 1 du nouveau filtre. La pagination reste sans effet tant qu'une lecture de remplacement compatible n'a pas réussi. Cela vaut aussi pour A, B, A : l'égalité du texte ne ressuscite pas une ancienne base invalidée. Pas de dédoublonnage des lignes pour masquer une concaténation incorrecte.

Cette garantie porte sur les entrelacements client. Les endpoints paginés ne fournissent pas de snapshot serveur : des insertions ou suppressions concurrentes entre deux pages peuvent déplacer leurs frontières. COR-01 ne promet pas une pagination transactionnelle face à des modifications externes du catalogue ou des comptes.

### Le rafraîchissement reprend le bon filtre et la bonne profondeur

COR-04 doit rester acquis : un rafraîchissement relit uniquement la liste, ne rejoue aucune mutation, et conserve le filtre et les pages déjà chargées lorsqu'ils constituent une base compatible.

- **Liste stabilisée sur deux pages du filtre A :** `update()` relit les deux pages en une lecture et remplace l'ensemble, comme aujourd'hui. Une page 3 seulement en vol n'est pas comptée comme déjà chargée ; sa réponse est invalidée.
- **Ancienne liste A sur cinq pages, puis recherche B en attente ou échouée :** `update()` doit lire la première page de B, pas cinq pages déduites des anciennes métadonnées de A. `state.search` change avant que `state.page` soit mis à jour dans le code actuel ; il faut distinguer contexte demandé et base publiée, sans imposer une remise à zéro visuelle immédiate.
- **Nouvelle recherche pendant le rafraîchissement :** elle devient propriétaire et son résultat remplace la liste. L'ancien rafraîchissement ne peut pas rétablir son filtre, ses lignes ou son avertissement.
- **Erreur courante de rafraîchissement :** anciennes lignes conservées, `updateFailed = true`, rejet vers le parent sans événement ERROR global. La notification et la navigation d'une mutation réussie restent acquises selon COR-04.
- **Erreur de rafraîchissement devenu obsolète :** consommée sans avertissement, événement ERROR ni rejet métier. Son `Promise<void>` se termine sans garantir une publication ; il n'attend pas la requête qui l'a remplacé. Le succès métier déjà enregistré reste indépendant de la fraîcheur de la liste.
- **Avertissement déjà présent :** ne pas l'effacer au démarrage d'une demande ni sur une réponse obsolète. Une lecture courante réussie remplaçant la liste le retire, y compris une recherche réussie ; un ajout de page ne le retire pas. Une recherche courante échouée garde son erreur de recherche et ne transforme pas cet échec en échec de mutation.

### Conserver deux indicateurs, mais une seule propriété

Recommandation : conserver la distinction visible existante au lieu d'assimiler tout rafraîchissement à un chargement bloquant.

| Propriétaire courant | `loading` | `updating` utilisateurs | Conséquence |
| --- | --- | --- | --- |
| Lecture initiale, recherche, pagination ou chargement complet | vrai | faux | Présentation de chargement existante ; recherche réentrante pendant sa propre recherche |
| Rafraîchissement utilisateurs | faux | vrai | Recherche encore disponible ; bouton de relance en attente lorsqu'il est présent ; pagination suspendue |
| Aucun | faux | faux | Indicateurs arrêtés, sans attendre les requêtes obsolètes |

Les indicateurs sont transférés dès le démarrage du nouveau propriétaire, pas laissés aux `finally` des anciennes opérations. Aujourd'hui `nextPage()` ignore `updating` : le garde-fou doit couvrir les deux activités. Un compteur de toutes les requêtes réseau serait trompeur, car il maintiendrait l'attente à cause de lectures qui n'ont plus aucun droit de publication.

Alternative possible : mettre `loading` à vrai pendant `update()`. Elle simplifierait certains garde-fous, mais désactiverait la recherche et changerait les spinners pendant le rafraîchissement ; ce n'est pas la recommandation. Bloquer toute interaction jusqu'à chaque réponse ou sérialiser les recherches ferait aussi attendre les nouvelles intentions derrière les anciennes.

### Un contrôle local de publication suffit comme première solution

Le mécanisme retenu est une identité d'opération courante par store et une référence privée à la base publiée, nécessaires à la validité de la pagination et à la profondeur de rafraîchissement. Pas de store générique, bibliothèque ou nouveau contrat de résultat. Les paramètres sont capturés au départ et tous les chemins de publication vérifient la propriété.

L'annulation réseau reste une optimisation facultative, non nécessaire à la première correction. Elle ne protège pas à elle seule des réponses déjà reçues ou des erreurs déjà engagées, et imposerait de modifier le transport pour accepter un signal. Aucun timeout, retry automatique ou traitement des écritures à résultat incertain n'est proposé.

### Les vérifications devront séparer la règle du store et l'accès UI

Après autorisation d'implémentation, compléter les tests des vrais stores avec réponses contrôlées : dernier A publié avant le premier ; ancien succès et ancienne erreur pendant l'attente courante ; erreur courante puis ancienne réussite ; recherche contre page suivante dans les deux ordres de résolution ; double scroll ; chargement complet contre recherche ; rafraîchissement contre recherche et pagination ; deux rafraîchissements ; ancien échec après récupération réussie de COR-04. Vérifier à chaque frontière les lignes exactes, métadonnées, erreurs et indicateurs, pas seulement l'état final.

Ajouter le cas asymétrique cinq pages A puis recherche B et rafraîchissement : vérifier la requête page 1 de B à profondeur normale, ainsi que l'absence de pagination sur l'ancienne base après échec de B. Garder en contrôle le rafraîchissement normal à deux pages de COR-04 et la reprise de pagination après réussite. Les anciens échecs ne doivent ni créer ni rétablir `updateFailed` après une lecture courante réussie.

Côté navigateur, reproduire A, B, A avec le vrai délai et des réponses retenues, vérifier champ, spinners et absence de dialogue obsolète ; tester le rafraîchissement avec recherche et scroll, ainsi que la navigation sur liste vide. Ne pas modifier les boutons pour rendre accessible un entrelacement purement module. Exécuter ensuite lint, typage ciblé de recherche et suite complète ; aucune de ces vérifications n'a été exécutée pour le présent cadrage documentaire.

## Historique des choix techniques du 17 novembre 2026

La demande initiale « Propose une implémentation de COR-01 » a donné lieu à une proposition uniquement. Les sources ont été relues sur la même base locale `dev` après COR-04. La [proposition détaillée](https://ampcode.com/artifacts/implementation-cor-01-df6cfeb6-9cb5-4a0e-9185-232ef70c9260) présente le pseudocode, les responsabilités de chaque méthode et la matrice de régression ; l’utilisateur en autorise ensuite explicitement l’implémentation.

- Ajouter deux valeurs privées au niveau module dans chacun des deux stores : un compteur `operationId`, commun à toutes ses lectures, et une référence `publishedBase`, nulle ou contenant le filtre et la taille normale des pages publiées. La profondeur reste dans `state.page`, sans duplication ni nouvel état réactif. Pas de store générique ou de génération supplémentaire : l'invalidation explicite de la base protège aussi A, B, A.
- Incrémenter le compteur seulement pour une requête acceptée ; capturer identité, paramètres et éventuelle base de concaténation avant l'attente. Contrôler l'identité après le transport et dans les chemins d'erreur et de terminaison. Un retour obsolète ne publie ni résultats, ni avertissement, ni rejet métier de rafraîchissement. Transférer immédiatement les indicateurs au démarrage du nouveau propriétaire.
- Une lecture ordinaire de page 1 invalide la base dès son démarrage, sans vider les anciennes lignes ; son échec laisse la pagination suspendue. Un ajout échoué garde sa base pour permettre de retenter la même page. Le chargement complet conserve son effacement immédiat et ne constitue pas une base de pagination à taille normale.
- Placer la garde complète des pages supplémentaires dans `getMovies(page)` et `getUsers(page)`, afin qu'un appel direct ne contourne pas `nextPage()` : base compatible, page suivante immédiate, page restante, aucune activité `loading` ou `updating`. Une demande refusée n'invalide pas l'opération courante. Conserver les méthodes publiques existantes.
- `update()` garde la base compatible et sa profondeur, y compris pour une relance après échec ; sans base compatible, il relit la page 1 du filtre demandé. Capturer aussi la taille normale pour les calculs après réponse. Conserver COR-04 et la séparation `loading`/`updating` ; une recherche peut remplacer le rafraîchissement.
- Aucun changement fonctionnel prévu dans les composants, le transport ou les dépendances. Actualiser les commentaires des contrats des stores et étendre les tests existants `stores.spec.js` et `client.spec.js`. La reprise d'une recherche échouée sans changer de texte n'est pas enrichie d'un nouveau bouton ; la pagination des anciennes lignes reste suspendue jusqu'à une lecture compatible réussie.

### Complément de périmètre accepté : rafraîchir une liste vide

`update()` pouvait publier `state.page = 0` pour une liste vide, puis calculer `page_size = 0` lors d'une relance, alors qu'OpenAPI exige au minimum 1. Ce cas, initialement relevé par lecture, est reproduit sur le store inchangé par le test dédié : taille 0 reçue au lieu de 2 avec la configuration de test. Le complément explicitement autorisé impose `Math.max(1, state.page)` uniquement pour calculer la profondeur de la requête compatible. Les métadonnées publiques, y compris page 0 après rafraîchissement vide, et le backend ne sont pas normalisés.

### Vérifications du cadrage initial

Lecture des stores, consommateurs, transport, tests existants, configuration de typage ciblé et contrat de pagination serveur ; consultation du thread de cadrage. Aucun nouveau test applicatif ni preuve de correction n’avait été exécuté au stade de la proposition. Le contrôle documentaire `git diff --check` réussissait ; l’EPIC restait inchangé. Ces contrôles documentaires ne remplacent pas les exécutions d’implémentation ci-dessous.

## Historique de l’implémentation et des vérifications avant retrait

Deux stores modifiés, sans extraction générique, nouvel état réactif ou modification des composants : `operationId` protège tous les succès, erreurs et terminaisons, `publishedBase` interdit les ajouts sur une base invalidée. Le rafraîchissement conserve la profondeur publiée compatible et la distinction `loading`/`updating` ; les anciennes erreurs ne rétablissent pas l’avertissement COR-04. Une lecture courante réussie remplaçant la liste le retire, pas un ajout de page. Les paramètres et les tableaux à concaténer sont capturés avant l’attente réseau.

Environnement : Node 24.19.0, Chromium `/usr/bin/chromium`, projets desktop 1280 × 800 et mobile 390 × 844. Les tests de stores contrôlent `fetch` en important les vrais singletons ; le serveur Playwright existant crée des bases temporaires et écoute en 4173. Les parcours de mutation utilisent ces seules bases temporaires, pas les données habituelles de `data/` ni le serveur 8080.

| Exécution réelle | Résultat |
| --- | --- |
| `npm run test:client -- stores.spec.js --project=desktop --grep COR-01 --reporter=line --output=../.amp/in/artifacts/cor01-before` avant modification des stores | 12 échecs attendus et 1 réussite de contrôle : ancien A publié, mauvais indicateurs, garde de pagination manquante, chargement complet tardif, rafraîchissement et taille 0. Les échecs sont des assertions de contrat, pas des timeouts |
| `npm run test:client -- stores.spec.js --project=desktop --reporter=line --output=../.amp/in/artifacts/cor01-stores` après correction | 15 réussites, anciens parcours compris ; compléments de contrôles ajoutés ensuite pour le filtre échoué sur cinq pages, l’ancienne erreur de chargement complet et la persistance de l’avertissement au démarrage |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:client -- client.spec.js --grep COR-01 --reporter=line --output=../.amp/in/artifacts/cor01-ui` | 8 réussites : A, B, A avec 999 + 1 ms, ancien échec, spinners et navigation sur liste vide, sur les deux formats |
| Parcours ciblés élargis COR-01 | 36 réussites et 2 échecs de synchronisation du nouveau test de mutation ; diagnostic et corrections de test ci-dessous, sans changement applicatif |
| Relance du parcours `COR-01 rafraîchissement après mutation` après calibrage, sortie `cor01-refresh-final` | 2 réussites : vraie mutation PATCH, deux pages publiées, scroll sans requête supplémentaire pendant le rafraîchissement, recherche plus récente, échec obsolète consommé, résultat filtré exact et mutation confirmée par lecture indépendante ; un seul PATCH |
| `npm run lint` et `npm run typecheck:search`, après les derniers compléments de tests | Réussite sans avertissement ; aucun élargissement du périmètre de typage |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm test` sur les sources et tests finaux | Build réussi, 100 tests réussis en 4,7 minutes (50 par projet), dont 38 exécutions COR-01 : 26 de stores dans Node et 12 de parcours navigateur. Tous les tests antérieurs, notamment COR-04 et sa récupération avec deux pages, restent verts sans modification de leurs scénarios |
| `git diff --check`, index et arrêt du serveur de fixtures | Réussite ; index vide, aucune écoute en 4173 à la restitution |

Les premières vérifications statiques ont signalé un paramètre de fixture vide et un tableau capturé implicitement `any[]` dans le store typé. La fixture utilise désormais `baseURL` et le tableau capturé est annoté `unknown[]` ; aucune règle ou option de typage n’a été désactivée.

Calibrage navigateur : le premier essai du nouveau parcours comptait trois lignes sans vérifier leur identité ; la trace confirme qu’il paginait encore la liste sans filtre avant le délai de recherche. Le test attend maintenant le premier nom filtré. Un deuxième essai comptait sept nœuds pendant une horloge suspendue : six lignes sortantes restaient dans la transition et une seule nouvelle ligne était visible. Reprendre l’horloge après les contrôles de concurrence permet aux timers de retrait de terminer ; les assertions finales conservent exactement une ligne. Ces essais ne sont pas présentés comme des validations réussies et aucun contrôle métier n’a été affaibli.

La concurrence « Tout charger » est accessible via navigation : la liste est vidée au démarrage, un retour depuis l’administration recrée la liste et demande une page normale. Le parcours vérifie 24 films demandés initialement, puis 3 au retour ; la réponse complète tardive ne remplace plus ces 3 films. Aucun bouton n’a été rendu artificiellement disponible.

Captures finales du parcours mutation/recherche inspectées en desktop et mobile : une ligne filtrée, mots de passe masqués, aucun avertissement ou dialogue obsolète, pas de débordement horizontal visible. Le nom long et le contenu du champ sont tronqués sur mobile selon le comportement existant ; les assertions DOM vérifient leurs valeurs complètes. La notification concerne volontairement le compte modifié, distinct du compte recherché ensuite. Ces captures n’établissent pas le comportement à elles seules ; les assertions exécutées portent sur les requêtes, les données, les indicateurs et la notification.

Les journaux, traces et captures de travail restent sous `.amp/in/artifacts/cor01-*` (ignoré) ; la suite complète utilise aussi `www/test-results/` (ignoré). Limites conservées : debounce inchangé, aucune annulation réseau, aucun nouveau bouton de reprise de recherche identique, aucun snapshot serveur ou test Safari/appareil réel. Pas de modification du backend, des dépendances, des composants, de `www.vue2` ou des autres tickets COR.

## Résultat et reprise

Correction et tests spécifiques retirés à la demande de l’utilisateur ; aucun nouveau mécanisme conservé. Les 100 tests mentionnés plus haut concernent uniquement l’implémentation retirée. Les vérifications après retrait sont consignées ci-dessous. Aucune validation de cette correction n’est attendue ; une éventuelle reprise exige une nouvelle demande explicite. Aucun commit ni push.

### Vérifications après retrait

- `git diff --exit-code HEAD -- www` : réussite, aucun écart applicatif ou de test par rapport à la base après COR-04.
- `npm run lint` et `npm run typecheck:search` : réussite après retrait, sans modification des règles ni du périmètre de typage.
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm test` : build réussi et 62 tests réussis en 3,9 minutes, desktop et mobile, dont les parcours COR-04 conservés. Journal de travail : `.amp/in/artifacts/cor01-removal-tests.log` (ignoré). Ces contrôles n’impliquent pas de garantie de priorité entre lectures concurrentes.
- `git diff --check` et `git diff --cached --exit-code` : réussite ; seuls l’EPIC et cette fiche restent modifiés, index vide et HEAD inchangé. Aucune écoute en 4173 après la suite ; données de test temporaires uniquement.

## Traçabilité et livraison

- [Thread d’implémentation](https://ampcode.com/threads/T-01a1e9dc-80d7-7788-b590-37b8d5eda9e5). Checkout partagé `/home/sbe/MEGA Développement/nodejs/@sbesson/filmotheque`, branche locale `dev`, base `0e10db2ae04310a5718e45f04dbc32bc7c58f38f`, après COR-04. Index vide au démarrage ; modifications documentaires préexistantes de cette fiche préservées.
- Autorisation explicite du 17 novembre 2026 : implémenter la proposition et le cas vide, sans commit ni push. Aucune acceptation du résultat présumée.
- [Thread de cadrage des choix de concurrence](https://ampcode.com/threads/T-01a1e9c5-7873-7235-ba2d-ab71b1ae618f), le 17 novembre 2026 ; lecture sur `dev` après COR-04, sans démarrage d'implémentation. Le statut reste uniquement dans l'EPIC, inchangé par ce cadrage.
- [Étape de proposition d’implémentation](https://ampcode.com/threads/T-01a1e9dc-80d7-7788-b590-37b8d5eda9e5), le 17 novembre 2026 ; même checkout, modifications documentaires du cadrage préexistantes préservées. La proposition et son complément ont ensuite été acceptés pour implémentation dans ce même thread.
- Livraison initiale du cadrage : modifications documentaires locales de cette fiche uniquement, sans modification applicative ni test à ce stade, avant l’autorisation d’implémenter. Aucun commit, push ou intégration de cette étape documentaire.
- Livraison historique de l’implémentation, depuis retirée : deux stores, deux fichiers de tests et cette fiche avaient été modifiés localement uniquement ; aucun commit, push, déploiement ou intégration Git.
- Livraison du retrait avant commit documentaire : seuls les documents de suivi restaient modifiés localement. Les changements documentaires préexistants sont préservés. Le pilotage, informé de l’abandon et du retrait, conserve la responsabilité du tableau de l’EPIC. Aucun commit applicatif, push, déploiement ou réécriture d’historique.
- À la demande ultérieure « commit les informations sur l’epic », abandon et historique documentaire enregistrés sur `dev` par le présent commit « Documenter l’abandon de COR-01 dans le suivi de modernisation » : cette fiche et l’EPIC uniquement, aucun code ni test. La correction COR-01 reste retirée ; aucun push autorisé ou effectué.
