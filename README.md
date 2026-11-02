# influence

Landing page and scripted product demo for **Influence**: get better at hard conversations by having them.

People learn negotiation frameworks in short lessons, then spar live with a real person and get feedback from their partner and an AI evaluator. The product itself isn't in this repo. This repo is the marketing site and a scripted preview.

## Repo layout

```
public/                what visitors see (Vercel serves this folder)
  index.html           landing page text and layout
  script.js            landing page behavior, plus the "pick your conversation" text
  demo.html            demo page shell, including the yellow banner
  demo.js              all demo text and logic (scripted, no backend)
  styles.css           shared styles; colors and fonts are the variables at the top
  favicon.svg          tab icon
api/subscribe.js       POST /api/subscribe: validates a sign-up and saves it
lib/supabase.js        tiny Supabase client (server-side only, no dependencies)
supabase/schema.sql    creates the influence_waitlist table (run once)
vercel.json            serves public/ and gives us the short /demo URL
doc/                   private application material: gitignored, shared outside git
```

No build step and no npm dependencies.

## Where to edit text

| To change | Look in |
|---|---|
| Landing page sections | `public/index.html`: each section starts with a comment such as `<!-- PRICING -->` (HERO, SCENARIOS, HOW IT WORKS, MASKING, WHY HUMAN, CREDIBILITY, PRICING, JOIN, FAQ) |
| "Pick your conversation" lines | `SCENES` in `public/script.js` |
| Demo lesson, brief and match screens | `learn()`, `brief()` and `match()` in `public/demo.js` |
| Demo sparring lines and scoring | `ROUNDS` and `BEST` in `public/demo.js` |
| Demo feedback | `partnerNote()` and `evaluatorNote()` in `public/demo.js` |

The tagline also appears in the page title, the `og:title` tag and the footer of `index.html`, so change it everywhere.

## Run locally

```bash
python3 -m http.server 4173 --directory public
# open http://localhost:4173 and http://localhost:4173/demo.html
```

This previews the pages only. Links to `/demo` and the waitlist forms work only on Vercel.

## Deploy (Vercel + Supabase)

1. Import the GitHub repo at <https://vercel.com/new>. Framework preset: **Other**. Leave the build settings empty.
2. In the Supabase dashboard → **SQL Editor**, paste [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
3. Add the environment variables below in Vercel → **Settings → Environment Variables**.
4. Vercel → **Deployments** → latest → **⋯ → Redeploy** so the variables take effect.
5. Optional: Vercel → **Analytics** → Enable, to get visitor counts for conversion rate.

Once connected, pushes to `main` deploy automatically.

## Environment variables

| Name | Purpose |
| --- | --- |
| `SUPABASE_URL` *or* `NEXT_PUBLIC_SUPABASE_URL` | Your project URL, e.g. `https://abcd.supabase.co` |
| `SUPABASE_SECRET_KEY` *or* `SUPABASE_SERVICE_ROLE_KEY` | Server-only key that can write to the table |

Never commit these, and never put the secret key in `public/`. `.env*` files are gitignored.

## Viewing sign-ups

Supabase dashboard → **Table Editor** → `influence_waitlist`.

Columns: `email, plan, conversation, spar_format, source, referrer, demo_completed, step, created_at, updated_at`.
`step` is `hero` when only the email was submitted and `full` when the longer form was submitted.

```sql
select conversation, count(*) from influence_waitlist group by 1 order by 2 desc;
select spar_format, count(*) from influence_waitlist group by 1 order by 2 desc;
select plan, count(*) from influence_waitlist group by 1;
select demo_completed, count(*) from influence_waitlist group by 1;
select coalesce(nullif(source, ''), '(direct)') as source, count(*) from influence_waitlist group by 1;
```

Exports contain personal emails. Don't commit them (`*.csv` is gitignored).

## Tracking where sign-ups come from

Add a `utm_source` to every link you post, e.g. `https://<your-domain>/?utm_source=stanford`. The value lands in the `source` column.
