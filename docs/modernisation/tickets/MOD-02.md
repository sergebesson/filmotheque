# MOD-02 Actions et interfaces des stores

[EPIC : état, dépendances et thread](../EPIC.md) · [Revue : R01 et R06](../REVUE.md)

## Objectif et origine

Remplacer les effets réseau implicites des affectations et les conventions de lecture concurrentes par une interface compréhensible : lecture cohérente des données et actions asynchrones attendables.

Sources à relire : [store films](../../../www/stores/movie-list.store.js), [store utilisateurs](../../../www/stores/user-list.store.js), [recherche](../../../www/modules/common/search/search.vue), [liste infinie](../../../www/modules/common/infinite-list/infinite-list.vue), [liste films](../../../www/modules/movie-list/movie-list.vue), [liste utilisateurs](../../../www/modules/users/components/user-list.vue), [chargement complet](../../../www/modules/movie-list/components/movie-list-button-all.vue).

## Périmètre et exclusions

- Clarifier les lectures, actions et contrats nécessaires aux consommateurs des listes ; documenter les promesses et erreurs sans refondre leur présentation.
- Adapter tous les consommateurs concernés sans multiplier les interfaces ou exposer deux conventions durables.
- Préserver délai de recherche, effacement, pagination, chargement complet, indicateurs et annulation des callbacks au démontage.
- Ne pas corriger COR-01 ni fabriquer un store générique ou imposer Pinia. Une modification de concurrence découverte pendant le refactoring doit être isolée et décidée séparément.

## Critères d’acceptation

- [x] Les opérations réseau de recherche sont appelées explicitement et peuvent être attendues par leurs consommateurs.
- [x] Les listes utilisent une convention cohérente de lecture, avec contrat des données, opérations et erreurs documenté.
- [x] Recherche, pagination, état vide, navigation et chargement complet produisent les mêmes résultats et états visibles sur les parcours existants.
- [x] Tous les consommateurs sont adaptés ; aucune interface conservée uniquement pour contourner un appelant oublié.

Ces cases consignent les vérifications techniques ci-dessous ; l’acceptation utilisateur est enregistrée dans la traçabilité. Le statut courant reste uniquement dans l’EPIC.

## Vérifications prévues

`npm run lint` et `npm test`, plus les scénarios ciblés des interfaces modifiées. Vérifier recherche avec caractères spéciaux, effacement, pagination et navigation pendant un debounce. Caractériser les cas de concurrence utiles pour détecter un changement involontaire, sans considérer la correction de COR-01 comme un critère de ce ticket.

### Exécution du 15 novembre 2026

Base vérifiée : `dev` à `b58b4bdc168c689ee414f615eb90cd99b6128a89`, arbre et index initialement propres, suivi documentaire présent et acceptation MOD-01 consignée. L’utilisateur confirme `dev` comme référence locale et demande la clôture de MOD-01 ainsi que ce seul ticket. AGENTS applicables, EPIC, MOD-01, MOD-02 et R01/R06 relus. Node 24.19.0, Chromium `/usr/bin/chromium`, vrai serveur et bases temporaires de `www/tests/server.cjs` ; aucun outil GX ni donnée de production.

| Contrôle réellement exécuté | Résultat |
| --- | --- |
| Inventaire `git grep` des deux stores et de `storeList` dans `www`, avant puis après | Recherche, liste infinie, listes films/utilisateurs, bouton de chargement complet et test de configuration adaptés ; barres d’outils et parent utilisateurs transmettent déjà le singleton ou appellent une action. Aucun accès restant aux anciens accesseurs |
| `node .amp/in/mod02-concurrency.mjs`, avant puis après refactoring | Mêmes résultats dans les entrelacements décrits ci-dessous ; aucune correction COR-01 |
| `npm run build`, avant refactoring | Succès, pour les contrôles navigateur de référence |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:client -- --grep 'délai, caractères'`, avant refactoring | 4 réussites après calibrage du test : deux listes, projets desktop/mobile |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:client -- stores.spec.js`, avant refactoring | 4 échecs attendus : l’action `setSearch` n’existe pas encore |
| `npm run lint`, après refactoring | Succès |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm test`, après refactoring | Build réussi et 26 tests réussis : 18 existants adaptés au contrat de lecture, 4 contrôles navigateur et 4 contrôles de stores |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium www/node_modules/.bin/playwright test --config .amp/in/mod02.config.mjs`, sondes complémentaires | 4 réussites après calibrage de la sonde : pagination/chargement complet et annulation du throttle au démontage, desktop/mobile |
| `git diff --check` | Succès |

Les [tests des stores conservés](../../../www/tests/stores.spec.js) utilisent les vrais singletons et des réponses HTTP retenues. Ils contrôlent la recherche spéciale `été + & ? #`, le résultat effectivement disponible après `await setSearch()`, la concaténation de deux pages distinctes, les gardes de pagination pendant le chargement et après la dernière page, l’effacement vers la page 1, la liste vide et la résolution après erreur HTTP avec un seul événement ERROR. Ils n’imposent pas un résultat aux concurrences de COR-01.

Les [scénarios navigateur conservés](../../../www/tests/client.spec.js) vérifient, pour chaque liste, l’absence de requête à 999 ms puis l’émission à 1000 ms, les caractères spéciaux correctement transmis au vrai serveur, les indicateurs de liste/recherche et la saisie encore active pendant une recherche, l’état vide, l’effacement soumis au même délai, puis la navigation pendant un debounce et le retour sans requête ni filtre abandonné. Aucun `pageerror` dans ces scénarios. Le test MOD-01 garde toutes ses assertions, avec `configuration.pageSize` comme nouveau chemin de lecture.

Les sondes navigateur temporaires retiennent une page suivante : recherche et bouton Tout charger désactivés, indicateur de liste actif et indicateur de recherche inactif ; après réponse, les films sont concaténés et les contrôles réactivés. Après une recherche non vide, Tout charger efface la recherche et la liste immédiatement, demande les 24 films sans filtre, puis réactive les contrôles ; aucun rechargement différé parasite après 1200 ms. Une autre sonde programme un scroll trailing, démonte la liste avant 50 ms et vérifie qu’aucune page supplémentaire ne part après expiration du délai.

Caractérisation avant/après des concurrences (réponses simulées sur les vrais stores) :

- A/B/A, dernier A résolu avant le premier A : l’ancien A peut toujours écraser le résultat récent.
- Réponse obsolète de recherche : les films restent en `loading`, les utilisateurs le libèrent via `finally` ; différence préservée.
- Erreur HTTP obsolète : `loading` libéré et un événement ERROR dans les deux stores.
- Chargement complet des films et `update()` utilisateurs tardifs : peuvent toujours écraser une recherche récente.
- Échec de `update()` : rejet vers l’appelant, `updating` libéré ; pas de nouvel événement ERROR.

Limites : Chromium seulement, viewports 1280 × 800 et 390 × 844, pas d’appareil réel, Safari ou Firefox. Le calibrage initial des sondes a rencontré un sélecteur ambigu avec une infobulle, une navigation gelée par l’horloge de test et un scroll supplémentaire dû au redimensionnement de la sonde ; les tests ont été ajustés, pas le comportement applicatif. L’horloge est reprise avant la navigation ; la sonde de pagination remonte avant de libérer la réponse. Le CSS produit garde le même nom de contenu `index-bTd8vvE7.css` ; aucun style, balisage structurel ou contrat HTTP changé. L’avertissement Vite de chunk JS supérieur à 500 kB subsiste. Les scripts temporaires sont supprimés après vérification ; leurs scénarios et conclusions sont consignés ici.

## Décisions

### Une seule convention de lecture, sans nouvelle couche

R01 est confirmé sur les sources actuelles : les accesseurs recouvrent `state`, et le setter `search` lance une requête non attendable. MOD-01 a déjà supprimé la dépendance à l’événement de configuration ; elle n’est pas réintroduite. Pour R06, seuls les contrats des composants communs de liste sont concernés ; imports globaux, formulaires et dépendances restent hors de ce ticket.

Les singletons et `reactive` sont conservés. Les consommateurs lisent les données sous `store.state`, la configuration sous `store.configuration`. Suppression des accesseurs de délégation (`page`, `totalPages`, `search`, `movies`/`users`, `loading`, `updating`, `pageSize`) plutôt qu’ajout d’un adaptateur ou d’une deuxième interface. Aucune conversion Pinia/Composition API, aucun store générique ni validation dynamique de props ajoutée.

Contrat de données (lecture côté consommateurs ; les actions possèdent les écritures) :

| Chemin | Sens |
| --- | --- |
| `state.search` | Texte courant, chaîne vide pour l’absence de filtre |
| `state.page`, `state.totalPages` | Pagination effective de la dernière réponse publiée ; calcul existant conservé après `update()` |
| `state.movies` / `state.users` | Objets API inchangés ; remplacement en page 1, concaténation ensuite |
| `state.loading` | Indicateur existant des chargements de liste, pas une garantie de propriété entre requêtes |
| `state.updating` (utilisateurs) | Rafraîchissement après mutation, distinct de `loading` |
| `configuration.pageSize` | Getter issu de MOD-01 : configuration disponible, défaut 30 |

### Actions et promesses

Toutes les actions renvoient `Promise<void>`. `await` attend la fin de l’appel concerné, pas une réussite garantie ni la priorité sur d’autres requêtes. Les commentaires des stores et des props de recherche/liste infinie décrivent le contrat au point d’usage.

| Action | Effet et responsabilité des erreurs conservés |
| --- | --- |
| `setSearch(string)` (deux listes) | Remplace immédiatement le texte puis attend `getMovies()` / `getUsers()` en page 1, même pour un texte identique. `""` efface le filtre. Erreurs HTTP consommées via ERROR |
| `getMovies(page = 1)` / `getUsers(page = 1)` | Chargement explicite avec filtre courant et garde existante par texte ; erreurs consommées via ERROR avec les mêmes messages |
| `nextPage()` | Ne fait rien pendant `loading` ou à la dernière page, sinon attend le chargement suivant ; même contrat d’erreur |
| `getAllMovies()` | Vide immédiatement films et recherche, charge le nombre de films fourni par infosStore ; erreurs consommées via ERROR |
| `update()` (utilisateurs) | Rafraîchit les pages déjà chargées avec le filtre courant, rejette en cas d’erreur ; le parent utilisateurs reste propriétaire de l’attente et de la suite métier |

La recherche attend `setSearch` dans son callback debounce ; la liste infinie attend `nextPage` dans son callback throttle. Aucun traitement après ces attentes ne modifie les indicateurs. Les délais 1000/50 ms, options Lodash, gardes, watchers, calcul du spinner, blocage des contrôles et appels `.cancel()` au démontage restent en place. L’annulation porte sur les callbacks différés, pas sur les requêtes déjà parties. Le bouton de chargement complet conserve son action existante ; le parent utilisateurs conserve `await update()`.

Les comportements COR-01 sont caractérisés mais volontairement non corrigés. Les responsabilités d’erreur divergentes sont documentées, pas uniformisées : MOD-03 n’est pas commencé. COR-02/COR-03, backend, profil, flash, routes, styles et `www.vue2` sont inchangés.

## Résultat et reprise

Le 15 novembre 2026, l’utilisateur valide MOD-02 et demande son commit sans push. Le code, les tests et le suivi sont regroupés dans le présent commit local « Rendre explicites les actions des stores (MOD-02) » sur `dev`, branche de référence convenue. Les critères vérifiés et l’acceptation permettent d’enregistrer sa clôture dans l’EPIC avec cette intégration locale. MOD-01 reste intégré localement ; aucun autre ticket n’est commencé.

Pour reprendre : vérifier `git status` et la présence du commit « Rendre explicites les actions des stores (MOD-02) » sur `dev`, puis relire l’EPIC et la fiche du prochain ticket autorisé. Dans un autre checkout, transférer explicitement les commits locaux de suivi/MOD-01/MOD-02 ou utiliser une référence devenue accessible après autorisation de push : le lien de thread et un SHA non poussé ne transfèrent pas ces fichiers. MOD-03 est le candidat à la suite, uniquement sur demande ; aucun COR n’est autorisé. Aucun push n’est autorisé par cette validation.

## Traçabilité et livraison

- Thread d’implémentation : [MOD-02 dans le checkout local](https://ampcode.com/threads/T-01a1e0b8-c0e7-72ed-9da7-0e2446f3f9fb). Reprise depuis le [thread MOD-01](https://ampcode.com/threads/T-01a1df6e-5165-75f1-ad75-584c3231189d), relu pour la transmission des résultats et des moyens de vérification.
- Référence de départ : branche locale de référence `dev`, commit `b58b4bdc168c689ee414f615eb90cd99b6128a89`, avec suivi `228e50f9a695d2d2c3fe1fa57fbef9b0a9196ff2` disponible ; arbre et index initialement propres.
- Livraison : présent commit local « Rendre explicites les actions des stores (MOD-02) » sur `dev`, contenant le code, les tests dont `www/tests/stores.spec.js` et le suivi. Intégration locale dans la branche de référence ; aucun push, merge supplémentaire, déploiement ou publication. Aucun accès distant Git nécessaire.
- Acceptation utilisateur de MOD-02 : obtenue le 15 novembre 2026 dans ce thread, avec autorisation de commit et interdiction de push. Le tableau de l’EPIC est actualisé directement dans cette reprise à la demande de l’utilisateur.
- Contrôle avant commit : diff et index relus, aucun changement extérieur constaté ; `npm run lint`, `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:client -- configuration.spec.js stores.spec.js` (6 réussites) et `git diff --check` relancés avec succès. Code inchangé depuis la suite complète de 26 tests ; seuls l’acceptation et le suivi de livraison sont actualisés.
