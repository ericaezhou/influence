// Minimal Supabase REST (PostgREST) client (no dependencies). Server-side only:
// the secret / service-role key bypasses row-level security and must never reach the browser.
// Env vars are set by the Vercel Marketplace Supabase integration, or add them by hand.
// The Vercel integration only creates the NEXT_PUBLIC_ name; the project URL isn't secret.
const URL_ = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

export function isConfigured() {
  return Boolean(URL_ && KEY);
}

// Insert a row, or update the columns present in `row` if `onConflict` already exists.
export async function upsert(table, row, onConflict) {
  const headers = {
    apikey: KEY,
    "Content-Type": "application/json",
    Prefer: "resolution=merge-duplicates,return=minimal",
  };
  // Legacy service_role keys are JWTs and also go in Authorization; new sb_secret_ keys don't.
  if (!KEY.startsWith("sb_")) headers.Authorization = `Bearer ${KEY}`;

  const res = await fetch(`${URL_}/rest/v1/${table}?on_conflict=${onConflict}`, {
    method: "POST",
    headers,
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Supabase HTTP ${res.status}`);
  }
}
