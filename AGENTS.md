# Développement de Filmothèque

- Les commandes d’installation, de démarrage et de vérification sont dans le [README](README.md). Les choix techniques, invariants et limites acceptées sont dans [Architecture et décisions techniques](docs/architecture.md).
- La modernisation est close ; ses documents archivés servent de références historiques, pas de liste de travaux à démarrer. La correction de concurrence des listes (COR-01) a été abandonnée : ne pas la réintroduire sans nouvelle demande explicite.
- Pour les tests, utiliser le serveur de fixtures et ses données temporaires sur 4173, jamais les données habituelles de l’application sur 8080. `npm test` reconstruit le même `www/dist` que l’application normale.
