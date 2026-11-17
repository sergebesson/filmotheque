# COR-02 Encodage des noms dans les URL utilisateurs

[EPIC : état, dépendances et thread](../EPIC.md) · [Revue : A02](../REVUE.md)

## Objectif et origine

Transmettre le nom d’utilisateur complet comme segment de chemin, sans que ses caractères soient interprétés comme fragment ou paramètres de requête. Correction explicitement autorisée le 17 novembre 2026 selon la proposition de ce thread.

Sources à relire : [service utilisateur](../../../www/modules/users/services/user.service.js), [avatar](../../../www/modules/avatar/avatar.vue), [schémas de noms](../../../server/api/modules/users/openapi/schemas.yml), [paramètre de chemin](../../../server/api/modules/users/openapi/parameters.yml), [routes backend](../../../server/api/modules/users/users.module.js).

## Périmètre et exclusions

- Contrôler existence, lecture, modification et suppression ; vérifier la cohérence avec l’avatar et les routes d’interface.
- La sonde de revue confirme des URL incorrectes pour `nom#suffixe` et `nom?option=1`. La reproduction et le CRUD isolé réalisés pour ce ticket sont détaillés ci-dessous.
- Ne pas ajouter de restriction métier sur les noms, changer leur valeur enregistrée, renommer des comptes ou modifier le backend sans nouveau cadrage.
- Utiliser des comptes temporaires dans l’environnement de test isolé, jamais des écritures sur les comptes habituels.

## Critères d’acceptation

- [x] Les noms ordinaires et les noms acceptés par le contrat avec espaces, accents, `#`, `?` ou `%` sont transmis sans troncature ni double encodage.
- [x] HEAD, GET, PATCH et DELETE ciblent le même identifiant logique ; les routes de formulaire et l’avatar restent cohérents.
- [x] Aucune nouvelle règle de nom n’est introduite pour contourner un problème de transport.
- [x] Une régression échoue sur la construction actuelle et passe après correction ; les limites backend éventuellement rencontrées sont explicitées plutôt que masquées.

## Vérifications prévues

Reproduire l’URL incorrecte avant modification ; vérifier les paramètres effectivement reçus et les résultats publics après. Exercer les opérations sur des comptes synthétiques de l’API de test, avec un nom ordinaire comme contrôle. `npm run lint` et `npm test`. Si le backend n’accepte pas un cas pourtant annoncé par son schéma, documenter l’écart et demander la suite du périmètre.

### Exécution du 17 novembre 2026

- Référence de départ : `dev` local à `ee1c117` (« Documenter l’abandon de COR-01 dans le suivi de modernisation »), checkout propre avant intervention. Node `v24.19.0`, Chromium `/usr/bin/chromium`, serveur Playwright existant avec bases temporaires ; aucun appel aux données habituelles.
- Avant correction, `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm --prefix www test -- tests/http.spec.js --project=desktop --grep 'segment de chemin exact'` : 2 contrôles réussis (nom ordinaire et espace/accent), 4 échecs attendus (`#`, `?`, `%23` littéral, `%`). Les segments attendus sont écrits explicitement dans le test, sans reprendre le calcul de production.
- Après build de la base, le parcours navigateur `tests/client.spec.js --project=desktop --grep 'COR-02.*cor02-nom#suffixe$'` échoue avant correction : le compte cible est absent (HEAD encodé 404), mais la validation du formulaire le confond avec le témoin `cor02-nom` et désactive l’enregistrement. Le même parcours est conservé après correction.
- Après correction, `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm --prefix www test -- tests/http.spec.js --project=desktop` : 9 tests réussis, dont les 6 cas vérifiant HEAD 204/404, GET, PATCH et DELETE.
- `npm run lint` et `npm run typecheck:search` : réussis. `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm test` : build réussi et **86 tests réussis** en 6,8 minutes, dont les 12 parcours CRUD COR-02 (6 noms sur desktop et mobile). Les contrôles HTTP tournent dans Node dans les deux projets ; les parcours CRUD tournent dans Chromium. `git diff --check` : réussi.
- Les parcours réels utilisent les noms `cor02-nom`, `cor02-Élodie Dupont`, `cor02-nom#suffixe`, `cor02-nom?option=1`, `cor02-nom%23suffixe`, `cor02-nom%`. Ils vérifient création par formulaire, contrôle du doublon, ouverture depuis la liste, avatar effectivement chargé, rechargement de route hash, modification relue par GET, suppression puis HEAD 404. Des témoins aux noms ressemblants coexistent et restent inchangés après les mutations ; nettoyage dans `finally`, par HEAD puis DELETE seulement pour les comptes encore présents.
- Les premières itérations du test ont exposé deux erreurs de scénario, corrigées sans changement d’application : nom et pseudo identiques rendaient le clic textuel ambigu (clic sur l’avatar unique désormais), puis une navigation avant la fin de l’animation de fermeture conservait deux titres transitoires (attente de la disparition du formulaire désormais, sans délai arbitraire). Le premier essai de nettoyage sur un compte absent a également masqué l’échec initial ; il a été remplacé par la vérification d’existence décrite ci-dessus.
- Traces de travail locales, non versionnées : `.amp/in/artifacts/cor02-http-before.log`, `cor02-crud-before.log`, `cor02-http-after.log`, `cor02-crud-ambiguous-locator.log`, `cor02-crud-transition.log`, `cor02-full-test.log`, `cor02-lint.log`, `cor02-typecheck.log`.

## Décisions et limites

- Quatre substitutions directes par `encodeURIComponent` dans `userExists`, `load`, `saveUser` et `deleteUser`. Aucun helper ajouté, aucun changement dans `callApiBackend`, le backend, l’avatar ou Vue Router.
- Les noms restent bruts dans les données et le corps de POST. Aucun décodage préalable : le nom littéral `nom%23suffixe` doit produire le segment `nom%2523suffixe` et rester distinct de `nom#suffixe`.
- Écart backend observé hors périmètre : DELETE d’un compte déjà absent renvoie 500, car le validateur des réponses rejette le 404 non déclaré dans l’OpenAPI de DELETE. Le journal du serveur temporaire confirme `no schema defined for status code '404' in the openapi spec`, depuis la réponse 404 de `users.module.js`. Aucun changement serveur inclus ; ce cas n’est pas nécessaire pour supprimer un compte existant et confirmer ensuite son absence par HEAD.
- Aucun changement visuel. Contrôles par DOM, état des images et réponses du vrai backend temporaire ; pas de preuve en production, Safari ou appareil mobile réel. L’ajout de restrictions de noms ou de changements backend reste soumis à un cadrage distinct. COR-01 n’est pas repris.

## Résultat et reprise

Correction et régressions vérifiées sur la pile locale isolée. Les six noms passent le CRUD, la validation d’unicité, la navigation et l’avatar sur desktop et mobile ; les témoins restent inchangés et les comptes synthétiques sont nettoyés. Le backend accepte ces noms sans modification. Résultat accepté le 17 novembre 2026 et intégré par commit sur la branche de référence locale `dev` ; clôture explicitement demandée. Aucun travail d’implémentation restant pour ce ticket, aucun push ni déploiement autorisé.

## Traçabilité et livraison

- [Thread de proposition et d’implémentation](https://ampcode.com/threads/T-01a1ea15-10f1-70b5-8f45-aec29238915c) ; [pilotage](https://ampcode.com/threads/T-01a1de9e-73bf-7283-bf9f-cf7dc98d6085).
- Autorisation reçue : « Oui, implémente COR-02 selon cette proposition », le 17 novembre 2026 ; périmètre limité au transport client et à ses vérifications.
- Acceptation et livraison autorisées le 17 novembre 2026 : « Je valide, commit puis note COR-02 comme terminée ».
- Modifications locales sur `dev` : service utilisateur, tests HTTP et navigateur, présente fiche ; tableau EPIC tenu par le pilotage.
- Livraison locale par le présent commit « Encoder les noms dans les URL utilisateurs (COR-02) » sur la branche de référence `dev` ; clôture du tableau EPIC après création du commit. Aucun push ni déploiement.
- Relecture du diff et de l’index vide avant préparation du commit, puis `git diff --check` réussis. Aucun changement applicatif depuis les 86 tests réussis ; contrôles applicatifs non rejoués pour cette seule mise à jour de livraison.
