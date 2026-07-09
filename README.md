# PointSolutions Browser Poll Automation

A [userscript](https://en.wikipedia.org/wiki/Userscript) that automatically responds to
**PointSolutions / TurningPoint** audience-participation polls (the ones at **ttpoll.com**)
when you answer them **in a web browser** instead of the mobile app.

- **Multiple choice** — picks a random option and lets the page auto-submit it.
- **Short answer / open-ended** — types one of your configured answers, then clicks the
  little **pink arrow** submit button (retrying until it goes through).
- **Hotspot (click-on-image)** — best-effort click inside the image. These are rare and
  the script is deliberately cautious here (see [Limitations](#limitations)).

It shows a small status pill in the bottom-left corner so you always know what it's doing,
and it only responds **once per question**.

> ⚠️ **Use responsibly.** This automates graded/attendance participation. Understand your
> institution's academic-integrity policy before using it. You are responsible for how you
> use this.

---

## Table of contents

- [How it works](#how-it-works)
- [Which app do I need?](#which-app-do-i-need) (quick picker)
- [Install on Windows](#install-on-windows-chrome--edge--brave--firefox)
- [Install on macOS](#install-on-macos)
  - [Safari (recommended on Mac)](#macos--safari-recommended)
  - [Chrome / Brave / Edge / Firefox](#macos--chrome--brave--edge--firefox)
- [Install on iPad / iPhone](#install-on-ipad--iphone)
- [Confirming it works](#confirming-it-works)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)
- [DEBUG mode](#debug-mode)
- [Limitations](#limitations)

---

## How it works

The script runs on any page under `ttpoll.com`, `turningtechnologies.com`, or `echo360.com`.
Once per second it scans the page and decides what kind of question is showing, based on
what interactive elements are present. It acts on the **first** match in this priority order:

1. **Multiple choice** → clicks a random choice (the page submits it automatically).
2. **Short answer** → types an answer and presses the pink arrow.
3. **Hotspot image** → clicks a point inside the image.

If none of those are present, it assumes you're just looking at a slide and does nothing.
A per-question lock means it will never answer the same question twice; the lock releases
automatically when a new question appears.

The site is a single-page app, so the script keeps watching in the background the whole
time you're in a session — you don't reload anything between questions.

---

## Which app do I need?

You need a **userscript manager** — a browser extension/app that runs scripts like this one.
Which one depends on your device and browser:

| Device | Browser | Use this |
|---|---|---|
| **Windows** | Chrome, Edge, Brave, Firefox | **Tampermonkey** |
| **macOS** | Safari | **Userscripts** (recommended) or Tampermonkey |
| **macOS** | Chrome, Brave, Edge, Firefox | **Tampermonkey** |
| **iPad / iPhone** | Safari | **Userscripts** or **Stay** |
| **iPad / iPhone** | Chrome, Firefox, Brave, etc. | ❌ **Not possible** — see [note](#a-note-about-chromefirefox-on-ipadiphone) |

The script file to install is **`pointsolutions-poll-automation.user.js`**.

---

## Install on Windows (Chrome / Edge / Brave / Firefox)

**1. Install Tampermonkey**

- Chrome / Brave: [Chrome Web Store → Tampermonkey](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
- Edge: [Edge Add-ons → Tampermonkey](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)
- Firefox: [Firefox Add-ons → Tampermonkey](https://addons.mozilla.org/firefox/addon/tampermonkey/)

**2. Enable the userscript permission (Chrome / Edge / Brave only)**

Recent versions of Chrome/Edge/Brave require an extra toggle before Tampermonkey can run
scripts. Do **whichever** of these your version shows:

- Go to the extensions page (menu → **Extensions → Manage Extensions**, or type
  `chrome://extensions` / `edge://extensions` / `brave://extensions` in the address bar).
- **Newer versions:** click **Details** on Tampermonkey and turn on **“Allow user scripts.”**
- **Older versions:** turn on **“Developer mode”** (toggle in the top-right of the extensions page).

Firefox needs neither — it works out of the box.

**3. Add the script**

1. Click the **Tampermonkey icon** in the toolbar (pin it first if hidden: click the puzzle-piece
   icon → pin Tampermonkey).
2. Choose **“Create a new script…”** — this opens an editor with a template.
3. Select all the template text and delete it, then paste the **entire contents** of
   `pointsolutions-poll-automation.user.js`.
4. Save with **Ctrl + S** (or **File → Save**). The script now appears in your
   Tampermonkey dashboard, enabled.

   > 💡 *Alternative:* if you open the `.user.js` file's URL/path directly in the browser,
   > Tampermonkey usually offers a one-click **Install** page. Either method works.

**4. Confirm site access**

In the Tampermonkey dashboard, the script should be **Enabled** (green). Tampermonkey
automatically grants access to the sites listed in the script (`ttpoll.com`,
`turningtechnologies.com`, `echo360.com`). No extra site setting is normally needed.

Then jump to [Confirming it works](#confirming-it-works).

---

## Install on macOS

On a Mac you can use **Safari with the Userscripts app (recommended)** or any Chromium/Firefox
browser with **Tampermonkey**.

### macOS — Safari (recommended)

**1. Install the Userscripts app**

Install **[Userscripts](https://apps.apple.com/us/app/userscripts/id1463298887)** (by Quoid)
from the Mac App Store. It's free and open-source.

**2. Enable it in Safari and grant website access**

1. Open **Safari → Settings (⌘,) → Extensions**.
2. Check the box next to **Userscripts** to turn it on.
3. Still in that panel, set Userscripts' permission to **Allow** for the poll websites.
   The simplest reliable setting is **“Allow on Every Website.”** (You can restrict it to
   `ttpoll.com` etc. if you prefer, but allowing everywhere avoids missed-permission issues.)

**3. Point Userscripts at a folder**

1. Click the **Userscripts icon** in Safari's toolbar (or open the Userscripts app) and, when
   prompted, **choose a folder** where your scripts live (e.g. `Documents/Userscripts`).

**4. Add the script — IMPORTANT: import the file, don't paste**

> ⚠️ **Pasting the code into the Userscripts editor often fails** — the editor can mangle the
> formatting/character encoding and the script won't run. **Importing the actual `.user.js`
> file works reliably.**

- In **Finder**, copy **`pointsolutions-poll-automation.user.js`** into the folder you
  chose in step 3.
- Open the Userscripts popup in Safari — the script now appears in the list. Make sure its
  toggle is **on**.

Then jump to [Confirming it works](#confirming-it-works).

### macOS — Chrome / Brave / Edge / Firefox

Follow the exact same steps as **[Install on Windows](#install-on-windows-chrome--edge--brave--firefox)** —
Tampermonkey works identically on macOS. (Remember the **“Allow user scripts” / Developer mode**
step for Chrome/Brave/Edge.)

---

## Install on iPad / iPhone

On iPad and iPhone you **must use Safari.** Two apps work; pick one:

- **[Userscripts](https://apps.apple.com/us/app/userscripts/id1463298887)** (by Quoid) — same
  app as on Mac. Requires **iOS/iPadOS 15.1 or newer**. No built-in editor on iOS, so you add
  scripts as files.
- **[Stay – Userscripts Extension](https://apps.apple.com/us/app/stay-userscripts-extension/id1591620171)**
  (by shenruisi) — understands Tampermonkey-format scripts and has an in-app import/editor, which
  some people find easier on a tablet.

### Option A — Userscripts (files-based)

1. Install **Userscripts** from the App Store.
2. **Settings app → Apps → Safari → Extensions → Userscripts** (on older iOS:
   **Settings → Safari → Extensions**). Turn it **on** and set its permission to **Allow** for
   the poll sites — **“Allow on Every Website”** is the safest.
3. Open the **Userscripts app** once and **choose a folder** for scripts (an iCloud Drive folder
   works and can sync with your Mac; note iCloud can be slow/evict files occasionally).
4. Using the **Files app**, copy **`pointsolutions-poll-automation.user.js`** into that
   folder. The filename **must end in `.user.js`**.
5. In Safari, tap the **puzzle-piece / “Aa” → Manage Extensions**, enable **Userscripts**, then
   open its popup and make sure the script is toggled **on**.

### Option B — Stay

1. Install **Stay** from the App Store and enable it in **Safari → Extensions** (same permission
   step as above — **Allow on Every Website**).
2. Open **Stay** and use its **import** feature to add the `.user.js` file (from Files, iCloud,
   or a URL). Stay accepts Tampermonkey-style scripts directly.
3. Make sure the script is enabled inside Stay.

### A note about Chrome/Firefox on iPad/iPhone

You **cannot** run this on Chrome, Firefox, Brave, or any other browser on iPad/iPhone. Apple
requires every iOS browser to use WebKit and only lets **Safari** run these web extensions, so
Tampermonkey/Userscripts/Stay simply aren't available in third-party iOS browsers. Use **Safari**.

---

## Confirming it works

1. Open **[ttpoll.com](https://ttpoll.com)** (or your institution's PointSolutions link) and
   **join your session**.
2. Look at the **bottom-left corner**. You should see a small pill:
   **“🤖 Poll Automation: Active & Scanning.”**
   - If you see it, the script is running. ✅
   - If you **don't** see it, the script isn't loading — see [Troubleshooting](#troubleshooting).
3. When a question opens, the pill updates, e.g.:
   - `✅ Answered: Multiple Choice (Option 2)`
   - `⌛ Typed "Yes" — submitting…` → `✅ Answered: Typed "Yes" + submitted`
   - `👁️ Watching lecture slides…` (no active question)

That's it — leave the tab open during the lecture.

---

## Configuration

Open the script in your userscript manager's editor to change these (near the top of the file):

- **Short-answer responses** — edit this list to control what gets typed:
  ```js
  const shortAnswerResponses = ["Yes", "Idk", "Not sure"];
  ```
  > If a professor actually reads open-ended answers, change these to something appropriate —
  > the defaults are obviously placeholder.
- **DEBUG mode** — see below:
  ```js
  const DEBUG = false;   // set to true to diagnose problems
  ```
- **Which sites it runs on** — the `@match` lines in the header. If your school uses a different
  domain, add another `@match` line for it.

---

## Troubleshooting

| Symptom | Likely cause & fix |
|---|---|
| **No status pill appears at all** | Script not running. Check the extension is **enabled**, the script is **toggled on**, and site permission is granted. On Chrome/Brave/Edge, confirm **“Allow user scripts” / Developer mode** is on. |
| **Pill shows but nothing gets answered** | The page's question markup may differ. Turn on [DEBUG mode](#debug-mode) and check the on-screen readout / console. |
| **Short answer types but doesn't submit** (`⚠️ couldn't find/press submit`) | The pink arrow button wasn't found. Enable DEBUG and capture the console dump of the submit button so the selector can be tightened. |
| **Enter key just makes a new line** | Expected — the short-answer box is multi-line, so the script uses the pink arrow, not Enter. |
| **Safari + Userscripts: script won't load after pasting** | Don't paste — **import the `.user.js` file** into the Userscripts folder instead (see the macOS Safari steps). |
| **Works on Mac but not iPad** | Make sure you're in **Safari**, the extension permission is **Allow on Every Website**, and the file in your scripts folder ends in **`.user.js`**. |
| **Chrome/Brave stopped running it after an update** | Chrome tightened userscript rules — re-enable **“Allow user scripts”** on Tampermonkey's Details page. |
| **It clicked something weird / a chat bubble** | Should be filtered now. If it still happens, enable DEBUG and capture what it clicked. |

---

## DEBUG mode

Set `const DEBUG = false;` to `const DEBUG = true;` near the top of the script and save.

Then, during a session:

- A second panel appears above the status pill showing a live readout:
  ```
  🔎 DEBUG readout
  mode:     SHORT ANSWER
  choices:  0
  textbox:  1
  hotspots: 0
  ```
  `mode` is how the script is classifying the current screen.
- Open the browser **console** (Windows/Linux: **F12** → Console tab; Mac Safari: enable
  **Develop menu** in Safari settings, then **Develop → Show JavaScript Console**) to see
  detailed `[PollAutomation]` dumps whenever it acts — the exact element, its classes, and a
  snippet of its HTML.

This is what to capture and share if a specific question type isn't working, so the detection
can be made exact. **Set `DEBUG` back to `false` when you're done** so the panels disappear.

---

## Limitations

- **Hotspot questions are best-effort.** The script only clicks a real image (or an element
  explicitly marked as a hotspot); it deliberately will **not** click a blank canvas, so it
  won't accidentally "answer" a plain lecture slide. If your class uses a hotspot layout the
  script doesn't recognize, use DEBUG to capture it. These questions are rare.
- **It can't read the question.** It answers **randomly** (MCQ) or with a **canned response**
  (short answer). It does not attempt to answer correctly.
- **Layouts vary by professor.** Some mirror slides into the poll, some embed the question text,
  some show only the answer choices. The script infers from the answer controls, so it copes
  with all three — but an unusual custom layout may need a DEBUG capture to support.
