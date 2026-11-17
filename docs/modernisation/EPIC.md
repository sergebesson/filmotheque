# EPIC : modernisation technique du frontend Vue 3

Simplifier le client `www`, ses dépendances et ses contrats internes sans modifier ses fonctionnalités, ses contrats API ni la présentation validée. Ce dossier est la mémoire durable du chantier ; les threads servent à réaliser et discuter les tickets.

## Point de départ

- Suivi initialisé le 15 novembre 2026 ; aucun ticket d’implémentation n’est démarré par cette initialisation.
- [Revue initiale](REVUE.md) : constats, preuves datées et limites. Les sources doivent être relues au démarrage de chaque ticket.
- [Thread de migration](https://ampcode.com/threads/T-01a1da44-6eb3-749b-8566-f32d65e4bb8e) : origine du comportement validé.
- [Thread de pilotage](https://ampcode.com/threads/T-01a1de9e-73bf-7283-bf9f-cf7dc98d6085) : revue, cadrage et initialisation du suivi.
- Branche locale : `dev`. Une anomalie de l’index avait été constatée pendant l’initialisation ; son origine n’a pas été établie. L’utilisateur l’a corrigée, puis la vérification du 15 novembre 2026 a confirmé les 246 fichiers suivis, le commit de migration accessible, aucune suppression indexée et uniquement les changements documentaires attendus.
- Le contrôle final retrouve la même empreinte de contenu qu’au départ pour `www`, `www.vue2`, le backend, les scripts et les fichiers de configuration vérifiés : aucun changement de code dans cette initialisation.
- Branche de référence locale du chantier : `dev`, confirmée par l’utilisateur le 15 novembre 2026 lors de la reprise MOD-02. Les commits de suivi et MOD-01 sont disponibles dans ce checkout ; aucun push n’est autorisé. Vérifier la disponibilité des documents avant une reprise dans un autre checkout.

« À faire » signifie que le sujet de refactoring est inscrit dans le périmètre, pas que son exécution est autorisée. Attendre une demande de démarrage. Les dépendances constituent l’ordre initial ; toute révision motivée est consignée ici avant exécution.

## Invariants

- Conserver les fonctionnalités, routes hash, vues nommées, droits et contrats HTTP existants. Ne pas refondre le backend ou l’authentification.
- Conserver recherche temporisée, effacement, pagination, regroupement et dates françaises, tailles IEC octet, téléchargement et liens externes des films.
- Conserver le chargement complet et ses effets sur la recherche, les indicateurs de chargement, textes d’erreur et notifications.
- Conserver validation, champs obligatoires, confirmations, état sale et réinitialisation des formulaires utilisateurs ; pseudo facultatif et protections administrateur inchangés.
- Conserver le masquage et les interactions des mots de passe. Leur exposition actuelle n’autorise pas une refonte de sécurité dans les tickets MOD.
- Conserver focus, responsive, couleurs, alignements, animations et durées validés, notamment le fondu de fond des films et l’animation de ligne utilisateur après modification.
- Conserver le flash, sa persistance, ses ancres internes et sa politique actuelle ignorant les patchs. Toute correction de version relève de COR-03.
- Ne pas mélanger refactoring et correction de cas limites. Si une simplification change un comportement connu ou découvert, isoler la correction et demander la décision avant de l’inclure.
- Ne pas imposer une réécriture générale, Composition API, Pinia, TypeScript, un nouveau client HTTP ou un store générique sans besoin établi dans le ticket.

## Tableau de suivi

Ce tableau est l’unique emplacement des statuts courants. Les fiches contiennent les détails et les résultats, sans statut dupliqué. Une cellule « — » signifie qu’aucune référence n’a encore été attribuée, pas qu’une opération a été réalisée.

### Refactorings à comportement constant

| Ticket | Sujet | Priorité | Dépendances | État | Thread d’implémentation | Intégration |
| --- | --- | --- | --- | --- | --- | --- |
| [MOD-01](tickets/MOD-01.md) | Configuration et initialisation explicites | P1 | — | Terminé | [Implémentation](https://ampcode.com/threads/T-01a1df6e-5165-75f1-ad75-584c3231189d) | Intégré localement sur `dev` : `b58b4bdc168c689ee414f615eb90cd99b6128a89`, accepté ; non poussé |
| [MOD-02](tickets/MOD-02.md) | Actions et interfaces des stores | P1 | MOD-01 | Terminé | [Implémentation](https://ampcode.com/threads/T-01a1e0b8-c0e7-72ed-9da7-0e2446f3f9fb) | Présent commit local « Rendre explicites les actions des stores (MOD-02) » sur `dev` ; accepté, non poussé |
| [MOD-03](tickets/MOD-03.md) | Responsabilité des erreurs asynchrones | P1 | MOD-02 | Terminé | [Implémentation](https://ampcode.com/threads/T-01a1e0e3-51b2-7065-bef2-48148dca5801) | Présent commit local « Clarifier la responsabilité des erreurs asynchrones (MOD-03) » sur `dev` ; accepté après essais utilisateur, non poussé |
| [MOD-04](tickets/MOD-04.md) | Données, HTTP et validation des utilisateurs | P2 | MOD-03 | Terminé | [Implémentation](https://ampcode.com/threads/T-01a1e350-796b-7755-b16b-a33e40d755bf) | Présent commit local « Simplifier les données et la validation des utilisateurs (MOD-04) » sur `dev` ; accepté, non poussé |
| [MOD-05](tickets/MOD-05.md) | Mesure et réduction des dépendances chargées | P2 | — | Terminé | [Implémentation](https://ampcode.com/threads/T-01a1e394-8694-73aa-954f-b6716597c434) | Présent commit local « Mesurer et réduire les dépendances chargées (MOD-05) » sur `dev` ; accepté le 16 novembre 2026, non poussé |
| [MOD-06](tickets/MOD-06.md) | Chargement différé de l’administration | P2 | MOD-01, MOD-05 | Terminé | [Implémentation](https://ampcode.com/threads/T-01a1e3c6-1ac1-705a-99df-57d8444e9bd1) | Présent commit local « Différer le chargement de l’administration (MOD-06) » sur `dev` ; accepté le 16 novembre 2026, non poussé |
| [MOD-07](tickets/MOD-07.md) | Couleurs, portée CSS et surcharges Vuetify | P2 | — | Terminé | [Implémentation](https://ampcode.com/threads/T-01a1e464-8f33-71c3-ac94-86f4b60e61ac) | Présent commit local « Simplifier les styles partagés et les surcharges Vuetify (MOD-07) » sur `dev` ; accepté le 16 novembre 2026, non poussé |
| [MOD-08](tickets/MOD-08.md) | Contrats documentés et garde-fous d’outillage | P3 | — ; cadrage après MOD-02 à MOD-04 | Terminé | [Cadrage et implémentation](https://ampcode.com/threads/T-01a1e4ba-96e3-7508-938a-9d902e0cb385) | Présent commit local « Documenter les contrats et renforcer les garde-fous navigateur (MOD-08) » sur `dev` ; résultat accepté le 16 novembre 2026, hors CI, migration ESLint et typage vérifié ; non poussé |
| [MOD-09](tickets/MOD-09.md) | Regrouper les CSS des composants dans les .vue | P3 | MOD-06, MOD-07, MOD-08 | Terminé | [Implémentation](https://ampcode.com/threads/T-01a1e519-e2ed-75c6-af4e-5682e54d5e43) ; [Création du ticket](https://ampcode.com/threads/T-01a1e4ba-96e3-7508-938a-9d902e0cb385) | Présent commit local « Regrouper les styles dans les composants Vue (MOD-09) » sur `dev` ; accepté le 16 novembre 2026 et intégré localement ; non poussé |
| [MOD-10](tickets/MOD-10.md) | Cadrer les options d’outillage différées : CI, ESLint, typage vérifié | P3 | MOD-08 | Terminé | [Cadrage et intégrations ciblées](https://ampcode.com/threads/T-01a1e5f8-0101-72a0-bc76-597938f298f5) ; [Création du ticket](https://ampcode.com/threads/T-01a1de9e-73bf-7283-bf9f-cf7dc98d6085) | ESLint accepté et intégré localement sur `dev` par `10882f294f8031d592909bd6202643d7716eedaa` ; typage ciblé durci avec `noImplicitAny: true` et limites accepté le 17 novembre 2026, intégré localement par le présent commit « Vérifier le contrat de recherche avec un typage ciblé (MOD-10) », clôture explicitement demandée ; typecheck/lint, 21 sondes et build/60 tests vérifiés ; CI différée, aucune généralisation ni alignement VS Code, limites détaillées dans la fiche ; non poussé, COR-04 exclu, aucun push ni activation CI autorisé |

MOD-05 établit les mesures avant toute optimisation. MOD-07 réévalue les styles si le chargement CSS a changé entre-temps. Les tests nécessaires accompagnent chaque ticket : MOD-08 ne les reporte pas à la fin du chantier. Le premier candidat proposé est MOD-01, sans démarrage implicite.

### Corrections hors du refactoring autorisé

| Ticket | Sujet | Priorité | Dépendances | État | Thread d’implémentation | Intégration |
| --- | --- | --- | --- | --- | --- | --- |
| [COR-01](tickets/COR-01.md) | Priorité des requêtes et propriété du chargement | P1 | — | Abandonné | [Implémentation et retrait](https://ampcode.com/threads/T-01a1e9dc-80d7-7788-b590-37b8d5eda9e5) ; [Cadrage](https://ampcode.com/threads/T-01a1e9c5-7873-7235-ba2d-ab71b1ae618f) | Abandon explicitement demandé le 17 novembre 2026 par arbitrage coût/bénéfice ; anomalies de concurrence et cas `page_size=0` après liste vide acceptés ; correction et tests spécifiques retirés, `www` identique à la base après COR-04, autres travaux préservés ; lint/typecheck, build et 62 tests réussis après retrait, preuves antérieures historiques ; abandon et suivi documentaire enregistrés sur `dev` par le présent commit « Documenter l’abandon de COR-01 dans le suivi de modernisation », explicitement demandé ; aucune intégration de la correction COR-01, validation non attendue, aucune reprise sans nouvelle demande explicite ; non poussé, aucun push autorisé |
| [COR-02](tickets/COR-02.md) | Encodage des noms dans les URL utilisateurs | P2 | — | Terminé | [Implémentation](https://ampcode.com/threads/T-01a1ea15-10f1-70b5-8f45-aec29238915c) | Résultat accepté le 17 novembre 2026 ; commit et clôture explicitement demandés, intégré localement sur `dev` par le présent commit « Encoder les noms dans les URL utilisateurs (COR-02) » ; reproduction avant/après, CRUD isolé de six noms desktop/mobile, lint/typecheck, build et 86 tests réussis, limites inchangées détaillées dans la fiche ; écart DELETE d’un compte absent hors périmètre, backend inchangé, COR-01 non repris ; non poussé, aucun push ni déploiement autorisé |
| [COR-03](tickets/COR-03.md) | Comparaison numérique des versions du flash | P2 | — | Terminé | [Proposition et implémentation](https://ampcode.com/threads/T-01a1ea2e-55d0-7206-a6f2-d28639d95a33) | Résultat accepté le 17 novembre 2026 ; commit du reste et clôture explicitement demandés, intégrés localement sur `dev` par le présent commit « Comparer numériquement les versions du flash (COR-03) » ; patchs toujours exclus ; reproduction avant/après et 20 tests flash réussis, suite complète finale de 106 tests réussie après analyse distincte et stabilisation des tests utilisateurs dans `f2adafcc72457e55dcabc991a37b11578d448e00` ; lint/typecheck, build et 20 tests flash rejoués avec succès avant clôture, sans rejouer la suite complète ; historique des échecs et limites conservés dans la fiche, backend et autres comportements applicatifs inchangés ; correction, tests flash et suivi inclus dans le présent commit, non poussé, aucun push ni déploiement autorisé |
| [COR-04](tickets/COR-04.md) | Récupération après mutation réussie et rafraîchissement échoué | P2 | MOD-03, MOD-04 | Terminé | [Implémentation](https://ampcode.com/threads/T-01a1e94b-e019-7159-b4b0-0ce383806499) ; [Création du ticket](https://ampcode.com/threads/T-01a1de9e-73bf-7283-bf9f-cf7dc98d6085) | Résultat et présentation acceptés le 17 novembre 2026 ; commit et clôture explicitement demandés, intégré localement sur `dev` par le présent commit « Récupérer la liste après une mutation utilisateur réussie (COR-04) » ; reproduction avant/après, relance de lecture seule, lint/typecheck, build et 62 tests réussis, six captures inspectées et limites inchangés, détaillés dans la fiche ; non poussé, aucun push ni déploiement autorisé |

L’exposition des mots de passe, la confiance du HTML du flash et la déconnexion Basic Auth restent des [risques et exclusions](REVUE.md), sans ticket d’implémentation autorisé ici. Conserver `www.vue2` ; sa suppression serait une décision distincte.

## États et validation

| État | Condition |
| --- | --- |
| À décider | Autorisation ou périmètre à trancher avant de commencer |
| À faire | Sujet accepté dans le suivi, en attente de demande de démarrage et de satisfaction des dépendances |
| En cours | Un thread identifié est responsable de l’implémentation |
| Bloqué | Le blocage et l’action attendue sont décrits dans la fiche |
| À valider | Résultat, vérifications et livraison réelle documentés ; validation ou intégration encore manquante |
| Terminé | Critères satisfaits, acceptation utilisateur et intégration dans la branche de référence convenue |

Une demande de reprise fait revenir le ticket à « En cours ». Un abandon reste documenté avec sa décision et son retrait de périmètre ; ne pas supprimer la fiche. Ne pas déduire une acceptation du silence ni d’un test réussi. Ne pas utiliser les statuts comme autorisation de commit, push, merge ou déploiement.

## Travail dans les threads

1. Choisir un ticket sur demande de l’utilisateur, vérifier son périmètre et ses dépendances, convenir de la référence de code de départ.
2. Ouvrir un thread dédié dans le dépôt et lui transmettre la fiche, l’objectif et l’état exact du code. Reporter son URL complète dans le tableau et passer à « En cours ».
3. Le thread d’implémentation relit le code, réalise uniquement ce ticket et actualise sa fiche aux décisions importantes et avant interruption ou restitution.
4. Il rapporte au pilotage les résultats, preuves, limites, livraison réelle et prochaine action. Le pilotage met le tableau à jour. Sans pilotage actif, le thread effectue cette mise à jour en respectant les conditions d’état.
5. Après validation et intégration, enregistrer la référence livrée et clôturer. Garder les anciens liens si un autre thread reprend le ticket.

Un seul ticket d’implémentation actif à la fois, sauf accord explicite pour des périmètres indépendants. Ne pas réécrire les fiches d’autres tickets pour y inclure du travail non demandé. Une fiche décrit la situation courante ; Git conserve les versions précédentes.

## Transmission et livraison

Un lien de thread ne transmet ni fichiers, ni commits locaux, ni services. Dans le même checkout, vérifier l’état de travail et les accès concurrents. Dans un autre checkout ou un orb, utiliser une référence Git accessible contenant le code et les documents, ou un transfert explicite des changements ; un SHA non poussé n’est pas suffisant.

Dans chaque fiche, distinguer modifications locales, commit, push et intégration. Déploiement et publication ne sont pas inclus. Avant tout commit futur, relire l’index existant pour ne pas embarquer les changements préexistants. L’AGENTS.md parent de `@sbesson` n’est pas transporté automatiquement vers un autre checkout : transmettre aussi les contraintes pertinentes.

## Vérifications et mémoire des preuves

- Réutiliser `npm run lint` et `npm test` selon le périmètre, avec les contrôles ciblés propres au ticket. Sur le runner utilisé pour la revue, Chromium est disponible via `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium` ; vérifier sa disponibilité ailleurs.
- Enregistrer date, état de code, commandes réellement exécutées, résultats et limites. Ne pas recycler le résultat d’une ancienne exécution comme preuve d’un changement ultérieur.
- Pour un changement d’apparence, inspecter les rendus représentatifs, y compris les états non par défaut concernés, et garder les comparaisons utiles. Ne pas modifier l’interface dans le seul but de rendre un test vert.
- Les traces et fichiers temporaires restent sous `.amp/in/`, ignoré par Git. Les conclusions nécessaires à la reprise restent dans la fiche. Conserver seulement les captures synthétiques durables utiles dans `docs/modernisation/preuves/`, sans données sensibles ; ne pas archiver tous les résultats Playwright.
- Vérifier les liens et les identifiants lors des modifications du suivi. Aucun moteur de tickets, génération de tableau, synchronisation externe ou surveillance automatique n’est installé.

## Décisions transverses

### 2026-11-15 : création du suivi uniquement

L’utilisateur autorise la mise en place documentaire, sans commencer la modernisation ni faire de commit. Les huit sujets MOD sont inscrits au suivi ; les trois COR nécessitent une décision distincte. Aucun thread d’implémentation n’est créé par cette initialisation.

### 2026-11-15 : une source de vérité dans Git

Ce dossier conserve les périmètres, décisions et résultats ; le tableau ci-dessus conserve les statuts. Les artefacts et conversations de préparation sont des références, pas des tableaux d’avancement à synchroniser. Les décisions locales restent dans leur fiche ; seules les décisions touchant plusieurs tickets sont enregistrées ici.

### 2026-11-17 : validation finale du développement

Sur `dev`, au commit « Comparer numériquement les versions du flash (COR-03) », les vérifications finales ont été réexécutées sous Node 24.19.0 : `npm run lint` et `npm run typecheck:search` réussis ; `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm test` réussit avec build et **106 tests passés en 6,1 minutes**, sans échec. La suite utilise le serveur de fixtures 4173 et des données temporaires, pas les données habituelles. Les limites de couverture demeurent celles des fiches : Chromium desktop/mobile émulé et contrôles Node, pas de validation Safari ou appareil physique revendiquée.

L’application a ensuite été démarrée par `npm start` sur le port local 8080 avec ses données et son authentification habituelles. Réponses vérifiées : `/logout` renvoie 200 et `/` sans authentification renvoie 401. L’utilisateur confirme ensuite : **« Mes tests manuels sont concluants »**. Les parcours manuels ne sont pas détaillés ; cette confirmation n’est pas présentée comme une couverture exhaustive. L’application est laissée en service pour l’utilisateur.

Le développement est validé dans son périmètre accepté : les dix MOD et COR-02/COR-03/COR-04 sont terminés ; COR-01 reste abandonné avec ses limites acceptées. Aucun autre travail n’est démarré. Au moment de cette validation, `dev` est alignée avec la référence locale `origin/dev`, sans interrogation du distant ; les mentions « non poussé » des lignes précédentes décrivent les livraisons à l’époque, pas un contrôle actuel du serveur distant.

L’utilisateur demande ensuite de regrouper tous les commits de `dev` en un seul : les 18 commits depuis la base commune avec `master` sont regroupés localement avec cette note de validation finale, sans modification du code validé. L’ancien historique est conservé dans la branche locale `backup/dev-before-squash-20261117` ; les références de commits et titres des fiches restent des références historiques. `master` n’est pas modifiée. Aucun push, réécriture distante ou déploiement n’est effectué par ce regroupement.
