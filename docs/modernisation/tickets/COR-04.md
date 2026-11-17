# COR-04 Récupération après mutation réussie et rafraîchissement échoué

[EPIC : état et dépendances](../EPIC.md) · [Origine : anomalie conservée dans MOD-03](MOD-03.md#comportement-de-référence-conservé-y-compris-les-limites-de-récupération)

## Objectif et origine

Distinguer la réussite d’une création, modification ou suppression utilisateur de l’échec de la lecture suivante, afin de conserver une interface utilisable et une information correcte sur ce qui a réellement été enregistré.

Le 16 novembre 2026, après explication du défaut et du périmètre proposé, l’utilisateur demande de créer ce ticket sans l’implémenter. Le 17 novembre 2026, il autorise explicitement uniquement COR-04 et ses vérifications, dans le checkout partagé, sans commit ni push. Cette autorisation ne vaut pas acceptation du résultat.

Sources à relire : [orchestration utilisateurs](../../../www/modules/users/users.vue), [formulaire](../../../www/modules/users/components/user-detail.vue), [modèle et opérations HTTP](../../../www/modules/users/services/user.service.js), [rafraîchissement du store](../../../www/stores/user-list.store.js), [liste affichée](../../../www/modules/users/components/user-list.vue) et [tests navigateur](../../../www/tests/client.spec.js).

## Comportement de référence

La mutation POST/PATCH/DELETE réussit d’abord. Le formulaire réinitialise sa validation, émet `updated` et termine son état d’envoi ; le parent attend ensuite `userListStore.update()` avant notification et navigation. Si cette seconde opération échoue, le parent affiche « Une erreur est survenue » puis sort sans exécuter la suite métier. Le succès de la mutation n’est pas annulé.

| Mutation réussie puis rafraîchissement refusé | Conséquence avant COR-04 |
| --- | --- |
| Création | Le compte est créé mais la route de création reste affichée, au lieu d’ouvrir son détail ; aucune notification de réussite |
| Modification | Le détail porte les données enregistrées mais la liste conserve ses anciennes valeurs ; Fermer reste utilisable ; aucune notification de réussite |
| Suppression | Le compte est supprimé mais sa fiche reste ouverte avec champs et bouton Fermer désactivés ; ancienne liste conservée ; sortie encore possible par le menu |

Ce comportement était caractérisé dans MOD-03 et dans les tests « mutation réussie puis rafraîchissement refusé », avec réponses simulées pour les deux opérations. Il a été réexécuté sur la base inchangée pour COR-04. Les scénarios étendus utilisent désormais de vraies mutations dans la base temporaire ; seuls les échecs et la retenue des lectures sont injectés. Ils ne démontrent pas une panne en production.

## Périmètre accepté

- Distinguer explicitement une mutation réussie d’un échec de rafraîchissement. Le message doit confirmer l’opération acquise et expliquer que la liste n’a pas pu être actualisée, sans affirmer que l’enregistrement ou la suppression a échoué.
- Après suppression réussie, quitter la fiche supprimée pour la liste même si le rafraîchissement échoue. Ne pas réactiver les champs ou remettre `isDeleted` à faux pour contourner le blocage.
- Après création réussie, rejoindre le détail du compte retourné par le serveur plutôt que laisser un formulaire de création réutilisable comme si rien n’avait été enregistré. Après modification, conserver un détail utilisable, avec fermeture possible et sans fausse confirmation d’abandon des données déjà enregistrées.
- Si l’ancienne liste est conservée faute de nouvelle réponse, signaler clairement qu’elle n’est pas à jour ; ne pas la présenter silencieusement comme un état confirmé du serveur.
- Proposer une relance explicite de la seule lecture de liste. Cette action ne doit rejouer ni POST, ni PATCH, ni DELETE. En cas de nouvel échec, l’interface doit rester utilisable et l’avertissement compréhensible ; après réussite, la liste est à jour et l’avertissement retiré.
- Conserver les parcours de succès complet et ceux où la mutation elle-même est refusée. Adapter les contrats et les attentes des tests concernés au changement de comportement, sans supprimer leur couverture.

## Exclusions et frontières

- Pas de restauration du compte supprimé, de rollback de la mutation ni de mécanisme de transaction entre écriture et lecture.
- Pas de retry automatique, timeout, nouvelle politique globale d’erreur, file de dialogues ou framework de récupération. Le texte exact et la présentation minimale seront précisés à l’implémentation dans le périmètre accepté.
- Pas de traitement des écritures à résultat incertain, par exemple réponse de mutation perdue : ce ticket part d’une réponse de réussite reçue par le client.
- Ne pas corriger la priorité des requêtes de COR-01, les URL de COR-02 ou les versions de COR-03. Une relance lit la liste selon son contrat courant ; tout problème de concurrence découvert reste à isoler.
- Conserver filtres et pagination selon le contrat de rafraîchissement existant, validation, droits et protections administrateur, payloads POST/PATCH distincts, masquage des mots de passe et confirmations de suppression.
- Aucun changement du backend, de l’authentification, de `www.vue2`, des dépendances ou de la chaîne de validation. Aucun redesign hors des messages et contrôles nécessaires à cette récupération.

## Critères d’acceptation

Les coches ci-dessous indiquent la vérification technique locale du 17 novembre 2026, pas une acceptation utilisateur ni une intégration Git.

- [x] Pour chacune des trois mutations réussies suivies d’un rafraîchissement échoué, l’utilisateur distingue le succès enregistré de la liste non actualisée ; aucun message ne suggère de rejouer la mutation.
- [x] Après suppression, la fiche supprimée n’emprisonne plus l’utilisateur : retour à la liste malgré l’échec de lecture, sans réactiver un objet supprimé.
- [x] Après création, le détail du compte créé remplace le formulaire de création ; après modification, les données enregistrées restent accessibles et la fermeture fonctionne, sans faux état sale.
- [x] Une liste conservée est explicitement signalée comme non actualisée ; la relance utilisateur effectue uniquement une lecture, puis retire cet avertissement sur réussite. Un nouvel échec ne bloque pas la navigation et ne provoque aucune nouvelle écriture.
- [x] Les succès complets et les refus de mutation conservent leurs résultats, notifications et possibilités de récupération existants ; les droits, filtres et règles de validation ne changent pas.
- [x] Les régressions montrent le défaut avant correction puis le résultat attendu après ; lint, tests pertinents et contrôles de rendu des états affectés réussissent sans affaiblir les garde-fous existants.

## Vérifications prévues

Étendre les cas existants de `client.spec.js`, sur le vrai serveur de test `www/tests/server.cjs` et ses bases temporaires en 4173. Reproduire séparément les trois opérations : réponse de mutation réussie, rafraîchissement retenu puis erreur HTTP ou réseau, message, route, champs, fermeture et liste observés. Vérifier une relance échouée puis réussie, l’absence de nouvelle écriture et l’exactitude finale des données. Inclure un refus de mutation et un succès complet comme contrôles, ainsi que filtre actif et pagination déjà avancée pour éviter une récupération qui les réinitialiserait par erreur.

Les assertions qui caractérisaient la route conservée, l’absence de notification et le dialogue générique après échec de lecture évoluent volontairement. Les contrôles pendant la lecture retenue sont conservés, y compris les champs et Fermer désactivés sur l’objet supprimé avant la réponse ; la correction quitte ensuite ce détail sans le réactiver. Aucun scénario de refus de mutation ni garde-fou général d’erreurs navigateur n’est retiré ou assoupli.

### Exécutions du 17 novembre 2026

Environnement : Node **24.19.0**, Chromium `/usr/bin/chromium`, projets desktop **1280 × 800** et mobile **390 × 844**. Le serveur `www/tests/server.cjs` crée ses bases sous `/tmp/filmotheque-test-*`, écoute en **4173** et nettoie ses données à la sortie. Aucun appel au serveur 8080 ni usage des données habituelles `data/`. Le serveur de fixtures n’est plus en écoute à la restitution.

| Exécution réelle | Résultat |
| --- | --- |
| `npm run build`, puis `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:client -- --grep 'mutation réussie puis rafraîchissement refusé' --output=../.amp/in/artifacts/cor04-before` sur les sources et tests inchangés | **6 réussites** caractérisent le défaut : création sur son formulaire, modification sans notification, suppression sur fiche désactivée, dialogue générique et ancienne liste conservée |
| Nouvelles attentes exécutées contre ce même build inchangé, sans recompilation | Création échoue sur la route de création au lieu du détail. Modification et suppression rejouées séparément sur bases neuves : modification échoue sur l’absence de notification ; suppression sur la route du détail au lieu de la liste. Le garde-fou de dialogue d’erreur échoue aussi comme attendu |
| `npm run build`, puis les six scénarios étendus après correction | **6 réussites** : mutations réelles, lecture 503, relance réseau échouée, relance réussie, résultat final vérifié et une seule écriture par parcours |
| Scénario `récupération avec filtre et deux pages conservées`, après calibrage | **2 réussites** : filtre conservé, deux pages (6 comptes), rafraîchissement/relance `page=1&page_size=6`, puis prochaine page `page=3&page_size=3` et huit comptes finaux sans doublon ; un seul PATCH |
| `npm run lint` | Réussite sans avertissement |
| `npm run typecheck:search` | Réussite ; aucun élargissement du typage |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm test`, exécution finale sans argument additionnel | Build réussi et **62 tests réussis en 3,9 minutes** (31 par projet), dont les six parcours de récupération et les contrôles existants : CRUD complet, refus JSON/HTML/réseau des trois mutations, droits lecteur/administrateur, validation, payloads et recherche |
| `git diff --check` | Réussite |
| Inspection des captures finales et des détails modifiés desktop/mobile | Avertissement et bouton lisibles, fermeture accessible, liste seule après suppression, avertissement retiré après récupération ; pas de débordement horizontal ajouté. Ellipse des noms longs sur mobile et snackbar superposé à la zone vide : présentation existante conservée |

Les journaux de travail sont sous `.amp/in/artifacts/cor04-*.log` (ignorés), notamment `cor04-before.log`, `cor04-red.log`, `cor04-red-updated.log`, `cor04-red-deleted.log`, `cor04-after.log`, `cor04-pagination-final.log` et `cor04-full-final.log`. Les tests finaux sont reproductibles via `npm test` avec Chromium et les fixtures existantes ; les captures brutes de cette exécution restent sous `www/test-results/` (ignoré).

Calibrages non comptés comme preuve de réussite : la première exécution groupée des nouvelles attentes sur l’ancien build laissait le compte créé par le test en échec, décalant les comptes suivants hors de la première page ; les cas modification/suppression ont donc été relancés séparément sur fixtures neuves. La première suite complète donnait **60 réussites / 2 échecs** du nouveau scénario de pagination : le retour à pleine hauteur déclenchait un scroll et chargeait une troisième page avant la mutation. Le scénario revient maintenant en haut, garde la liste défilante et réserve 320 px de hauteur au détail (240 px est utilisé uniquement pour provoquer la pagination). Un essai à 240 px pendant le détail mobile recouvrait Fermer ; il n’est pas présenté comme une validation de cette hauteur extrême. Aucun changement applicatif de pagination, règle de concurrence ou garde-fou de test n’a été fait pour contourner ces calibrages.

### Captures synthétiques conservées

Chaque paire vient de l’exécution finale, avec données de test uniquement, mots de passe masqués et animations désactivées lors de la capture. Les assertions exécutées vérifient routes, boutons, valeurs, absence de dialogue d’abandon et données HTTP ; les captures n’en sont pas un substitut.

- Détail du compte créé après relance échouée : [desktop](../preuves/COR-04/detail-desktop.png), [mobile](../preuves/COR-04/detail-mobile.png).
- Liste après suppression et relance échouée, ancienne ligne encore signalée comme périmée : [desktop](../preuves/COR-04/list-desktop.png), [mobile](../preuves/COR-04/list-mobile.png).
- Liste actualisée après modification et récupération réussie : [desktop](../preuves/COR-04/recovered-desktop.png), [mobile](../preuves/COR-04/recovered-mobile.png).

## Décisions, résultat et reprise

- `users.vue` consomme l’échec de lecture via un avertissement persistant, puis exécute la notification et la navigation de la mutation acquise, que la lecture ait réussi ou échoué. Les textes de succès restent inchangés. Le formulaire continue de terminer `sending` sans attendre le parent ; `isDeleted`, validation et service HTTP ne changent pas.
- Un seul signal réactif `userListStore.state.updateFailed` accompagne la liste conservée, afin que l’avertissement ne disparaisse pas silencieusement lors d’un aller-retour par les films. `update()` le positionne sur rejet et le retire sur réussite ; une lecture réussie remplaçant la première page le retire aussi, mais pas l’ajout d’une page suivante.
- Présentation minimale dans la palette existante, visible au-dessus des panneaux, y compris lorsque la liste est masquée en mobile : **« La dernière opération a réussi. La liste n'a pas pu être actualisée. Les données affichées ne sont pas à jour. »** puis **« Actualiser la liste »**. Pas de dialogue bloquant générique pour cet échec distinct. La relance appelle uniquement `update()` ; son bouton est en chargement et désactivé pendant cette lecture.
- Sur nouvel échec, l’avertissement reste et la navigation demeure utilisable. Sur réussite, la liste reçue remplace l’ancienne et retire l’avertissement. Les tests vérifient aussi fermeture sans fausse confirmation d’abandon et persistance après navigation films/utilisateurs.
- Limites conservées : pas de retry automatique, rollback ni traitement des écritures incertaines ; pas de garantie nouvelle de priorité entre lectures (COR-01). Aucun changement COR-02/COR-03, backend, authentification, dépendances, `www.vue2` ou CI. Tests sur Chromium desktop/mobile émulé, pas sur Safari ni appareil physique, pas en production. La mise en page à une hauteur extrême de 240 px pendant le détail n’est pas validée.
- Le 17 novembre 2026, l’utilisateur valide explicitement le résultat présenté : « Je valide COR-04, sans commit ni push ». Cette validation couvre les parcours et la présentation restitués, avec les limites documentées ; elle n’autorise aucune livraison Git.
- L’utilisateur autorise ensuite explicitement « commit et note COR-04 terminé » : commit et clôture après intégration locale sur `dev`, sans push ni déploiement. Aucun autre ticket commencé.

## Traçabilité et livraison

- [Thread de création et de pilotage](https://ampcode.com/threads/T-01a1de9e-73bf-7283-bf9f-cf7dc98d6085), après le [thread MOD-03](https://ampcode.com/threads/T-01a1e0e3-51b2-7065-bef2-48148dca5801) qui a documenté le défaut.
- [Thread d’implémentation et de reprise](https://ampcode.com/threads/T-01a1e94b-e019-7159-b4b0-0ce383806499). Checkout partagé `/home/sbe/MEGA Développement/nodejs/@sbesson/filmotheque`, runner `762e9de5-10f1-47ab-8ece-60cbd5bd060c`, branche locale `dev`, base vérifiée `a7622c8a6b8f722e0ac9c1e6105d93a0901e4e00` (« Vérifier le contrat de recherche avec un typage ciblé (MOD-10) »).
- Au démarrage : index vide ; seuls changements préexistants = présente fiche non suivie et ajout de sa ligne dans l’EPIC, préservés. Le pilotage a rattaché ce thread et modifié uniquement la ligne COR-04 ; il conserve la responsabilité du tableau.
- Livraison réelle : correction, tests, fiche, six captures et suivi **commités et intégrés localement sur `dev`** par le présent commit « Récupérer la liste après une mutation utilisateur réussie (COR-04) ». Aucun push ni déploiement ; aucun autre ticket inclus. Les sources applicatives et tests sont inchangés depuis les vérifications finales ci-dessus ; seuls l’acceptation et le suivi de livraison sont consignés ensuite.
- Résultat, preuves, acceptation explicite et intégration locale transmis au pilotage pour la clôture demandée par l’utilisateur le 17 novembre 2026. Le statut courant reste uniquement dans l’EPIC. Toute publication distante ou tout déploiement nécessite une autorisation distincte.
