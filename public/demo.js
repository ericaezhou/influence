// Influence prototype walkthrough. Everything is scripted: no mic, no network, no backend.
// All copy lives in this file and is never built from user input, so innerHTML is safe here.
(() => {
  const screen = document.querySelector("[data-screen]");
  const phone = document.querySelector(".phone");
  const toastEl = document.querySelector("[data-toast]");
  const guideEl = document.querySelector("[data-guide]");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Every navigation bumps the epoch; async work from an old screen checks it and stops.
  let epoch = 0;
  const sleep = (ms) => new Promise((r) => setTimeout(r, reduced ? 0 : ms));
  const alive = (e) => e === epoch;

  // Remember where this visit came from, so a sign-up after the demo is credited correctly.
  try {
    const params = new URLSearchParams(location.search);
    const source = params.get("utm_source") || params.get("ref");
    if (source) sessionStorage.setItem("inf_source", source);
    const ref = document.referrer;
    if (ref && new URL(ref).origin !== location.origin && !sessionStorage.getItem("inf_referrer")) {
      sessionStorage.setItem("inf_referrer", ref);
    }
  } catch {}

  const ICON = {
    mic: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3" fill="currentColor"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4M8 22h8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    person: (skin, shirt, hair) => `<svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="46" r="24" fill="${skin}" stroke="#1e2232" stroke-width="3"/><path d="M18 118c3-30 21-42 42-42s39 12 42 42z" fill="${shirt}" stroke="#1e2232" stroke-width="3"/>${hair ? `<path d="M37 42c0-20 14-26 25-25 13 1 22 10 21 25-6-1-14-5-20-12-5 7-15 11-26 12z" fill="${hair}"/>` : ""}</svg>`,
    masked: '<svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="46" r="24" fill="#c8cfe0" stroke="#1e2232" stroke-width="3"/><path d="M18 118c3-30 21-42 42-42s39 12 42 42z" fill="#c8cfe0" stroke="#1e2232" stroke-width="3"/><circle cx="51" cy="44" r="3.5" fill="#1e2232"/><circle cx="69" cy="44" r="3.5" fill="#1e2232"/><path d="M50 56h20" stroke="#1e2232" stroke-width="3" stroke-linecap="round"/></svg>',
  };
  const WAVE = `<div class="wave idle" aria-hidden="true">${"<i></i>".repeat(14)}</div>`;

  // ------------------------------------------------------------------ content

  const CASE = {
    title: "Ask your manager for a raise",
    goal: "$110k, up from $95k",
    walkaway: "Recruiter final rounds at about $105k",
  };

  const STORY = [
    "You're a product analyst, two years in, making $95k.",
    "At your last review you got 3%, and your manager said the budget was tight.",
    "Since then you've run the Q3 launch. Last week, a recruiter called.",
    "Tomorrow you meet Dana, your manager. You want $110k.",
  ];

  // [brackets] mark the key ideas that get highlighted in the transcript.
  const PROMPTS = [
    {
      step: "The other side's interests",
      q: "What does your manager really need from this conversation, besides keeping costs down?",
      takes: [
        { text: "Um, I think they need to [stay within budget], and probably not [lose someone] right before planning season.",
          ideas: ["Budget pressure", "Fear of losing you"],
          nudge: "You named their fear of losing you. What about how they look to their own boss?", good: false },
        { text: "They need to [stay within budget], [keep the team stable] before planning, and [look good to their own boss] for keeping strong people.",
          ideas: ["Budget pressure", "Team stability", "Their boss"],
          nudge: "Strong. You named three interests, including one they'd never say out loud.", good: true },
      ],
    },
    {
      step: "Your walkaway (BATNA)",
      q: "If this talk fails, what's your best option?",
      takes: [
        { text: "I guess I'd just [keep looking] for something else.",
          ideas: ["Other options"],
          nudge: "Be specific. What's actually on the table, and what would you accept?", good: false },
        { text: "A recruiter has me in [final rounds at around $105k]. I'd [take it if this goes nowhere], but I'd [rather stay].",
          ideas: ["Concrete alternative", "Your floor", "Preference to stay"],
          nudge: "Clear walkaway. Now you know your floor before you walk in.", good: true },
      ],
    },
    {
      step: "Your opening move",
      q: "Say your first line out loud.",
      takes: [
        { text: "So, um, I feel like I've been [underpaid] for a while, and it's kind of starting to bother me.",
          ideas: ["A feeling"],
          nudge: "This opens with a feeling. Lead with what you've done and a specific number.", good: false },
        { text: "Since my last review I [ran the Q3 launch] and [brought churn reporting in-house]. I'd like to talk about [moving to $110k].",
          ideas: ["Your track record", "A specific number"],
          nudge: "Concrete and specific. That's an opening they can take to finance.", good: true },
      ],
    },
  ];

  const PRO = [
    { h: "The other side's interests", pro: "Find what they can still move, not just what's frozen. Budgets are rarely frozen everywhere." },
    { h: "Your walkaway", pro: "Know your number before you walk in, and mention your alternative calmly, as context rather than a threat." },
    { h: "Your opening move", pro: "Open with your record and a specific ask, then ask for a package: title, timing and money." },
  ];

  const PLAN = "I'll open with the launch and a number, find out what they can still move, and keep the recruiter as my backup.";
  const CHECKIN = "They're open, but the budget is real. I should ask what they can move.";
  const DEBRIEF = "I'd bring up the recruiter earlier, and more calmly. And I'd ask about the retention pool myself instead of waiting.";

  // The live spar: their opener, then your line and their reply for each turn.
  const LIVE = {
    opener: "Thanks for grabbing time. What's on your mind?",
    turns: [
      { me: "Since my last review I ran the Q3 launch and brought churn reporting in-house. I'd like to talk about moving to $110k.",
        them: "The launch went really well. But budgets are frozen until January." },
      { me: "That makes sense. Help me understand what's frozen. What could we still do before January?",
        them: "Base pay is locked. I do have a small retention pool, and we've talked about your title." },
      { me: "I'd rather stay. A recruiter has me in final rounds, but if we can do the senior title now, $5k from the pool, and a written January review, I'm in.",
        them: "Title and $5k I can do this week, and I'll put January in writing. Let me talk to HR." },
    ],
    deal: "Senior title · $5k now · January review in writing",
  };

  const MODULE_STEPS = [
    { id: "story", label: "The story", sub: "Who's at the table, what's at stake" },
    { id: "p0", label: "The other side's interests", sub: "Speak it · instant feedback" },
    { id: "p1", label: "Your walkaway (BATNA)", sub: "Speak it · instant feedback" },
    { id: "p2", label: "Your opening move", sub: "Speak it · instant feedback" },
    { id: "pro", label: "How a pro plays it", sub: "Compare with your answers" },
    { id: "brief", label: "Spar checkpoint", sub: "Live with a partner · unlocks the next module", spar: true },
    { id: "debrief", label: "Debrief", sub: "What would you do differently?" },
  ];

  // Presenter sections, mapped to number keys 1-9.
  const SECTIONS = [
    { label: "Train home", go: "home" },
    { label: "Module roadmap", go: "roadmap" },
    { label: "The story", go: "story" },
    { label: "Speak the framework", go: "p0" },
    { label: "How a pro plays it", go: "pro" },
    { label: "Find a partner", go: "match" },
    { label: "Live spar", go: "live" },
    { label: "Scorecard", go: "score" },
    { label: "Spar tab", go: "sparhome" },
  ];

  // ------------------------------------------------------------------ state

  let state;
  function reset() {
    state = { done: new Set(), takes: {}, mode: "live", hideVideo: false, disguise: true, moduleDone: false, via: "train" };
  }
  reset();

  const partnerName = () => ({ live: "Alex", friend: "Sam", ai: "AI opponent" })[state.mode];
  const stepIndex = (id) => MODULE_STEPS.findIndex((s) => s.id === id);
  const currentStep = () => MODULE_STEPS.find((s) => !state.done.has(s.id));
  const progress = () => Math.round((state.done.size / MODULE_STEPS.length) * 100);

  // When jumping ahead, mark everything before the target as done with the stronger takes.
  function prime(target) {
    const order = ["story", "p0", "p1", "p2", "pro", "brief", "debrief"];
    const stop = { story: 0, p0: 1, p1: 2, p2: 3, pro: 4, brief: 5, match: 5, live: 5, score: 6, debrief: 6, done: 7 }[target];
    if (stop === undefined) return;
    order.slice(0, stop).forEach((id, i) => {
      state.done.add(id);
      if (i >= 1 && i <= 3 && state.takes[i - 1] === undefined) state.takes[i - 1] = 1;
    });
  }

  // ------------------------------------------------------------------ navigation

  const history = [];
  let current = null;
  let primary = null; // what → does on this screen

  function go(name, { push = true } = {}) {
    epoch += 1;
    if (push && current && current !== name) history.push(current);
    current = name;
    primary = null;
    phone.classList.toggle("in-call", name === "live");
    screen.scrollTop = 0;
    SCREENS[name]();
    const tab = name === "sparhome" || (state.via === "spar" && ["sparbrief", "match", "live", "score"].includes(name)) ? "spar" : "train";
    document.querySelectorAll("[data-tab]").forEach((b) => {
      b.classList.toggle("on", b.dataset.tab === tab);
      b.setAttribute("aria-current", b.dataset.tab === tab ? "page" : "false");
    });
    const sec = SECTIONS.findIndex((s) => s.go === name);
    guideEl.querySelectorAll("button").forEach((b, i) => b.classList.toggle("on", i === sec));
    screen.focus({ preventScroll: true });
  }

  function back() {
    if (!history.length) return;
    go(history.pop(), { push: false });
  }

  function jump(name) {
    reset();
    if (name === "sparhome") state.via = "spar";
    prime(name);
    history.length = 0;
    go(name, { push: false });
  }

  function toast(text) {
    toastEl.textContent = text;
    toastEl.hidden = false;
    clearTimeout(toast.t);
    toast.t = setTimeout(() => (toastEl.hidden = true), 2600);
  }

  const $ = (sel) => screen.querySelector(sel);
  const on = (sel, fn) => { const el = $(sel); if (el) el.addEventListener("click", fn); return el; };
  const scrollDown = () => { screen.scrollTop = screen.scrollHeight; };

  function top(eyebrow, stepId) {
    const i = stepId ? stepIndex(stepId) : -1;
    const dots = i >= 0
      ? `<div class="steps-dots" aria-label="Step ${i + 1} of ${MODULE_STEPS.length}">${MODULE_STEPS.map((s, j) => `<i class="${j < i ? "done" : j === i ? "cur" : ""}"></i>`).join("")}</div>`
      : "";
    return `<div class="top"><button class="back" data-back aria-label="Back">←</button><span class="eyebrow">${eyebrow}</span>${dots}</div>`;
  }
  function wireBack() { on("[data-back]", back); }

  // ------------------------------------------------------------------ voice helpers

  // Renders "text with [key ideas]" word by word into el, with key ideas highlighted.
  async function stream(el, text, e, speed = 55) {
    el.textContent = "";
    for (const part of text.split(/(\[[^\]]+\])/).filter(Boolean)) {
      const hl = part.startsWith("[");
      const words = (hl ? part.slice(1, -1) : part).split(/(\s+)/).filter(Boolean);
      const host = hl ? el.appendChild(document.createElement("mark")) : el;
      for (const w of words) {
        if (!alive(e)) return false;
        host.appendChild(document.createTextNode(w));
        if (w.trim()) await sleep(speed);
      }
    }
    return true;
  }
  const plain = (text) => text.replace(/[[\]]/g, "");

  // A hold-to-talk mic. Pressing (mouse, touch, Space or →) "records" the scripted answer.
  function mic(area, { label = "Hold to talk", small = false, onStart, onWords }) {
    area.innerHTML = `
      <div class="mic-area">
        <button class="mic ${small ? "small" : ""}" aria-label="${label}">${ICON.mic}</button>
        ${WAVE}
        <span class="mic-label">${label}</span>
      </div>`;
    const btn = area.querySelector(".mic");
    const wave = area.querySelector(".wave");
    const lab = area.querySelector(".mic-label");
    let busy = false;
    async function start() {
      if (busy || btn.disabled) return;
      busy = true;
      const e = epoch;
      btn.classList.add("rec");
      wave.classList.remove("idle");
      lab.textContent = "Listening…";
      if (onStart) onStart();
      const ok = await onWords(e);
      if (!ok || !alive(e)) return;
      btn.classList.remove("rec");
      wave.classList.add("idle");
      lab.textContent = label;
      busy = false;
    }
    btn.addEventListener("pointerdown", (ev) => { ev.preventDefault(); start(); });
    btn.addEventListener("keydown", (ev) => { if (ev.key === " " || ev.key === "Enter") { ev.preventDefault(); start(); } });
    return { start, btn, isBusy: () => busy, disable(v) { btn.disabled = v; } };
  }

  // ------------------------------------------------------------------ screens

  const SCREENS = {
    home() {
      const p = progress();
      const step = currentStep();
      screen.innerHTML = `
        <div class="app-head">
          <div><span class="greet">Good morning</span><h1>Erica</h1></div>
          <span class="streak">🔥 3-day streak</span>
        </div>
        <button class="continue" data-open>
          <span class="eyebrow">${state.moduleDone ? "Completed" : p ? "Continue" : "Start here"}</span>
          <h2>${CASE.title}</h2>
          <p>${state.moduleDone ? "Next up: Negotiate a job offer" : `Next: ${step.label}`}</p>
          <div class="bar"><i style="width:${p}%"></i></div>
        </button>

        <section class="sec">
          <h3>Negotiation</h3>
          <div class="row">
            ${modCard({ title: "Ask your manager for a raise", c: "Workplace", d: 2, len: "15 min", p, key: "raise" })}
            ${modCard({ title: "Negotiating with the KGB", c: "With Bruce Allyn", d: 3, len: "25 min", soon: true, key: "kgb" })}
            ${modCard({ title: "Negotiate a job offer", c: "Career", d: 2, len: "15 min", p: 0, locked: !state.moduleDone, key: "offer" })}
          </div>
        </section>
        <section class="sec">
          <h3>Building rapport</h3>
          <div class="row">
            ${modCard({ title: "Reconnect with an old friend", c: "Friendship", d: 1, len: "10 min", p: 0 })}
            ${modCard({ title: "Your first week on a new team", c: "Workplace", d: 1, len: "10 min", p: 0 })}
          </div>
        </section>
        <section class="sec">
          <h3>Persuasion</h3>
          <div class="row">
            ${modCard({ title: "Pitch your idea to a skeptic", c: "Workplace", d: 2, len: "15 min", p: 0 })}
            ${modCard({ title: "Change your manager's mind", c: "Workplace", d: 3, len: "20 min", p: 0 })}
          </div>
        </section>
        <section class="sec">
          <h3>Giving hard feedback</h3>
          <div class="row">
            ${modCard({ title: "Tell a teammate they're missing deadlines", c: "Workplace", d: 2, len: "12 min", p: 0 })}
            ${modCard({ title: "Push back on a close friend", c: "Friendship", d: 2, len: "12 min", p: 0 })}
          </div>
        </section>`;
      on("[data-open]", () => go("roadmap"));
      screen.querySelectorAll(".mod").forEach((m) =>
        m.addEventListener("click", () => {
          if (m.dataset.key === "raise") return go("roadmap");
          if (m.dataset.key === "kgb") return toast("Coming soon: Bruce Allyn's real negotiation with the KGB.");
          if (m.dataset.key === "offer" && !state.moduleDone) return toast("Finish the raise module to unlock this one.");
          toast("This walkthrough covers the raise module.");
        })
      );
      primary = () => go("roadmap");
    },

    roadmap() {
      const cur = currentStep();
      screen.innerHTML = `
        ${top("Negotiation")}
        <div class="mod-head">
          <h1 class="title">${CASE.title}</h1>
          <div class="mod-meta"><span>Medium</span><span>15 min</span><span>${progress()}% done</span></div>
        </div>
        <ol class="trail">
          ${MODULE_STEPS.map((s, i) => {
            const done = state.done.has(s.id);
            const isCur = cur && cur.id === s.id;
            const cls = done ? "done" : isCur ? "cur" : "lock";
            const mark = done ? "✓" : isCur ? i + 1 : "🔒";
            return `<li><button class="node ${cls} ${s.spar ? "spar" : ""}" data-step="${s.id}" ${!done && !isCur ? "disabled" : ""}>
              <span class="dot">${s.spar && !done ? "⚔" : mark}</span>
              <span class="lbl"><b>${s.label}</b><small>${s.sub}</small></span></button></li>`;
          }).join("")}
        </ol>
        ${cur ? `<div class="actions"><button class="btn" data-go>${state.done.size ? "Continue" : "Start"}: ${cur.label}</button></div>` : ""}`;
      wireBack();
      screen.querySelectorAll("[data-step]").forEach((b) => b.addEventListener("click", () => go(b.dataset.step)));
      if (cur) { on("[data-go]", () => go(cur.id)); primary = () => go(cur.id); }
      else primary = () => go("home");
    },

    story() {
      screen.innerHTML = `
        ${top("Step 1 · The story", "story")}
        <h1 class="title">The raise</h1>
        <div class="scene" aria-hidden="true">
          <svg viewBox="0 0 340 150">
            <rect x="0" y="112" width="340" height="38" fill="#cdd8f5"/>
            <rect x="95" y="92" width="150" height="14" rx="4" fill="#fff" stroke="#1e2232" stroke-width="2.5"/>
            <g transform="translate(40 26) scale(.72)">${ICON.person("#f1c7a8", "#e0452f", "#1e2232").replace(/<\/?svg[^>]*>/g, "")}</g>
            <g transform="translate(214 26) scale(.72)">${ICON.person("#d9a47e", "#2f5fdc", "#5a3a22").replace(/<\/?svg[^>]*>/g, "")}</g>
            <text x="83" y="140" text-anchor="middle" font-family="Outfit" font-weight="700" font-size="13" fill="#1e2232">You</text>
            <text x="257" y="140" text-anchor="middle" font-family="Outfit" font-weight="700" font-size="13" fill="#1e2232">Dana, your manager</text>
          </svg>
        </div>
        <div class="facts">
          <div class="fact"><span>👥</span><div><b>At the table</b>You and Dana, your manager of two years.</div></div>
          <div class="fact"><span>💰</span><div><b>What's at stake</b>You make $95k. You want $110k.</div></div>
          <div class="fact"><span>⚠️</span><div><b>What's gone wrong</b>Last review: 3% and "the budget's tight."</div></div>
        </div>
        <div class="player">
          <button class="play" data-play aria-label="Play the story">▶</button>
          <div class="track"><i data-track></i></div>
          <small data-time>0:00 / 0:24</small>
        </div>
        <div class="captions" data-cc aria-live="polite"><p class="dim">Tap play to hear the story.</p></div>
        <div class="actions"><button class="btn" data-next disabled>Continue</button></div>`;
      wireBack();
      const nextBtn = $("[data-next]");
      let played = false;
      async function play() {
        if (played) return;
        played = true;
        const e = epoch;
        const cc = $("[data-cc]");
        const track = $("[data-track]");
        const time = $("[data-time]");
        $("[data-play]").textContent = "❚❚";
        cc.innerHTML = "";
        for (let i = 0; i < STORY.length; i++) {
          const p = cc.appendChild(document.createElement("p"));
          if (!(await stream(p, STORY[i], e, 45))) return;
          track.style.width = `${((i + 1) / STORY.length) * 100}%`;
          time.textContent = `0:${String(Math.round(((i + 1) / STORY.length) * 24)).padStart(2, "0")} / 0:24`;
          await sleep(250);
        }
        if (!alive(e)) return;
        $("[data-play]").textContent = "↺";
        nextBtn.disabled = false;
        primary = finish;
      }
      function finish() { state.done.add("story"); go("p0"); }
      on("[data-play]", play);
      nextBtn.addEventListener("click", finish);
      primary = play;
    },

    p0() { promptScreen(0); },
    p1() { promptScreen(1); },
    p2() { promptScreen(2); },

    pro() {
      const rows = PRO.map((r, i) => {
        const t = PROMPTS[i].takes[state.takes[i] ?? 0];
        return `<div class="card"><h3>${r.h}</h3>
          <p class="you">You: "${plain(t.text)}"</p>
          <p class="pro">${r.pro}</p>
          <span class="verdict ${t.good ? "yes" : "part"}">${t.good ? "✓ You got there" : "◐ Partly. Worth another take"}</span></div>`;
      }).join("");
      screen.innerHTML = `
        ${top("Step 5 · Compare", "pro")}
        <h1 class="title">How a pro plays it</h1>
        <p class="lead">Your answers next to the expert approach.</p>
        <div class="cmp">${rows}</div>
        <div class="actions"><button class="btn" data-next>Build my spar brief</button></div>`;
      wireBack();
      const next = () => { state.done.add("pro"); go("brief"); };
      on("[data-next]", next);
      primary = next;
    },

    brief() {
      const interests = PROMPTS[0].takes[state.takes[0] ?? 1].ideas.join(", ");
      screen.innerHTML = `
        ${top("Step 6 · Spar checkpoint", "brief")}
        <span class="hand">your brief, built from your answers</span>
        <h1 class="title">Time to spar it</h1>
        <p class="lead">You'll play this live with a partner. They get a different brief.</p>
        <div class="brief">
          <div class="card"><span class="k">Your role</span>Product analyst, asking Dana for a raise</div>
          <div class="card"><span class="k">Your goal</span>${CASE.goal} <span class="from">· from your opening move</span></div>
          <div class="card"><span class="k">Your walkaway</span>${CASE.walkaway} <span class="from">· from your BATNA</span></div>
          <div class="card"><span class="k">Their likely interests</span>${interests} <span class="from">· from your notes</span></div>
          <div class="card them"><span class="k">Your partner's brief</span><span class="redact">Base pay frozen until January, has a small retention pool</span><br><small class="from">Revealed after the spar</small></div>
        </div>
        <div class="actions"><button class="btn" data-next>Find a partner</button></div>`;
      wireBack();
      const next = () => go("match");
      on("[data-next]", next);
      primary = next;
    },

    sparhome() {
      state.via = "spar";
      screen.innerHTML = `
        <div class="app-head"><div><span class="eyebrow">Open sparring</span><h1>Spar</h1></div></div>
        <button class="spar-now" data-now>Spar now<small>Matched in seconds</small></button>
        <h3 style="font-size:1.15rem;margin-bottom:10px">Case library</h3>
        <div class="lib">
          <button data-case="raise"><span class="ic">💼</span><span><b>The raise</b><small>Negotiation · Medium · 10 min</small></span></button>
          <button data-case="x"><span class="ic">📄</span><span><b>The job offer</b><small>Negotiation · Medium · 12 min</small></span></button>
          <button data-case="x"><span class="ic">🏠</span><span><b>The lease renewal</b><small>Negotiation · Easy · 8 min</small></span></button>
          <button data-case="x"><span class="ic">🤝</span><span><b>Splitting co-founder equity</b><small>Negotiation · Hard · 15 min</small></span></button>
          <button data-case="x"><span class="ic">🗣️</span><span><b>Defend your roadmap</b><small>Persuasion · Medium · 10 min</small></span></button>
          <button class="soon" data-case="kgb"><span class="ic">🕵️</span><span><b>Negotiating with the KGB</b><small>With Bruce Allyn · Coming soon</small></span></button>
        </div>`;
      const start = () => go("sparbrief");
      on("[data-now]", start);
      screen.querySelectorAll("[data-case]").forEach((b) =>
        b.addEventListener("click", () => {
          if (b.dataset.case === "raise") return start();
          toast(b.dataset.case === "kgb" ? "Coming soon: Bruce Allyn's real negotiation with the KGB." : "This walkthrough plays The raise.");
        })
      );
      primary = start;
    },

    sparbrief() {
      screen.innerHTML = `
        ${top("Case brief")}
        <h1 class="title">The raise</h1>
        <p class="lead">Your partner plays your manager, with a brief you can't see.</p>
        <div class="brief">
          <div class="card"><span class="k">Your role</span>Product analyst, two years in, making $95k</div>
          <div class="card"><span class="k">Your goals</span>Get to $110k, or a clear path there</div>
          <div class="card"><span class="k">Your limits</span>A recruiter has you near $105k. Below that, you'd consider leaving.</div>
          <div class="card them"><span class="k">What you know about them</span>Your manager values you, but just said budgets are tight.</div>
        </div>
        <h3 style="font-size:1.05rem;margin:18px 0 0">Record a 30-second plan</h3>
        <div data-mic></div>
        <div class="said" data-said hidden><span class="eyebrow">Your plan</span><div class="transcript" data-tx></div></div>
        <div class="actions"><button class="btn" data-next disabled>Find a partner</button></div>`;
      wireBack();
      const next = $("[data-next]");
      const m = mic($("[data-mic]"), {
        onStart: () => { $("[data-said]").hidden = false; },
        onWords: async (e) => {
          const ok = await stream($("[data-tx]"), PLAN, e);
          if (ok) { next.disabled = false; m.disable(true); primary = () => go("match"); scrollDown(); }
          return ok;
        },
      });
      next.addEventListener("click", () => go("match"));
      primary = m.start;
    },

    match() {
      const opt = (k, ic, t, s) => `<button class="opt ${state.mode === k ? "on" : ""}" data-mode="${k}"><span class="ic">${ic}</span><span><b>${t}</b><small>${s}</small></span><span class="radio"></span></button>`;
      screen.innerHTML = `
        ${top(state.via === "spar" ? "Spar now" : "Spar checkpoint")}
        <h1 class="title">Who do you want to spar?</h1>
        <div class="opts">
          ${opt("live", "🧑", "Live partner", "Someone working on this case right now")}
          ${opt("friend", "💌", "Invite a friend", "Send them the other brief")}
          ${opt("ai", "🤖", "Warm up with AI", "For when no one's around")}
        </div>
        <div class="toggles">
          <button class="tg" data-tg="disguise" aria-pressed="${state.disguise}"><span>Disguise my voice</span><i></i></button>
          <button class="tg" data-tg="hideVideo" aria-pressed="${state.hideVideo}"><span>Hide my video (use an avatar)</span><i></i></button>
        </div>
        <div data-area><div class="actions"><button class="btn" data-find>Find my partner</button></div></div>`;
      wireBack();
      screen.querySelectorAll("[data-mode]").forEach((b) =>
        b.addEventListener("click", () => {
          state.mode = b.dataset.mode;
          screen.querySelectorAll("[data-mode]").forEach((x) => x.classList.toggle("on", x === b));
        })
      );
      screen.querySelectorAll("[data-tg]").forEach((b) =>
        b.addEventListener("click", () => {
          state[b.dataset.tg] = !state[b.dataset.tg];
          b.setAttribute("aria-pressed", String(state[b.dataset.tg]));
        })
      );
      async function find() {
        const e = epoch;
        primary = null;
        const area = $("[data-area]");
        const waiting = { live: "Finding someone on this case…", friend: "Waiting for Sam to join…", ai: "Setting up your AI opponent…" }[state.mode];
        area.innerHTML = `<div class="searching fade-in"><div class="radar"><span>${state.mode === "ai" ? "🤖" : "🧑"}</span></div><b>${waiting}</b></div>`;
        scrollDown();
        await sleep(1500);
        if (!alive(e)) return;
        const who = { live: "Alex · on the same case", friend: "Sam · your friend", ai: "AI opponent · manager persona, medium" }[state.mode];
        const tag = state.mode === "ai" ? "Ready when you are" : "Matched · playing Dana, your manager";
        area.innerHTML = `
          <div class="matched fade-in"><span class="av">${state.mode === "ai" ? "🤖" : partnerName()[0]}</span><div><b>${who}</b><br><small class="from">${tag}</small></div></div>
          ${state.mode === "ai" ? `<div class="actions"><button class="btn" data-start>Start spar</button></div>` : `
          <div class="consent fade-in">
            <p><b>This spar will be recorded</b> so you both get feedback. Both partners must agree.</p>
            <div class="agree-row"><span data-a-me>You</span><span data-a-them>${partnerName()}</span></div>
            <button class="btn" data-agree>I agree</button>
          </div>`}`;
        scrollDown();
        if (state.mode === "ai") {
          on("[data-start]", () => go("live"));
          primary = () => go("live");
          return;
        }
        async function agree() {
          const e2 = epoch;
          primary = null;
          $("[data-a-me]").classList.add("ok");
          $("[data-a-me]").textContent = "✓ You agreed";
          const btn = $("[data-agree]");
          btn.disabled = true;
          btn.textContent = `Waiting for ${partnerName()}…`;
          await sleep(900);
          if (!alive(e2)) return;
          $("[data-a-them]").classList.add("ok");
          $("[data-a-them]").textContent = `✓ ${partnerName()} agreed`;
          btn.disabled = false;
          btn.textContent = "Start spar";
          btn.onclick = () => go("live");
          primary = () => go("live");
        }
        $("[data-agree]").addEventListener("click", agree, { once: true });
        primary = agree;
      }
      on("[data-find]", find);
      primary = find;
    },

    live() {
      const e = epoch;
      const masked = state.mode !== "ai";
      const partner = state.mode === "ai" ? "AI opponent" : `${partnerName()} · playing Dana`;
      screen.innerHTML = `
        <div class="call">
          <div class="call-top"><span class="recdot">REC</span><span>The raise · ${state.mode === "ai" ? "AI warm-up" : "Live spar"}</span><span class="timer" data-timer>08:00</span></div>
          <div class="pin"><b>📌 YOUR BRIEF</b> · Goal ${CASE.goal.split(",")[0]} · Walkaway ~$105k offer · Ask what they can still move</div>
          <div class="tiles">
            <div class="tile-main" data-them>
              ${state.mode === "ai" ? '<span style="font-size:4.5rem">🤖</span>' : masked ? ICON.masked : ""}
              ${state.mode !== "ai" ? '<span class="tile-badge">Voice disguised</span>' : ""}
              <span class="tile-name">${partner}</span>
            </div>
            <div class="tile-self" data-me>${state.hideVideo ? ICON.masked : ICON.person("#f1c7a8", "#e0452f", "#1e2232")}</div>
          </div>
          <div class="cc" data-cc aria-live="polite"></div>
          <div data-ctl></div>
          <div data-overlay></div>
        </div>`;
      // Timer runs while this screen is open.
      let secs = 480;
      const timerEl = $("[data-timer]");
      const tick = setInterval(() => {
        if (!alive(e)) return clearInterval(tick);
        secs = Math.max(0, secs - 1);
        timerEl.textContent = `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;
      }, 1000);

      const cc = $("[data-cc]");
      const themTile = $("[data-them]");
      const meTile = $("[data-me]");
      function line(who, cls) {
        const p = document.createElement("p");
        p.className = cls;
        p.innerHTML = `<span class="who">${who}</span>`;
        const t = p.appendChild(document.createElement("span"));
        cc.appendChild(p);
        while (cc.children.length > 3) cc.firstElementChild.remove();
        return t;
      }
      async function themSay(text) {
        themTile.classList.add("talking");
        await sleep(500);
        const ok = await stream(line(partner.split(" ·")[0].toUpperCase(), "them"), text, e, 50);
        themTile.classList.remove("talking");
        return ok;
      }

      let turn = 0;
      let m;
      function yourTurn() {
        m = mic($("[data-ctl]"), {
          label: "Hold to speak",
          onWords: async (e2) => {
            meTile.classList.add("talking");
            const ok = await stream(line("YOU", "me"), LIVE.turns[turn].me, e2, 50);
            meTile.classList.remove("talking");
            if (!ok) return false;
            m.disable(true);
            primary = null;
            if (!(await themSay(LIVE.turns[turn].them))) return false;
            turn += 1;
            if (turn === 1) checkIn();
            else if (turn < LIVE.turns.length) { m.disable(false); primary = m.start; }
            else finish();
            return true;
          },
        });
        primary = m.start;
      }

      function checkIn() {
        const ov = $("[data-overlay]");
        ov.innerHTML = `<div class="overlay fade-in">
          <span class="eyebrow">Quick check-in · only you see this</span>
          <h3>What's your read on them so far?</h3>
          <div class="transcript" data-ctx></div>
          <div data-cmic></div></div>`;
        const cm = mic(ov.querySelector("[data-cmic]"), {
          small: true,
          label: "Hold to answer",
          onWords: async (e2) => {
            const ok = await stream(ov.querySelector("[data-ctx]"), CHECKIN, e2, 45);
            if (!ok) return false;
            await sleep(700);
            if (!alive(e2)) return false;
            ov.innerHTML = "";
            m.disable(false);
            primary = m.start;
            return true;
          },
        });
        primary = cm.start;
      }

      function finish() {
        $("[data-ctl]").innerHTML = `
          <div class="deal fade-in"><b>DEAL REACHED</b>${LIVE.deal}</div>
          <button class="btn" data-end>End spar · see scorecard</button>`;
        const end = () => { state.done.add("brief"); go("score"); };
        on("[data-end]", end);
        scrollDown();
        primary = end;
      }

      (async () => {
        $("[data-ctl]").innerHTML = `<p class="mic-label" style="text-align:center">Connecting…</p>`;
        await sleep(700);
        if (!alive(e)) return;
        if (!(await themSay(LIVE.opener))) return;
        yourTurn();
      })();
    },

    score() {
      try { sessionStorage.setItem("inf_demo", "1"); } catch {}
      const first = PROMPTS[2].takes[0].text;
      screen.innerHTML = `
        ${top("Scorecard")}
        <h1 class="title">Nice spar.</h1>
        <div class="deal"><b>THE DEAL YOU REACHED</b>${LIVE.deal}</div>
        <div class="score-hero">
          <div class="ring"><svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15.5" fill="none" stroke="#ebe8e1" stroke-width="4"/><circle cx="18" cy="18" r="15.5" fill="none" stroke="#e0452f" stroke-width="4" stroke-linecap="round" stroke-dasharray="97.4" stroke-dashoffset="${97.4 * (1 - 0.84)}"/></svg><b>84</b></div>
          <div><b>Spar score</b><p class="lead" style="margin:0">Strong opening and a clean package. Your walkaway came in late.</p></div>
        </div>

        <section class="card panel">
          <h3>AI feedback · negotiation rubric</h3>
          ${meter("Understood the other side", 88)}${meter("Knew your walkaway", 74)}${meter("Bargained with intent", 90)}
        </section>

        <section class="card panel">
          <h3>From ${state.mode === "ai" ? "your AI opponent" : partnerName()}</h3>
          ${rate("Felt listened to", 5)}${rate("Was clear about what they wanted", 4)}${rate("Stayed calm under pressure", 4)}
          <p class="quote">"When you asked what I could still do, I stopped defending and started helping."</p>
        </section>

        <section class="card panel">
          <h3>How you sounded</h3>
          <dl class="stats">
            <div><dt>Talk time</dt><dd>48%</dd></div>
            <div><dt>Interruptions</dt><dd>0</dd></div>
            <div><dt>Pace</dt><dd>148<small style="font-size:.6em"> wpm</small></dd></div>
          </dl>
        </section>

        <section class="card panel">
          <h3>Your voice journey</h3>
          ${clip("first", "Your first take", "Opening move, take 1", plain(first))}
          ${clip("now", "In this spar", "Opening line, live", LIVE.turns[0].me)}
        </section>

        <section class="card panel" style="background:var(--blue-soft)">
          <h3>Their brief, revealed</h3>
          <p style="margin:0">Base pay was frozen until January, but Dana had a small retention pool and really didn't want to lose you.</p>
        </section>

        <div class="actions"><button class="btn" data-next>${state.via === "spar" ? "Done" : "Debrief"}</button></div>`;
      wireBack();
      requestAnimationFrame(() => screen.querySelectorAll(".meter .trk i").forEach((i) => (i.style.width = i.dataset.w)));
      screen.querySelectorAll("[data-clip]").forEach((b) => b.addEventListener("click", () => playClip(b)));
      const next = () => (state.via === "spar" ? go("sparhome") : go("debrief"));
      on("[data-next]", next);
      primary = next;
    },

    debrief() {
      screen.innerHTML = `
        ${top("Step 7 · Debrief", "debrief")}
        <h1 class="title">One last thing</h1>
        <div class="q">What would you do differently?</div>
        <div data-mic></div>
        <div class="said" data-said hidden><span class="eyebrow">Your reflection</span><div class="transcript" data-tx></div></div>
        <div class="actions"><button class="btn" data-next disabled>Finish module</button></div>`;
      wireBack();
      const next = $("[data-next]");
      const finish = () => { state.done.add("debrief"); state.moduleDone = true; go("done"); };
      const m = mic($("[data-mic]"), {
        onStart: () => { $("[data-said]").hidden = false; },
        onWords: async (e) => {
          const ok = await stream($("[data-tx]"), DEBRIEF, e);
          if (ok) { next.disabled = false; m.disable(true); primary = finish; scrollDown(); }
          return ok;
        },
      });
      next.addEventListener("click", finish);
      primary = m.start;
    },

    done() {
      screen.innerHTML = `
        <div class="done-hero">
          <div class="big">🏆</div>
          <span class="hand">module complete</span>
          <h1 class="title">You asked for the raise.</h1>
          <p class="lead">Three framework reps, one live spar, and a deal on the table.</p>
        </div>
        <div class="unlock"><span style="font-size:1.6rem">🔓</span><div><b>Unlocked: Negotiate a job offer</b><br><small class="from">Next in Negotiation</small></div></div>
        <a class="btn" href="/#join">Spar for real: join the waitlist</a>
        <div class="actions"><button class="btn ghost" data-next>Back to Train</button></div>`;
      const next = () => { history.length = 0; go("home", { push: false }); };
      on("[data-next]", next);
      primary = next;
    },
  };

  function modCard({ title, c, d, len, p = 0, locked, soon, key = "" }) {
    const diff = `<span class="diff" aria-label="Difficulty ${d} of 3">${[1, 2, 3].map((n) => `<i class="${n <= d ? "on" : ""}"></i>`).join("")}</span>`;
    const cls = soon ? "feature" : locked ? "locked" : "";
    return `<button class="mod ${cls}" data-key="${key}">
      ${soon ? '<span class="tag">Coming soon</span>' : locked ? '<span class="tag">🔒 Locked</span>' : `<span class="case">${c}</span>`}
      <h4>${title}</h4>
      ${soon ? `<span class="case">${c}</span>` : ""}
      <span class="meta">${diff}<span>${len}</span>${p ? `<span>${p}%</span>` : ""}</span>
      ${!soon && !locked ? `<span class="mbar"><i style="width:${p}%"></i></span>` : ""}
    </button>`;
  }

  // ------------------------------------------------------------------ framework prompt screen

  function promptScreen(i) {
    const P = PROMPTS[i];
    const id = `p${i}`;
    let take = -1;
    screen.innerHTML = `
      ${top(`Step ${i + 2} · Framework`, id)}
      <h1 class="title">${P.step}</h1>
      <div class="q">${P.q}</div>
      <div data-mic></div>
      <div data-out></div>
      <div class="actions" data-actions hidden>
        <button class="btn ghost" data-redo>↺ Re-record</button>
        <button class="btn" data-next>Continue</button>
      </div>`;
    wireBack();
    const out = $("[data-out]");
    const acts = $("[data-actions]");
    const redo = $("[data-redo]");
    const finish = () => {
      state.takes[i] = Math.max(take, 0);
      state.done.add(id);
      go(i < 2 ? `p${i + 1}` : "pro");
    };
    const m = mic($("[data-mic]"), {
      onStart: () => {
        take += 1;
        acts.hidden = true;
        out.innerHTML = `<div class="said"><span class="eyebrow">You said ${take ? '<span class="take">TAKE 2</span>' : ""}</span><div class="transcript" data-tx></div></div>`;
      },
      onWords: async (e) => {
        const T = P.takes[take];
        if (!(await stream(out.querySelector("[data-tx]"), T.text, e))) return false;
        await sleep(250);
        if (!alive(e)) return false;
        out.insertAdjacentHTML("beforeend", `
          <div class="fade-in">
            <div class="ideas">${T.ideas.map((x) => `<span>✓ ${x}</span>`).join("")}</div>
            <div class="nudge ${T.good ? "good" : ""}"><span class="ic">${T.good ? "🎯" : "💡"}</span><span>${T.nudge}</span></div>
          </div>`);
        acts.hidden = false;
        if (take >= 1) { redo.hidden = true; m.disable(true); primary = finish; }
        else primary = m.start; // → on a first take re-records, to show the improvement
        scrollDown();
        return true;
      },
    });
    redo.addEventListener("click", m.start);
    $("[data-next]").addEventListener("click", finish);
    primary = m.start;
  }

  // ------------------------------------------------------------------ scorecard helpers

  const meter = (label, v) =>
    `<div class="meter"><span>${label}</span><b>${v}</b><div class="trk"><i data-w="${v}%" style="width:0"></i></div></div>`;
  const rate = (label, n) =>
    `<div class="rate"><span>${label}</span><span class="pips" aria-label="${n} of 5">${[1, 2, 3, 4, 5].map((k) => `<i class="${k <= n ? "on" : ""}"></i>`).join("")}</span></div>`;
  const clip = (k, title, sub, text) =>
    `<div class="clip"><div class="clip-head"><button class="play" data-clip="${k}" aria-label="Play ${title}">▶</button><div><b>${title}</b><small>${sub}</small></div></div>
      <p>${text.split(" ").map((w) => `<span class="w">${w}</span>`).join(" ")}</p></div>`;

  async function playClip(btn) {
    const e = epoch;
    const words = btn.closest(".clip").querySelectorAll(".w");
    btn.textContent = "❚❚";
    for (const w of words) {
      if (!alive(e)) return;
      w.classList.add("lit");
      await sleep(110);
      w.classList.remove("lit");
    }
    if (alive(e)) btn.textContent = "▶";
  }

  // ------------------------------------------------------------------ wiring

  guideEl.innerHTML = SECTIONS.map((s, i) => `<li><button data-jump="${s.go}"><span class="n">${i + 1}</span>${s.label}</button></li>`).join("");
  guideEl.querySelectorAll("[data-jump]").forEach((b) => b.addEventListener("click", () => jump(b.dataset.jump)));

  document.querySelectorAll("[data-tab]").forEach((b) =>
    b.addEventListener("click", () => {
      if (b.dataset.tab === "spar") go("sparhome");
      else { state.via = "train"; go("home"); }
    })
  );

  document.addEventListener("keydown", (ev) => {
    if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
    if (ev.key === "ArrowRight") { ev.preventDefault(); if (primary) primary(); }
    else if (ev.key === "ArrowLeft") { ev.preventDefault(); back(); }
    else if (ev.key === "r" || ev.key === "R") { reset(); history.length = 0; go("home", { push: false }); }
    else if (/^[1-9]$/.test(ev.key)) jump(SECTIONS[+ev.key - 1].go);
    else if (ev.key === " " && current && document.activeElement && !document.activeElement.closest("button")) {
      // Space anywhere acts like holding the mic when there is one.
      const micBtn = screen.querySelector(".mic:not([disabled])");
      if (micBtn) { ev.preventDefault(); micBtn.dispatchEvent(new PointerEvent("pointerdown")); }
    }
  });

  go("home", { push: false });
})();
