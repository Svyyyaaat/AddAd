# AddAd

Make websites riddled with fake, humorous, ugly ads. On purpose.

AddAd is a browser extension that injects obnoxious, 2003-grade parody ads into
websites of your choosing. Garish banners, bouncing DVD-logo popups, countdown
close buttons, "HOT SINGLES" copy — the whole catalogue. Great for curing
doom-scrolling, pranking your own browser, or appreciating your ad blocker.

Every ad is generated locally. No tracking, no network calls, no real ads were
harmed in the making of this extension.

## Features

- **Pick your victims** — target specific domains (`example.com`, `*.reddit.com`)
- **Intensity slider** — from *Low* to *CHAOS* to *NO RETURN* (1–200 ads per page)
- **Per-site overrides** — give reddit the chaos it deserves while keeping your bank readable
- **Whitelist** — spare specific pages even on targeted sites, paths included (`www.instagram.com/direct/inbox`)
- **Three ad species** — inline banners wedged into the page, floating popups, and up to 10 bouncing ping-pong banners
- **Countdown close buttons** — some ads make you wait, for authenticity
- **Rickroll on click** — clicking an ad opens a configurable redirect URL
- **The dodging Remove button** — try to un-target a site you've visited recently. Try.
- **Light & dark themes** — auto (follows your OS), or forced light/dark
- Works on **Firefox** (desktop & Android) and **Chromium-based** browsers

## Install

### Firefox

1. Download the latest `.xpi` from releases, or build it yourself (below)
2. Or load temporarily: `about:debugging` → *This Firefox* → *Load Temporary Add-on* → pick `manifest.json`

### Chrome / Chromium / Edge

1. Open `chrome://extensions`, enable *Developer mode*
2. *Load unpacked* → select this folder

## Usage

1. Click the toolbar icon → **💥 Destroy this website** to target the current site, or open **⚙️ Settings**
2. Add domains, pick an intensity, and browse
3. Ads refresh on SPA navigation and on a timer you control

## Development

No build step — plain JS/CSS/HTML, Manifest V3.

```sh
# Run in a scratch Firefox profile
npx web-ext run

# Lint & package
npx web-ext lint
npx web-ext build
```

| File | Purpose |
| --- | --- |
| `content.js` / `content.css` | Ad generation & injection on target pages |
| `background.js` | Defaults, migrations, recent-site tracking |
| `options.html/js/css` | Settings page |
| `popup.html/js/css` | Toolbar popup |

## License

No license yet — all rights reserved for now.
