# Dressing

PWA mobile-first pour gérer sa garde-robe et générer, chaque matin, des idées de tenues adaptées à la météo.

**Stack** : Next.js 16 (App Router) · TypeScript strict · Tailwind CSS v4 · composants façon shadcn/ui sur Base UI · Supabase (Auth, Postgres, Storage) · Serwist (service worker) · Open-Meteo · Vitest.

## Fonctionnalités

- **Connexion** par email + code à 6 chiffres (pas de lien magique : sur iOS il ouvrirait Safari, hors de la PWA installée).
- **Garde-robe** : hauts, bas, chaussures. La photo est prise ou choisie dans la galerie, puis compressée sur le téléphone (1000 px, WebP, ou JPEG sur Safari). On renseigne aussi les couleurs, les saisons, les occasions, la chaleur et l'adaptation à la pluie.
- **Règles de compatibilité** : tout va avec tout par défaut. On ajoute des exclusions « ce vêtement ne va jamais avec celui-là » ou « jamais cette couleur avec celle-là ».
- **Génération** : 1 à 3 tenues tirées au hasard parmi les combinaisons valides, sans pièce commune quand c'est possible, et relançables une par une. Quand rien n'est possible, l'écran dit quel filtre bloque.
- **Météo du jour** : ressenti de 8 h à 18 h et pluie, via la position du téléphone ou la ville par défaut. Le détail heure par heure est accessible.
- **Réglages** : ville par défaut, occasions (ajout, renommage, suppression avec réaffectation), installation de l'app, déconnexion.

Toutes les données sont privées. La RLS est activée sur chaque table et sur le bucket photos, qui est privé et servi par URLs signées. Les photos étant ré-encodées sur le téléphone, leurs métadonnées EXIF (dont la position GPS) ne sont jamais envoyées.

## Structure

```
app/
  (auth)/login/          connexion OTP
  (app)/                 écrans connectés : tenues (/), garde-robe, règles, réglages
  serwist/[path]/        service worker généré (Serwist + Turbopack)
  sw.ts · manifest.ts    PWA
components/              ui/ (thème noir & blanc), garments/, rules/, outfits/, settings/
lib/
  outfit-engine.ts       moteur de tenues : fonction pure, sans Supabase
  weather-rules.ts       seuils météo → contraintes (configurable)
  weather.ts             Open-Meteo + résumé de la journée (configurable)
  garments/ rules/ occasions/ profile/   modèles, validation, requêtes
  supabase/              clients navigateur / serveur / proxy
  db/types.ts            types du schéma
proxy.ts                 rafraîchit la session et protège les routes
supabase/
  migrations/            schéma SQL versionné : tables, index, RLS, bucket
  templates/otp.html     email avec le code à 6 chiffres (local)
tests/                   unit/ · integration/ · rls/
```

### Réglages du moteur

| Fichier | Contenu |
| --- | --- |
| `lib/weather-rules.ts` | `DEFAULT_WEATHER_RULES` : moins de 3 °C → haut chaleur 3 et bas ≥ 2 ; moins de 10 °C → haut et bas ≥ 2 ; plus de 22 °C → pièces légères privilégiées ; pluie → chaussures adaptées. |
| `lib/weather.ts` | `WEATHER_SUMMARY_CONFIG` : fenêtre 8 h – 18 h ; il y a pluie dès qu'un quart d'heure atteint 0,2 mm. |
| `lib/palette.ts` | Palette de couleurs, à garder synchronisée avec `public.palette_colors()` (vérifié par un test). |

## Développement local

Prérequis : Node.js ≥ 20, pnpm (`corepack enable`), Docker (pour Supabase en local).

```bash
pnpm install
pnpm supabase start          # Postgres, Auth, Storage + applique supabase/migrations
cp .env.example .env.local   # y copier l'API URL et la Publishable key affichées
pnpm dev                     # http://localhost:3000
```

- Les emails de connexion arrivent dans la boîte de test : http://127.0.0.1:54324
- Studio Supabase : http://127.0.0.1:54323
- Le service worker est désactivé en `pnpm dev`. Pour tester la PWA : `pnpm build && pnpm start`.
- **Sur un téléphone**, la géolocalisation, le service worker et l'envoi de photos exigent HTTPS : passer par un déploiement Preview Vercel, ou `pnpm dev --experimental-https` (le téléphone doit faire confiance au certificat).

### Scripts

| Commande | Rôle |
| --- | --- |
| `pnpm dev` · `build` · `start` | Next.js |
| `pnpm lint` · `pnpm typecheck` | ESLint · TypeScript |
| `pnpm test` | Tous les tests Vitest |
| `pnpm test:unit` | Logique métier pure (moteur, météo, validation…) |
| `pnpm test:integration` | Écrans rendus dans jsdom, réseau simulé avec MSW |
| `pnpm test:rls` | Policies RLS et fonctions SQL contre le Supabase local (ignorés s'il n'est pas démarré) |
| `pnpm test:coverage` | Couverture des tests unitaires |
| `pnpm db:reset` | Recrée la base locale depuis les migrations |
| `pnpm db:types` | Régénère `lib/db/types.ts` depuis le schéma local |

## Mise en place de Supabase (hébergé)

1. **Créer un projet** sur [supabase.com](https://supabase.com) (région proche, par exemple Paris).
2. **Appliquer les migrations** : elles créent les tables, les index, la RLS **et** le bucket privé `garments`.
   ```bash
   pnpm supabase login
   pnpm supabase link --project-ref <ref-du-projet>
   pnpm supabase db push
   ```
3. **Authentification** (Authentication dans le dashboard) :
   - *Sign In / Providers* : laisser **Email** activé, avec une **longueur d'OTP de 6** (c'est ce que l'écran de connexion attend).
   - *Emails › Templates* : dans **Confirm signup** et **Magic Link**, remplacer le lien par le code, par exemple `<p>Votre code : <strong>{{ .Token }}</strong></p>`. Le gabarit de `supabase/templates/otp.html` peut servir de base.
   - *URL Configuration* : **Site URL** = l'URL de production (Vercel).
   - *SMTP* : le service d'email intégré est très limité en nombre d'envois. Pour un usage régulier, configurer un SMTP (Resend, Brevo…).
4. **Clés** (Project Settings › API Keys) : récupérer l'**URL du projet** et la **Publishable key**.
5. **Fermer les inscriptions** une fois ton compte créé : *Sign In / Providers* › décocher **Allow new users to sign up**. Sans ça, n'importe qui connaissant l'URL peut créer un compte et stocker des photos sur ton projet. L'app affiche alors « Les inscriptions sont fermées » aux inconnus.

Les photos ne demandent aucune configuration supplémentaire : le bucket et ses policies sont dans `supabase/migrations/20261024000000_garments.sql`.

## Variables d'environnement

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase (`https://<ref>.supabase.co`, ou `http://127.0.0.1:54321` en local) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clé publique (`sb_publishable_…`). La RLS protège les données. |

Open-Meteo (météo et recherche de ville) ne demande aucune clé. Aucune clé secrète n'est utilisée par l'app.

## Déploiement sur Vercel

1. Sur [vercel.com](https://vercel.com), **importer le dépôt GitHub** (framework détecté : Next.js, commande `next build`).
2. Ajouter les deux variables d'environnement ci-dessus (Production et Preview).
3. Déployer, puis reporter l'URL obtenue dans **Site URL** côté Supabase.

Chaque push sur la branche principale redéploie. Le service worker est généré au build.

## Installer la PWA

**iPhone (Safari)**
1. Ouvrir l'URL de l'app dans **Safari**.
2. Toucher **Partager** (carré avec une flèche), puis **Sur l'écran d'accueil**, puis **Ajouter**.
3. Ouvrir Dressing depuis l'écran d'accueil et se connecter avec le code reçu par email. La session de l'app installée est indépendante de celle de Safari.
4. Autoriser la localisation à la première génération, ou définir une ville par défaut dans les Réglages.

**Android (Chrome)**
1. Ouvrir l'URL dans **Chrome**.
2. Toucher **Installer** dans les Réglages de l'app, ou passer par le menu ⋮ puis **Installer l'application**.

## Hors périmètre du MVP

Historique des tenues portées, favoris, partage, accessoires et vestes, reconnaissance automatique des vêtements, mode hors-ligne complet. Une page « hors ligne » simple s'affiche toutefois sans réseau.
