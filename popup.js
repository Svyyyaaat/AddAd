// Firefox has `browser`, Chrome only has `chrome` (promise-based in MV3)
globalThis.browser ??= globalThis.chrome;

const statusEl = document.getElementById("popup-status");

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
