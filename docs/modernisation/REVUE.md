# Revue initiale du frontend Vue 3

Le client est exploitable, petit et organisé. Sa migration a modernisé la compilation davantage que les contrats internes : privilégier des refactorings progressifs plutôt qu’une réécriture.

## Référence historique du 15 novembre 2026

Ce document transpose la [revue publiée](https://ampcode.com/artifacts/revue-technique-de-www-dea18393-033e-433d-a828-b3d7cf1808aa) en référence locale pour les tickets. Il ne décrit pas l’avancement courant : consulter [l’EPIC](EPIC.md). Les numéros de ligne et constats du rapport d’origine doivent être revalidés sur le code au démarrage d’un ticket.

- [Thread de migration](https://ampcode.com/threads/T-01a1da44-6eb3-749b-8566-f32d65e4bb8e).
- [Thread de revue et de pilotage](https://ampcode.com/threads/T-01a1de9e-73bf-7283-bf9f-cf7dc98d6085).
- Code examiné : fichiers locaux sur `dev`. Git ne présentait pas de commit accessible par `HEAD`, mais des fichiers ajoutés dans l’index. Le commit cité dans le thread de migration n’a pas été utilisé comme référence locale vérifiable.
- Périmètre : sources et tests de `www`, avec les contrats backend directement concernés. Le client comprenait 21 composants `.vue` et 12 fichiers CSS.

### Vérifications exécutées pendant la revue

- `npm run lint` : succès.
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm test` : compilation réussie et 16 tests réussis, soit huit scénarios sur deux configurations Chromium.
- Sondes Node sur les vrais stores et le service `User`, avec réponses HTTP simulées et ordonnancées : concurrence des recherches, état `loading`, construction des URL.
- Exécution de la comparaison de versions extraite du composant flash.
- Build Vite : JS 619,27 kB minifié / 209,99 kB gzip ; CSS 353,33 kB / 50,75 kB gzip. Avertissement de chunk JS supérieur à 500 kB.

Ces résultats sont datés, pas des vérifications de travaux futurs. Les sondes n’ont pas démontré chaque entrelacement par des clics dans l’interface. Pas d’audit de sécurité complet, de mesure sur appareil réel ou de validation Firefox/Safari. Les tailles de build ne constituent pas une mesure de latence ou de transfert effectivement observé.

## Points à conserver

- SFC compilés par Vite, organisation par domaines et composants généralement courts.
- Petit [point d’entrée HTTP commun](../../www/common/call-api-backend.js), gestion des statuts, réponses vides et erreurs attendues par les consommateurs.
- Tests d’intégration avec le vrai serveur et des données temporaires, couvrant films, CRUD, validation, abandon de formulaire, droits visibles et erreurs réseau.
- Annulation des debounce/throttle au démontage et désabonnement du dialogue d’erreur.
- Options API, routes hash et organisation actuelle : leur maintien n’est pas en soi une dette à éliminer.

## R01 Contrats des stores

Les stores exposent `state` et des accesseurs qui le recouvrent ; écrire `search` lance une opération asynchrone que l’affectation ne permet pas d’attendre. Les consommateurs utilisent plusieurs styles d’accès.

- Sources : [store films](../../www/stores/movie-list.store.js), [store utilisateurs](../../www/stores/user-list.store.js), [recherche](../../www/modules/common/search/search.vue).
- Recommandation : actions asynchrones explicites, convention de lecture cohérente et contrat d’erreur documenté. Les singletons réactifs restent adaptés à la taille du client.
- Éviter un store générique paramétrable avant d’avoir clarifié les différences de chargement complet et de rafraîchissement après mutation.
- Suivi : [MOD-02](tickets/MOD-02.md), avec [COR-01](tickets/COR-01.md) séparé pour les anomalies de concurrence.

## R02 Initialisation et ordre des imports

`app.js` attend la configuration. Les stores de liste s’abonnent à un événement ponctuel lors de leur import ; le profil charge l’utilisateur connecté et le flash charge les informations générales.

- Sources : [démarrage](../../www/app.js), [configuration](../../www/stores/configuration.store.js), [bus](../../www/eventBus.js), [profil](../../www/modules/profile/profile.vue), [flash](../../www/modules/flash/flash.vue) et stores de liste de R01.
- Risque déduit du code : une route différée pourrait importer son store après l’événement et conserver la taille de page par défaut de 30. Le découpage différé n’a pas été implémenté pendant la revue pour tester cette hypothèse.
- Recommandation : configuration disponible explicitement et responsabilité claire des chargements partagés, en préservant ordre observable, parallélisme, flash et loader.
- Le bus d’erreurs est suffisamment petit pour être conservé ; supprimer `mitt` n’est pas un objectif.
- Suivi : [MOD-01](tickets/MOD-01.md), préalable au [chargement différé](tickets/MOD-06.md).

## R03 Poids du client

Les routes sont importées statiquement ; Lodash est importé par défaut à plusieurs endroits, Moment sert au formatage de date, l’ensemble d’animate.css est chargé pour quelques animations. `object-hash` sert à la clé de contenu animée des lignes utilisateurs. Les contributions individuelles n’ont pas été isolées pendant la revue.

- Sources : [routeur](../../www/router.js), [démarrage](../../www/app.js), [dépendances](../../www/package.json), [liste films](../../www/modules/movie-list/movie-list.vue), [liste utilisateurs](../../www/modules/users/components/user-list.vue).
- Recommandation : mesurer avant optimisation, imports ciblés, puis différer l’administration après clarification de la configuration. Ne pas relever le seuil d’avertissement pour masquer le problème.
- Préserver les options et l’annulation des debounce/throttle. Un remplacement de Moment par `Intl` nécessite la fidélité des dates françaises et des fuseaux ; `new Date('YYYY-MM-DD')` peut changer le jour selon le fuseau.
- Conserver les classes de base, durées et règles de réduction des animations si animate.css est allégé.
- Ne pas remplacer simplement la clé `hashUser(user)` par le nom : la clé interne déclenche le flash après modification ; la clé extérieure par nom assure déjà l’identité de ligne.
- Suivi : [MOD-05](tickets/MOD-05.md) et [MOD-06](tickets/MOD-06.md).

## R04 Modèle utilisateur

La classe `User` combine objet de données interne, accesseurs de délégation, validation Vuelidate, HTTP et émission d’erreurs. Le formulaire connaît plusieurs de ces mécanismes simultanément.

- Sources : [service utilisateur](../../www/modules/users/services/user.service.js), [formulaire](../../www/modules/users/components/user-detail.vue).
- Recommandation : clarifier les responsabilités dans le module utilisateurs, avec moins d’indirection si le bilan est positif ; ne pas créer un fichier par champ ou une architecture de repositories.
- `toJson()` n’avait pas d’appel dans le client examiné et renvoyait l’objet interne. Revalider ses références avant suppression.
- Les payloads de création et modification n’ont pas les mêmes champs autorisés : ne pas les remplacer par l’objet entier.
- Suivi : [MOD-04](tickets/MOD-04.md).

## R05 Responsabilité des erreurs

Le service `User` affiche puis relance les erreurs ; le formulaire les capture car elles ont déjà été affichées. Les stores de lecture les consomment généralement, mais `userListStore.update()` les propage. Le rafraîchissement après mutation est traité dans le composant parent.

- Sources : [service](../../www/modules/users/services/user.service.js), [formulaire](../../www/modules/users/components/user-detail.vue), [parent utilisateurs](../../www/modules/users/users.vue), [store utilisateurs](../../www/stores/user-list.store.js), [dialogue](../../www/modules/error/error.vue).
- Recommandation : préciser qui possède la promesse et qui présente l’erreur ; conserver textes, nombre de dialogues et notifications. Garder les notifications métier hors du transport HTTP.
- L’absence d’AbortSignal ou de timeout n’est pas une anomalie démontrée. Ajouter un timeout modifie le comportement et n’est pas un nettoyage implicite.
- Suivi : [MOD-03](tickets/MOD-03.md).

## R06 Contrats Vue et composants communs

Des composants sont enregistrés globalement, dont `UserCreate`, propre aux utilisateurs. Les props `Object` documentent peu le contrat des listes ; des fonctions debounce/throttle sont ajoutées à l’instance dans `created`.

- Sources : [démarrage](../../www/app.js), [recherche](../../www/modules/common/search/search.vue), [liste infinie](../../www/modules/common/infinite-list/infinite-list.vue), [enveloppe de validation](../../www/modules/common/field-vuelidate/field-vuelidate.vue).
- Recommandation : imports locaux pour les composants métier et contrats JSDoc pour les données et opérations ; introduire une vérification statique seulement si elle apporte une valeur concrète.
- Un composable doit isoler une responsabilité cohérente. Aucune conversion globale en Composition API, Pinia ou TypeScript n’est requise.
- `FieldVuelidate` applique une classe `dirty` utilisée pour le gras des champs ; son rôle visuel doit survivre à toute simplification.
- Suivi : [MOD-02](tickets/MOD-02.md) pour le contrat de liste, [MOD-04](tickets/MOD-04.md) pour le formulaire, [MOD-06](tickets/MOD-06.md) pour les imports, [MOD-08](tickets/MOD-08.md) pour leur documentation et leurs contrôles.

## R07 Styles et couplage Vuetify

Les CSS voisins sont globaux et plusieurs sélecteurs ciblent des classes internes de Vuetify. Certains styles de cartes couvrent tous les overlays. Les couleurs sont répétées entre thème et CSS ; le spinner garde le nom historique `--md-theme-default-primary`.

- Sources : [styles principaux](../../www/modules/filmotheque/filmotheque.css), [recherche](../../www/modules/common/search/search.css), [navigation](../../www/modules/navigation/navigation.css), [spinner](../../www/modules/common/spinner/spinner.css), [styles utilisateurs](../../www/modules/users/components/user-list.css).
- Recommandation : identifier les styles globaux assumés, centraliser les couleurs identiques, préférer les API publiques permettant un rendu équivalent et documenter les surcharges internes nécessaires.
- Ne pas ajouter `scoped` partout : les dialogues sont téléportés. Les ajustements validés de survol, d’alignement et de flash sont des invariants, pas du CSS à supprimer aveuglément.
- Suivi : [MOD-07](tickets/MOD-07.md).

## R08 Tests et outillage

La suite couvre les usages principaux mais pas les réponses de recherche réordonnées. Le flash automatique est neutralisé par `last_version = '999.0.0'` ; son ouverture manuelle est testée, pas sa politique de versions.

- Sources : [tests](../../www/tests/client.spec.js), [serveur de test](../../www/tests/server.cjs), [configuration Playwright](../../www/playwright.config.js), [lint](../../www/.eslintrc.cjs).
- Les projets ordinateur et mobile utilisent Chromium. Le viewport et le tactile ne constituent pas un vrai appareil ou Safari/iOS ; le scénario lecteur crée son propre contexte sans reprendre les options mobiles du projet.
- Recommandation : garder les parcours et ajouter les quelques tests contractuels nécessaires aux changements concernés, avec une surveillance adaptée des erreurs JavaScript inattendues.
- Les assertions de fondu et d’alignement protègent des demandes explicites de la migration ; ne pas les supprimer comme détails internes.
- CI, documentation des contrats et actualisation de l’outillage peuvent être utiles sans justifier une migration générale.
- Suivi : vérifications dans chaque ticket ; [MOD-08](tickets/MOD-08.md) pour les garde-fous transverses, [COR-01](tickets/COR-01.md) et [COR-03](tickets/COR-03.md) pour leurs régressions après autorisation.

## Anomalies de comportement distinctes

### A01 Requêtes concurrentes

Sondes reproduites sur les stores : lancer A, B, puis A et résoudre le dernier A avant le premier permet à l’ancien A d’écraser le résultat récent. Le contrôle ne compare que le texte de recherche. Dans le store utilisateurs, une réponse obsolète libère `loading` via le `finally` ; dans celui des films, une erreur obsolète peut aussi libérer le chargement et afficher une erreur.

Un `getAllMovies()` tardif peut écraser une recherche récente au niveau du store ; cet entrelacement n’a pas été reproduit depuis l’interface, dont les boutons limitent les concurrences. Le rafraîchissement `update()` écrit également l’état de liste sans le même contrôle que la recherche.

Une correction devrait déterminer quelle requête peut publier résultats, erreur et fin de chargement. L’annulation réseau seule ne remplace pas ce contrôle. Voir [COR-01](tickets/COR-01.md), sans autorisation implicite de correction dans MOD-02.

### A02 Noms dans les URL

Les méthodes utilisateur interpolent le nom sans encoder le segment, contrairement à l’[avatar](../../www/modules/avatar/avatar.vue). La sonde de `userExists` montre que `nom#suffixe` devient un chemin `/api/users/nom` avec fragment, et que `nom?option=1` devient ce même chemin avec une query.

Le [schéma backend](../../server/api/modules/users/openapi/schemas.yml) définit un nom de type chaîne sans ces restrictions. Aucun CRUD complet de ces noms n’a été exécuté pendant la revue. Encoder est une correction du transport ; interdire de nouveaux noms serait une nouvelle règle métier. Voir [COR-02](tickets/COR-02.md).

### A03 Comparaison des versions

La méthode de [flash.vue](../../www/modules/flash/flash.vue) extraite et exécutée considère `1.10.0` inférieur à `1.9.0`, car elle compare des chaînes. Elle considère aussi `1.4.15` égal à `1.4.14`, car les patchs sont ignorés.

Comparer major et minor numériquement corrigerait le premier cas. Commencer à compter les patchs est une autre décision, non autorisée par la revue. Voir [COR-03](tickets/COR-03.md).

## Risques conservés hors implémentation

- Les mots de passe sont présents dans les données administratives et affichables dans la liste. Le [backend](../../server/stores/user.js) les renvoie ; le [client](../../www/modules/users/components/user-list.vue) ne fait pas que masquer une donnée absente. Changer ce contrat demande un chantier backend/authentification, hors MOD.
- Le `v-html` du flash repose sur un fichier Markdown administré dans le dépôt ; le [serveur](../../server/stores/infos.store.js) active `html: true`. Aucune preuve d’exploitation par un utilisateur ordinaire n’a été établie. Ne pas ouvrir cette source à du contenu non maîtrisé sans revoir la frontière de confiance.
- La [déconnexion](../../www/modules/profile/profile.vue) Basic Auth utilise volontairement XHR. Un remplacement par fetch ne garantit pas le même comportement des identifiants mémorisés par les navigateurs.
- La suppression de `www.vue2`, la virtualisation des listes, un changement des règles de validation, des routes ou de la politique du flash ne sont pas des nettoyages implicites.

## Couverture de la revue dans le suivi

R01 à R08 sont couverts par MOD-01 à MOD-08, avec les recoupements explicités ci-dessus. A01 à A03 restent les trois tickets COR à décider. Les risques de sécurité, d’authentification et de conservation restent documentés sans ouverture automatique d’un chantier fonctionnel.
