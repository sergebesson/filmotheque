# Suivi de la modernisation

- Pour un travail de modernisation de `www`, lire [l’EPIC](docs/modernisation/EPIC.md) et la fiche du ticket concerné avant de modifier le code. Relire les sources actuelles : la revue est une référence historique.
- Commencer un ticket uniquement sur demande de l’utilisateur ; la présence d’un ticket dans le suivi n’autorise pas son exécution. Garder un seul ticket d’implémentation actif à la fois, sauf accord explicite pour du travail parallèle.
- Respecter le périmètre et les invariants de la fiche. Traiter les corrections de comportement `COR-*` séparément des refactorings `MOD-*`, après autorisation explicite.
- Avant de rendre le travail, mettre à jour la fiche avec les décisions, vérifications réellement exécutées, limites, état de livraison et prochaine action. Conserver les liens vers les threads de reprise.
- Les statuts vivent uniquement dans le tableau de `EPIC.md`. Le thread de pilotage tient ce tableau à jour ; le thread d’implémentation met à jour sa fiche et lui rapporte le résultat. Sans pilotage actif, mettre à jour le tableau directement sans déclarer une validation qui n’a pas eu lieu.
- Ne passer un ticket à « Terminé » qu’après satisfaction des critères, acceptation par l’utilisateur et intégration dans la branche de référence convenue. Distinguer travail local, commit, push et intégration ; ne pas effectuer ces opérations sur la seule base du statut.
- Avant une reprise dans un autre checkout, vérifier la disponibilité des documents et du code exacts. Un lien de thread ou un identifiant de commit non accessible ne transfère pas les fichiers.
