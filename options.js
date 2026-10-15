// Firefox has `browser`, Chrome only has `chrome` (promise-based in MV3)
globalThis.browser ??= globalThis.chrome;

const websiteInput = document.getElementById("website-input");
const addBtn = document.getElementById("add-btn");
const websiteList = document.getElementById("website-list");
const emptyMsg = document.getElementById("empty-msg");
const redirectInput = document.getElementById("redirect-input");
const saveRedirectBtn = document.getElementById("save-redirect-btn");
const redirectSaved = document.getElementById("redirect-saved");
const pingpongToggle = document.getElementById("pingpong-toggle");
const intensitySlider = document.getElementById("intensity-slider");
const intensityValue = document.getElementById("intensity-value");
const reloadInput = document.getElementById("reload-input");
const pingpongCountInput = document.getElementById("pingpong-count");
const whitelistInput = document.getElementById("whitelist-input");
const whitelistAddBtn = document.getElementById("whitelist-add-btn");
const whitelistList = document.getElementById("whitelist-list");
const whitelistEmpty = document.getElementById("whitelist-empty");

function normalizeIntensity(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 40;
  return Math.max(1, Math.min(200, Math.round(n)));
}

function normalizePingPongCount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(10, Math.round(n)));
}

function domainMatches(hostname, pattern) {
  if (pattern.startsWith("*.")) {
    const base = pattern.slice(2);
    return hostname === base || hostname.endsWith("." + base);
  }
  return hostname === pattern || hostname === "www." + pattern || "www." + hostname === pattern;
}

function normalizeMinutes(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 5;
  return Math.max(1, Math.min(120, Math.round(n)));
}

let websites = [];
let whitelist = [];
let siteSettings = {}; // { [pattern]: { customIntensity, intensity, reloadMinutes } }

// ===================== THEME =====================
const themeButtons = document.querySelectorAll(".theme-btn");

function applyTheme(theme) {
  if (theme === "light" || theme === "dark") {
    document.documentElement.dataset.theme = theme;
  } else {
    theme = "auto";
    delete document.documentElement.dataset.theme;
  }
  themeButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.themeChoice === theme);
  });
}

themeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const theme = btn.dataset.themeChoice;
    browser.storage.local.set({ theme });
    applyTheme(theme);
  });
});

// ===================== THE DODGING REMOVE BUTTON =====================
// If the site is open right now (or was in the last few minutes), the Remove
// button plays hard to get: it jumps away and demands extra clicks.
const RECENT_WINDOW_MS = 5 * 60 * 1000;
const INITIAL_DODGES = 5;
const dodgesLeft = new Map(); // pattern -> clicks still needed

async function siteIsProtected(pattern) {
  const { recentSites = {} } = await browser.storage.local.get("recentSites");
  const now = Date.now();
  return Object.entries(recentSites).some(
    ([host, ts]) => now - ts < RECENT_WINDOW_MS && domainMatches(host, pattern)
  );
}

function dodge(btn, row) {
  row.style.position = "relative";
  btn.style.position = "absolute";
  btn.style.top = "50%";
  btn.style.transform = "translateY(-50%)";
  btn.style.zIndex = "5";
  const maxLeft = Math.max(0, row.clientWidth - btn.offsetWidth);
  btn.style.left = Math.floor(Math.random() * maxLeft) + "px";
}

let toastEl = null;
let toastTimer = null;
function showToast(text) {
  if (!toastEl) {
    toastEl = document.createElement("div");
    toastEl.className = "toast";
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = text;
  toastEl.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("visible"), 1800);
}

function saveWebsites() {
  browser.storage.local.set({ websites });
}

function saveSiteSettings() {
  browser.storage.local.set({ siteSettings });
}

function getSiteConf(site) {
  if (!siteSettings[site]) {
    siteSettings[site] = { customIntensity: false, intensity: 40, reloadMinutes: 5 };
  }
  return siteSettings[site];
}

// Builds the slider + orientation marks used both here and per-site
function buildIntensitySlider(initial, onChange) {
  const wrap = document.createElement("div");
  wrap.className = "slider-wrap";

  const row = document.createElement("div");
  row.className = "slider-row";

  const slider = document.createElement("input");
  slider.type = "range";
  slider.min = "1";
  slider.max = "200";
  slider.value = initial;

  const value = document.createElement("span");
  value.className = "slider-value";
  value.textContent = initial;

  slider.addEventListener("input", () => {
    value.textContent = slider.value;
  });
  slider.addEventListener("change", () => {
    onChange(Number(slider.value));
  });

  row.appendChild(slider);
  row.appendChild(value);
  wrap.appendChild(row);

  const marks = document.createElement("div");
  marks.className = "slider-marks";
  const MARKS = [
    ["Low", 15, ""],
    ["Medium", 40, ""],
    ["CHAOS", 75, " mark-chaos"],
    ["NO RETURN", 200, " mark-noreturn"],
  ];
  for (const [label, val, cls] of MARKS) {
    const mark = document.createElement("span");
    mark.className = "slider-mark" + cls;
    mark.textContent = label;
    mark.style.left = (val / 200) * 100 + "%";
    mark.addEventListener("click", () => {
      slider.value = val;
      value.textContent = val;
      onChange(val);
    });
    marks.appendChild(mark);
  }
  wrap.appendChild(marks);

  return wrap;
}

function renderList() {
  websiteList.innerHTML = "";
  emptyMsg.style.display = websites.length === 0 ? "block" : "none";

  websites.forEach((site, i) => {
    const conf = siteSettings[site];
    const li = document.createElement("li");
    li.className = "site-row";

    const main = document.createElement("div");
    main.className = "site-main";

    const name = document.createElement("span");
    name.className = "site-name";
    name.textContent = site;

    const customLabel = document.createElement("label");
    customLabel.className = "site-custom-toggle";
    const customCheck = document.createElement("input");
    customCheck.type = "checkbox";
    customCheck.checked = !!(conf && conf.customIntensity);
    customLabel.appendChild(customCheck);
    customLabel.appendChild(document.createTextNode(" Custom intensity"));

    const removeBtn = document.createElement("button");
    removeBtn.className = "remove-btn";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", async () => {
      if (await siteIsProtected(site)) {
        const left = dodgesLeft.has(site) ? dodgesLeft.get(site) : INITIAL_DODGES;
        if (left > 0) {
          dodgesLeft.set(site, left - 1);
          dodge(removeBtn, main);
          showToast(`Click ${left} time${left === 1 ? "" : "s"} more to delete`);
          return;
        }
      }
      dodgesLeft.delete(site);
      websites.splice(i, 1);
      delete siteSettings[site];
      saveWebsites();
      saveSiteSettings();
      renderList();
    });

    main.appendChild(name);
    main.appendChild(customLabel);
    main.appendChild(removeBtn);
    li.appendChild(main);

    const custom = document.createElement("div");
    custom.className = "site-custom";
    custom.style.display = customCheck.checked ? "block" : "none";

    function buildCustomControls() {
      custom.innerHTML = "";
      const c = getSiteConf(site);

      custom.appendChild(buildIntensitySlider(c.intensity, (v) => {
        getSiteConf(site).intensity = v;
        saveSiteSettings();
      }));

      const reloadRow = document.createElement("div");
      reloadRow.className = "reload-row site-reload-row";
      const reloadLabel = document.createElement("span");
      reloadLabel.textContent = "Ad reload timing";
      const reload = document.createElement("input");
      reload.type = "number";
      reload.min = "1";
      reload.max = "120";
      reload.value = c.reloadMinutes;
      reload.addEventListener("change", () => {
        const v = normalizeMinutes(reload.value);
        reload.value = v;
        getSiteConf(site).reloadMinutes = v;
        saveSiteSettings();
      });
      reloadRow.appendChild(reloadLabel);
      reloadRow.appendChild(reload);
      reloadRow.appendChild(document.createTextNode(" minutes"));
      custom.appendChild(reloadRow);
    }

    if (customCheck.checked) buildCustomControls();

    customCheck.addEventListener("change", () => {
      getSiteConf(site).customIntensity = customCheck.checked;
      saveSiteSettings();
      if (customCheck.checked) {
        buildCustomControls();
        custom.style.display = "block";
      } else {
        custom.style.display = "none";
      }
    });

    li.appendChild(custom);
    websiteList.appendChild(li);
  });
}

addBtn.addEventListener("click", () => {
  const val = websiteInput.value.trim();
  if (!val) return;
  const cleaned = val.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  if (cleaned && !websites.includes(cleaned)) {
    websites.push(cleaned);
    saveWebsites();
    renderList();
    websiteInput.value = "";
  }
});

websiteInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addBtn.click();
});

// ===================== WHITELIST =====================
// Entries may include a subdomain and a path, e.g. www.instagram.com/direct/inbox
function renderWhitelist() {
  whitelistList.innerHTML = "";
  whitelistEmpty.style.display = whitelist.length === 0 ? "block" : "none";

  whitelist.forEach((entry, i) => {
    const li = document.createElement("li");
    const main = document.createElement("div");
    main.className = "site-main";

    const name = document.createElement("span");
    name.className = "site-name";
    name.textContent = entry;

    const removeBtn = document.createElement("button");
    removeBtn.className = "remove-btn";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", () => {
      whitelist.splice(i, 1);
      browser.storage.local.set({ whitelist });
      renderWhitelist();
    });

    main.appendChild(name);
    main.appendChild(removeBtn);
    li.appendChild(main);
    whitelistList.appendChild(li);
  });
}

whitelistAddBtn.addEventListener("click", () => {
  const val = whitelistInput.value.trim();
  if (!val) return;
  const cleaned = val.replace(/^https?:\/\//, "").replace(/\/+$/, "").split(/[?#]/)[0];
  if (cleaned && !whitelist.includes(cleaned)) {
    whitelist.push(cleaned);
    browser.storage.local.set({ whitelist });
    renderWhitelist();
    whitelistInput.value = "";
  }
});

whitelistInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") whitelistAddBtn.click();
});

// ===================== GLOBAL INTENSITY / RELOAD =====================
intensitySlider.addEventListener("input", () => {
  intensityValue.textContent = intensitySlider.value;
});

intensitySlider.addEventListener("change", () => {
  browser.storage.local.set({ intensity: Number(intensitySlider.value) });
});

// Static (global) marks carry data-value; per-site marks are wired in buildIntensitySlider
document.querySelectorAll(".slider-mark[data-value]").forEach((mark) => {
  mark.addEventListener("click", () => {
    const v = Number(mark.dataset.value);
    intensitySlider.value = v;
    intensityValue.textContent = v;
    browser.storage.local.set({ intensity: v });
  });
});

reloadInput.addEventListener("change", () => {
  const v = normalizeMinutes(reloadInput.value);
  reloadInput.value = v;
  browser.storage.local.set({ reloadMinutes: v });
});

pingpongToggle.addEventListener("change", () => {
  browser.storage.local.set({ pingPong: pingpongToggle.checked });
});

pingpongCountInput.addEventListener("change", () => {
  const v = normalizePingPongCount(pingpongCountInput.value);
  pingpongCountInput.value = v;
  browser.storage.local.set({ pingPongCount: v });
});

// The count input sits inside the toggle's <label>; keep clicks on it from
// toggling the checkbox.
pingpongCountInput.addEventListener("click", (e) => e.preventDefault());

saveRedirectBtn.addEventListener("click", () => {
  const url = redirectInput.value.trim();
  if (url) {
    browser.storage.local.set({ redirectURL: url });
    redirectSaved.classList.add("visible");
    setTimeout(() => redirectSaved.classList.remove("visible"), 2000);
  }
});

// ===================== LOAD SAVED DATA =====================
browser.storage.local.get([
  "websites", "whitelist", "siteSettings", "intensity", "reloadMinutes", "redirectURL",
  "pingPong", "pingPongCount", "theme",
]).then((data) => {
  applyTheme(data.theme);
  websites = data.websites || [];
  whitelist = data.whitelist || [];
  siteSettings = data.siteSettings || {};
  renderList();
  renderWhitelist();

  const intensity = normalizeIntensity(data.intensity);
  intensitySlider.value = intensity;
  intensityValue.textContent = intensity;

  reloadInput.value = normalizeMinutes(data.reloadMinutes);

  if (data.redirectURL) {
    redirectInput.value = data.redirectURL;
  }

  pingpongToggle.checked = data.pingPong !== false; // default true
  pingpongCountInput.value = normalizePingPongCount(data.pingPongCount);
});
