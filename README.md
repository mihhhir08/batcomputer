# Momentum 90

A private 90-day transformation dashboard for body recomposition, publishing consistency, and job-search momentum.

## Run locally

```bash
npm install
npm run dev
```

Without environment variables, the preview stores check-ins in the browser. For production, create a Supabase project, run `supabase/schema.sql` in its SQL editor, copy `.env.example` to `.env.local`, and add the two public project values. This enables passwordless email sign-in, cloud-synced records, and private progress-photo storage.

## Deploy

The app uses standard Next.js and is ready for a Vercel project. Run `npm run build` before deploying.

Add the same Supabase environment values to the Vercel project before the production deployment.

## Data safety

- Challenge records and private photos live in Supabase, outside the Git repository and Vercel deployment bundle. Updating or redeploying the app does not replace them.
- Treat database changes as additive migrations. Never drop or recreate `profiles`, `daily_logs`, or the `progress-photos` bucket while a challenge is active.
- The dashboard can download a versioned JSON backup and merge it back later. Restoring preserves dates that are not present in the backup.
- Without Supabase configuration, browser storage is only a preview fallback and can be lost if browser site data is cleared.
