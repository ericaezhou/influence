import { upsert, isConfigured } from "../lib/supabase.js";

const PLANS = new Set(["free", "pro"]);
const CONVERSATIONS = new Set(["raise", "offer", "boss", "deal", "repair", "debate", "other"]);
const FORMATS = new Set(["camera", "voice", "masked", "friend"]);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const clip = (v, n = 300) => (typeof v === "string" ? v.trim().slice(0, n) : "");
const oneOf = (set, v) => (set.has(v) ? v : "");

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = (typeof req.body === "string" ? safeParse(req.body) : req.body) || {};

  // Honeypot: bots fill hidden fields. Pretend success.
  if (body.company_website) return res.status(200).json({ ok: true });

  const email = clip(body.email, 254).toLowerCase();
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: "Please enter a valid email." });

  if (!isConfigured()) {
    console.error("Waitlist storage not configured; a sign-up was not saved");
    return res.status(500).json({ error: "Sign-ups are temporarily unavailable. Please try again soon." });
  }

  const fields = {
    plan: oneOf(PLANS, body.plan),
    conversation: oneOf(CONVERSATIONS, body.conversation),
    spar_format: oneOf(FORMATS, body.sparFormat),
    source: clip(body.source, 100),
    referrer: clip(body.referrer, 300),
    // Only ever upgrade these; the columns default to 'hero' and false on insert.
    step: body.step === "full" ? "full" : "",
    demo_completed: body.demoCompleted === true,
  };

  // Upsert: the hero form saves just the email, the full form adds details later.
  // Only set fields are sent, so a later submit never blanks earlier answers,
  // and created_at keeps its insert-time default.
  const row = { email, updated_at: new Date().toISOString() };
  for (const [k, v] of Object.entries(fields)) if (v) row[k] = v;

  try {
    await upsert("influence_waitlist", row, "email");
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Waitlist save failed:", err.message);
    return res.status(500).json({ error: "Couldn't save your sign-up. Please try again." });
  }
}

function safeParse(s) {
  try { return s ? JSON.parse(s) : null; } catch { return null; }
}
