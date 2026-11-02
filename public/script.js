(() => {
  // sessionStorage can throw in private windows; the page must work without it.
  const store = {
    get(k) { try { return sessionStorage.getItem(k) || ""; } catch { return ""; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch {} },
  };

  // Track where sign-ups come from (e.g. ?utm_source=reddit or ?ref=stanford).
  // Kept for the visit, so a trip to /demo and back doesn't lose it.
  const params = new URLSearchParams(location.search);
  const source = params.get("utm_source") || params.get("ref") || store.get("inf_source");
  if (source) store.set("inf_source", source);
  // Only outside sites count; hops between our own pages aren't a referrer.
  const external = document.referrer && new URL(document.referrer).origin !== location.origin ? document.referrer : "";
  const referrer = store.get("inf_referrer") || external;
  if (referrer) store.set("inf_referrer", referrer);

  const toastEl = document.querySelector(".toast");
  function toast(text) {
    toastEl.textContent = text;
    toastEl.hidden = false;
    clearTimeout(toast.t);
    toast.t = setTimeout(() => (toastEl.hidden = true), 4200);
  }

  async function submit(data) {
    const res = await fetch("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, source, referrer, demoCompleted: store.get("inf_demo") === "1" }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || "Something went wrong. Please try again.");
    return body;
  }

  const validEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const mainForm = document.querySelector('[data-form="main"]');
  const joinCard = document.querySelector(".join-card");
  const joinSection = document.getElementById("join");

  function setRadio(name, value) {
    const radio = mainForm.querySelector(`input[name="${name}"][value="${value}"]`);
    if (radio) radio.checked = true;
  }

  // ---- Hero form: save the email right away, then offer the longer form ----
  document.querySelector('[data-form="hero"]').addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const btn = form.querySelector("button");
    const email = form.email.value.trim();
    if (!validEmail(email)) return toast("That email doesn't look right.");
    btn.disabled = true;
    try {
      await submit({ email, company_website: form.company_website.value, step: "hero" });
      mainForm.email.value = email;
      toast("You're on the list. Add a few details below so we can match you well.");
      joinSection.scrollIntoView({ behavior: "smooth" });
    } catch (err) {
      toast(err.message);
    } finally {
      btn.disabled = false;
    }
  });

  // ---- Scenario picker ----
  const SCENES = {
    raise: {
      you: "I've been here two years and I think I deserve a raise.",
      them: "Everyone thinks that. What's changed since your last review?",
      move: "Bargain with intent",
      why: "Open with what you've done and a specific number, not how you feel. It gives them something they can take to finance.",
    },
    offer: {
      you: "Is there any flexibility on the salary?",
      them: "This is the standard band for the level. Do you have another offer?",
      move: "Know your alternatives",
      why: "Your leverage comes from what you'd do if this falls through. Work that out before you ask, so the question doesn't rattle you.",
    },
    boss: {
      you: "I don't think this deadline is realistic.",
      them: "The client already has the date. So what are you proposing?",
      move: "Understand the other side",
      why: "Your boss has a problem too. Find out what they can't move, then bring a plan that works inside it.",
    },
    deal: {
      you: "We can do 10% off if you sign this week.",
      them: "Your competitor is at 20%. Why would I sign at all?",
      move: "Bargain with intent",
      why: "Don't drop your price on reflex. Trade each concession for something you want, and make it clear what you're getting in return.",
    },
    repair: {
      you: "Can we talk about what happened?",
      them: "Honestly, I thought you didn't care. You never called.",
      move: "Understand the other side",
      why: "Your first instinct is to defend yourself. Learn to find out what they actually experienced before you explain your side.",
    },
    debate: {
      you: "I think we should kill this feature.",
      them: "Two customers asked for it yesterday. Where's your data?",
      move: "Understand the other side",
      why: "People don't change their minds because you out-argued them. Start from what they care about and build your case from there.",
    },
  };

  const chips = document.querySelectorAll(".chip");
  const sceneEl = (k) => document.querySelector(`[data-scene-${k}]`);
  let currentScene = "raise";

  function showScene(key) {
    const s = SCENES[key];
    currentScene = key;
    sceneEl("you").textContent = s.you;
    sceneEl("them").textContent = s.them;
    sceneEl("move").textContent = s.move;
    sceneEl("why").textContent = s.why;
    chips.forEach((c) => {
      const on = c.dataset.scene === key;
      c.classList.toggle("on", on);
      c.setAttribute("aria-selected", String(on));
    });
  }
  chips.forEach((c) => c.addEventListener("click", () => showScene(c.dataset.scene)));
  sceneEl("cta").addEventListener("click", () => setRadio("conversation", currentScene));
  showScene("raise");

  // ---- Masking toggles ----
  const tile = document.querySelector("[data-tile]");
  const tileStatus = document.querySelector("[data-tile-status]");
  const maskVideo = document.querySelector('[data-mask="video"]');
  const maskVoice = document.querySelector('[data-mask="voice"]');
  function updateTile() {
    tile.classList.toggle("hide-video", maskVideo.checked);
    tile.classList.toggle("mask-voice", maskVoice.checked);
    const see = maskVideo.checked ? "an avatar" : "you";
    const hear = maskVoice.checked ? "a masked voice" : "your voice";
    tileStatus.textContent = `Your partner sees ${see} and hears ${hear}.`;
  }
  maskVideo.addEventListener("change", updateTile);
  maskVoice.addEventListener("change", updateTile);

  // ---- Hero spar clock ----
  const clock = document.querySelector("[data-clock]");
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
    let secs = 161;
    setInterval(() => {
      secs = secs > 0 ? secs - 1 : 180;
      clock.textContent = `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;
    }, 1000);
  }

  // ---- Pricing buttons preselect the plan ----
  document.querySelectorAll("[data-plan]").forEach((btn) =>
    btn.addEventListener("click", () => {
      setRadio("plan", btn.dataset.plan);
      setTimeout(() => mainForm.email.focus({ preventScroll: true }), 500);
    })
  );

  // ---- Main form ----
  mainForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = mainForm.querySelector(".form-msg");
    const btn = mainForm.querySelector('button[type="submit"]');
    const data = Object.fromEntries(new FormData(mainForm));
    msg.className = "form-msg";
    if (!validEmail((data.email || "").trim())) {
      msg.textContent = "Please enter a valid email.";
      msg.classList.add("err");
      mainForm.email.focus();
      return;
    }
    btn.disabled = true;
    msg.textContent = "Saving your spot…";
    try {
      await submit({ ...data, step: "full" });
      joinCard.classList.add("done");
      const thanks = document.createElement("div");
      thanks.className = "thanks";
      thanks.setAttribute("role", "status");
      thanks.innerHTML = `<span class="hand">see you in the ring</span>
        <h2>You're in.</h2>
        <p>We'll email you when the first cohort opens. In the meantime, try a practice round.</p>
        <a class="btn" href="/demo">Try the demo spar →</a>`;
      joinCard.appendChild(thanks);
    } catch (err) {
      msg.textContent = err.message;
      msg.classList.add("err");
    } finally {
      btn.disabled = false;
    }
  });
})();
