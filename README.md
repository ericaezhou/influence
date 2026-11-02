# influence

Landing page and scripted product demo for **Influence**: practice the hard conversation with someone who can say no.

## Project layout

```
public/              static site served by Vercel
  index.html         landing page
  demo.html, demo.js scripted demo spar at /demo (no backend, no mic)
  styles.css         shared styles; brand palette is the CSS variables at the top
  script.js          landing page interactions, sign-up forms, source tracking
  favicon.svg
api/subscribe.js     POST /api/subscribe: validates a sign-up and saves it to Supabase
lib/supabase.js      tiny Supabase REST client (no dependencies, server-side only)
supabase/schema.sql  creates the influence_waitlist table (run once)
vercel.json          serves public/ as the site, with /demo as a clean URL
```

No build step and no npm dependencies.

## Run locally

```bash
python3 -m http.server 4173 --directory public
# open http://localhost:4173 and http://localhost:4173/demo.html
```

This previews the pages only. The sign-up API runs on Vercel.

## Deploy (Vercel + Supabase)

1. Import this GitHub repo at <https://vercel.com/new>. Framework preset: **Other**. Leave the build settings empty. Deploy.
2. Connect Supabase: Vercel project → **Storage** → **Supabase**, or add the environment variables below by hand.
3. In the Supabase dashboard → **SQL Editor**, paste [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
4. Vercel → **Deployments** → latest → **⋯ → Redeploy** so the env vars take effect.
5. Optional: Vercel project → **Analytics** → Enable, to get visitor counts for conversion rate.

## Environment variables

| Name | Purpose |
| --- | --- |
| `SUPABASE_URL` *or* `NEXT_PUBLIC_SUPABASE_URL` | Your project URL, e.g. `https://abcd.supabase.co` |
| `SUPABASE_SECRET_KEY` *or* `SUPABASE_SERVICE_ROLE_KEY` | Server-only key that can write to the table |

Never commit these, and never put the secret key in `public/`. `.env*` files are gitignored.

## Viewing sign-ups

Supabase dashboard → **Table Editor** → `influence_waitlist`.

Columns: `email, plan, role, conversation, spar_format, detail, source, referrer, demo_completed, step, created_at, updated_at`.
`step` is `hero` when only the email was submitted and `full` when the longer form was submitted.

```sql
select conversation, count(*) from influence_waitlist group by 1 order by 2 desc;
select spar_format, count(*) from influence_waitlist group by 1 order by 2 desc;
select plan, count(*) from influence_waitlist group by 1;
select demo_completed, count(*) from influence_waitlist group by 1;
select coalesce(nullif(source, ''), '(direct)') as source, count(*) from influence_waitlist group by 1;
```

## Tracking where sign-ups come from

Add a `utm_source` to every link you post, e.g. `https://<your-domain>/?utm_source=stanford`. The value lands in the `source` column.
