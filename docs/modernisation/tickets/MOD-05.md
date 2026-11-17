# MOD-05 Mesure et réduction des dépendances chargées

[EPIC : état, dépendances et thread](../EPIC.md) · [Revue : R03](../REVUE.md)

## Objectif et origine

Mesurer la contribution des dépendances au client, puis réduire le code et les styles chargés sans sacrifier les comportements pour un seuil de taille arbitraire.

Sources à relire : [dépendances](../../../www/package.json), [verrou client](../../../www/package-lock.json), [démarrage](../../../www/app.js), [configuration Vite](../../../www/vite.config.js), [liste films](../../../www/modules/movie-list/movie-list.vue), [liste utilisateurs](../../../www/modules/users/components/user-list.vue), [recherche](../../../www/modules/common/search/search.vue), [liste infinie](../../../www/modules/common/infinite-list/infinite-list.vue).

## Périmètre et exclusions

- Établir une mesure reproductible du build et identifier les contributions avant de choisir les imports ciblés ou remplacements utiles.
- Examiner Lodash, Moment, animate.css et object-hash sans imposer leur suppression. Conserver options debounce/throttle, annulation au démontage, dates françaises et animations.
- Ne pas découper les routes de MOD-06, virtualiser les listes, changer de bibliothèque UI ou masquer l’avertissement en relevant son seuil.
- Ne pas modifier la clé animée des utilisateurs sans préserver son effet après changement de contenu. Ne pas mélanger nettoyage des dépendances backend et client.

## Critères d’acceptation

- [x] Mesures avant/après datées avec commandes, versions et état de code ; distinguer taille minifiée, gzip et chargement initial.
- [x] Les optimisations retenues ont un gain mesuré et n’ajoutent pas une complexité supérieure au bénéfice ; les dépendances conservées sont justifiées si examinées.
- [x] Les formats de dates et tailles, fuseaux pertinents, recherche et animations conservent leur sémantique observable.
- [x] Le build et les parcours passent, les verrouillages de dépendances restent cohérents ; aucun gain de latence non mesuré n’est annoncé.

Ces cases consignent les contrôles techniques ci-dessous, pas une acceptation utilisateur. Le statut courant reste uniquement dans l’EPIC.

## Vérifications prévues

Mesurer `npm run build` sur les mêmes conditions avant/après ; utiliser une analyse temporaire des contributions si nécessaire. `npm run lint` et `npm test`. Si Moment change, comparer les dates sans heure dans plusieurs fuseaux, dont un à décalage négatif. Si les styles d’animation changent, vérifier le fondu, les entrées/sorties, le flash de ligne et les règles de réduction des animations sur les rendus concernés.

### Référence et conditions du 16 novembre 2026

Départ vérifié dans le checkout demandé : `dev` à `978bb52ef76f8d86774595894a2703f4d896fd45`, arbre et index propres, documents et MOD-01 à MOD-04 présents. La référence locale `origin/dev` est à `82f17e5` : seul MOD-04 est en avance sur cette référence. Aucun fetch ni interrogation de l’état distant. AGENTS applicables, EPIC, MOD-04, MOD-05, R03 et sources actuelles relus ; méthode Playwright du thread MOD-04 reprise.

Même machine et même installation avant/après : Linux x64, Node **24.19.0**, npm **11.17.0**, Vite **8.3.8**, plugin Vue **6.0.11**, Vue **3.5.45**, Vuetify **4.3.3**, Lodash **4.18.1**, Moment **2.31.0** avant retrait, object-hash **3.0.0**, animate.css **4.1.1**, Playwright **1.65.1**, Chromium **157.0.8103.50** via `/usr/bin/chromium`. `npm --prefix www ls --depth=0` contrôlé avant et après ; aucune mise à niveau de dépendance. Vuelidate core/validators **2.0.3 / 2.0.4**, byte-size **8.2.1**, vue-router **4.6.5**.

Les ports 8080 et 4173 étaient libres au départ. La suite utilise son vrai serveur `tests/server.cjs`, ses bases et films temporaires, `pageSize: 3`, un worker, vues desktop/mobile de la configuration existante. Aucun lancement de l’application sur les bases de `data`, aucun outil GX. Les ports sont de nouveau libres après la suite.

### Build reproductible avant/après

Mesures de départ effectuées **avant toute optimisation**, le 16 novembre 2026 à **10:02 CET** ; après à **10:07 CET**. Référence avant : HEAD ci-dessus. Référence après : ce même HEAD avec le diff local MOD-05 (imports Lodash ciblés, formatage Intl et retrait de Moment du manifeste/verrou client). Ni routes, ni configuration de build, ni CSS modifiés.

Commandes depuis la racine, exécutées dans les deux états :

```sh
node --version
npm --version
npm --prefix www ls --depth=0
npm run build
node --input-type=module <<'JS'
import { readFileSync, readdirSync } from "node:fs";
import { gzipSync } from "node:zlib";
for (const name of readdirSync("www/dist/assets")) {
  if (!/\.(js|css)$/.test(name)) continue;
  const data = readFileSync(`www/dist/assets/${name}`);
  console.log(name, data.length, gzipSync(data).length);
}
JS
```

Tailles en **octets**, kB décimaux dans le texte. Gzip reproductible ci-dessous : **Node `zlib.gzipSync`, niveau par défaut 6**, et non une estimation du transfert HTTP.

| Ressource | Avant minifiée | Après minifiée | Écart minifié | Avant gzip Node | Après gzip Node | Écart gzip Node |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| JS unique | 618 084 | 509 034 | −109 050 (−17,64 %) | 207 926 | 170 034 | −37 892 (−18,22 %) |
| CSS unique | 353 330 | 353 330 | 0 | 50 756 | 50 756 | 0 |
| JS + CSS | 971 414 | 862 364 | −109 050 | 258 682 | 220 790 | −37 892 |

Le reporter Vite utilise sa propre estimation gzip : **209,70 → 171,50 kB JS**, **50,75 → 50,75 kB CSS**. Ne pas confondre cette colonne de sortie avec la compression Node ci-dessus ou celle négociée avec le serveur. Les deux builds normaux et les builds instrumentés donnent les mêmes fichiers : `index-QnklfRtu.js` avant, `index-C4mAdK9F.js` après ; **`index-bTd8vvE7.css` inchangé**. Icônes inchangées : AlloCiné 4 286 octets, IMDb 9 158, TMDB 15 086 ; HTML 0,62 kB selon Vite. L’avertissement du chunk JS supérieur à 500 kB subsiste, avec son seuil inchangé.

### Analyse temporaire des contributions

Un plugin temporaire Vite `generateBundle` a additionné `chunk.modules[id].renderedLength` par dépendance, sans modifier les modules ni les options de build. Ce sont des **octets de modules rendus avant minification finale**, pas des parts additives du gzip ou du poids transféré : Lodash **181 297 → 84 822**, Moment + locale française **119 031 → 0**, object-hash **47 933 → 47 933**. Vuetify reste la contribution principale (**572 281 → 571 967**) ; `@vue` **196 253 → 196 191**, Vuelidate **29 382 → 29 455**, byte-size **4 699 → 4 764**. Les petites variations des dépendances inchangées viennent du rendu de modules par le bundler, pas de modifications de ces bibliothèques.

Reproduction de cette instrumentation sur chaque état de code :

```sh
node --input-type=module <<'JS'
import { build } from "./www/node_modules/vite/dist/node/index.js";
const totals = {};
await build({ root: "www", plugins: [{
  name: "temporary-mod05-analysis",
  generateBundle(options, bundle) {
    for (const chunk of Object.values(bundle)) {
      if (chunk.type !== "chunk") continue;
      for (const [id, info] of Object.entries(chunk.modules)) {
        const name = id.match(/node_modules\/(lodash|moment|object-hash|vuetify|@vue|@vuelidate|byte-size)\//)?.[1];
        if (name) totals[name] = (totals[name] || 0) + info.renderedLength;
      }
    }
  },
}] });
console.log(totals);
JS
```

Des builds diagnostiques séparés, sur le code **de départ**, ont ensuite isolé l’effet marginal de trois dépendances avec un plugin `transform` en `enforce: "pre"`, uniquement sur `app.js`, `movie-list.vue`, `user-list.vue`. Sorties dans `.amp/in/`, jamais servies comme application de validation. Le reste du code et de la configuration reste identique. Les écarts gzip ne sont pas additifs.

| Sonde diagnostique exacte | Résultat minifié / gzip Node | Écart par rapport au départ | Interprétation |
| --- | --- | --- | --- |
| Retirer les deux imports Moment de `app.js`, son `moment.locale("fr")`, l’import de `movie-list.vue` et remplacer `moment(dateAdded).format("LL")` par `String(dateAdded)` | JS 553 129 / 187 047 | −64 955 / −20 879 | Contribution marginale maximale, **pas** un formateur de remplacement validé |
| Retirer l’import object-hash et remplacer `objectHash(user)` par `JSON.stringify(user)` | JS 583 903 / 196 538 | −34 181 / −11 388 | Mesure seulement ; cette substitution n’est pas retenue |
| Retirer seulement `import "animate.css"` | CSS 329 387 / 47 523 | −23 943 / −3 233 | Plafond absolu : un sous-ensemble conservant les animations gagnerait moins |

Ces sondes ne constituent ni des variantes livrées ni une validation de suppression. Les scripts et builds temporaires ont été retirés après consignation ; aucun analyseur ni configuration d’optimisation supplémentaire conservé.

### Ressources du chargement initial — base utile à MOD-06

Observation séparée avec Playwright et `performance.getEntriesByType("resource")`, sur `http://localhost:4173/#/movies` puis `/#/users/list`, contextes neufs sans cache partagé, administrateur de test, viewport **1280 × 800**, `last_version = "999.0.0"`. Attente du premier élément puis `networkidle`. Même serveur temporaire et mêmes conditions avant/après, pendant les suites respectives. Relever `decodedBodySize`, `encodedBodySize`, `transferSize` et les URL ; aucune chronométrie de latence déduite de ces octets.

| Ressource initiale sur les deux routes | Avant décodée | Après décodée | Avant corps encodé HTTP | Après corps encodé HTTP |
| --- | ---: | ---: | ---: | ---: |
| JS | 618 084 | 509 034 | 208 515 | 169 175 |
| CSS | 353 330 | 353 330 | 50 863 | 50 863 |
| Total JS + CSS | 971 414 | 862 364 | 259 378 | 220 038 |

`transferSize` ajoute ici 300 octets par ressource aux corps encodés. Le middleware inchangé `compression@1.8.2` préfère Brotli quand le navigateur le propose ; les tailles observées correspondent exactement à `brotliCompressSync` qualité 4, vérifié sur les deux JS et le CSS. Elles ne sont donc **pas du gzip**. Le tableau n’est pas le poids total de la page : HTML, favicon, avatars, réponses API, CSS Google Fonts et polices externes exclus de ce total. Les requêtes observées comprennent `configuration`, `api/infos`, `api/users/me` et la première page de la liste ; seuls les films demandent les trois icônes TMDB/AlloCiné/IMDb (28 530 octets décodés au total), les utilisateurs demandent les avatars des lignes. Pas de nouveau chunk, import dynamique ou modulepreload applicatif : **tout le JS, administration et validation incluses, est toujours initial sur les deux routes**. MOD-06 pourra mesurer le report réel de ces ressources, mais n’est pas démarré ici.

### Vérifications réellement exécutées

| Contrôle | Résultat du 16 novembre 2026 |
| --- | --- |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm test`, avant optimisation | Build de référence et **50 tests réussis en 2,7 minutes** |
| Nouveau scénario de dates, d’abord sur Moment : `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:client -- --grep 'dates sans heure'` | **8 réussites**, quatre fuseaux × desktop/mobile, avant changement applicatif |
| Comparaison Node préalable de Moment `format("LL")` avec le formatage local français envisagé | **40 comparaisons identiques**, dix dates × UTC, Europe/Paris, America/Los_Angeles, Pacific/Auckland : jour ordinaire, année bissextile, changement d’année, changements d’heure européens/américains |
| `npm run lint`, après optimisation | Succès, règles inchangées |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm test`, après optimisation | Build final et **58 tests réussis en 2,8 minutes**, dont les 50 existants réutilisés et les 8 contrôles de dates |
| Sonde Node temporaire sur les vrais imports Lodash et `configurationStore.getValue()` | Regroupements asymétriques, chemins imbriqués/indexés, clé avec point, `false`, `null`, défaut et copie profonde isolée conformes à l’import global antérieur |
| Sonde temporaire avec `node:test` mock timers | Traces des imports debounce/throttle ciblés identiques à l’import global pour options par défaut, leading seul, trailing seul, leading + trailing + maxWait, appels successifs et `cancel()` |
| Sonde Chromium sur le build final, backend temporaire et PATCH/rafraîchissement simulés sans écriture | Même nom `alice`, description changée : flash réellement déclenché, durée **1 000 ms**, opacité **0 à 250 ms** ; entrée `bounceInRight` et sortie `bounceOutRight` réellement démarrées, chacune **1 000 ms** |
| `npm --prefix www ls --depth=0`, diff des manifestes/verrous, `git diff --check` | Succès ; seul Moment client retiré, aucun changement de version ni de dépendance backend |
| Avant commit après acceptation : `npm run lint`, `npm run build`, tests ciblés dates/configuration/HTTP/User/stores | Succès et **20 tests réussis en 14,3 secondes** ; mêmes fichiers JS/CSS compilés, code applicatif et tests inchangés depuis les 58 réussites |

Commande ciblée avant commit : `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:client -- --grep 'dates sans heure|configuration :|User :|HTTP :|recherche attendable'`. Diff et index relus : uniquement les douze fichiers MOD-05 attendus, aucun changement extérieur constaté ni élément préexistant dans l’index.

Les contrôles conservés portent sur les résultats publics : dates françaises attendues littéralement, ordre et regroupement de cinq films dont deux à la même date non contigus, en UTC/Paris/Los Angeles/Auckland. À Los Angeles, le contre-exemple `new Date("2026-03-29")` affiche **28 mars**, tandis que la construction locale retenue affiche **29 mars** : le scénario distingue bien ces implémentations.

La suite existante vérifie notamment les deux recherches à 999/1 000 ms, effacement, annulation à la navigation, caractères spéciaux, indicateurs, pagination, chargement complet, téléchargement, tailles IEC, fondu films aux deux directions (transition réelle **500 ms**, opacité intermédiaire), CRUD, délai du nom, validation/pending, dirty et abandon, protections administrateur, erreurs, notifications et rafraîchissement parent. Aucun test existant supprimé ou assoupli.

Limites : Chromium desktop/mobile simulés, pas de Firefox/Safari ni d’appareil réel. Aucun CSS, template ou classe d’animation modifié ; CSS compilé identique octet pour octet, y compris règles print/`prefers-reduced-motion`. Pas de nouvelle revue visuelle statique ni de prétention qu’une capture prouve une animation. Les sondes supplémentaires d’animation caractérisent le mouvement réel sur desktop ; les parcours mobile sont ceux de la suite. Pas de mesure de latence ou de performance sur appareil ; aucun gain de latence annoncé. Les formats hors contrat API `date` ne sont pas élargis par le remplacement de Moment.

## Décisions

### Imports ciblés, sans réimplémenter les temporisations

Lodash est **conservé**, mais tous ses six points d’import global deviennent des chemins ciblés de la même version : `groupBy.js`, `debounce.js`, `throttle.js`, `get.js`, `cloneDeep.js`. Aucun remplacement artisanal par timer, aucun lodash-es ni nouveau paquet. Options inchangées : recherche et nom à **1 000 ms**, trailing par défaut ; scroll à **50 ms**, leading/trailing par défaut. Les trois annulations au démontage restent à leur place. `getValue()` conserve aussi sa copie profonde et ses chemins/défauts ; la présentation des erreurs garde la sémantique de `get()`.

### Moment remplacé seulement à sa frontière réelle

Usage unique confirmé : formater `date_added` en français. Le schéma et le producteur backend fournissent une date ISO **sans heure** (`mtime.toISOString().split("T")[0]`). `Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" })`, instancié une fois dans la liste, couvre cet usage sans bibliothèque ni nouveau helper. La date est construite avec **`T00:00:00` sans suffixe UTC**, pour ne pas reculer d’un jour en fuseau négatif. Regroupement toujours assuré par le même `groupBy` sur la chaîne API ; tailles IEC toujours assurées par byte-size, inchangé. Moment et son initialisation de locale quittent le client et son verrou par `npm --prefix www uninstall moment --ignore-scripts --no-audit --no-fund`. Aucun manifeste/verrou racine ni historique `www.vue2` modifié.

### Dépendances examinées et conservées

- **object-hash** : coût marginal diagnostique non négligeable, mais son usage assure une clé de **contenu complet**, indépendante de l’ordre des propriétés, et non une identité par nom. Une sérialisation JSON brute réintroduirait une dépendance à cet ordre ; une liste manuelle de champs réduirait le contrat de détection des changements. Ajouter notre sérialiseur canonique pour économiser environ 11,39 kB gzip n’est pas retenu dans ce refactoring. Import, clé et effet animé préservés ; le flash après modification de description sans changement de nom a été exécuté.
- **animate.css** : seules `flash`, `bounceInRight`, `bounceOutRight` et la base `animate__animated` sont utilisées. Le fichier livré contient aussi durées/fill-mode, variables, variantes et règles print/réduction d’animations. Sa suppression **totale**, déjà optimisée par Vite, ne gagnerait que **3,23 kB gzip** de CSS ; un vrai sous-ensemble gagnerait moins. Les sources sélectives du paquet sont non préfixées (`.animated`, `.flash`, etc.), alors que les composants utilisent `animate__*` ; les importer telles quelles ne convient pas et peut heurter le spinner `.animated`. Une copie locale ou une transformation de préfixes maintiendrait du CSS fournisseur pour un faible gain : non retenue. Aucun CSS ni configuration de build supplémentaire.

Ni seuil Vite relevé, ni découpage de routes, virtualisation, nouvelle bibliothèque UI ou correction COR. Les anomalies de concurrence, noms d’URL, versions du flash et suppression suivie d’un rafraîchissement refusé restent hors périmètre.

## Résultat et reprise

Résultat local validé par l’utilisateur le 16 novembre 2026 : **109 050 octets de JS minifié et 37 892 octets gzip Node en moins**, sans ajout de dépendance ni changement CSS. Les mesures initiales utiles à MOD-06 figurent ci-dessus ; aucun travail MOD-06 commencé. L’EPIC est mis à jour directement, aucun pilotage actif distinct n’étant établi pour cette reprise.

Le 16 novembre 2026, après validation du résultat, l’utilisateur autorise explicitement le commit local sur `dev`, sans push, et la clôture de MOD-05. Code, tests et suivi sont enregistrés ensemble dans le présent commit local « Mesurer et réduire les dépendances chargées (MOD-05) ». Les critères vérifiés, l’acceptation et l’intégration sur la branche de référence convenue permettent le passage à « Terminé » dans l’EPIC. Aucun changement applicatif depuis la suite complète de 58 tests ; lint, build et 20 tests ciblés revérifiés avant commit.

Pour reprendre, vérifier l’arbre, la présence de ce commit local sur `dev` et la disponibilité des documents du prochain ticket explicitement autorisé. Aucun autre ticket n’est commencé par cette livraison. Dans un autre checkout, transférer ce commit ou utiliser une référence rendue accessible après autorisation de push ; le seul lien de thread ne transmet rien.

## Traçabilité et livraison

- Thread d’implémentation : [MOD-05 dans le checkout local](https://ampcode.com/threads/T-01a1e394-8694-73aa-954f-b6716597c434), en reprise du [thread MOD-04](https://ampcode.com/threads/T-01a1e350-796b-7755-b16b-a33e40d755bf).
- Départ : `dev` à `978bb52ef76f8d86774595894a2703f4d896fd45`, propre ; implémentation et intégration dans le même checkout local.
- Livraison réelle : présent commit local « Mesurer et réduire les dépendances chargées (MOD-05) », contenant les douze fichiers attendus (client, test de dates et suivi), sur `dev`. Aucun changement extérieur constaté lors de la relecture de l’index. Anciennes mentions de livraison des autres tickets laissées intactes.
- Aucun push, merge supplémentaire, déploiement ou publication. `dev` contient désormais MOD-04 et MOD-05 en avance sur la référence locale `origin/dev` à `82f17e5`, sans assertion sur le serveur distant.
- Acceptation utilisateur obtenue explicitement le 16 novembre 2026 (« Je valide MOD-05. »), puis autorisation du commit local sans push et du passage à « Terminé ». Aucun autre ticket ni COR commencé.
