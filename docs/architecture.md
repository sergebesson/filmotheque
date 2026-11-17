# Architecture et décisions techniques

Cette synthèse conserve les choix utiles à la maintenance après la modernisation du client. Les commandes d’installation, de démarrage et de vérification restent dans le [README](../README.md#installation-et-démarrage).

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
- Recherche temporisée, effacement, pagination, chargement complet, droits, validation, confirmations et état sale des formulaires font partie du comportement à préserver. Les animations comprennent le fondu du fond des films de 500 ms et le signal de ligne utilisateur modifiée de 1 000 ms.
- Le flash compare **numériquement major et minor**, en ignorant volontairement les patchs. La persistance `last_version`, l’ouverture manuelle, le contenu HTML et ses ancres sont conservés.

## Vérifications et périmètre de l’outillage

Le développement utilise Node 24 et ESLint 10 avec des configurations plates. Le choix de Node pour les outils ne réduit pas la contrainte d’exécution des manifestes. La CI est **différée**, pas implicitement à mettre en place.

`npm run typecheck:search` vérifie un contrat JavaScript/JSDoc ciblé avec `vue-tsc` : store films, composant de recherche et conformité du vrai producteur. `noImplicitAny: true` ne rend pas tout le client typé : les corps importés ne sont pas contrôlés, des `any` peuvent se propager et les réponses JSON ne sont pas validées. Watchers textuels, props globales, autres consommateurs et concurrence ne sont pas couverts ; le projet actif de VS Code n’est pas aligné automatiquement. Les détails et commandes d’inventaire sont dans le [README](../README.md#vérifications).

Les tests navigateur utilisent le vrai serveur Express sur **4173**, avec des données temporaires, distinct du serveur habituel **8080**. Les tests HTTP/stores/configuration utilisent Node et un `fetch` simulé. Les projets desktop et mobile utilisent Chromium ; le mobile est émulé, sans garantie Safari, Firefox ou appareil physique. Les garde-fous sur les exceptions navigateur et les dialogues d’erreur ne constituent pas une détection exhaustive des erreurs internes.

**Validation de fin de chantier, le 17 novembre 2026 :** lint, typage ciblé, build et 106 tests réussis sous Node 24.19.0 ; essais manuels déclarés concluants par l’utilisateur, sans inventaire exhaustif des parcours. Ce constat historique n’est pas une validation automatique des changements ultérieurs.

## Limites connues et décisions acceptées

- **Concurrence des listes (COR-01) : correction abandonnée par arbitrage coût/bénéfice.** Son implémentation et ses tests ont été retirés. Les réponses, erreurs et indicateurs peuvent devenir obsolètes lorsque recherche, pagination, chargement complet ou rafraîchissement se chevauchent, notamment dans une séquence A → B → A. Après rafraîchissement d’une liste utilisateurs vide, un nouveau rafraîchissement peut demander `page_size=0`. Ces limites sont acceptées ; aucune reprise sans nouvelle demande explicite.
- **Contrats backend hors périmètre :** supprimer un compte déjà absent peut renvoyer 500 au lieu de 404 ; créer un doublon peut renvoyer 500 au lieu de 400, ces réponses étant absentes des schémas OpenAPI. Les corrections client n’ont pas corrigé ces écarts serveur.
- **Dépendances :** le graphe client comporte un peer optionnel préexistant incohérent : `@vuetify/v0` attend `@vue/devtools-api >=7`, mais la version résolue est 6.6.4. Installation, build et tests ont réussi, pas `npm ls --all` côté client ; ce point n’a pas été corrigé.
- **Sécurité non refondue :** mots de passe affichables par l’administration, HTML du flash issu du Markdown administré sur le serveur et déconnexion Basic Auth par XHR restent des contraintes existantes. Le flash utilise `v-html` et du Markdown autorisant le HTML ; y injecter du contenu utilisateur non fiable imposerait une révision de ce contrat. La modernisation ne constitue pas un audit de sécurité ; un remplacement de la déconnexion par `fetch` n’est pas présumé équivalent.

## Archives du chantier

Les dix refactorings MOD et les corrections COR-02, COR-03 et COR-04 ont été acceptés ; COR-01 est abandonné. L’EPIC, la revue, les quatorze fiches et leurs 22 captures ont été retirés de la documentation courante, pas de l’historique Git.

Le tag **local** `archive/modernisation-vue3` conserve les 38 fichiers exacts avant nettoyage, y compris la validation finale. Ce tag n’a pas été poussé lors du nettoyage ; pour le consulter depuis un autre clone, il faut aussi transférer cette référence et ses objets Git. Les anciens statuts, références de commits et consignes de pilotage sont historiques, pas des instructions de travail actuelles.

L’ancienne sauvegarde `www.vue2`, non servie par l’application, a également été supprimée du dossier courant sur demande de l’utilisateur. Ses 49 fichiers restent disponibles dans ce même tag.

Pour consulter le suivi archivé sans restaurer les fichiers :

```sh copy Copy Archived Epic
git show archive/modernisation-vue3:docs/modernisation/EPIC.md
```
