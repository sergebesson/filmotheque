# MOD-01 Configuration et initialisation explicites

[EPIC : état, dépendances et thread](../EPIC.md) · [Revue : R02](../REVUE.md)

## Objectif et origine

Rendre l’application de la configuration et la responsabilité des chargements partagés indépendantes d’abonnements ponctuels enregistrés à l’import. Préparer le chargement différé sans changer l’expérience de démarrage.

Sources à relire : [app.js](../../../www/app.js), [configuration](../../../www/stores/configuration.store.js), [bus](../../../www/eventBus.js), [store films](../../../www/stores/movie-list.store.js), [store utilisateurs](../../../www/stores/user-list.store.js), [profil](../../../www/modules/profile/profile.vue), [flash](../../../www/modules/flash/flash.vue), [structure principale](../../../www/modules/filmotheque/filmotheque.vue).

## Périmètre et exclusions

- Expliciter la disponibilité de la configuration, son application aux listes et la responsabilité des chargements partagés.
- Préserver le parallélisme et l’ordre observable des chargements, les états du loader, le titre, les erreurs et le moment d’apparition du flash.
- Ne pas introduire le chargement différé de MOD-06, corriger les concurrences de COR-01, changer la politique de version ou ajouter une reprise automatique après erreur.
- Conserver le bus d’erreurs si son remplacement n’est pas nécessaire ; sa suppression n’est pas un objectif.

## Critères d’acceptation

- [x] Une taille de page configurée différente du défaut est utilisée par les deux listes, y compris si leur module est importé après le chargement de configuration.
- [x] Les chargements partagés ont une responsabilité identifiée et ne reposent plus sur un événement de configuration déjà passé.
- [x] Les parcours films et utilisateurs, le loader, le profil et le flash gardent leur comportement visible ; les échecs de démarrage ne sont pas transformés silencieusement.
- [x] Les contrôles pertinents passent et la configuration est prête pour MOD-06 sans réaliser ce dernier ticket.

Ces cases consignent les vérifications techniques ci-dessous. L'acceptation utilisateur est enregistrée dans la traçabilité ; elle ne vaut pas accord sur une branche d'intégration ni autorisation de push.

## Vérifications prévues

Comparer la taille de page effective avec une valeur non standard ; exercer l’import d’une liste après configuration. Vérifier démarrage normal, accès direct aux utilisateurs, échec de configuration et chargement du profil/des informations. Réutiliser `npm run lint` et `npm test` ; contrôler les erreurs asynchrones attendues sans les masquer. Ajouter seulement un test contractuel nécessaire à ce changement.

### Exécution du 15 novembre 2026

Environnement : checkout local `dev`, Node 24.19.0, Chromium `/usr/bin/chromium`, serveur et bases temporaires de `www/tests/server.cjs`. Aucun appel aux données de production ni outil GX.

| Contrôle réellement exécuté | Résultat |
| --- | --- |
| Sonde Node sur les sources initiales : réponse HTTP `pageSize: 7` à `configurationStore.load()`, puis import des deux listes | Configuration à 7, mais films et utilisateurs à 30 : risque R02 reproduit, sans introduire de route différée |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:client -- configuration.spec.js`, avant refactoring | Deux échecs attendus (projets desktop/mobile) : les imports tardifs donnent 30 au lieu de 7 |
| `npm run lint`, après refactoring | Succès |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm test`, après refactoring | Build réussi et 18 tests réussis : huit scénarios existants et un nouveau contrat, sur les deux projets |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:client -- configuration.spec.js`, contrôle final | Deux réussites après suppression de la dépendance à l'ordre des requêtes dans l'assertion du nouveau test ; lint relancé avec succès |
| Sondes navigateur temporaires : `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium www/node_modules/.bin/playwright test --config .amp/in/mod01.config.mjs` | 16 réussites sur la base applicative inchangée, puis 16 sur le build modifié, avec les mêmes assertions ; scripts temporaires supprimés après vérification |
| `npm run build`, relancé pour les sondes finales | Succès ; CSS identique (même nom de contenu), aucun template ni style modifié |
| `git diff --check` | Succès |

Le [test contractuel conservé](../../../www/tests/configuration.spec.js) charge les vrais modules avant et après `load()`, avec HTTP simulé : défaut de 30, valeur configurée de 7 et paramètre HTTP `page_size=7` pour les quatre instances de liste. Les suffixes d'import isolent les instances précoces et tardives ; aucune assertion ne dépend de l'ordre des requêtes.

Les sondes navigateur utilisent le vrai serveur de test et interceptent certaines réponses pour les retenir ou les faire échouer. Scénarios exécutés avant et après, sur les deux viewports :

- `/movies` et accès direct `/users/list` : configuration retenue, seul le loader HTML est présent et aucune requête API ne part ; après libération, informations, profil et liste partent sans attendre leurs réponses respectives. Ordre d'émission observé : configuration, informations, profil, liste. `page_size=3` et trois lignes dans chaque parcours.
- Informations libérées avant le profil, puis ordre inverse : loader applicatif lié uniquement à `meStore.name`, liste déjà chargée mais masquée tant que le profil manque, titre initial puis `filmothèque 1.4.14 - 24 films`, flash affiché dès les informations disponibles même si le profil attend encore. Persistance de `last_version`, fermeture et absence de réouverture au rechargement.
- Configuration en 503 : redirection vers `/error.html?message=Request%20failed%20with%20status%20code%20503`, texte d'erreur de configuration et aucune requête API.
- Informations en 503 : message existant avec le détail HTTP, profil disponible, titre non enrichi et aucune version persistée. Profil en 503 : message spécifique existant, loader maintenu et bouton Profil absent. Une seule tentative du chargement en échec, pas de reprise automatique.
- Exception volontaire de `localStorage.getItem` pendant le flash : l'erreur asynchrone `Stockage indisponible` reste observable via `pageerror`, sans conversion en dialogue générique. Aucun `pageerror` dans les autres scénarios. Ce comportement préexistant est conservé, pas corrigé.

Limites : contrôles Chromium uniquement, pas de Safari/Firefox ni appareil réel ; aucune mesure de latence. Les sondes temporaires ont été calibrées sur la base inchangée (chemin local contenant des espaces, ordre réseau réel, wrapper Vuetify et persistance au rechargement), puis exécutées sans modification entre les deux comparaisons finales. L'avertissement Vite de chunk JS supérieur à 500 kB subsiste, comme avant ; aucune optimisation MOD-05/MOD-06 n'est réalisée.

## Décisions

### Configuration disponible sans événement ponctuel

`app.js` conserve `await configurationStore.load()` avant la création de l'application et l'installation du routeur ; cette promesse est la barrière explicite de disponibilité. Une erreur continue de rejeter vers la redirection existante, sans valeur de secours ajoutée au démarrage.

Les deux listes lisent `configurationStore.getValue("pageSize", 30)` via leur accesseur `configuration.pageSize` : aucune copie à synchroniser et aucune dépendance à l'ordre des imports. Les interfaces de lecture, URL, méthodes HTTP et défaut de 30 restent en place. L'événement `CONFIGURATION_LOADED`, son émission et ses deux abonnements sont supprimés ; le bus `ERROR` et `mitt` restent inchangés.

La configuration n'est chargée qu'une fois par l'application ; aucun rechargement à chaud ni appel d'initialisation supplémentaire n'est introduit. Le getter lit la valeur courante, sans nouvelle couche d'orchestration, store générique ou dépendance.

### Responsabilités partagées conservées, rendues explicites

La relecture confirme R02, avec une distinction importante : seuls les stores de liste dépendent de l'événement. Le profil et les informations possèdent déjà des chargements explicites, sans abonnement d'import. Les déplacer n'est donc pas nécessaire pour MOD-01 et risquerait de changer les timings ou la responsabilité des erreurs.

| Propriétaire | Responsabilité conservée |
| --- | --- |
| `app.js` | Attend la configuration, prépare l'application, attend le routeur, monte la racine, puis retire le loader HTML |
| `filmotheque.vue` | Monte les composants partagés indépendamment des routes et maintient le loader applicatif tant que le nom du profil manque ; commentaires de responsabilité ajoutés |
| `Profile.created()` | Lance et attend `meStore.loadMe()` ; demeure monté même sous le contenu masqué par `v-show` |
| `Flash.created()` / `showFlash()` | Charge les informations et gère titre, ouverture conditionnelle et persistance de version, sans attendre le profil |
| Composant de liste de la route active | Charge sa liste si elle est vide ; ne prend pas en charge le profil ou les informations |

Pas de `Promise.all` bloquant le montage ni de déplacement dans un hook parent. Les imports des routes restent statiques ; MOD-06 pourra différer l'administration sans manquer la configuration, mais devra conserver les composants partagés dans la racine. Les stores de profil/informations continuent de consommer leurs erreurs HTTP sur le bus ; l'appel asynchrone du flash et sa politique de versions ne sont pas modifiés.

## Résultat et reprise

Le 15 novembre 2026, l'utilisateur valide MOD-01 et demande son commit ainsi qu'un message de reprise dans un autre thread. Le code, le test et le suivi sont regroupés dans le commit local `b58b4bdc168c689ee414f615eb90cd99b6128a89` sur `dev`. Lors de la reprise, l’utilisateur confirme `dev` comme branche de référence locale et demande le démarrage de MOD-02. Le commit, l’acceptation et l’arbre propre sont vérifiés : l’intégration locale de MOD-01 est enregistrée et sa clôture reportée dans l’EPIC. Aucun push n’est autorisé.

Pour reprendre : utiliser ce même checkout local, vérifier `git status` et la présence du commit « Rendre explicite la configuration des listes (MOD-01) », puis relire l'EPIC et la fiche du prochain ticket. Les scripts de sonde temporaires ont été supprimés ; leurs scénarios et résultats sont décrits ci-dessus. Dans un autre checkout, transférer explicitement les commits locaux de documentation et de MOD-01, ou utiliser une référence devenue accessible après autorisation de push : le lien du thread et un SHA non poussé ne transfèrent pas les fichiers.

## Traçabilité et livraison

- Thread d'implémentation : [MOD-01 dans le checkout local](https://ampcode.com/threads/T-01a1df6e-5165-75f1-ad75-584c3231189d).
- Référence de départ vérifiée : branche locale `dev`, commit `228e50f9a695d2d2c3fe1fa57fbef9b0a9196ff2` (« Documenter le suivi de la modernisation du client »), arbre et index propres ; migration `ba24db3` accessible et documents présents. Aucun fetch ni push effectué.
- Livraison : commit local `b58b4bdc168c689ee414f615eb90cd99b6128a89` « Rendre explicite la configuration des listes (MOD-01) » sur `dev`, contenant le code, `www/tests/configuration.spec.js` et le suivi. Intégration locale vérifiée sur cette branche de référence ; aucun push, merge supplémentaire ni déploiement.
- Acceptation utilisateur : obtenue le 15 novembre 2026 dans le thread d'implémentation, avec autorisation de commit. Confirmation de `dev` et clôture locale demandées dans le [thread MOD-02](https://ampcode.com/threads/T-01a1e0b8-c0e7-72ed-9da7-0e2446f3f9fb). Le statut courant reste uniquement dans l'EPIC.
