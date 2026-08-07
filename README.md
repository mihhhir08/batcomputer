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
