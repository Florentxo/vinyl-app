# Vinyl Collec'

Application React pour gérer une collection de vinyles, une wishlist et des favoris. Les sorties sont recherchées dans Discogs et les collections sont stockées dans Supabase.

## Démarrage

1. Installer les dépendances avec `npm install`.
2. Créer un fichier `.env.local` à la racine :

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_DISCOGS_TOKEN=your-discogs-token
```

3. Lancer `npm run dev`.

`VITE_DISCOGS_TOKEN` est facultatif, mais les requêtes Discogs sans jeton sont soumises aux limites publiques de l'API. Les variables préfixées par `VITE_` sont intégrées au code envoyé au navigateur : ne jamais y placer une clé Supabase `service_role` ni un secret serveur. Pour un déploiement public, servir les requêtes Discogs depuis un proxy ou une Supabase Edge Function.

## Recherche Discogs

Les champs Artiste et Album peuvent être utilisés seuls ou ensemble, avec un filtre de format facultatif. Saisir au moins deux caractères dans l'un des deux champs lance la recherche ; sélectionner une suggestion d'artiste est facultatif.

Les suffixes numériques Discogs (par exemple `Justice (3)`) sont retirés du nom envoyé à la recherche. Après sélection, le filtre accepte les titres crédités sans suffixe ou avec le même suffixe et exclut les suffixes explicitement différents. Ce filtrage par nom ne garantit pas la distinction des homonymes lorsque Discogs omet leur suffixe dans les résultats.

## Supabase

Créer une table `public.records` avec les colonnes attendues par l'application :

| Colonne | Type suggéré | Contraintes |
| --- | --- | --- |
| `id` | `uuid` | clé primaire, défaut `gen_random_uuid()` |
| `user_id` | `uuid` | référence à `auth.users.id`, non nul |
| `artist` | `text` | non nul |
| `album` | `text` | non nul |
| `year` | `text` | nullable |
| `genre` | `text` | nullable |
| `cover_url` | `text` | nullable |
| `discogs_release_id` | `bigint` | nullable, positif ; identifiant de l'édition Discogs |
| `favorite` | `boolean` | non nul, défaut `false` |
| `status` | `text` | `owned` ou `wishlist` |

Activer la Row Level Security (RLS) sur cette table et créer des politiques `select`, `insert`, `update` et `delete` qui autorisent chaque utilisateur authentifié à accéder uniquement aux lignes dont `user_id = auth.uid()`. Les filtres côté client ne remplacent pas ces politiques. Vérifier les règles existantes dans le tableau de bord Supabase avant de les modifier.

### Migration pour les collections existantes

Avant d'utiliser l'ajout de disques avec cette version, appliquer [la migration Discogs](supabase/migrations/202610250001_discogs_release_id.sql) dans l'éditeur SQL du projet Supabase (ou via votre procédure habituelle de migrations). Elle ajoute une colonne nullable sans modifier les disques existants ni leurs politiques RLS.

Les nouveaux disques conservent l'identifiant de l'édition sélectionnée : la fiche utilise cette édition exacte, comme l'aperçu. Les anciens disques sans identifiant continuent à utiliser la recherche par artiste et album, avec repli sur un master si aucune édition vinyle n'est trouvée. Une erreur sur une édition connue est affichée avec une action de nouvelle tentative, sans basculer vers une autre édition.

## Aperçu avant ajout

Un clic sur un résultat Discogs ouvre un aperçu de l'édition sélectionnée et de sa liste de chansons. Le bouton « Add release » confirme l'ajout ; « Back to results » conserve la recherche. Sur mobile, cet aperçu occupe tout l'écran. Une liste absente ou une erreur Discogs ne bloque pas l'ajout ; une erreur permet également de réessayer.

## Actions sur les disques

Seul le bouton « ⋯ » compact est visible au départ, avec une zone tactile de 44 pixels. Un appui ou un glissé tactile vers la gauche d'au moins 50 pixels révèle les icônes sur la même ligne que le disque, sans texte visible : « + » orange pour déplacer un disque de wishlist dans la collection, étoile pour les favoris, poubelle pour supprimer. Le bouton « ⋯ » disparaît lorsque la barre est ouverte ; celle-ci utilise un fond beige contrastant. Les boutons conservent des libellés accessibles et des infobulles. Un seul groupe reste ouvert à la fois ; glisser vers la droite, toucher ailleurs ou appuyer sur Échap le ferme.

Les actions dépendent du statut du disque, y compris dans la vue Favoris : un disque de wishlist peut être déplacé dans la collection sans doublon ; chaque disque peut être ajouté aux favoris ou retiré des favoris. La poubelle supprime le disque de toutes les vues après confirmation. Le glissé seul ne modifie aucun disque et n'ouvre pas sa fiche ; le défilement vertical reste disponible.

 : un disque de wishlist peut être déplacé dans la collection sans doublon ; chaque disque peut être ajouté aux favoris ou retiré des favoris. La poubelle supprime le disque de toutes les vues après confirmation. Le glissé seul ne modifie aucun disque et n'ouvre pas sa fiche ; le défilement vertical reste disponible.

## Vérifications

- `npm run build` : build de production.
- `npm run lint` : vérification ESLint.
- `npm test` : tests des utilitaires de recherche Discogs.