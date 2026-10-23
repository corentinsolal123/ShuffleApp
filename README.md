# Dressing

PWA mobile-first pour gérer sa garde-robe et générer des idées de tenues chaque matin.

**Stack** : Next.js 16 (App Router) · TypeScript strict · Tailwind CSS v4 · composants façon shadcn/ui sur Base UI · Supabase (Auth, Postgres, Storage) · Serwist (service worker) · Vitest.

> Ce README sera complété à la fin du projet (Supabase hébergé, Vercel, installation de la PWA).

## Prérequis

- Node.js ≥ 20 et pnpm (`corepack enable`)
- Docker, pour le Supabase local (`supabase start`)

## Lancement en local

```bash
pnpm install
pnpm supabase start          # démarre Postgres, Auth, Storage et applique supabase/migrations
cp .env.example .env.local   # puis copier l'URL et la "Publishable key" affichées par la commande précédente
pnpm dev
```

- App : http://localhost:3000
- Emails de connexion (code OTP) : boîte de test locale sur http://127.0.0.1:54324
- Studio Supabase : http://127.0.0.1:54323

Le service worker est désactivé en `pnpm dev`. Pour tester la PWA : `pnpm build && pnpm start`.

## Scripts

| Commande | Rôle |
| --- | --- |
| `pnpm dev` / `build` / `start` | Next.js |
| `pnpm lint` · `pnpm typecheck` | ESLint · TypeScript |
| `pnpm test` | Tous les tests Vitest |
| `pnpm test:unit` | Logique métier pure |
| `pnpm test:integration` | Écrans rendus dans jsdom, réseau simulé avec MSW |
| `pnpm test:rls` | Policies RLS contre le Supabase local (ignorés s'il n'est pas démarré) |
| `pnpm db:reset` | Recrée la base locale à partir des migrations |
| `pnpm db:types` | Régénère `lib/db/types.ts` depuis le schéma local |

## Authentification

Connexion par **email + code à 6 chiffres** (OTP Supabase), plutôt qu'un lien magique : sur iOS, un lien ouvre Safari et la session n'arrive pas dans la PWA installée.

Le gabarit d'email local est `supabase/templates/otp.html`. Sur un projet Supabase hébergé, il faudra mettre `{{ .Token }}` dans les gabarits **Confirm signup** et **Magic Link** (Authentication › Emails).

## Structure

```
app/
  (auth)/login/        connexion OTP
  (app)/               écrans connectés : tenues, garde-robe, règles, réglages
  serwist/[path]/      service worker généré (Serwist + Turbopack)
  sw.ts                source du service worker
  manifest.ts          manifest PWA
components/ui/         composants de base (Base UI, thème noir & blanc)
lib/supabase/          clients navigateur / serveur / proxy
lib/db/types.ts        types du schéma
proxy.ts               rafraîchit la session et protège les routes
supabase/migrations/   schéma SQL versionné (tables, index, RLS)
tests/                 unit · integration · rls
```
