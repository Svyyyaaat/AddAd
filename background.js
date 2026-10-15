// Works as a Firefox event page and as a Chrome MV3 service worker.
globalThis.browser ??= globalThis.chrome;

browser.runtime.onInstalled.addListener(() => {
  // Firefox MV3 treats host permissions as opt-in. If they're missing,
  // open the settings page right away so the user sees the allow prompt
  // without having to find the toolbar button. Chrome grants them at
  // install, so this never fires there.
  browser.permissions.contains({ origins: ["*://*/*"] }).then((granted) => {
    if (!granted) browser.runtime.openOptionsPage();
  }).catch(() => {});

  browser.storage.local.get(["websites", "whitelist", "intensity", "reloadMinutes", "redirectURL", "pingPongCount"]).then((data) => {
    const defaults = {};
    if (!data.websites) defaults.websites = [];
    if (!data.whitelist) defaults.whitelist = [];
    if (!data.intensity) defaults.intensity = 40;
    if (!data.reloadMinutes) defaults.reloadMinutes = 5;
    if (!data.redirectURL) defaults.redirectURL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    if (!data.pingPongCount) defaults.pingPongCount = 1;
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
