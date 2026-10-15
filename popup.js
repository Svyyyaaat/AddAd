// Firefox has `browser`, Chrome only has `chrome` (promise-based in MV3)
globalThis.browser ??= globalThis.chrome;

browser.storage.local.get("theme").then(({ theme }) => {
  if (theme === "light" || theme === "dark") {
    document.documentElement.dataset.theme = theme;
  }
});

const statusEl = document.getElementById("popup-status");
const grantBtn = document.getElementById("grant-btn");
// Request <all_urls> but check the http/https wildcard — contains() does
// pattern-subset matching and the broad check can miss narrower grants.
const REQUEST_ORIGINS = { origins: ["<all_urls>"] };
const CHECK_ORIGINS = { origins: ["*://*/*"] };

// Firefox MV3: host permissions are opt-in — offer the grant where
// the user will actually see it. Chrome grants at install; never shows.
browser.permissions?.contains(CHECK_ORIGINS).then((granted) => {
  grantBtn.hidden = granted;
}).catch(() => {});

grantBtn.addEventListener("click", async () => {
  const granted = await browser.permissions.request(REQUEST_ORIGINS);
  if (!granted) return;
  grantBtn.hidden = true;
  // Reload the current tab so ads kick in right away
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (tab && /^https?:/.test(tab.url || "")) browser.tabs.reload(tab.id);
  statusEl.textContent = "All set. Enjoy the ads.";
});

document.getElementById("settings-btn").addEventListener("click", () => {
  browser.runtime.openOptionsPage();
  window.close();
});

document.getElementById("destroy-btn").addEventListener("click", async () => {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  const url = tab && tab.url ? tab.url : "";

  if (!/^https?:/.test(url)) {
    statusEl.textContent = "Nothing to destroy here.";
    return;
  }

  const hostname = new URL(url).hostname.replace(/^www\./, "");
  const { websites = [] } = await browser.storage.local.get("websites");

  if (websites.includes(hostname)) {
    statusEl.textContent = hostname + " is already doomed.";
    return;
  }

  websites.push(hostname);
  await browser.storage.local.set({ websites });
  browser.tabs.reload(tab.id);
  window.close();
});
