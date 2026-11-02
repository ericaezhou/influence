(() => {
  const stage = document.querySelector("[data-stage]");
  const progress = document.querySelectorAll("[data-progress] li");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const wait = (ms) => new Promise((r) => setTimeout(r, reduced ? 0 : ms));

  // Keep where this visit came from, so a link straight to /demo still gets credited at sign-up.
  try {
    const params = new URLSearchParams(location.search);
    const source = params.get("utm_source") || params.get("ref");
    if (source) sessionStorage.setItem("inf_source", source);
    const ref = document.referrer;
    if (ref && new URL(ref).origin !== location.origin && !sessionStorage.getItem("inf_referrer")) {
      sessionStorage.setItem("inf_referrer", ref);
    }
  } catch {}

  // All copy in this file is written here, never from user input, so innerHTML is safe.
  const state = { video: false, voice: false, picks: [] };
  // Bumped on every restart, so a pending timer from an old run can't draw into a new one.
  let runId = 0;

  // o = understood the other side, a = knew their alternatives, i = bargained with intent.
  // talk = share of airtime this line implies; cut = whether it talks over the partner.
  const ROUNDS = [
    {
      prompt: "Thanks for grabbing time. What's on your mind?",
      options: [
        { text: "I feel like I've been underpaid for a while, and it's starting to bother me.",
          reply: "Okay. Underpaid compared with what? I can't take a feeling to finance.",
          o: 1, a: 0, i: 0, talk: 42, cut: 0 },
        { text: "Since my last review I took over the Q3 launch and brought churn reporting in-house. I'd like to talk about moving my pay to $110k.",
          reply: "That launch went well, I'll give you that. But $110k is a big jump, and budgets are frozen until January.",
          o: 1, a: 1, i: 3, talk: 55, cut: 0 },
        { text: "I have another offer, so you'd need to match it or I'm gone.",
          reply: "Wow. Okay. If that's where you are, maybe you should take it.",
          o: 0, a: 1, i: 0, talk: 62, cut: 1 },
      ],
    },
    {
      options: [
        { text: "That seems convenient. Is everyone's budget really frozen?",
          reply: "I don't love that tone. It isn't convenient for me either.",
          o: 0, a: 0, i: 0, talk: 60, cut: 2 },
        { text: "Okay, I understand. I'll wait until January then.",
          reply: "Thanks for understanding. Let's circle back then. Anything else?",
          o: 1, a: 0, i: 0, talk: 30, cut: 0 },
        { text: "Help me understand. What would you need to see, or who would need to sign off, to make something happen before January?",
          reply: "Base is locked until the January cycle. I do have a small retention pool, and I've been meaning to talk about your title.",
          o: 3, a: 0, i: 1, talk: 45, cut: 0 },
      ],
    },
    {
      options: [
        { text: "What about $110k in January, then? Can you promise me that?",
          reply: "I can't promise a number. I can promise we'll talk.",
          outcome: { title: "No deal yet", body: "You got a conversation in January and nothing in writing." },
          o: 0, a: 0, i: 1, talk: 50, cut: 0 },
        { text: "A recruiter has me in final rounds at around $105k, and I'd rather stay. Could we do the senior title now, a bump from whatever discretionary budget you have, and a written January review for the rest?",
          reply: "I don't want to lose you. Title and $5k I can do this week, and I'll put January in writing. Let me talk to HR.",
          outcome: { title: "Deal: senior title, $5k now, January in writing", body: "Most of what you wanted, and a clear path to the rest." },
          o: 1, a: 3, i: 3, talk: 52, cut: 0 },
        { text: "A recruiter reached out, and honestly I might just leave if this doesn't work.",
          reply: "I don't want you to go, but I can't work with an ultimatum. Send me what they offer.",
          outcome: { title: "Stalemate", body: "You showed your alternative as a threat, so your manager stopped looking for options." },
          o: 0, a: 1, i: 0, talk: 58, cut: 1 },
      ],
    },
  ];

  const PULSES = [
    "Did your partner seem to be listening?",
    "Did that feel like a real limit or a stall?",
  ];

  function step(n) {
    progress.forEach((li, i) => {
      li.classList.toggle("done", i < n);
      li.classList.toggle("cur", i === n);
      if (i === n) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current");
    });
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
    stage.focus({ preventScroll: true });
  }

  // ---- 1. Learn ----
  function learn() {
    step(0);
    stage.innerHTML = `
      <span class="hand">your first lesson, in 45 seconds</span>
      <h1>Three moves skilled negotiators make.</h1>
      <ul class="frameworks">
        <li><b>Understand the other side</b>Everyone across the table has limits and fears of their own. Ask until you know what they are.</li>
        <li><b>Know your alternatives</b>What will you do if they say no? Your answer is your leverage, even if you never say it out loud.</li>
        <li><b>Bargain with intent</b>Name something specific, and trade for what you want instead of hoping for it.</li>
      </ul>
      <p class="check-q">Quick check: your manager says the budget is frozen. What's your best next move?</p>
      <div class="opts" data-check>
        <button class="opt" data-ok="0">Accept it. They've given you the answer.</button>
        <button class="opt" data-ok="1">Ask what is and isn't frozen, and what they could do.</button>
        <button class="opt" data-ok="0">Tell them you'll quit unless they find the money.</button>
      </div>
      <div data-check-result></div>
      <p class="sim">In the full unit, you'd also study case briefs like Bruce Allyn's talks with the KGB.</p>`;
    stage.querySelectorAll("[data-check] .opt").forEach((b) =>
      b.addEventListener("click", () => {
        stage.querySelectorAll("[data-check] .opt").forEach((x) => (x.disabled = true));
        b.classList.add("picked");
        const right = b.dataset.ok === "1";
        stage.querySelector("[data-check-result]").innerHTML = `
          <div class="answer" role="status"><b>${right ? "Exactly." : "Not quite."}</b> "Frozen" usually applies to one thing. Understanding the other side means finding out what they can still move.</div>
          <div class="stage-actions"><button class="btn" data-next>Read your brief →</button></div>`;
        stage.querySelector("[data-next]").addEventListener("click", brief);
      })
    );
  }

  // ---- 2. Brief ----
  function brief() {
    step(1);
    stage.innerHTML = `
      <span class="hand">read this before you step in</span>
      <h1>The raise.</h1>
      <p class="stage-lede">You've asked your manager for a meeting. Your partner has been given a brief of their own, and you can't see it.</p>
      <div class="brief-grid">
        <div class="brief red-side">
          <h3>Your brief</h3>
          <ul>
            <li>You're a product analyst, two years in, making $95k.</li>
            <li>You want <b>$110k</b>.</li>
            <li>You ran the Q3 launch and brought churn reporting in-house.</li>
            <li>A recruiter has you in final rounds at around $105k. There's no offer yet.</li>
          </ul>
        </div>
        <div class="brief blue-side">
          <h3>Their brief</h3>
          <p class="redacted">Your manager <i>can't change base pay until January</i>, but <i>has room on title</i> and <i>a small retention pool</i>.</p>
          <small>Revealed when the spar ends</small>
        </div>
      </div>
      <div class="stage-actions"><button class="btn" data-next>I'm ready →</button></div>`;
    stage.querySelector("[data-next]").addEventListener("click", match);
  }

  // ---- 3. Match ----
  function match() {
    step(2);
    stage.innerHTML = `
      <span class="hand">show up as much as you want to</span>
      <h1>How do you want to spar?</h1>
      <p class="stage-lede">Masking is optional. You can change it for every spar.</p>
      <div class="demo-toggles">
        <label class="toggle"><input type="checkbox" data-t="video" ${state.video ? "checked" : ""}/><i></i><span>Hide my video behind an avatar</span></label>
        <label class="toggle"><input type="checkbox" data-t="voice" ${state.voice ? "checked" : ""}/><i></i><span>Mask my voice</span></label>
      </div>
      <div data-match-area><div class="stage-actions"><button class="btn" data-find>Find me a partner →</button></div></div>`;
    stage.querySelectorAll("[data-t]").forEach((t) =>
      t.addEventListener("change", () => (state[t.dataset.t] = t.checked))
    );
    stage.querySelector("[data-find]").addEventListener("click", async () => {
      const id = runId;
      stage.querySelector("[data-match-area]").innerHTML =
        `<div class="matching" role="status"><span class="spinner"></span>Looking for someone on the same module…</div>`;
      await wait(1400);
      if (id !== runId) return;
      stage.querySelector("[data-match-area]").innerHTML = `
        <div class="matching" role="status">✓ Matched. Your partner will play your manager, and they want this to go their way.</div>
        <div class="stage-actions"><button class="btn" data-next>Step in →</button></div>`;
      stage.querySelector("[data-next]").addEventListener("click", spar);
      stage.querySelector("[data-next]").focus();
    });
  }

  // ---- 4. Spar ----
  function bubble(chat, who, text, cls) {
    const p = document.createElement("div");
    p.className = `bub ${cls}`;
    const label = document.createElement("span");
    label.className = "who";
    label.textContent = who;
    p.append(label, document.createTextNode(text));
    chat.appendChild(p);
    return p;
  }

  function spar() {
    step(3);
    state.picks = [];
    const you = [state.video ? "Avatar" : "Camera on", state.voice ? "voice masked" : "your voice"].join(", ");
    stage.innerHTML = `
      <div class="spar-head demo-spar-head">
        <span class="live"><i></i>SCRIPTED SPAR</span>
        <span class="round" data-round>ROUND 1 OF 3</span>
      </div>
      <div class="corners">
        <div class="corner red"><span class="corner-tag">RED CORNER</span><b>You</b><small>${you}</small></div>
        <div class="vs">VS</div>
        <div class="corner blue"><span class="corner-tag">BLUE CORNER</span><b>Your partner</b><small>Playing your manager</small></div>
      </div>
      <div class="chat" data-chat aria-live="polite"></div>
      <div data-turn></div>`;
    const chat = stage.querySelector("[data-chat]");
    bubble(chat, "YOUR PARTNER", ROUNDS[0].prompt, "them");
    turn(0);
  }

  function turn(r) {
    const area = stage.querySelector("[data-turn]");
    stage.querySelector("[data-round]").textContent = `ROUND ${r + 1} OF 3`;
    area.innerHTML = `<p class="check-q">What do you say?</p><div class="opts">${ROUNDS[r].options
      .map((o, i) => `<button class="opt" data-i="${i}">${o.text}</button>`)
      .join("")}</div>`;
    area.querySelectorAll(".opt").forEach((b) =>
      b.addEventListener("click", () => respond(r, ROUNDS[r].options[+b.dataset.i]))
    );
  }

  async function respond(r, opt) {
    const id = runId;
    const chat = stage.querySelector("[data-chat]");
    const area = stage.querySelector("[data-turn]");
    state.picks.push(opt);
    area.innerHTML = "";
    bubble(chat, "YOU", opt.text, "you");
    const typing = bubble(chat, "YOUR PARTNER", "…", "them typing");
    typing.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
    await wait(1300);
    if (id !== runId) return;
    typing.remove();
    bubble(chat, "YOUR PARTNER", opt.reply, "them");

    if (r === ROUNDS.length - 1) {
      await wait(600);
      if (id !== runId) return;
      area.innerHTML = `<div class="stage-actions"><button class="btn" data-next>See your scorecard →</button></div>`;
      area.querySelector("[data-next]").addEventListener("click", review);
      area.querySelector("[data-next]").scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
      return;
    }
    area.innerHTML = `
      <div class="pulse demo-pulse">
        <span>Quick pulse: ${PULSES[r]}</span>
        <div class="pulse-btns"><button>Yes</button><button>Sort of</button><button>No</button></div>
      </div>`;
    area.querySelector(".pulse").scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
    area.querySelectorAll(".pulse-btns button").forEach((b) =>
      b.addEventListener("click", () => {
        turn(r + 1);
        area.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
      })
    );
  }

  // ---- 5. Review ----
  // Set above the highest reachable totals (5, 4, 7): even the best line leaves room to improve.
  const BEST = { o: 6, a: 5, i: 8 };

  function score() {
    const sum = { o: 0, a: 0, i: 0 };
    state.picks.forEach((p) => { sum.o += p.o; sum.a += p.a; sum.i += p.i; });
    const pct = (k) => Math.round((sum[k] / BEST[k]) * 100);
    const parts = { o: pct("o"), a: pct("a"), i: pct("i") };
    return { ...parts, total: Math.round((parts.o + parts.a + parts.i) / 3) };
  }

  function partnerNote(s) {
    const asked = state.picks[1].o === 3;
    const landed = asked
      ? "When you asked what I could actually do, I stopped defending and started helping."
      : state.picks[0].i === 3
        ? "You opened with what you'd done and a clear number. That was hard to brush off."
        : "You stayed in the room when it got uncomfortable. That counts.";
    const next = s.o < 60
      ? "I never felt like you were curious about my side. Try asking one more question before you respond."
      : s.a < 60
        ? "I had no idea you had other options, or if I did, it felt like a threat. Mention them calmly, as context."
        : s.i < 60
          ? "I wasn't sure what you actually wanted from me. Be more specific."
          : "You could have asked for more. I had a little more room than I gave you.";
    return { landed, next };
  }

  function evaluatorNote() {
    const weakest = [...state.picks].map((p, i) => ({ p, i, v: p.o + p.a + p.i })).sort((x, y) => x.v - y.v)[0];
    const notes = [
      "This opening was your best chance to set the terms. A concrete record and a number would have given your manager something to work with.",
      "A frozen budget was your cue to dig. This line didn't uncover what your manager could still move.",
      "This was your moment to combine your alternative with a specific package. Ask for several things you can trade between.",
    ];
    if (weakest.v >= 4) {
      return { line: state.picks[2].text, why: "This line used all three moves at once: a calm alternative, a specific package, and room for your manager to say yes." };
    }
    return { line: weakest.p.text, why: notes[weakest.i] };
  }

  // Single series, so no legend; end points are labelled directly and each marker has a tooltip.
  function chart(latest) {
    const history = [38, 47, 44, 58, latest];
    const X = (i) => 22 + i * 69;
    const Y = (v) => 110 - (v / 100) * 92;
    const pts = history.map((v, i) => `${X(i)},${Y(v).toFixed(1)}`).join(" ");
    const circles = history
      .map((v, i) => `<circle cx="${X(i)}" cy="${Y(v).toFixed(1)}" r="5"><title>${i === 4 ? "This spar" : `Spar ${i + 1} (example)`}: ${v}</title></circle>`)
      .join("");
    const labelY = Y(latest) < 22 ? Y(latest) + 20 : Y(latest) - 11;
    return `<svg class="progress" viewBox="0 0 320 130" role="img" aria-label="Line chart of spar scores. Four example sessions of 38, 47, 44 and 58, then this spar at ${latest}.">
      <line class="grid" x1="12" x2="308" y1="110" y2="110"/>
      <polyline class="series" points="${pts}"/>
      <g class="pts">${circles}</g>
      <text class="val" x="${X(4)}" y="${labelY.toFixed(1)}" text-anchor="middle">${latest}</text>
      <text class="axis" x="${X(0)}" y="126" text-anchor="middle">Spar 1</text>
      <text class="axis" x="${X(4)}" y="126" text-anchor="middle">This spar</text>
    </svg>`;
  }

  function review() {
    step(4);
    const s = score();
    const out = state.picks[2].outcome;
    const note = partnerNote(s);
    const moment = evaluatorNote();
    const talk = Math.round(state.picks.reduce((n, p) => n + p.talk, 0) / state.picks.length);
    const cuts = state.picks.reduce((n, p) => n + p.cut, 0);
    const listened = s.o >= 60 ? "Yes" : s.o >= 20 ? "Sort of" : "No";

    try { sessionStorage.setItem("inf_demo", "1"); } catch {}

    stage.innerHTML = `
      <span class="hand">good spar</span>
      <h1>Here's how it went.</h1>
      <div class="outcome"><h2>${out.title}</h2><p>${out.body}</p></div>
      <div class="score-big">${s.total}<small>/100 spar score</small></div>

      <div class="results">
        <section class="panel panel-blue">
          <h3>From your partner</h3>
          <p><b>What landed:</b> "${note.landed}"</p>
          <p><b>Try next time:</b> "${note.next}"</p>
          <p><b>Felt listened to:</b> ${listened}</p>
        </section>

        <section class="panel">
          <h3>From the AI evaluator</h3>
          <div class="meter"><span>Understood the other side</span><b>${s.o}</b><div class="track"><i style="width:${s.o}%"></i></div></div>
          <div class="meter"><span>Knew your alternatives</span><b>${s.a}</b><div class="track"><i style="width:${s.a}%"></i></div></div>
          <div class="meter"><span>Bargained with intent</span><b>${s.i}</b><div class="track"><i style="width:${s.i}%"></i></div></div>
        </section>

        <section class="panel full">
          <h3>The moment that mattered</h3>
          <p class="moment">"${moment.line}"</p>
          <p>${moment.why}</p>
          <dl class="speech">
            <div><dt>Your talk time</dt><dd>${talk}%</dd></div>
            <div><dt>Interruptions</dt><dd>${cuts}</dd></div>
            <div><dt>Pace</dt><dd>${talk > 55 ? "Rushed" : "Steady"}</dd></div>
          </dl>
          <p class="sim">Estimated from your choices in this preview. In a real spar, these are measured from your audio.</p>
        </section>

        <section class="panel panel-red">
          <h3>Their brief, revealed</h3>
          <p>Base pay was locked until January. They had room on title and a small retention pool, and they really didn't want to lose you.</p>
        </section>

        <section class="panel">
          <h3>Your progress</h3>
          ${chart(s.total)}
          <p class="sim">The earlier sessions are examples. Every real spar adds to your record.</p>
        </section>
      </div>

      <div class="demo-final">
        <a class="btn" href="/#join">Spar a real person: join the waitlist →</a>
        <button class="btn btn-ghost" data-rematch>Run it back</button>
      </div>`;
    stage.querySelector("[data-rematch]").addEventListener("click", () => {
      runId += 1;
      match();
    });
  }

  learn();
})();
