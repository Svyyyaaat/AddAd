// Works as a Firefox event page and as a Chrome MV3 service worker.
globalThis.browser ??= globalThis.chrome;

const LEGACY_INTENSITY = { low: 15, medium: 40, chaos: 75 };

// Storage keys from removed features (Anki unlock), cleaned up on update
const OBSOLETE_KEYS = ["ankiEnabled", "ankiURL", "ankiSelectedDecks", "ankiUnlockSites", "ankiDecksCache"];

browser.runtime.onInstalled.addListener(() => {
  browser.storage.local.remove(OBSOLETE_KEYS);

  browser.storage.local.get(["websites", "intensity", "reloadMinutes", "redirectURL"]).then((data) => {
    const defaults = {};
    if (!data.websites) defaults.websites = [];
    if (!data.intensity) {
      defaults.intensity = 40;
    } else if (typeof data.intensity === "string") {
      // Migrate pre-slider low/medium/chaos values
      defaults.intensity = LEGACY_INTENSITY[data.intensity] || 40;
    }
    if (!data.reloadMinutes) defaults.reloadMinutes = 5;
    if (!data.redirectURL) defaults.redirectURL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    if (Object.keys(defaults).length > 0) {
      browser.storage.local.set(defaults);
    }
  });
});

// ===================== RECENT SITE TRACKING =====================
// Content scripts on targeted sites ping while the page is open, so the
// options page knows which sites are open now or were open moments ago
// (used by the dodging Remove button).
const RECENT_PRUNE_MS = 10 * 60 * 1000;

async function recordSiteSeen(hostname) {
  const data = await browser.storage.local.get("recentSites");
  const recentSites = data.recentSites || {};
  const now = Date.now();
  recentSites[hostname] = now;
  for (const host of Object.keys(recentSites)) {
    if (now - recentSites[host] > RECENT_PRUNE_MS) delete recentSites[host];
  }
  browser.storage.local.set({ recentSites });
}

browser.runtime.onMessage.addListener((msg) => {
  if (msg.type === "siteSeen") {
    recordSiteSeen(msg.hostname);
  }
});
