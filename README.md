<div align="center">

# Momentum 90

### Your transformation, in motion.

A focused 90-day dashboard for turning daily actions into visible momentum across body recomposition, publishing, and career goals.

[![Next.js](https://img.shields.io/badge/Next.js-16-111111?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-2879FF?style=flat-square&logo=react&logoColor=white)](https://react.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-cloud_sync-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com/)
[![Vercel](https://img.shields.io/badge/Vercel-ready-111111?style=flat-square&logo=vercel&logoColor=white)](https://vercel.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

**Public code. Private progress.** Personal records and photos live in your own Supabase project—not in this repository.

</div>

---

## The idea

Most habit trackers make every checkbox feel equally important. Momentum 90 connects the work to three outcomes and shows whether the whole system is moving:

| Body | Content | Career |
| :--- | :--- | :--- |
| Clean whole-food eating | Post on X | 10 job applications |
| Protein target | Post on LinkedIn | Goal retires when a job is secured |
| 10,000 daily steps | Start Instagram when ready | Historical scores remain stable |
| Strength training | Track publishing consistency | Simple count—no application CRM |

## Product experience

|  | Capability | What it does |
| :---: | :--- | :--- |
| ◉ | **Daily command center** | One calm check-in for habits, steps, applications, and weight. |
| ↗ | **Momentum analytics** | A vivid line-and-bar chart switches between 14-day, 30-day, and full-challenge views. |
| ≋ | **Weekly comparison** | Compares Body, Content, and Career scores with the previous week. |
| ▦ | **90-day consistency map** | Turns the full challenge into a visual record, one square per day. |
| ◇ | **Milestones** | Marks Days 15, 30, 45, 60, 75, and 90 without breaking focus. |
| ◎ | **Body signals** | Tracks weight and occasional waist measurements with a directional RFM body-fat estimate. |
| ▣ | **Private progress photos** | Stores visual checkpoints in a private Supabase Storage bucket. |
| ✓ | **Adaptive goals** | Instagram begins when activated; job applications stop counting after the job is secured. |
| ⤓ | **Portable backups** | Downloads versioned JSON and safely merges it back without deleting dates missing from the backup. |
| ◌ | **Planned recovery** | Excludes a deliberate strength-recovery day without rewarding or punishing it. |
| ◒ | **Weekly weight trend** | Turns occasional weigh-ins into a readable body-recomposition trend. |
| ✦ | **Assistant review** | Summarizes what went well, what went wrong, and what to improve after the first week. |
| ● | **Cloud confidence** | Shows live saving, saved, local-only, and sync-error states. |
| ◫ | **Day 90 report** | Concludes the challenge with the core body, consistency, content, and career totals. |

The interface is deliberately encouraging: a missed action never resets the challenge, and recovery language points toward the next useful choice instead of punishing an imperfect day.

## How the data flows

```text
Daily check-in
      │
      ├── Browser state ── Local preview fallback
      │
      └── Supabase Auth
             ├── profiles        Challenge settings
             ├── daily_logs      One private record per date
             └── progress-photos Private storage bucket
                       │
                       └── Analytics, comparisons and milestones
```

The application code and personal data are intentionally separate. Git commits and Vercel deployments replace the interface, not the challenge history.

## Run locally

### Requirements

- Node.js 22.13 or newer
- npm
- A Supabase project for durable sync, authentication, and photo storage

```bash
git clone https://github.com/mihhhir08/momentum-90.git
cd momentum-90
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Without Supabase variables, Momentum 90 runs in preview mode and saves check-ins to that browser only.

## Connect Supabase

1. Create a Supabase project.
2. Run [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL editor.
3. Add the project URL and public anonymous key to `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
```

The supplied schema creates:

- passwordless email authentication support;
- row-level security so each signed-in user can access only their own records;
- `profiles` and `daily_logs` tables;
- a private `progress-photos` bucket with owner-scoped policies.

## Deploy to Vercel

1. Import this repository into Vercel.
2. Add the two Supabase variables from `.env.local` to the Vercel project.
3. Deploy.

```bash
npm run lint
npm run build
```

Both commands should pass before a production deployment.

## Data safety during an active challenge

> [!IMPORTANT]
> Browser storage is a convenient preview fallback, not a durable database. Connect Supabase before relying on Momentum 90 for an active challenge.

- Supabase records and photos remain outside Git and the Vercel deployment bundle.
- Future database changes should be additive migrations. Never drop or recreate `profiles`, `daily_logs`, or the `progress-photos` bucket while a challenge is active.
- Download a JSON backup before major application or schema changes.
- Backup restore merges records by date and preserves current dates absent from the imported file.
- Secrets are not required in the frontend: the app uses Supabase's public anonymous key with row-level security.

## Stack

| Layer | Technology |
| :--- | :--- |
| Application | Next.js 16 · React 19 · TypeScript |
| Styling | Purpose-built responsive CSS |
| Authentication | Supabase passwordless email sign-in |
| Database | Supabase Postgres with row-level security |
| Files | Private Supabase Storage |
| Hosting | Vercel-ready |

## Project structure

```text
app/
├── page.tsx          Dashboard, scoring and sync behavior
├── globals.css       Responsive product interface
└── layout.tsx        Application metadata and shell
lib/
└── supabase.ts       Supabase browser client
supabase/
└── schema.sql        Tables, storage and security policies
```

---

<div align="center">

Built for consistency over perfection—one honest day at a time.

</div>
