(() => {
  "use strict";

  // Firefox has `browser`, Chrome only has `chrome` (promise-based in MV3)
  const browser = globalThis.browser ?? globalThis.chrome;

  // ===================== AD COPY =====================
  const AD_TEXTS = [
    "INSURANCE FOR YOUR INSURANCE!!! Because what if your insurance fails? Who insures THAT?!",
    "TIRED OF ADS? TIRED OF ADS? TIRED OF ADS? Well maybe you should BUY OUR SUBSCRIPTION then??",
    "Please buy our subscription PLEAWSSE PLEASE PLASE PLASE we're BEGGING you",
    "HOT SINGLES IN YOUR AREA want to tell you about our LORD AND SAVIOR: this amazing vacuum cleaner",
    "YOU ARE THE 1,000,000th VISITOR!!! Click here to claim your mass-produced plastic trophy!!!",
    "DOCTORS HATE HIM! Local man discovers that drinking water keeps you hydrated. Revolutionary.",
    "LOSE 50 POUNDS IN 5 MINUTES with this one weird trick (it's called taking off your backpack)",
    "FREE IPAD!! Just pay $9999.99 shipping and handling and your firstborn child",
    "MAKE $9,000,000 PER DAY working from home!! All you need is a small loan of $9,000,001",
    "WARNING: Your computer has 47 viruses!!! Also 3 of them are lonely and want to chat",
    "CONGRATULATIONS! You've been selected to read this ad. That's it. That's the prize.",
    "Learn THIS ONE LANGUAGE that EVERYBODY is talking about! It's English. It was English the whole time.",
    "EXTEND YOUR CAR'S WARRANTY... to the MOON. Literally. Our warranty covers lunar road trips.",
    "HAVE YOU TRIED TURNING IT OFF AND ON AGAIN? Our product does that! For only $299.99/month!",
    "REVOLUTIONARY AI will write your emails, do your taxes, walk your dog, and eventually replace you",
    "BUY OUR MATTRESS!! You spend 1/3 of your life sleeping. Spend the other 2/3 paying for our mattress.",
    "CLICK HERE FOR FREE MONEY!!! And by free we mean it'll cost you money. And by money we mean money.",
    "THIS AD IS LOADING... just kidding, this IS the ad. Gotcha. Now buy our product.",
    "WE NOTICED YOU HAVE AN AD BLOCKER. That's cool. This isn't an ad. It's a CONVERSATION.",
    "AI-POWERED JUICER! AI MAKES the pefect JUICE from your VEGETABLES!",
    "NEW: PREMIUM AIR subscription! Breathe ad-free air for only $49.99/month! Cancel anytime (you won't).",
    "YOUR NEIGHBOR BOUGHT THIS AND NOW THEY'RE BETTER THAN YOU. Don't let them win.",
    "STOP SCROLLING!! Actually no, keep scrolling. We get paid per scroll. Thank you for your service.",
    "OUR PRODUCT HAS 5 STARS! We wrote all the reviews ourselves but still, technically 5 stars!",
    "HAVE YOU CONSIDERED BUYING SOMETHING YOU DON'T NEED? Because we have PLENTY of that.",
    "THIS IS AN AD. WE KNOW YOU KNOW. YOU KNOW WE KNOW YOU KNOW. Let's just acknowledge it and move on. Buy stuff.",
    "GRANDMA'S SECRET RECIPE: 1 cup flour, 2 cups sugar, and a LINK TO OUR ONLINE STORE",
    "NEW SUPERFOOD: It's just regular food but we put it in a fancy bag. $47/bag. Organic.",
    "YOU LOOK TIRED. You should buy our energy drink. It's basically battery acid with sugar.",
    "DO YOU WANT ADS? NO? WELL TOO BAD! HERE'S ANOTHER ONE ABOUT BUYING A BOAT!",
    "IMPORTANT NOTIFICATION: This is not actually important. We just wanted your attention. Hi.",
    "FUN FACT: If you click this ad, absolutely nothing good will happen. But you're curious now, aren't you?",
    "OUR LAWYERS SAID WE CAN'T SAY THIS CURES ANYTHING. So we'll just say it's... really really great.",
    "ALERT: You have been breathing FOR FREE this whole time! Subscribe to Premium Oxygen today!",
    "THIS SALE ENDS IN 5 MINUTES!!! (It has been ending in 5 minutes since 2019)",
    "WANT TO LOOK 10 YEARS YOUNGER? Try our cream! Results may vary. By vary we mean not happen.",
    "NEW APP: It does what your phone already does, but WORSE and with MORE ADS! Download now!",
    "WE SPENT MORE ON THIS AD THAN ON THE ACTUAL PRODUCT. Priorities.",
    "LEARN GUITAR IN 30 DAYS! (Day 1: Buy our $2000 guitar. Days 2-30: We don't care anymore, we got paid.)",
    "YOUR DATA IS VERY IMPORTANT TO US. That's why we sell it to everyone. You're welcome.",
    "SUBSCRIBE TO OUR NEWSLETTER! We'll email you 47 times a day about things you never asked about!",
    "THIS AD WAS MADE WITH LOVE. And by love we mean a marketing budget. A very large marketing budget.",
  ];

  // ===================== GLOBALS =====================
  let settings = {
    intensity: 40, // 1-200
    reloadMinutes: 5,
    redirectURL: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    pingPong: true,
    pingPongCount: 1,
    whitelist: [],
  };
  const NUM_STYLES = 8;
  let injectedAds = [];
  let countdownIntervals = [];
  let bounceRAFs = [];
  let lastURL = location.href;
  let reloadTimer = null;

  function normalizeIntensity(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 40;
    return Math.max(1, Math.min(200, Math.round(n)));
  }

  function normalizeCount(value, fallback, max) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(0, Math.min(max, Math.round(n)));
  }

  function normalizeMinutes(value) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return 5;
    return Math.max(1, Math.min(120, Math.round(n)));
  }

  // ===================== HELPERS =====================
  function rand(min, max) {
    if (max < min) max = min;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function pick(arr) {
    return arr[rand(0, arr.length - 1)];
  }

  function shuffled(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = rand(0, i);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ===================== GLOBAL EVENT INTERCEPT =====================
  // Capture clicks at the window level (first in the capture chain, before any
  // site-level capturing listeners on React roots, YouTube containers, etc.)
  // so page elements never see clicks that land on our ads.
  for (const evt of ["click", "mousedown", "pointerdown"]) {
    window.addEventListener(evt, (e) => {
      const ad = e.target.closest(".addad-banner");
      if (!ad) return;

      e.stopImmediatePropagation();
      e.stopPropagation();
      e.preventDefault();

      // Only act on the click event (mousedown/pointerdown are just blocked)
      if (evt !== "click") return;

      if (e.target.closest(".addad-close")) {
        ad.remove();
      } else {
        window.open(settings.redirectURL, "_blank");
      }
    }, true);
  }

  // ===================== CLOSE BUTTON =====================
  function createCloseButton(hasCountdown) {
    const side = Math.random() < 0.5 ? "left" : "right";
    const size = rand(10, 18);

    if (hasCountdown) {
      const seconds = rand(5, 15);
      return createCountdownClose(side, size, seconds);
    }

    const btn = document.createElement("button");
    btn.className = `addad-close addad-close-${side}`;
    btn.textContent = "\u00D7";
    btn.style.width = size + "px";
    btn.style.height = size + "px";
    btn.style.fontSize = Math.max(size - 4, 8) + "px";
    return btn;
  }

  function createCountdownClose(side, size, seconds) {
    const wrap = document.createElement("div");
    wrap.className = `addad-countdown-wrap addad-close-${side}`;

    const svgSize = size + 10;
    const r = (svgSize - 4) / 2;
    const circumference = 2 * Math.PI * r;
    const dashPercent = circumference;

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "addad-countdown-svg");
    svg.setAttribute("width", svgSize);
    svg.setAttribute("height", svgSize);
    svg.setAttribute("viewBox", `0 0 ${svgSize} ${svgSize}`);

    const track = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    track.setAttribute("class", "addad-countdown-track");
    track.setAttribute("cx", svgSize / 2);
    track.setAttribute("cy", svgSize / 2);
    track.setAttribute("r", r);

    const progress = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    progress.setAttribute("class", "addad-countdown-progress");
    progress.setAttribute("cx", svgSize / 2);
    progress.setAttribute("cy", svgSize / 2);
    progress.setAttribute("r", r);
    progress.style.strokeDasharray = dashPercent;
    progress.style.strokeDashoffset = dashPercent;
    progress.style.transition = `stroke-dashoffset ${seconds}s linear`;

    svg.appendChild(track);
    svg.appendChild(progress);

    const timerText = document.createElement("span");
    timerText.className = "addad-countdown-text";
    timerText.textContent = seconds;

    wrap.style.width = svgSize + "px";
    wrap.style.height = svgSize + "px";
    wrap.style.position = "absolute";
    wrap.appendChild(svg);
    wrap.appendChild(timerText);

    // Start animation after append
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        progress.style.strokeDashoffset = "0";
      });
    });

    let remaining = seconds;
    const interval = setInterval(() => {
      remaining--;
      timerText.textContent = remaining;
      if (remaining <= 0) {
        clearInterval(interval);
        const btn = document.createElement("button");
        btn.className = `addad-close addad-close-${side}`;
        btn.textContent = "\u00D7";
        btn.style.width = size + "px";
        btn.style.height = size + "px";
        btn.style.fontSize = Math.max(size - 4, 8) + "px";
        wrap.replaceWith(btn);
      }
    }, 1000);
    countdownIntervals.push(interval);

    return wrap;
  }

  // ===================== AD CREATION =====================
  function createAd(text, type) {
    const ad = document.createElement("div");
    const styleIdx = rand(0, NUM_STYLES - 1);
    ad.className = `addad-banner addad-style-${styleIdx}`;

    if (type === "floating") ad.classList.add("addad-floating");
    if (type === "bouncing") ad.classList.add("addad-bouncing");

    const span = document.createElement("span");
    span.textContent = text;
    ad.appendChild(span);

    // Close button: ~40% get countdown
    const hasCountdown = Math.random() < 0.4;
    const closeBtn = createCloseButton(hasCountdown);
    ad.appendChild(closeBtn);

    return ad;
  }

  // ===================== INLINE INJECTION =====================
  const INLINE_SELECTORS = [
    // Standard content
    "p", "article", "section", "blockquote", "pre", "figure", "figcaption",
    // Headings
    "h1", "h2", "h3", "h4",
    // Lists and tables
    "li", "tr", "dt", "dd",
    // Common class patterns for posts/cards/items/threads
    "[class*='post']", "[class*='Post']",
    "[class*='card']", "[class*='Card']",
    "[class*='item']", "[class*='Item']",
    "[class*='thread']", "[class*='Thread']",
    "[class*='comment']", "[class*='Comment']",
    "[class*='entry']", "[class*='Entry']",
    "[class*='feed']", "[class*='Feed']",
    "[class*='pin']", "[class*='Pin']",
    "[class*='tile']", "[class*='Tile']",
    "[class*='grid'] > *",
    "[class*='Grid'] > *",
    "[class*='list'] > *",
    "[class*='List'] > *",
    // Role-based
    "[role='article']", "[role='listitem']", "[role='row']",
  ].join(", ");

  const MAX_CANDIDATES = 200;

  // An inline ad is only allowed to stay if its close button is actually
  // reachable: not squeezed into a tiny grid cell, not hanging outside the
  // page horizontally, and not clipped away by an overflow:hidden ancestor
  // (card containers, carousels, rounded-corner wrappers, etc.).
  function intersectRects(a, b) {
    const left = Math.max(a.left, b.left);
    const top = Math.max(a.top, b.top);
    const right = Math.min(a.right, b.right);
    const bottom = Math.min(a.bottom, b.bottom);
    if (right <= left || bottom <= top) return null;
    return { left, top, right, bottom };
  }

  function adIsUsable(ad) {
    const rect = ad.getBoundingClientRect();

    // Squeezed into a sliver (narrow grid/flex cell) — close button overlaps text
    if (rect.width < 120 || rect.height < 30) return false;

    // Hanging outside the page horizontally
    const pageWidth = document.documentElement.clientWidth || window.innerWidth;
    if (rect.left < -2 || rect.right > pageWidth + 2) return false;

    // Walk up and clip against every ancestor that hides overflow
    let visible = rect;
    for (let el = ad.parentElement; el && el !== document.body; el = el.parentElement) {
      const style = getComputedStyle(el);
      const overflow = style.overflow + style.overflowX + style.overflowY;
      if (!/(hidden|clip|scroll|auto)/.test(overflow)) continue;
      visible = intersectRects(visible, el.getBoundingClientRect());
      if (!visible) return false;
    }

    // The close button (or its countdown placeholder) must sit fully inside
    // the visible region, otherwise the ad can never be dismissed.
    const btn = ad.querySelector(".addad-close, .addad-countdown-wrap");
    if (!btn) return false;
    const b = btn.getBoundingClientRect();
    return (
      b.left >= visible.left - 1 &&
      b.right <= visible.right + 1 &&
      b.top >= visible.top - 1 &&
      b.bottom <= visible.bottom + 1
    );
  }

  function injectInlineAds(count) {
    const targets = document.querySelectorAll(INLINE_SELECTORS);

    if (targets.length === 0) return;

    // Cap candidates to avoid expensive getBoundingClientRect on huge DOMs
    let candidates;
    if (targets.length <= MAX_CANDIDATES) {
      candidates = [...targets];
    } else {
      const indices = shuffled([...Array(targets.length).keys()]).slice(0, MAX_CANDIDATES);
      candidates = indices.map((i) => targets[i]);
    }

    const viable = candidates.filter((el) => {
      const rect = el.getBoundingClientRect();
      return rect.height > 20 && rect.width > 50;
    });

    if (viable.length === 0) return;

    const positions = shuffled([...Array(viable.length).keys()]).slice(0, count);
    const texts = shuffled(AD_TEXTS);

    positions.forEach((pos, i) => {
      const target = viable[pos];
      if (!target || !target.parentNode) return;
      // Skip if we already injected an ad next to this element
      if (target.previousElementSibling?.classList?.contains("addad-banner")) return;
      if (target.nextElementSibling?.classList?.contains("addad-banner")) return;
      const ad = createAd(texts[i % texts.length], "inline");
      target.parentNode.insertBefore(ad, target.nextSibling);

      // Bail out of spots where the close button would be clipped or offscreen
      if (!adIsUsable(ad)) {
        ad.remove();
        return;
      }

      injectedAds.push(ad);
    });
  }

  // ===================== FLOATING ADS =====================
  function injectFloatingAds(count) {
    const texts = shuffled(AD_TEXTS);
    for (let i = 0; i < count; i++) {
      const ad = createAd(texts[i % texts.length], "floating");
      ad.style.top = rand(5, 70) + "vh";
      ad.style.left = rand(2, 50) + "vw";
      document.body.appendChild(ad);

      // Clamp into the viewport so the close button is always reachable
      // (small screens especially: left:50vw + a 340px banner overflows)
      const r = ad.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      if (r.right > vw - 6) ad.style.left = Math.max(6, vw - r.width - 6) + "px";
      if (r.left < 6) ad.style.left = "6px";
      if (r.bottom > vh - 6) ad.style.top = Math.max(6, vh - r.height - 6) + "px";

      injectedAds.push(ad);
    }
  }

  // ===================== BOUNCING ADS =====================
  function injectBouncingAd() {
    const ad = createAd(pick(AD_TEXTS), "bouncing");
    document.body.appendChild(ad);
    injectedAds.push(ad);

    const slot = bounceRAFs.length;
    bounceRAFs.push(null);

    const adW = ad.offsetWidth || 280;
    const adH = ad.offsetHeight || 80;
    let x = rand(0, Math.max(0, window.innerWidth - adW));
    let y = rand(0, Math.max(0, window.innerHeight - adH));
    let dx = (Math.random() < 0.5 ? 1 : -1) * (1.5 + Math.random() * 2);
    let dy = (Math.random() < 0.5 ? 1 : -1) * (1.5 + Math.random() * 2);

    function animate() {
      if (!document.body.contains(ad)) {
        bounceRAFs[slot] = null;
        return;
      }

      x += dx;
      y += dy;

      const w = ad.offsetWidth || 280;
      const h = ad.offsetHeight || 80;

      if (x <= 0 || x + w >= window.innerWidth) {
        dx = -dx;
        x = Math.max(0, Math.min(x, window.innerWidth - w));
      }
      if (y <= 0 || y + h >= window.innerHeight) {
        dy = -dy;
        y = Math.max(0, Math.min(y, window.innerHeight - h));
      }

      ad.style.left = x + "px";
      ad.style.top = y + "px";

      bounceRAFs[slot] = requestAnimationFrame(animate);
    }

    bounceRAFs[slot] = requestAnimationFrame(animate);
  }

  // ===================== CLEANUP =====================
  function removeAllAds() {
    for (const ad of injectedAds) {
      if (ad && ad.parentNode) ad.remove();
    }
    injectedAds = [];
    for (const id of countdownIntervals) clearInterval(id);
    countdownIntervals = [];
    for (const raf of bounceRAFs) {
      if (raf) cancelAnimationFrame(raf);
    }
    bounceRAFs = [];
  }

  // ===================== DOMAIN MATCHING =====================
  function domainMatches(hostname, pattern) {
    if (pattern.startsWith("*.")) {
      const base = pattern.slice(2);
      return hostname === base || hostname.endsWith("." + base);
    }
    return hostname === pattern || hostname === "www." + pattern || "www." + hostname === pattern;
  }

  // ===================== WHITELIST =====================
  // Entries can be a bare domain ("example.com"), a subdomain, or include a
  // path prefix ("www.instagram.com/direct/inbox") — those pages never get
  // ads even when the site itself is targeted.
  function whitelistMatches(entry) {
    const slash = entry.indexOf("/");
    const entryHost = slash === -1 ? entry : entry.slice(0, slash);
    const entryPath = slash === -1 ? "" : entry.slice(slash).replace(/\/+$/, "");

    if (!domainMatches(location.hostname, entryHost)) return false;
    if (!entryPath) return true;

    const path = location.pathname.replace(/\/+$/, "");
    return path === entryPath || path.startsWith(entryPath + "/");
  }

  function isWhitelisted() {
    return settings.whitelist.some(whitelistMatches);
  }

  // ===================== PRESENCE HEARTBEAT =====================
  // Ping the background script while a targeted page is open, so the
  // options page knows this site is (or recently was) open.
  function startPresenceHeartbeat(hostname) {
    const ping = () => {
      browser.runtime.sendMessage({ type: "siteSeen", hostname }).catch(() => {});
    };
    ping();
    setInterval(ping, 60 * 1000);
  }

  // ===================== INJECTION LOGIC =====================
  // Continuous scale anchored so Low(15)/Medium(40)/CHAOS(75) roughly match
  // the old presets, with headroom up to 200 for the point of NO RETURN.
  function countsForIntensity(i) {
    const inlineMin = Math.max(1, Math.round(i * 0.16));
    const inlineMax = Math.max(inlineMin, Math.round(i * 0.26));
    const floatMin = Math.max(1, Math.round(i * 0.08));
    const floatMax = Math.max(floatMin, Math.round(i * 0.14));
    return {
      inline: rand(inlineMin, inlineMax),
      floating: rand(floatMin, floatMax),
      bounceChance: Math.min(1, i / 75),
    };
  }

  function injectAll() {
    removeAllAds();
    if (isWhitelisted()) return;

    const counts = countsForIntensity(settings.intensity);
    injectInlineAds(counts.inline);
    injectFloatingAds(counts.floating);
    if (settings.pingPong) {
      for (let i = 0; i < settings.pingPongCount; i++) {
        if (Math.random() < counts.bounceChance) injectBouncingAd();
      }
    }
  }

  // ===================== PERIODIC RELOAD =====================
  function startReloadTimer() {
    if (reloadTimer) clearInterval(reloadTimer);
    reloadTimer = setInterval(refreshAds, settings.reloadMinutes * 60 * 1000);
  }

  function refreshAds() {
    // injectAll() removes the previous batch first, so ads never accumulate
    injectAll();
  }

  // ===================== SPA NAVIGATION DETECTION =====================
  function startURLWatcher() {
    // Detect SPA navigations (pushState/replaceState/popstate)
    const origPushState = history.pushState;
    const origReplaceState = history.replaceState;

    history.pushState = function () {
      origPushState.apply(this, arguments);
      onURLChange();
    };

    history.replaceState = function () {
      origReplaceState.apply(this, arguments);
      onURLChange();
    };

    window.addEventListener("popstate", () => onURLChange());

    // Also poll as a fallback (some SPAs use hash or other tricks)
    setInterval(() => {
      if (location.href !== lastURL) {
        onURLChange();
      }
    }, 1000);
  }

  function onURLChange() {
    if (location.href === lastURL) return;
    lastURL = location.href;

    // Small delay to let SPA render new content, then restart the reload
    // clock so the navigation bump and the periodic bump don't stack up
    setTimeout(() => {
      injectAll();
      startReloadTimer();
    }, 800);
  }

  // ===================== MAIN =====================
  function init() {
    if (/^(moz|chrome)-extension:$/.test(window.location.protocol)) return;

    browser.storage.local.get([
      "websites", "whitelist", "siteSettings", "intensity", "reloadMinutes", "redirectURL",
      "pingPong", "pingPongCount",
    ]).then((data) => {
      const websites = data.websites || [];
      if (websites.length === 0) return;

      const hostname = window.location.hostname;
      const matchedPattern = websites.find((pattern) => domainMatches(hostname, pattern));
      if (!matchedPattern) return;

      startPresenceHeartbeat(hostname);

      settings.intensity = normalizeIntensity(data.intensity);
      settings.reloadMinutes = normalizeMinutes(data.reloadMinutes);
      settings.redirectURL = data.redirectURL || "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
      settings.pingPong = data.pingPong !== false; // default true
      settings.pingPongCount = normalizeCount(data.pingPongCount, 1, 10);
      settings.whitelist = data.whitelist || [];

      // Per-site override
      const siteConf = (data.siteSettings || {})[matchedPattern];
      if (siteConf && siteConf.customIntensity) {
        settings.intensity = normalizeIntensity(siteConf.intensity);
        settings.reloadMinutes = normalizeMinutes(siteConf.reloadMinutes);
      }

      injectAll();
      startReloadTimer();
      startURLWatcher();
    });
  }

  init();
})();
