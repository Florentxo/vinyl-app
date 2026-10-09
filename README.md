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
| `favorite` | `boolean` | non nul, défaut `false` |
| `status` | `text` | `owned` ou `wishlist` |

Activer la Row Level Security (RLS) sur cette table et créer des politiques `select`, `insert`, `update` et `delete` qui autorisent chaque utilisateur authentifié à accéder uniquement aux lignes dont `user_id = auth.uid()`. Les filtres côté client ne remplacent pas ces politiques. Vérifier les règles existantes dans le tableau de bord Supabase avant de les modifier.

## Vérifications

- `npm run build` : build de production.
- `npm run lint` : vérification ESLint.