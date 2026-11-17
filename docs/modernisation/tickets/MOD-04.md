# MOD-04 Données, HTTP et validation des utilisateurs

[EPIC : état, dépendances et thread](../EPIC.md) · [Revue : R04 et R06](../REVUE.md)

## Objectif et origine

Réduire l’indirection et clarifier données, HTTP et validation dans le module utilisateurs, sans réécrire son formulaire ni modifier ses règles.

Sources à relire : [service User](../../../www/modules/users/services/user.service.js), [formulaire](../../../www/modules/users/components/user-detail.vue), [parent utilisateurs](../../../www/modules/users/users.vue), [enveloppe Vuelidate](../../../www/modules/common/field-vuelidate/field-vuelidate.vue), [validateur](../../../www/common/vuelidate-validator.js), [schémas API](../../../server/api/modules/users/openapi/schemas.yml).

## Périmètre et exclusions

- Simplifier le modèle et ses accesseurs si une représentation plus directe améliore réellement la lisibilité ; conserver des frontières cohérentes dans le module.
- Rechercher les références de `toJson()` et du code susceptible d’être devenu inutile avant suppression.
- Préserver les champs autorisés des payloads POST/PATCH, l’unicité asynchrone, le délai de validation du nom et les états dirty/pending/sending.
- Ne pas traiter l’encodage COR-02, changer les règles métier, l’exposition des mots de passe, les protections administrateur ou imposer une conversion Composition API.

## Critères d’acceptation

- [x] Les responsabilités sont plus lisibles sans nouveaux niveaux de délégation inutiles ; le bilan de simplification est explicité.
- [x] Les payloads autorisés et réponses utilisées restent conformes au contrat backend, sans envoyer l’objet entier par facilité.
- [x] Nom en création, mot de passe, description et genre restent obligatoires ; pseudo facultatif ; contrôles d’unicité et de longueur inchangés.
- [x] Abandon, réinitialisation entre utilisateurs, masquage du mot de passe, gras des champs dirty, confirmations et protections administrateur sont préservés.

Ces cases consignent les contrôles techniques ci-dessous, pas une acceptation utilisateur. Le statut courant reste uniquement dans l’EPIC.

## Vérifications prévues

`npm run lint` et `npm test`, avec création, modification, suppression, refus d’abandon puis abandon, nom déjà pris et validation asynchrone. Vérifier qu’afficher le mot de passe ne rend pas le formulaire sale et qu’il est remasqué au changement d’utilisateur. Inspecter les rendus si la structure ou les classes de formulaire changent.

### Exécution du 16 novembre 2026

Départ vérifié dans le checkout demandé : branche locale `dev`, HEAD `82f17e51191b2f11bce35ee5a095185aa106152d`, arbre et index propres ; commits MOD-01 à MOD-03 et documents présents. AGENTS applicables, EPIC, MOD-03/MOD-04, R04/R06 et sources actuelles relus. Méthode de test MOD-03 reprise : Playwright, vrai client compilé, serveur et bases temporaires de `tests/server.cjs`, sans utilisation des bases de `data`. Node 24.19.0 et Chromium via `/usr/bin/chromium`. Aucun outil GX utilisé.

Le serveur manuel historique ne répondait plus sur `localhost:8080` (`curl` : code HTTP 000 ; aucune écoute constatée ensuite avec `ss`). Il n’a pas été redémarré. Les tests lancent et arrêtent leur propre serveur sur 4173.

| Contrôle réellement exécuté | Résultat |
| --- | --- |
| Inventaire `git grep` de `User`, `toJson()`, `validations()`, `configuration` et `load()` | Formulaire seul consommateur applicatif de `User` ; parent consommant le nom dans `updated`. Aucun appel client de `toJson()` ; `validations()` uniquement dans le formulaire, configuration uniquement interne, `load()` uniquement via `getByName()`. Version historique `www.vue2` laissée intacte |
| Lecture des schémas, routes backend, réponses et `server/stores/user.js` | POST/PATCH utilisent le détail complet en réponse ; champs de requête distincts conservés, dont exclusion de `name` dans PATCH et des indicateurs administrateur/suppression dans les deux payloads |
| `npm run build`, avant refactoring | Succès, CSS `index-bTd8vvE7.css` |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:client -- --grep 'User :\|délai du nom\|abandon refusé'`, avant refactoring | 6 réussites après calibrage de l’horloge du nouveau test, sur desktop/mobile ; données/payloads et interactions caractérisés sur le code MOD-03 |
| `npm run lint`, après refactoring | Succès, sans modification des règles |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm test`, après refactoring | Build réussi et 50 tests réussis en 2,8 minutes : les 46 cas antérieurs, plus deux scénarios exécutés chacun sur desktop/mobile ; tests de stores existants réutilisés sans modification |
| Comparaison du template avec `HEAD`, relecture du diff et `git diff --check` | Template strictement identique, styles et composants communs inchangés ; aucun problème de whitespace, aucun changement extérieur ni fichier indexé |
| `npm run lint`, `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:client -- http.spec.js stores.spec.js` et `git diff --check`, avant commit après acceptation | Succès et 10 tests réussis ; code applicatif et tests inchangés depuis la suite complète de 50 tests. Seules l’acceptation et la livraison documentaire sont actualisées |

Le premier essai du nouveau scénario de délai a donné 4 réussites et 2 échecs avant changement applicatif : après la réponse HEAD, Enregistrer était déjà actif mais le message « Vérification du nom en cours » restait dans le DOM. L’horloge Playwright suspendue retenait aussi sa transition de sortie Vuetify. Reprendre l’horloge juste après libération du HEAD permet de terminer l’animation ; les 6 contrôles passent alors sur le code initial. Aucun correctif applicatif ni assouplissement d’assertion inclus pour ce calibrage.

Couverture utile des tests :

- [HTTP](../../../www/tests/http.spec.js) : nouveau scénario sur les vraies opérations de `User` avec `fetch` simulé. Égalité exacte des corps POST/PATCH avec valeurs asymétriques (`active: false`, pseudo vide, genre différent), retour de l’instance et reprise des données serveur après création/chargement/sauvegarde, dont pseudo normalisé et indicateur administrateur. Les contrôles existants couvrent HEAD 204/404, DELETE sans corps, erreurs JSON/HTML, JSON malformé et réseau.
- [Navigateur](../../../www/tests/client.spec.js) : nouveau scénario avec horloge contrôlée, aucun message pending à 999 ms, message et enregistrement bloqué à 1000 ms tant que HEAD est retenu, puis formulaire valide avec pseudo vide après vraie réponse 404. Vérification de l’erreur sur description vidée. Le parcours d’abandon existant vérifie désormais aussi le gras effectif du pseudo modifié (400 → 700 → 400 après changement d’utilisateur) et l’absence de dirty lors de l’affichage du mot de passe.
- Parcours existants revérifiés : unicité réelle, mot de passe de trois puis quatre caractères, création/modification/suppression avec confirmations et notifications, abandon refusé puis accepté, remasquage et état propre entre utilisateurs, protections administrateur, erreurs de chargement/validation/mutation JSON/HTML/réseau, mutation réussie suivie de rafraîchissement retenu puis refusé. `sending` terminé avant ce rafraîchissement et anomalie de suppression MOD-03 préservés.

Limites : Chromium desktop/mobile simulés uniquement, pas de Firefox/Safari ni d’appareil réel. Vérification DOM/accessibilité et CSS calculé des interactions ; aucune modification de structure ou de classe du formulaire à inspecter visuellement, CSS compilé identique (`index-bTd8vvE7.css`). Les captures existantes produites par la suite ne constituent pas une nouvelle revue visuelle. L’avertissement Vite de chunk JS supérieur à 500 kB subsiste, hors périmètre. Sorties de test locales ignorées ; aucun helper ou script temporaire ajouté.

## Décisions

### Représentation directe, sans nouvelle couche

La classe `User` est conservée : ses opérations déjà consommées restent disponibles sans introduire de service parallèle, de DTO ni de wrappers. Ses six champs modifiables sont désormais des propriétés directes, au lieu d’un objet `user` caché derrière douze accesseurs get/set. `isDeleted` devient lui aussi une propriété directe. Le seul accesseur conservé, `isAdmin`, traduit `is_admin` du contrat API et évite de modifier les consommateurs. L’enveloppe statique `configuration` devient une constante locale d’URL.

Les réponses GET/POST/PATCH sont appliquées après succès par `Object.assign(this, user)`. Le schéma `user_detail` est complet : ses sept propriétés sont obligatoires, sans propriété supplémentaire. Les réponses du backend actuel respectent ce contrat. Les données retournées par le serveur remplacent donc les champs édités ; `isDeleted`, absent du schéma, garde son état local comme auparavant. Aucun mécanisme de fusion pour réponses partielles ni de conversion du contrat backend ajouté.

La validation quitte `User` pour l’option `validations()` du formulaire, son seul consommateur. Règles, noms de validateurs et branchement création/édition identiques ; l’erreur du HEAD est toujours présentée par le validateur puis propagée à Vuelidate. Le modèle n’importe plus Vuelidate, le bus ni le validateur commun. Les messages restent au formulaire ; son debounce de 1000 ms et son annulation au démontage ne changent pas. Ni extraction de fichier ni conversion Composition API nécessaires.

`toJson()` est supprimé après vérification de l’absence d’appel dans le client actuel. `FieldVuelidate` reste inchangé : il relie `$model` et `$dirty` aux contrôles et à la classe `dirty` utilisée pour le gras. Le helper `oneOf` reste utilisé et inchangé. `users.vue`, les stores et le transport HTTP restent inchangés.

**Bilan :** deux fichiers applicatifs modifiés, aucun ajouté ; 48 lignes ajoutées, 100 retirées, soit **52 lignes nettes en moins**. Douze accesseurs de champs, le getter de suppression, l’enveloppe de configuration et la sérialisation inutilisée supprimés ; validation déplacée sans délégation supplémentaire. Une représentation entièrement en objets/fonctions aurait imposé plus de changements d’appelants sans bénéfice établi ici.

### Contrats conservés

| Frontière | Contrat après refactoring |
| --- | --- |
| POST | `name`, `active`, `password`, `pseudo`, `description`, `sexe`, explicitement énumérés ; ni `is_admin` ni `isDeleted`, pas d’envoi de l’instance entière |
| PATCH | `active`, `password`, `pseudo`, `description`, `sexe`, explicitement énumérés ; ni `name` ni indicateurs locaux/administrateur |
| Backend et avatar | Aucun schéma modifié ; les champs avatar autorisés côté backend mais non édités par ce formulaire restent absents de ses requêtes |
| HTTP utilisateur | Même méthode, URL non encodée (COR-02 exclu), statuts HEAD 204/404 et réponses ; rejet sans affichage. Les mutations ne publient leurs données qu’après succès |
| Validation | Nom obligatoire en création, contrôle d’unicité asynchrone, mot de passe requis et minimum 4, description requise, genre requis parmi F/M, pseudo facultatif ; aucune règle ajoutée |
| Erreurs et rafraîchissement | Contrat MOD-03 inchangé : formulaire propriétaire de chargement/mutations, validateur propriétaire du nom, parent consommateur du rejet de `userListStore.update()` avec message générique. `sending` ne dépend pas du rafraîchissement ; notification/navigation seulement après sa réussite |

L’anomalie après suppression réussie puis rafraîchissement refusé reste volontairement présente : détail et Fermer désactivés, sortie par menu possible. Aucune correction COR-*, règle métier, notification, exposition des mots de passe ou déconnexion XHR modifiée ; aucun autre ticket commencé.

## Résultat et reprise

Le 16 novembre 2026, l’utilisateur valide explicitement MOD-04 et demande son commit local ainsi que l’actualisation du suivi, sans push. Code, tests et suivi sont regroupés dans le présent commit local « Simplifier les données et la validation des utilisateurs (MOD-04) » sur `dev`, branche de référence convenue. Les critères vérifiés, l’acceptation et cette intégration locale permettent la clôture dans l’EPIC.

Pour reprendre, vérifier l’arbre de travail, la présence de ce commit sur `dev` et le suivi du prochain ticket explicitement autorisé. Dans un autre environnement, transférer le commit local MOD-04 ou utiliser une référence rendue accessible après autorisation de push ; ce thread ne transfère pas les fichiers. Aucun autre ticket ni COR n’est commencé ; cette validation n’en autorise pas le démarrage.

## Traçabilité et livraison

- Thread d’implémentation : [MOD-04 dans le même checkout local](https://ampcode.com/threads/T-01a1e350-796b-7755-b16b-a33e40d755bf), en reprise du [thread MOD-03](https://ampcode.com/threads/T-01a1e0e3-51b2-7065-bef2-48148dca5801).
- Référence de départ : `dev` à `82f17e51191b2f11bce35ee5a095185aa106152d`, MOD-01/MOD-02/MOD-03 présents, arbre et index initialement propres.
- Écart au message de reprise : la référence locale `origin/dev` pointe déjà sur le même commit et son reflog indique « update by push ». Le caractère non poussé des anciens commits ne peut donc pas être reconduit comme état actuel. Aucun fetch, accès distant ni push réalisé par ce thread ; état distant non interrogé.
- Livraison réelle : présent commit local « Simplifier les données et la validation des utilisateurs (MOD-04) », contenant code, tests et suivi sur `dev`, branche de référence convenue. Intégration locale uniquement ; aucun push, merge supplémentaire, déploiement ou publication.
- Acceptation utilisateur : obtenue le 16 novembre 2026 dans ce thread, avec demande explicite de commit local et de mise à jour du suivi, sans push. Tableau de l’EPIC actualisé directement dans cette reprise, avec compte rendu au thread de pilotage historique ; aucun travail parallèle lancé.
- Contrôle avant commit : diff et index relus, uniquement les six fichiers MOD-04 attendus, aucun changement extérieur constaté ; lint, 10 tests HTTP/stores et `git diff --check` réussis. Aucun changement applicatif depuis la suite complète de 50 tests.
