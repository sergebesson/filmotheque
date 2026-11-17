# COR-03 Comparaison numérique des versions du flash

[EPIC : état, dépendances et thread](../EPIC.md) · [Revue : A03](../REVUE.md)

## Objectif et origine

Après autorisation distincte, comparer numériquement major et minor pour que `1.10.0` soit reconnu plus récent que `1.9.0`, sans commencer à déclencher le flash pour les patchs.

Sources à relire : [flash](../../../www/modules/flash/flash.vue), [store informations](../../../www/stores/infos.store.js), [version serveur](../../../server/stores/infos.store.js), [tests](../../../www/tests/client.spec.js).

## Périmètre et exclusions

- Corriger l’ordre major/minor, maintenir la politique ignorant les patchs et les interactions avec `last_version`.
- Préserver contenu, ancre Changelog, titre, fermeture et stockage du flash. L’ouverture manuelle doit rester possible.
- Ne pas introduire une nouvelle politique SemVer, de déclenchement sur patch, de gestion des préversions ou de données locales malformées sans décision distincte.
- Les tests existants neutralisent l’ouverture automatique ; ajouter une couverture dédiée sans fragiliser les autres parcours.

## Critères d’acceptation proposés

- [x] `1.10.0` après `1.9.0` déclenche le flash si son contenu existe, mais l’ordre inverse ne le déclenche pas.
- [x] Le passage de major, l’égalité et une version antérieure respectent l’ordre numérique ; le cas `10.0.0` contre `2.0.0` n’est pas comparé lexicalement.
- [x] Un changement de patch seul, tel que `1.4.14` vers `1.4.15`, ne déclenche toujours pas le flash.
- [x] Persistance `last_version`, ouverture manuelle, contenu et ancres conservent leur comportement ; un test observable échoue avant la correction et passe après.

Ces cases décrivent les vérifications techniques de COR-03 ; l'acceptation utilisateur et la livraison sont consignées ci-dessous.

## Vérifications prévues

Contrôler l’affichage automatique avec des versions et informations synthétiques, sans modifier le stockage utilisateur réel. Vérifier les deux sens de comparaison et le patch seul, puis l’ouverture manuelle et les liens internes. `npm run lint` et `npm test`. Ne pas tester uniquement une méthode privée si le comportement d’ouverture reste non couvert.

### Étude du 17 novembre 2026

- Sources actuelles relues sur `dev`, à partir du commit local `ee1c117` : composant flash, stores informations client et serveur, profil, suite client et serveur de test. Les modifications locales COR-02 sont préexistantes et laissées intactes.
- Exécution Node de la méthode extraite du composant courant : `1.10.0` contre `1.9.0` renvoie `-1`, l'ordre inverse `1` ; `10.0.0` contre `2.0.0` renvoie `-1`, l'ordre inverse `1`. Le passage `1.99.0` vers `2.0.0` renvoie `1` ; le patch seul et l'égalité renvoient `0`.
- Cette sonde confirme le défaut du comparateur, pas encore son effet observable dans le navigateur. Aucun test navigateur, lint ou build exécuté pour cette proposition.

## Proposition d'implémentation

- Dans `comparedVersion`, convertir les éléments issus des deux `split(".")` avec `.map(Number)`. Garder les comparaisons major puis minor et le retour `0` ; le patch reste ignoré. Ne pas ajouter de dépendance SemVer, de module utilitaire ni de gestion des données malformées.
- Conserver intégralement `showFlash`, notamment le repli `0.0.0`, la condition de contenu et l'écriture de la version serveur dans `last_version`, même sans ouverture et en cas de retour à une version antérieure. Ne modifier ni store, ni serveur, ni présentation.
- Étendre les tests client avec une valeur initiale `last_version` paramétrable, conservant `999.0.0` par défaut pour les parcours existants. Employer une seule initialisation du stockage, sans scripts concurrents, et intercepter `/api/infos` pour les données synthétiques.
- Vérifier l'ouverture observable pour les minor et major à deux chiffres dans les deux sens, la priorité du major (`2.0.0` après `1.99.0`), l'égalité, le patch seul, la première visite et l'absence de contenu. Attendre la persistance de la version avant d'affirmer l'absence d'ouverture, pour ne pas réussir avant le chargement des informations.
- Ajouter un parcours fermeture puis rechargement sans réinitialiser le stockage : pas de réouverture automatique, mais ouverture manuelle toujours possible. Réutiliser le parcours existant pour le contenu, l'ancre Changelog et le titre. Exécuter les tests dédiés avant/après correction, puis `npm run lint` et `npm test` dans les deux projets Chromium configurés.

Proposition acceptée le 17 novembre 2026 : « Oui, implémente COR-03 en conservant l’exclusion des patchs ».

## Décisions retenues

Comparaison numérique autorisée, en conservant l’exclusion des patchs. Toute nouvelle politique de notification de version doit être proposée séparément. Le changement applicatif se limite aux deux conversions `.map(Number)` dans le composant ; aucun changement serveur ou de présentation.

### Implémentation et vérifications du 17 novembre 2026

- Départ : `dev` au commit local `e80d558d61ce10b150fdf9ceed097ca862646aa7`, après intégration locale de COR-02. Au démarrage, seule la proposition documentaire COR-03 était modifiée.
- Dix scénarios navigateur ajoutés dans `client.spec.js`, exécutés dans les projets desktop et mobile. Les informations sont synthétiques via interception de `/api/infos`, et le stockage appartient uniquement aux contextes Playwright isolés. La valeur initiale de `last_version` devient paramétrable ; l'initialisation ne remplace pas une valeur déjà persistée au rechargement.
- Reproduction avant correction : `npm run build`, puis `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:client -- --grep 'flash :' --output ../.amp/in/artifacts/cor-03-before` : 10 échecs et 10 réussites. Dans chaque projet, les quatre comparaisons minor/major à deux chiffres échouent sur l'ouverture observable, ainsi que le scénario de fermeture qui attend l'ouverture initiale. Les contrôles major prioritaire, égalité, patch seul, première visite et contenu absent passent. Une première tentative avait une attente erronée sur le titre de page ; cette attente a été corrigée pour conserver le titre réel `filmothèque`, avant cette reproduction de référence.
- Après les deux conversions numériques : `npm run build`, puis même sélection avec `--output ../.amp/in/artifacts/cor-03-after` : 20 tests réussis. Fermeture, absence de réouverture après rechargement, consultation manuelle et persistance vérifiées ; la version serveur est mémorisée même lors d'un retour arrière ou sans contenu.
- `npm run lint`, `npm run typecheck:search` et `git diff --check` réussis. Le typage ciblé ne couvre pas le composant flash ; ce sont les tests navigateur qui vérifient sa correction.
- Suite complète : `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm test` : build réussi, **95 tests réussis et 11 échecs** en 8,9 minutes. Les 20 tests dédiés COR-03 et le parcours existant « administrateur protégé, menu et informations » passent dans les deux projets, y compris l'ancre Changelog sans changement d'URL.
- Les 11 échecs concernent les parcours utilisateurs COR-02/COR-04. Les traces de deux timeouts COR-02 desktop montrent le texte de modification de description dans le champ de recherche après rechargement, puis un nettoyage interrompu lorsque le contexte est fermé. Les erreurs suivantes comprennent des créations de témoins refusées et des comptes absents des trois premières lignes. À cette première restitution, la course de focus puis la contamination des données étaient des hypothèses ; l'analyse distincte ci-dessous les vérifie ensuite.
- Contrôle sur la base exacte sans COR-03 : archive temporaire du commit de départ avec les dépendances locales, build puis `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:client -- --grep 'utilisateurs COR-02|mutation réussie puis'` : **18 tests réussis**. Ce contrôle ciblé ne reproduit donc pas les échecs de la suite complète ; il ne permet pas de les déclarer préexistants. L'archive temporaire a été supprimée. Aucun parcours utilisateur ou serveur n'est modifié pour masquer ces échecs.
- Relance de la même sélection utilisateurs sur le code corrigé, avec `--output ../.amp/in/artifacts/cor-03-users-check` : **18 tests réussis** également. Les échecs globaux ne sont pas reproduits dans cette sélection, ni avant ni après COR-03. Pas de seconde exécution de toute la suite ; l'absence de régression globale n'est donc pas affirmée.
- Journaux et traces locaux sous `.amp/in/artifacts/` : `cor-03-before.log`, `cor-03-after.log`, `cor-03-full.log`, `cor-03-full-results/`, `cor-03-baseline.log`, `cor-03-users-check.log`. La suite globale n'est pas déclarée verte ; cette limite doit accompagner toute décision d'acceptation.

## Analyse distincte des échecs utilisateurs du 17 novembre 2026

L'utilisateur demande « Analyse les échecs utilisateurs séparément avant de valider COR-03 ». Cette demande autorise le diagnostic, pas la correction des autres parcours. [Rapport détaillé, preuves et proposition de stabilisation des tests](https://ampcode.com/artifacts/echecs-utilisateurs-playwright-46a228b2-7bf1-4a45-94e9-11dd64f5d1f8).

- Les onze traces sont analysées : **deux détournements de saisie desktop**, puis **neuf conséquences de données non nettoyées** (deux doublons de témoins, un compte déjà présent au démarrage mobile, six comptes COR-04 absents des seules trois premières lignes). Les réponses réseau confirment que ces derniers comptes sont hors de la page affichée, pas qu'ils n'ont pas été créés.
- Le champ de recherche `autofocus` utilise dans Vuetify 4.3.3 un `setTimeout(..., 50)` qui appelle `focus()` sans vérifier un changement de champ. Après `page.reload()`, le CRUD attend les données du formulaire, mais pas cet autofocus avant `.fill()` sur la description. Les snapshots avant/après des deux actions confirment la recherche modifiée et la description inchangée, sans PATCH ; l'enregistrement reste désactivé et le test expire.
- Une sonde temporaire retient uniquement le vrai callback Vuetify puis impose son exécution entre le focus de la description et l'insertion du texte. Sur une archive reconstruite de la base sans COR-03 : **quatre contrôles réussis**, reproduction et synchronisation avant saisie sur desktop/mobile. Sur le code avec COR-03 : **les mêmes quatre contrôles réussis**. Le mécanisme existe donc sans la correction de versions et sans la nouvelle fixture de stockage. Il s'agit d'une reproduction à ordonnancement contrôlé du défaut observé dans les traces, pas d'une nouvelle reproduction spontanée de toute la suite.
- Le `finally` du CRUD réutilise un contexte `request` fermé après expiration. La base serveur est commune aux tests et aux deux projets ; les résidus survivent aux contextes navigateur. Une seconde sonde sur la base sans COR-03 produit **quatre timeouts volontaires** et **quatre contrôles réussis** : `finally` échoue puis le compte subsiste et décale une cible COR-04 en page 2 ; un nettoyage en `afterEach`, disposant de son budget séparé, peut au contraire supprimer le compte après le même timeout, et le test suivant confirme HEAD 404. Les timeouts diagnostiques ne sont pas comptés comme tests verts.
- Le doublon renvoie bien 500 : le routeur tente un 400 `alreadyExists`, mais ce statut manque dans l'OpenAPI POST ; le journal de fixtures confirme `no schema defined for status code '400' in the openapi spec`. Aucun changement backend proposé dans la stabilisation des tests ; cet écart de contrat est distinct.
- Correction recommandée, **non appliquée** : attendre le focus initial de la recherche après rechargement avant la saisie, vérifier la valeur saisie, et déplacer le nettoyage des comptes alloués par les scénarios COR-02/COR-04 dans un teardown disposant de son budget. Conserver assertions, temporisations applicatives, pagination et backend ; ne pas augmenter les timeouts ou ajouter d'attente arbitraire.
- Preuves locales : `.amp/in/artifacts/users-analysis-focus-baseline.log`, `users-analysis-focus-current.log`, `users-analysis-cleanup-baseline.log`, `users-analysis-duplicate-schema.log` et leurs dossiers de traces. Les scripts et l'archive temporaires sont supprimés après diagnostic ; leurs sources exécutées restent dans les traces Playwright. Aucun changement de source applicative ou de test permanent pendant cette analyse. Pas de nouvelle suite complète ; la validation globale reste à refaire après stabilisation.

## Stabilisation des tests utilisateurs autorisée le 17 novembre 2026

Demande explicite : « Oui, stabilise uniquement les tests utilisateurs puis relance la suite complète ». Cette reprise ne modifie que les tests utilisateurs et leur suivi ; la correction applicative COR-03 reste strictement identique.

- Le CRUD COR-02 attend désormais le focus initial de la recherche après `page.reload()` avant de saisir la description. La valeur saisie est contrôlée avant Enregistrer. L'ouverture des formulaires COR-04 et du parcours de pagination attend aussi cet autofocus ; aucun délai arbitraire ni augmentation de timeout.
- Une fixture `usersToCleanUp` dépendant de `request` assure le nettoyage après le corps du test, avec le budget de teardown Playwright. Les comptes synthétiques sont déclarés avant leur création : compte principal et témoins COR-02, CRUD général, mutations COR-04 et pagination filtrée. HEAD accepte 404 pour un compte jamais créé ou déjà supprimé, et DELETE doit retourner 204 si le compte subsiste. Les assertions souples du nettoyage signalent les statuts anormaux sans empêcher le nettoyage des comptes suivants.
- Les assertions métier existantes restent conservées. Aucun changement de pagination, de recherche, d'autofocus applicatif, de backend ou de dépendances ; le défaut OpenAPI des doublons reste hors périmètre. COR-01 n'est pas repris.
- Contrôle de la fixture réelle, copiée dans une sonde temporaire : deux timeouts et deux assertions volontairement échouées, puis **quatre contrôles réussis** sur desktop/mobile. Tous les noms déclarés sont absents ensuite, y compris un nom avec accents et caractères réservés ; un compte jamais créé ou déjà supprimé n'interrompt pas le nettoyage, et `alice` est conservée. Ces quatre échecs imposés ne sont pas une suite verte. Une première tentative omettait `pseudo` dans le payload synthétique et échouait avant le timeout ; elle est exclue de cette preuve. Résultats corrigés : `.amp/in/artifacts/users-stability-teardown-verified.log` et `users-stability-teardown-verified/`.
- Première sélection ciblée : `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:client -- --grep 'flash :|utilisateurs COR-02|mutation réussie puis|récupération avec filtre|validation, création|refus JSON' --output ../.amp/in/artifacts/users-stability-focused` : **48 tests réussis** en 3,9 minutes, sur desktop/mobile, dont les 20 scénarios flash. Journal : `.amp/in/artifacts/users-stability-focused.log`.
- Première relance complète après cette stabilisation : `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm test` : build réussi, **105 tests réussis et un échec mobile** du contrôle du nom. Tous les CRUD COR-02 et récupérations COR-04 passent. La trace du nouvel échec montre une autre synchronisation manquante : après fermeture, l'URL liste est déjà appliquée mais l'ancien formulaire subsiste pendant `animate__bounceOutRight`. Le `fill("alice")` du scénario suivant vise encore cet ancien champ (`input-v-14`, valeur précédente `mod03-disponible`), ensuite remplacé par un nouveau champ vide (`input-v-38`) ; aucune seconde requête HEAD alice, donc aucun dialogue d'erreur attendu. Preuves conservées : `.amp/in/artifacts/users-stability-full.log` et `users-stability-full/`.
- Les tests d'erreur attendent désormais la disparition du détail entre scénarios, et l'autofocus au démarrage. Les lectures de récupération HEAD `bruno` (204) et `mod03-disponible` (404) sont attendues avant les assertions : la trace montrait aussi que le message « existe déjà » pouvait être celui du précédent échec, avant toute lecture de `bruno`. Aucun changement applicatif, aucune suppression d'assertion ou augmentation de délai.
- Sélection après ce complément : `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:client -- --grep 'utilisateurs : erreurs du' --repeat-each 2 --output ../.amp/in/artifacts/users-stability-errors` : **8 tests réussis** en 2,1 minutes (les deux parcours, desktop/mobile, répétés deux fois). Journal : `.amp/in/artifacts/users-stability-errors.log`.
- `npm run lint`, `npm run typecheck:search` et `git diff --check` réussis après le dernier complément. Les scripts de sonde temporaires sont supprimés, leurs sources exécutées restent dans les traces.
- Relance complète finale : `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm test` : **build réussi et 106 tests réussis, aucun échec**, en 6,1 minutes. Les 20 tests flash et tous les parcours utilisateurs passent dans les deux projets ; contrôles HTTP, configuration et stores inclus. Journal : `.amp/in/artifacts/users-stability-full-final.log` ; résultats copiés dans `users-stability-full-final/`. Une tentative précédente de transmettre `--output` via le script racine avait construit l'application mais ne sélectionnait aucun test ; elle n'est pas comptée comme exécution de la suite, la commande finale sans cet argument est celle ci-dessus.
- Avant le commit de clôture, sans nouvelle modification des sources applicatives ou des tests : `npm run lint`, `npm run typecheck:search`, `npm run build` et `git diff --check` réussis ; nouvelle sélection `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:client -- --grep 'flash :' --output ../.amp/in/artifacts/cor-03-close` : **20 tests réussis**, en 18,2 secondes. Journal : `.amp/in/artifacts/cor-03-close.log`. La suite complète à 106 réussites n'est pas rejouée lors de cette clôture.

## Résultat et reprise

Correction COR-03 et couverture dédiée réalisées, avec exclusion des patchs conservée. Après l'analyse distincte, les seuls tests utilisateurs sont stabilisés et la suite complète finale est réussie (106 tests). Résultat accepté explicitement le 17 novembre 2026 : « J’accepte COR-03 : commit la correction restante et clôture le ticket, sans push ». La correction, ses tests et son suivi sont intégrés localement sur `dev` par le présent commit « Comparer numériquement les versions du flash (COR-03) », après le commit distinct de stabilisation des tests utilisateurs. Les vérifications couvrent Chromium desktop/mobile simulé et les données synthétiques, pas Safari ni un appareil réel. Aucun push ni déploiement.

## Traçabilité et livraison

- Thread de proposition et d'implémentation : [COR-03](https://ampcode.com/threads/T-01a1ea2e-55d0-7206-a6f2-d28639d95a33).
- Référence de départ et autorisation : `dev` après COR-02, demande explicite du 17 novembre 2026 ci-dessus.
- Périmètre du présent commit : composant flash, initialisation paramétrable de `last_version` et scénarios flash dans les tests client, présente fiche et ligne COR-03 du tableau de l'EPIC. Aucun autre ticket implémenté ni repris.
- À la demande « Commit la correction des tests », la seule stabilisation des tests utilisateurs a été intégrée localement sur `dev` dans `f2adafcc72457e55dcabc991a37b11578d448e00` (« Stabiliser les tests utilisateurs »). Ce commit contient uniquement les changements utilisateurs de `www/tests/client.spec.js` : ni comparateur de versions, ni initialisation paramétrable de `last_version`, ni scénarios flash, ni documentation COR-03. Lint exécuté aussi sur le contenu exact de l'index et contrôle du diff réussis avant ce commit ; la suite à 106 réussites ci-dessus portait sur le worktree combiné, sans nouvelle exécution complète lors de cette séparation. À cette étape, le suivi restait modifié localement pour conserver cette distinction.
- Acceptation, commit du reste et clôture explicitement demandés le 17 novembre 2026 ; intégration locale sur `dev` par le présent commit identifié ci-dessus. Les limites applicatives et de vérification restent celles de cette fiche. Aucun push ni déploiement autorisé ou effectué.
