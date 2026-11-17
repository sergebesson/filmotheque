# MOD-03 Responsabilité des erreurs asynchrones

[EPIC : état, dépendances et thread](../EPIC.md) · [Revue : R05](../REVUE.md)

## Objectif et origine

Rendre explicite qui possède une opération asynchrone, qui propage son erreur et qui l’affiche, sans changer les messages, notifications ou parcours de récupération.

Sources à relire : [transport HTTP](../../../www/common/call-api-backend.js), [service utilisateur](../../../www/modules/users/services/user.service.js), [formulaire](../../../www/modules/users/components/user-detail.vue), [parent utilisateurs](../../../www/modules/users/users.vue), [stores](../../../www/stores/user-list.store.js), [dialogue d’erreur](../../../www/modules/error/error.vue), [gestionnaire Vue](../../../www/app.js).

## Périmètre et exclusions

- Clarifier le contrat d’erreur des appels et la responsabilité de rafraîchissement après création, modification ou suppression.
- Garder les notifications métier hors du transport HTTP et éviter un affichage doublé lors d’une propagation.
- Ne pas ajouter retry, timeout, file d’erreurs, nouveaux textes ou nouvelle politique de notification. Ne pas modifier la déconnexion XHR.
- Si un échec révèle un bug nécessitant un résultat visible différent, le documenter et demander une correction séparée plutôt que l’inclure dans le refactoring.

## Critères d’acceptation

- [x] Le contrat indique quelles opérations rejettent et qui présente leurs erreurs ; les appelants respectent ce contrat.
- [x] Les erreurs API et réseau déjà prises en charge gardent leur texte et leur affichage sans dialogue supplémentaire.
- [x] Le formulaire et le rafraîchissement de liste ont des responsabilités lisibles, avec fin des états d’envoi conforme au comportement de référence.
- [x] Le transport conserve corps JSON, réponses vides, `error.response` et statuts personnalisés, notamment HEAD 204/404.

Ces cases consignent les vérifications techniques ci-dessous ; l'acceptation utilisateur est enregistrée dans la traçabilité. Le statut courant reste uniquement dans l’EPIC.

## Vérifications prévues

`npm run lint` et `npm test`. Exercer erreurs JSON, HTML, réseau, mutation refusée et mutation réussie suivie d’un échec de rafraîchissement ; relever le comportement avant refactoring pour distinguer contrat et anomalie. Vérifier les succès HEAD/DELETE sans corps. Les assertions doivent porter sur l’affichage ou le résultat public, pas sur le nombre d’appels internes.

### Exécution du 15 novembre 2026

Base vérifiée dans le même checkout : `dev` à `70c66e362f6af71884d655835092909f523fc0a2` (« Rendre explicites les actions des stores (MOD-02) »), arbre et index initialement propres. Les commits locaux de suivi, MOD-01 et MOD-02 sont présents ; documents et sources disponibles. AGENTS applicables, EPIC, fiches MOD-02/MOD-03, R05 et thread précédent relus. Node 24.19.0, Chromium 157 via `/usr/bin/chromium`. Aucun outil GX, accès Git distant ou donnée de production utilisé.

| Contrôle réellement exécuté | Résultat |
| --- | --- |
| Inventaire `git grep` des appels HTTP et des consommateurs de `User` | Chargement/mutations consommés par le formulaire, HEAD consommé par le validateur Vuelidate ; rafraîchissement possédé par le parent. Aucun autre consommateur applicatif oublié |
| `npm run build`, avant refactoring | Succès ; application de référence compilée |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:client -- --grep 'HTTP :\|utilisateurs (created\|updated\|deleted)'`, avant refactoring | 16 réussites après calibrage de la navigation mobile ; contrat HTTP et refus/succès de mutation suivis d'échec de rafraîchissement caractérisés |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:client -- --grep 'utilisateurs : erreurs du'`, avant refactoring | 4 réussites après calibrage des reprises de formulaire ; chargement et validation caractérisés avec erreurs JSON, HTML et réseau |
| `npm run lint`, après refactoring | Succès après remplacement des déclarations de fonctions de test dans une boucle par des expressions, conformément au lint existant ; aucun assouplissement de règle |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm test`, après refactoring | Build réussi et 46 tests réussis en 3 minutes : 26 scénarios historiques, 16 nouveaux parcours navigateur et 4 contrôles HTTP (projets desktop/mobile) ; test de store utilisateurs étendu au rejet du rafraîchissement |
| `npm run lint` puis `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:client -- --grep 'validation, création, modification et suppression'`, contrôle complémentaire | Succès et 2 tests réussis après ajout des assertions sur les trois textes de notification de succès ; aucun changement applicatif depuis la suite complète |
| `git diff --check`, relecture du diff et de l'index | Succès ; index vide, changements limités à MOD-03 |
| `npm run lint`, `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:client -- http.spec.js stores.spec.js` et `git diff --check`, contrôle avant commit après acceptation | Succès et 8 tests réussis ; aucun changement applicatif depuis la suite complète de 46 tests, seules l'acceptation et la livraison documentaire sont actualisées |

Les tests [navigateur](../../../www/tests/client.spec.js) exercent le vrai client compilé sur le serveur et les bases temporaires existants. Les erreurs et le succès de mutation avant rafraîchissement refusé sont des réponses contrôlées par Playwright, sans écriture de ces mutations dans la base ; le parcours CRUD de succès utilise séparément le vrai backend. Assertions sur dialogues, textes, route, liste, notifications, champs, boutons, spinner, récupération et absence de `pageerror`, pas sur le nombre d'appels internes. Le formulaire est observé aussi pendant que le rafraîchissement est retenu, avant son échec.

Les tests [HTTP](../../../www/tests/http.spec.js) utilisent les fonctions réelles avec `fetch` simulé : corps et en-têtes JSON, réponse JSON, HEAD 204/404 accepté (résultat vide `""`, booléen du service), DELETE 204 sans corps ni Content-Type de requête, rejet JSON/HTML avec `error.response`, JSON malformé rejeté en `SyntaxError`, erreur réseau propagée par identité. Le test [du store](../../../www/tests/stores.spec.js) vérifie aussi le rejet 403 de `update()`, la libération de `updating`, la conservation de la liste/du filtre et l'absence d'un nouvel événement ERROR.

Calibrage des nouveaux tests avant changement applicatif : les six échecs mobiles initiaux demandaient une liste visible alors que le détail la masque ; les scénarios passent désormais par la liste puis ouvrent le formulaire. Les essais du chargement/contrôle du nom réutilisaient une URL hash déjà ouverte ou tentaient de quitter un formulaire sale sans accepter sa confirmation ; les scénarios ferment explicitement le formulaire entre essais. Corrections des tests seulement, aucun comportement modifié pour obtenir ces résultats.

Limites : Chromium uniquement, viewports 1280 × 800 et 390 × 844 ; aucun appareil réel, Firefox ou Safari. Pas de modification d'apparence : vérification DOM/accessibilité des interactions et des états concernés, aucun style ni template changé. Le CSS compilé conserve le nom de contenu `index-bTd8vvE7.css`. L'avertissement Vite de chunk JS supérieur à 500 kB subsiste. Aucun script temporaire ajouté pour ce ticket ; les sorties Playwright restent locales et ignorées.

## Décisions

### Contrat et responsabilités après caractérisation

R05 est confirmé sur les sources de départ : `User` affichait puis relançait, le formulaire capturait, les lectures de listes consommaient ERROR et `update()` rejetait vers le parent, puis le gestionnaire Vue. Le refactoring déplace seulement les frontières de présentation ; aucune nouvelle politique d'erreur n'est approuvée.

| Opération / propriétaire | Propagation et présentation |
| --- | --- |
| `callApiBackend()` | Résout `{ status, data }`, avec chaîne vide pour corps vide. Rejette les statuts non acceptés avec `error.response` ; propage sans enveloppe les erreurs réseau/décodage JSON. Aucun affichage ni notification métier. Implémentation inchangée, commentaire de contrat ajouté |
| `User.getByName()` / `load()`, `saveUser()`, `createUser()`, `deleteUser()` | `Promise<User>` : ne publient les données et `isDeleted` qu'après succès, rejettent sans afficher. Le formulaire attend, présente ERROR une fois et consomme le rejet. Échec du chargement : l'événement local `error` conserve uniquement la sortie vers la liste |
| `User.userExists()` | `Promise<boolean>` : 204 → vrai, 404 → faux ; les autres erreurs rejettent sans afficher. Le validateur de `User.validations()` possède le contrôle du nom : il présente le message existant puis relance vers Vuelidate, qui termine la validation en échec et consomme le rejet. La structure et les règles de validation restent en place pour MOD-04 |
| Lectures films/utilisateurs, `setSearch()`, `nextPage()`, chargement complet, `loadMe()`, `loadInfos()` | Présentation ERROR et consommation du rejet conservées chez les propriétaires existants ; aucun déplacement ni changement de concurrence |
| `userListStore.update()` | `Promise<void>` : rejette sans ERROR, libère `updating` dans `finally`. Le parent `users.vue` attend et présente désormais explicitement « Une erreur est survenue », sans relancer vers Vue |
| Formulaire après mutation réussie | Réinitialise la validation, émet `updated`, termine `sending` sans attendre le parent. L'événement n'est pas transformé en callback/promesse ; pas de couplage entre `sending` et le rafraîchissement |
| Parent après `updated` | Rend le détail propre et possède le rafraîchissement. Notification et navigation restent après sa réussite seulement ; un échec est consommé après présentation, sans rejouer la mutation |
| `error.vue`, gestionnaire Vue et démarrage | Dialogue commun et règle ignorant les erreurs pendant qu'il est ouvert inchangés ; pas de file. Le gestionnaire Vue reste le recours pour erreurs non consommées. `configurationStore.load()` rejette toujours vers `main().catch()`, qui redirige vers la page d'erreur |

Les messages de chargement, création, sauvegarde, suppression et contrôle du nom sont déplacés à l'identique, sans nouveau texte ni traducteur d'erreur. Les notifications restent dans `users.vue`. Aucun wrapper HTTP, helper de présentation ou nouvel événement ajouté. Corps POST/PATCH, URL, ordre de validation/réinitialisation, routes, données, confirmations et textes de notification inchangés. Pas de retry, timeout, annulation réseau, correction COR-* ou changement de la déconnexion XHR. MOD-04 et les autres tickets ne sont pas commencés.

### Comportement de référence conservé, y compris les limites de récupération

| Cas caractérisé avant et revérifié après | Résultat observable |
| --- | --- |
| Chargement du détail refusé (JSON, HTML, réseau) | Un dialogue avec « Impossible de récupérer l'utilisateur alice » et le détail existant ; sortie vers la liste, puis réouverture fonctionnelle |
| Contrôle du nom refusé (JSON, HTML, réseau) | Un dialogue avec « Impossible de savoir si l'utilisateur 'alice' existe » ; fin de validation en échec, fermeture et nouvelles saisies possibles, distinction nom existant/disponible conservée |
| POST/PATCH/DELETE refusé (JSON, HTML, réseau) | Un dialogue avec le texte métier existant, pas de notification ni sortie du détail ; `sending` terminé, champs/actions réutilisables et abandon possible |
| Mutation réussie, rafraîchissement en attente | Formulaire propre, `sending` déjà terminé et enregistrement désactivé ; champs/fermeture actifs après création/modification, mais désactivés après suppression. Pas encore de notification/navigation |
| Mutation réussie, puis rafraîchissement 503 JSON refusé | Un dialogue générique avec détail 503 ; ancienne liste et route conservées, aucune notification. `updating` libéré. Après création/modification, fermer reste possible sans confirmation d'abandon ; après suppression, sortie par le menu films possible sans confirmation |
| Mutation et rafraîchissement réussis | Textes des trois notifications conservés ; création vers le détail, modification sur place, suppression vers la liste ; fin des états et vrais HEAD/DELETE vérifiés par le CRUD |

**Anomalie conservée, à soumettre séparément :** après suppression réussie puis échec du rafraîchissement, `isDeleted` reste vrai et le bouton Fermer ainsi que les champs restent désactivés sur la route du détail supprimé. La mutation n'est pas annulée ; le menu permet encore de sortir. La création reste de même sur sa route de création si le rafraîchissement échoue. Corriger ces routes ou proposer une nouvelle récupération/notification modifierait le comportement visible : aucune correction incluse dans MOD-03. Demander une autorisation distincte avant de définir et réaliser cette correction, sans ouvrir ni commencer un COR implicitement.

## Résultat et reprise

Le 15 novembre 2026, après démarrage de l'application locale et essais manuels concluants rapportés par l'utilisateur, celui-ci valide MOD-03 et demande son commit ainsi que sa clôture dans le suivi. Les opérations HTTP utilisateur propagent leurs erreurs ; formulaire/validateur et parent possèdent explicitement leur présentation. Les scénarios avant/après conservent le résultat visible, y compris l'anomalie décrite ci-dessus, non corrigée et sans nouvelle autorisation de correction.

Code, tests et suivi sont regroupés dans le présent commit local « Clarifier la responsabilité des erreurs asynchrones (MOD-03) » sur `dev`, branche de référence convenue. Les critères vérifiés, l'acceptation utilisateur et cette intégration locale permettent la clôture dans l'EPIC. Aucun push n'est autorisé par cette demande.

Pour reprendre : vérifier l'arbre de travail, la présence de ce commit sur `dev` et le suivi du prochain ticket explicitement autorisé. Dans un autre environnement, transférer les commits locaux de suivi/MOD-01/MOD-02/MOD-03, comprenant notamment `www/tests/http.spec.js`, ou utiliser une référence rendue accessible après autorisation de push : ni le lien de thread ni un SHA non poussé ne transfèrent les fichiers. Aucun autre ticket ni COR n'est commencé ; l'éventuelle correction du parcours de récupération demande une décision séparée.

## Traçabilité et livraison

- Thread d'implémentation : [MOD-03 dans le checkout local](https://ampcode.com/threads/T-01a1e0e3-51b2-7065-bef2-48148dca5801), en reprise du [thread MOD-02](https://ampcode.com/threads/T-01a1e0b8-c0e7-72ed-9da7-0e2446f3f9fb).
- Référence de départ : branche de référence locale `dev`, HEAD `70c66e362f6af71884d655835092909f523fc0a2`, arbre et index initialement propres ; MOD-01/MOD-02 déjà acceptés et intégrés localement, non poussés.
- Livraison réelle : présent commit local « Clarifier la responsabilité des erreurs asynchrones (MOD-03) », contenant code, tests et suivi sur `dev`, branche de référence convenue. Intégration locale uniquement ; aucun push, merge supplémentaire, déploiement ou publication.
- Acceptation utilisateur : obtenue le 15 novembre 2026 dans ce thread après ses essais manuels, avec demande explicite de commit et de clôture de MOD-03. Le tableau de l'EPIC est actualisé directement dans cette reprise. La validation n'autorise ni autre ticket ni correction de comportement.
- Contrôle avant commit : diff et index relus, aucun changement extérieur constaté ; lint, 8 tests ciblés HTTP/stores et `git diff --check` réussis. L'application démarrée pour les essais reste en écoute locale sur le port 8080 ; ses données locales ne sont pas incluses dans le commit.
