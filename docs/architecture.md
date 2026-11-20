# Architecture et décisions techniques

Cette synthèse conserve les choix utiles à la maintenance du client et du stockage. Les commandes d’installation, de démarrage et de vérification restent dans le [README](../README.md#installation-et-démarrage).

## Client et responsabilités

- Le client `www` utilise Vue 3, Vuetify 4 et Vite, avec des composants `.vue` en **Options API**. Une réécriture générale en Composition API, Pinia ou TypeScript n’a pas été retenue.
- Le démarrage attend le chargement de la configuration avant le montage. Les listes lisent `pageSize` dans la configuration au moment de son utilisation, y compris après un import différé.
- Les stores sont des singletons : données réactives dans `state`, écritures des consommateurs par des actions explicites. Attendre une action ne garantit pas son succès ni sa priorité sur les autres requêtes ; les commentaires des stores précisent qui consomme ou propage l’erreur.
- Le transport HTTP commun possède la construction des requêtes et l’interprétation des erreurs. Les services utilisateurs conservent les noms bruts dans les données et encodent leur segment d’URL avec `encodeURIComponent` pour HEAD, GET, PATCH et DELETE.
- Une mutation utilisateur confirmée reste réussie si la relecture de la liste échoue : notification et navigation sont conservées. L’avertissement persistant et « Actualiser la liste » relancent seulement une lecture, jamais la mutation.
- Les routes restent en mode hash, avec les vues nommées de contenu et de toolbar. Les composants et styles de l’administration sont chargés à la demande.

## Présentation et comportements conservés

- Les styles propres aux composants sont dans leurs `.vue`, généralement **sans `scoped`** : leur portée reste globale. Le style scoped de l’avatar est conservé. La palette et les règles communes restent dans [filmotheque.css](../www/modules/filmotheque/filmotheque.css), chargé avant montage, notamment pour le loader.
- Les surcharges Vuetify restantes couvrent les besoins non exprimés par ses props, dont les cartes téléportées. Une modification de portée CSS doit tenir compte des dialogues et du chargement différé de l’administration.
- Les dates restent françaises, avec le traitement de fuseau existant, désormais via `Intl` plutôt que Moment. Les imports Lodash sont ciblés ; aucune nouvelle couche générique de stores ou de transport n’est nécessaire à cette organisation.
- Les tailles utilisent les unités IEC en octets avec `byte-size` 9 : deux décimales au maximum, sans zéros superflus (`1 Mio`, `1,5 Mio` selon la locale du navigateur).
- Recherche temporisée, effacement, pagination, chargement complet, droits, validation, confirmations et état sale des formulaires font partie du comportement à préserver. Les animations comprennent le fondu du fond des films de 500 ms et le signal de ligne utilisateur modifiée de 1 000 ms.
- Le flash compare **numériquement major et minor**, en ignorant volontairement les patchs. La persistance `last_version`, l’ouverture manuelle, le contenu HTML et ses ancres sont conservés.

## Persistance LMDB

- Un environnement `lmdb` 3.5.11 appartient au contexte serveur, dans `storage.databaseDirectory/filmotheque-lmdb`. Il est ouvert avant la construction et l’initialisation parallèle des stores. Les bases nommées sont `movies` et `users` (documents JSON), et `usersByLogin` (valeurs UUID textuelles).
- La clé d’un film est son identifiant TMDB textuel, également stocké dans `_id` et `themoviedb_id`. Le serveur ne lit jamais l’ancien catalogue JSON et ne scanne pas les vidéos au démarrage : un nouveau catalogue est vide, un catalogue LMDB existant est conservé.
- La clé d’un compte est un UUID v4 ; `usersByLogin` associe le SHA-256 hexadécimal du login UTF-8 exact à cet UUID. Le document conserve le `name` original ; les routes, objets `User`, projections et droits restent fondés sur le nom. Après les deux lectures directes, un login différent provoque une erreur explicite de collision ; un index pointant vers un compte absent provoque une erreur d’incohérence. Aucun renommage ni normalisation n’est ajouté.
- Le contrôle d’accès commun des modules HTTP retrouve le compte nommé par `request.auth.user`. `/api/users/me` relit le compte par l’UUID enregistré dans `request.auth` lors de la validation des identifiants, sans exposer cet UUID. Aucun utilisateur connecté n’est conservé dans le store partagé. Un compte absent ne reçoit aucun droit administrateur ; `/me` répond 401 si le compte authentifié a été supprimé pendant l’attente, même si le même login a été recréé. Cette correction serveur ne reprend pas COR-01 et ne modifie ni les transactions de reconstruction ni le script hors ligne.
- Création (contrôle d’unicité compris) et suppression du compte et de son index partagent une transaction du même environnement. Les mises à jour conservent l’UUID. Les callbacks `transactionSync` sont synchrones, avec `putSync`/`removeSync` dans les bases nommées ; ni cache, ni writemap, ni mode sans synchronisation. `overlappingSync: false` est explicite. Ne pas remplacer ces opérations par une autre variante de transaction sans revérifier ses garanties de rollback.
- `UsersStore.rebuildLoginIndex()` reconstruit uniquement l’index depuis les comptes bruts et leurs UUID, sans dépendre de l’ancien index ni transformer les documents via `User`. Le vidage et les écritures forment une transaction : compte invalide, doublon de login, collision ou erreur avant commit restaurent l’ancien index. L’opération participe au suivi des mutations et attend la synchronisation disque. Elle est accessible par `POST /api/users/index/rebuild`, réservé à l’administrateur, et par `scripts/rebuild_users_login_index.js --config …`, application arrêtée, si l’index empêche l’authentification administrateur. Le script n’initialise aucun compte et ne lit aucun ancien JSON ; une base vide reste vide. L’arrêt préalable est une obligation opérateur, pas une détection automatique. Aucun appel automatique n’est ajouté au démarrage.
- Les mutations attendent `root.flushed` avant de confirmer leur réussite. Un échec de cette attente après commit est signalé comme durabilité non confirmée, pas comme un rollback de données déjà visibles. Cela ne prouve pas la résistance à une panne électrique ni les garanties du matériel. La [procédure de reprise](reprise-lmdb.md) distingue les phases d’échec et restaure un cliché de l’environnement entier dans un emplacement neuf.
- La fermeture finale refuse les nouvelles mutations, attend les opérations engagées (y compris un import encore en lecture), synchronise puis ferme LMDB. L’arrêt HTTP précède cette fermeture ; SIGUSR1 ne ferme pas LMDB. Les échecs d’initialisation attendent les autres initialisations avant nettoyage ; les échecs de démarrage HTTP ferment aussi la base.
- La recherche reste un parcours synchrone des documents : champs réunis, accents et casse ignorés, caractères de requête échappés puis blancs remplacés par `.*`. Les fragments doivent apparaître dans l’ordre ; `man` retrouve toujours « Batman », `futur retour` ne retrouve pas « Retour vers le futur ». Tri et pagination restent dans les middlewares existants. Ni Orama ni la projection JavaScript étudiée ne sont retenus ; aucun index de recherche des films n’est ajouté.
- L’import manuel est un **remplacement complet transactionnel**, pas un import différentiel. Il exige TMDB, choisit le premier fichier valide dans l’ordre lexicographique fixe en cas de doublon, refuse un inventaire sans film valide et refuse un import simultané. Le rapport expose les anomalies et le refus. Un fichier connu devenu illisible peut encore disparaître si d’autres fichiers sont valides ; le catalogue est réécrit même si l’inventaire est identique. L’import différentiel et la protection des fiches en erreur ne sont pas implémentés.
- Le démarrage ignore les anciens JSON des comptes et ne vérifie aucun état de migration. Si la base de comptes LMDB est vide, le compte initial est créé avec son index dans une transaction, y compris après un vidage d’une base déjà utilisée. Un échec avant commit permet une reprise au prochain démarrage ; une base non vide est conservée. Aucun marqueur de bootstrap n’est nécessaire.
- La migration des comptes est un script explicite, `scripts/migration_users.js`, à exécuter application arrêtée sur une destination supposée cohérente entre comptes et index. Le contrôle préalable compte uniquement les comptes, sans audit ni comptage de l’index : aucun compte, ou uniquement le compte initial `serge` strictement inchangé. La définition `UsersStore.initialUser`, commune au démarrage et à la comparaison brute du compte enregistré, évite de dupliquer les valeurs initiales. Dans ce seul cas, compte initial et index sont retirés dans la transaction globale d’import ; un échec avant commit les restaure, UUID compris. Un compte modifié, un autre compte ou une source vide/invalide est refusé. Les documents `json-db` sont validés sans passer par les valeurs par défaut de `User` : leurs champs restent inchangés, hors retrait de `__private__`. Les nouveaux UUID et l’index SHA-256 sont écrits dans la transaction ; la confirmation attend la synchronisation disque, la relecture des documents et le contrôle des comptages des comptes et de l’index. Aucun autre compte préexistant n’est fusionné ou modifié, aucun film n’est touché, aucun fichier JSON n’est modifié ou supprimé. Aucun marqueur ne prouve l’historique : une migration ne produisant que le compte initial à l’identique peut être relancée et lui réattribuer un UUID. La bascule réelle et le nettoyage éventuel des JSON sont des opérations distinctes de la qualification sur copies.
- Le répertoire `filmotheque-lmdb/` est exclu de Git, y compris hors de `data`. Aucun store, script de migration ou fixture n’importe `@sbesson/json-db`. Il reste transitif : `@sbesson/configuration-loader` charge son module de couche JSON même lorsque seules les couches fichier et environnement sont sélectionnées.

### Mesure de référence de la recherche

Mesure du 20 novembre 2026 sur 10 000 films synthétiques : Node 24.19.0, LMDB 3.5.11, Linux x64, Intel i5-1135G7, ext4. Chaque cas redémarre Express sur les fixtures de **4173** ; les caches OS ne sont pas purgés. Le temps HTTP inclut la lecture du corps, sans décodage JSON. Les nombres de résultats et tous les identifiants de la page sont contrôlés. Les p50/p95 portent sur 50 requêtes séquentielles après la première, avec p95 au rang 48.

| Recherche | Résultats | Première (ms) | p50 / p95 à chaud (ms) |
| --- | ---: | ---: | ---: |
| `phare ete` (ordre inversé) | 0 | 95,49 | 25,96 / 34,60 |
| `ETE + phare` (casse, accent, `+` littéral) | 1 | 102,99 | 47,95 / 51,84 |
| `iction`, page 2 de 30 | 9 500 | 130,79 | 55,05 / 63,35 |
| Sans filtre, page 1 de 30 | 10 000 | 124,14 | 55,40 / 71,58 |
| Sans filtre, tout charger | 10 000 | 188,95 | 116,17 / 143,54 |

Les requêtes larges trient avant pagination ; « tout charger » transfère aussi environ 2,2 Mo de JSON. Le RSS maximal observé après réponse va de 153 à 275 Mio selon le cas, sans garantie de capturer les pics synchrones. Ce corpus et ces mesures ne qualifient ni les performances des données habituelles, ni la charge concurrente, ni un budget d’exploitation. L’[étude comparative Orama](https://ampcode.com/artifacts/filmotheque-lot-3-16051251-4c83-40b8-a096-dcf0068ae909), hors HTTP, reste une référence d’étude et non une fonctionnalité à intégrer.

## Vérifications et périmètre de l’outillage

Le développement utilise Node 24 à partir de 24.11 et ESLint 10 avec des configurations plates. Le manifeste client exige `^22.22.0 || >=24.11.0` pour les dépendances d’outillage de Vue Router 5. Le manifeste serveur conserve `^20.19.0 || >=22.12.0` pour servir un client précompilé ; `npm start` reconstruit le client et utilise donc le Node d’outillage. La CI est **différée**, pas implicitement à mettre en place.

`npm run typecheck:search` vérifie un contrat JavaScript/JSDoc ciblé avec `vue-tsc` et TypeScript 6.0.3 : store films, composant de recherche et conformité du vrai producteur. TypeScript 7 n’est pas utilisé, faute de l’API du compilateur JavaScript attendue par `vue-tsc` 3.3.14. `noImplicitAny: true` ne rend pas tout le client typé : les corps importés ne sont pas contrôlés, des `any` peuvent se propager et les réponses JSON ne sont pas validées. Watchers textuels, props globales, autres consommateurs et concurrence ne sont pas couverts ; le projet actif de VS Code n’est pas aligné automatiquement. Les détails et commandes d’inventaire sont dans le [README](../README.md#vérifications).

Les tests navigateur utilisent le vrai serveur Express sur **4173**, avec des données temporaires, distinct du serveur habituel **8080**. Les tests HTTP/stores/configuration utilisent Node et un `fetch` simulé. Les projets desktop et mobile utilisent Chromium ; le mobile est émulé, sans garantie Safari, Firefox ou appareil physique. Les garde-fous sur les exceptions navigateur et les dialogues d’erreur ne constituent pas une détection exhaustive des erreurs internes.

**Validation de fin de chantier, le 17 novembre 2026 :** lint, typage ciblé, build et 106 tests réussis sous Node 24.19.0 ; essais manuels déclarés concluants par l’utilisateur, sans inventaire exhaustif des parcours. Ce constat historique n’est pas une validation automatique des changements ultérieurs.

## Limites connues et décisions acceptées

- **Concurrence des listes (COR-01) : correction abandonnée par arbitrage coût/bénéfice.** Son implémentation et ses tests ont été retirés. Les réponses, erreurs et indicateurs peuvent devenir obsolètes lorsque recherche, pagination, chargement complet ou rafraîchissement se chevauchent, notamment dans une séquence A → B → A. Après rafraîchissement d’une liste utilisateurs vide, un nouveau rafraîchissement peut demander `page_size=0`. Ces limites sont acceptées ; aucune reprise sans nouvelle demande explicite.
- **Contrats backend hors périmètre :** supprimer un compte déjà absent peut renvoyer 500 au lieu de 404 ; créer un doublon peut renvoyer 500 au lieu de 400, ces réponses étant absentes des schémas OpenAPI. Les corrections client n’ont pas corrigé ces écarts serveur.
- **Dépendances :** Vue Router 5 apporte `@vue/devtools-api` 8.2.1 et résout le peer optionnel incohérent de `@vuetify/v0` ; `npm ls --all` côté client réussit. L’audit client conserve toutefois l’avis ReDoS [GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf) sur `picomatch`, propagé à plusieurs dépendances d’outillage. La montée de version n’est pas une correction globale de sécurité.
- **Sécurité non refondue :** mots de passe affichables par l’administration, HTML du flash issu du Markdown administré sur le serveur et déconnexion Basic Auth par XHR restent des contraintes existantes. Le flash utilise `v-html` et du Markdown autorisant le HTML ; y injecter du contenu utilisateur non fiable imposerait une révision de ce contrat. La modernisation ne constitue pas un audit de sécurité ; un remplacement de la déconnexion par `fetch` n’est pas présumé équivalent.

## Archives du chantier

Les dix refactorings MOD et les corrections COR-02, COR-03 et COR-04 ont été acceptés ; COR-01 est abandonné. L’EPIC, la revue, les quatorze fiches et leurs 22 captures ont été retirés de la documentation courante, pas de l’historique Git.

Le tag **local** `archive/modernisation-vue3` conserve les 38 fichiers exacts avant nettoyage, y compris la validation finale. Ce tag n’a pas été poussé lors du nettoyage ; pour le consulter depuis un autre clone, il faut aussi transférer cette référence et ses objets Git. Les anciens statuts, références de commits et consignes de pilotage sont historiques, pas des instructions de travail actuelles.

L’ancienne sauvegarde `www.vue2`, non servie par l’application, a également été supprimée du dossier courant sur demande de l’utilisateur. Ses 49 fichiers restent disponibles dans ce même tag.

Pour consulter le suivi archivé sans restaurer les fichiers :

```sh copy Copy Archived Epic
git show archive/modernisation-vue3:docs/modernisation/EPIC.md
```
