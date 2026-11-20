# Sauvegarde et reprise LMDB

Qualifier ces opérations sur des copies privées, avec le serveur de fixtures
sur **4173**. Une intervention sur l’instance habituelle, une restauration réelle
ou une suppression de données requiert une autorisation distincte.

## Produire un cliché hors ligne

1. Arrêter proprement l’application et tout autre écrivain. Vérifier que l’arrêt
   a réussi. Relever le `storage.databaseDirectory` **effectif** (`DB_DIR` peut
   le surcharger), les chemins résolus et la version LMDB. Vérifier que la source
   est le vrai répertoire `filmotheque-lmdb` existant avec son `data.mdb` régulier.
2. Dans un emplacement distinct, privé et sur un support avec assez d’espace,
   créer un répertoire neuf et vide (permissions 0700). Avec `lmdb` 3.5.11,
   depuis la racine du projet, le principe est le suivant. N’utiliser que les
   chemins absolus contrôlés aux étapes précédentes.

   ```javascript
   const { open } = require("lmdb");
   async function sauvegarder(source, dossierNeuf) {
       const root = open({ path: source, noSubdir: false, readOnly: true, overlappingSync: false });
       try {
           await root.backup(dossierNeuf, false);
       } finally {
           await root.close();
       }
   }
   ```

3. Le cliché contient `data.mdb` (les trois bases nommées), pas `lock.mdb`,
   les vidéos, la configuration ou les anciens JSON. Les conserver séparément
   selon les besoins de reprise. Ne pas copier le fichier d’une base active
   avec `cp`. En cas d’échec, isoler le résultat partiel et repartir vers un
   autre répertoire neuf. Noter date, version, taille, empreinte SHA-256 et
   comptages attendus (sans profils ni mots de passe). Protéger le cliché comme
   le stockage des comptes. Pour une confirmation de persistance du cliché,
   synchroniser le fichier puis les répertoires créés selon le système cible ;
   la comparaison d’empreintes ne prouve pas cette persistance.

## Restaurer dans un emplacement neuf

1. Vérifier le cliché avec son manifeste. Refuser fichier manquant, lien, type
   inattendu, taille ou empreinte incorrecte. Choisir un nouveau parent privé
   distinct de l’environnement actif, de la source et du cliché ; vérifier les
   chemins résolus avant toute copie. Ne pas continuer si l’isolation est douteuse.
2. Créer `filmotheque-lmdb` sous ce parent avec `mkdir` **sans** récursion ; si la
   cible existe déjà, même vide ou sous forme de lien, refuser. Copier uniquement
   le `data.mdb` du cliché dans ce répertoire avec `fs.copyFile` et
   `fs.constants.COPYFILE_EXCL`. LMDB régénère le verrou. En cas d’échec, ne pas
   démarrer sur la copie incomplète ; laisser la source, le cliché et tout
   environnement existant intacts.
3. Avant de démarrer Filmothèque, ouvrir la **copie** en lecture seule avec les
   options de l’étape de sauvegarde. Pour chaque base, utiliser
   `root.openDB({ name, encoding, create: false })` : `users` et `movies` en
   `json`, `usersByLogin` en `string`. Vérifier que toutes existent et sont
   lisibles, leurs comptages, chaque relation login exact–SHA-256–UUID dans les
   deux sens et les clés TMDB des films. Refuser toute incohérence. Ne pas
   utiliser le démarrage de l’application pour valider cette étape : il ouvre
   ou crée les bases et peut initialiser le compte admin.
4. Tester la copie avec une configuration isolée après fermeture de cette
   lecture : connexion admin et lecteur, comptages, recherche et téléchargement
   depuis les vidéos correspondantes. Une restauration restitue un point dans
   le temps : les écritures postérieures au cliché ne sont pas dedans. Ne pas
   remplacer la configuration active sans décision explicite.

## Interpréter un échec d’écriture

- **Avant commit** : un refus de validation ou une exception dans la transaction
  laisse les données antérieures. Le contrôle de migration suppose l’index de
  destination cohérent ; une entrée orpheline étrangère à la migration peut
  n’être détectée qu’au contrôle après commit. Ne pas contourner un refus en
  vidant la base ou en reconstruisant l’index.
- **Erreur native au commit** : commit non confirmé. Relever la cause, geler les
  écritures si l’état est incertain, puis vérifier la destination avant reprise.
- **Après commit** : « Durabilité non confirmée après commit LMDB », un contrôle
  de comptage échoué ou une fermeture échouée ne valent pas rollback. Un HTTP
  500 ou un code CLI non nul ne suffisent pas à connaître l’état. Vérifier ce qui
  est visible avant toute relance ; ne pas rejouer à l’aveugle. Si la migration
  échoue et que la fermeture échoue également, son diagnostic affiche d’abord
  l’erreur initiale, puis celle de la fermeture. `root.flushed` est
  la frontière de confirmation applicative, pas la promesse d’un second `fsync`
  avec `overlappingSync: false`. Les injections de rejet JS et les redémarrages
  ne qualifient ni une coupure électrique ni les défaillances du matériel.

## Revenir à la version JSON

- **Avant l’ouverture aux nouvelles écritures** : fermer LMDB et conserver
  l’environnement de la tentative. Reprendre la version précédente et ses
  verrous de dépendances et sa configuration, les paires JSON historiques
  (données et structures) et les vidéos compatibles. Vérifier l’admin, le
  catalogue historique et ses liens sur copies avant de rouvrir l’accès. La
  migration initiale des comptes et l’import initial ne réécrivent pas ces JSON.
- **Après de nouvelles écritures** : geler les mutations et faire un nouveau
  cliché. Sur une copie du format ancien, réconcilier les ajouts, modifications
  et suppressions de comptes par login, et les écarts du catalogue et des
  fichiers. Vérifier les règles de l’ancienne version, les accès et les liens.
  Il n’existe ni journal à rejouer ni convertisseur inverse ; certains anciens
  liens ne peuvent pas être déduits des seules fiches TMDB. Si la copie
  réconciliée ne peut pas être validée, ne pas repartir sur des JSON obsolètes :
  privilégier une reprise LMDB depuis un point validé. Faire autoriser séparément
  toute perte résiduelle éventuelle.

## Qualification réalisée

Le 20 novembre 2026, sur copies synthétiques et données temporaires, la chaîne
migration des comptes → catalogue vide → import manuel → cliché → restauration
dans un emplacement neuf a été vérifiée, avec authentification et téléchargement
par TMDB. La restauration retrouve les trois bases au point sauvegardé, UUID
compris, sans reprendre les mutations ultérieures de la source. Les essais
injectent aussi des erreurs avant et après commit et refusent les cibles
existantes ou les clichés incomplets. Le retour au serveur pré-LMDB a été répété
sur copies, avant puis après réconciliation de modifications de comptes et du
catalogue ; aucun convertisseur inverse n’est fourni.

La validation consignée sous Node 24.19.0, LMDB 3.5.11 et Linux x64 comprend
build, lint, typage ciblé, 19 tests serveur et 108 tests Playwright Chromium
(106 ordinaires et 2 sur catalogue vide), avec HTTP uniquement sur **4173**.
Le mobile est émulé, sans qualification Safari ni appareil physique. Ces essais
ne qualifient pas une panne électrique, une migration des données habituelles
ou une bascule d’exploitation ; aucune de ces opérations n’a été réalisée dans
cette qualification.
