# PointSolutions Browser Poll Assistant

A userscript that automatically responds to **PointSolutions / TurningPoint** browser polls
(ttpoll.com / turningtechnologies.com / echo360.com). When a question appears, it picks a
multiple-choice option or types a short answer and submits it for you after a short, random
delay — so your responses aren't suspiciously instant.

It runs entirely in your browser. There's no account, no server, and no API key.

> **Use responsibly.** This automates graded/attendance participation in a live class. Make sure you
> understand your school's academic-integrity policy before using it. You are responsible for how you
> use it. Answers are picked for *plausibility and participation* — they are **not** meant to be correct.

---

## What it does

- **Multiple choice:** picks one of the on-screen options at random and clicks it (works for any
  number of options — 2, 4, 5, 12, …).
- **Short answer:** types a topical word/phrase into the answer box and submits it with the poll's
  pink arrow. The answer is drawn from **20 built-in topic pools** (endocrine, cardio, renal, pulm,
  heme, neuro, micro, immuno, biochem, pharm, repro, MSK, embryology, histology, biostats, oncology,
  psych, nutrition, genetics, GI). You steer which pool is used by typing a **lecture topic** into
  the on-screen pill — e.g. `thyroid disorders`, `renal physiology`.
- **Random delay:** every answer waits a random **1.5–8 seconds** before submitting, shown as a live
  countdown with a progress bar on the pill.
- **Stays out of the way:** it skips the results/chart screen between questions, ignores the site's
  chat/navigation chrome, and answers each question only once.

### The on-screen pill

A small pill appears in the bottom-left of the poll page:

- **Status line** — shows what it's doing ("Watching slides", the delay countdown, "MCQ answered",
  etc.). **Drag the pill by this line** to move it anywhere; it remembers where you put it.
- **📚 Topic box** — type the lecture/workshop topic here so short answers are on-topic. It's saved
  automatically between sessions.
- **⏸ Pause / ▶ Resume** — stops the tool from answering (and cancels any running countdown) until
  you resume. Use it to hold off on a question you'd rather answer yourself. The paused state sticks
  until you resume (even across reloads).
- **✕ Clear** — clears the topic box only. It does **not** stop or restart answering — use Pause for
  that.
- **Ctrl+Shift+D** — toggles a small debug readout (what it's detecting), if you ever need it.

---

## Install

### 1. Install a userscript manager

| Your browser | Install this | Cost |
|---|---|---|
| **Chrome / Edge / Brave** (Windows, Mac) | **[Tampermonkey](https://www.tampermonkey.net/)** | Free |
| **Safari** (Mac, iPad, iPhone) | **[Userscripts](https://apps.apple.com/app/userscripts/id1463298887)** | Free |

> On Safari, use **Userscripts** — it's free. (Tampermonkey on Safari is a paid app.) After
> installing Userscripts, open **Safari → Settings → Extensions** and enable it, and allow it to run
> on the poll sites when prompted.

### 2. Chrome only: turn on "Allow user scripts"

Recent versions of Chrome require you to flip one switch before Tampermonkey is allowed to run
scripts. You only do this once:

1. Open **`chrome://extensions`** (or **⋮ menu → Extensions → Manage Extensions**).
2. Find **Tampermonkey** and click **Details**.
3. Scroll down and turn **Allow User Scripts** **ON**.

> If you don't see an "Allow User Scripts" toggle, instead turn on **Developer mode** (switch in the
> top-right of the `chrome://extensions` page). One of the two will be there depending on your Chrome
> version.

### 3. Add the script

Click this link — your userscript manager will open an install page; confirm it:

**→ [Install / update the script](https://raw.githubusercontent.com/rsharma929/pointsolutions-poll-automation/main/pointsolutions-poll-automation.user.js)**

```
https://raw.githubusercontent.com/rsharma929/pointsolutions-poll-automation/main/pointsolutions-poll-automation.user.js
```

- **Tampermonkey (Chrome):** the link opens a tab with an **Install** button — click it.
- **Userscripts (Safari):** if the link just shows the raw text, copy all of it, open the Userscripts
  extension, create a **new script**, paste it in, and save (see *Editing* below).

That's it. Open a poll at `ttpoll.com` (or your class's PointSolutions link) and the pill appears.

---

## Using it

1. Join the poll session as normal.
2. In the pill's **📚 topic box**, type the lecture/workshop topic (e.g. `adrenal`, `cardio`,
   `vitamin deficiencies`). This makes short answers match the subject.
3. Leave the tab open. When a question appears, the pill shows a countdown and then answers:
   - **MCQ** → clicks an option.
   - **Short answer** → types an answer and submits with the pink arrow.
4. Use **⏸ Pause** to stop it from answering (e.g. a question you want to do yourself); **▶** resumes.
   Use **✕** to clear the topic between unrelated sessions.

If you answer a question yourself first, the tool detects it and won't touch it.

---

## Editing the script

You can open the script and change anything — most usefully the **topic answer pools** (near the top,
`GENERAL_POOL` and `TOPIC_BANKS`) or the **delay range** (`MIN_DELAY_MS` / `MAX_DELAY_MS`).

### Tampermonkey (Chrome)

1. Click the **Tampermonkey icon** in the toolbar → **Dashboard** (or go to `chrome://extensions`,
   Tampermonkey → **Details** → **Extension options**).
2. In the **Installed Userscripts** list, click **PointSolutions Browser Poll Automation**.
3. Edit the code in the editor.
4. Save with **File → Save** (or **Ctrl+S** / **Cmd+S**). The change takes effect on the next page
   reload.

### Userscripts (Safari)

1. Open the **Userscripts** extension (its icon in the Safari toolbar, or **Safari → Settings →
   Extensions → Userscripts**; on iPhone/iPad it's in the **aA / extensions** menu in the address bar).
2. Select **PointSolutions Browser Poll Automation** from the list.
3. Edit the code, then tap/click **Save**.
4. Reload the poll tab for the change to take effect.

---

## Updating the script

**Automatic:** if your manager tracks an update URL for the script, it checks periodically on its own.
To force a check in **Tampermonkey**: open the **Dashboard**, go to the **Utilities** tab (or the
settings menu) and click **Check for userscript updates**.

**Manual (always works):** if it doesn't update on its own, just install the latest over the top:

- **Tampermonkey:** open the [install link](https://raw.githubusercontent.com/rsharma929/pointsolutions-poll-automation/main/pointsolutions-poll-automation.user.js)
  again and click **Install/Reinstall** — it replaces the existing script and keeps your settings.
- **Either manager:** open the script in the editor (see *Editing* above), select all, delete, paste
  in the newest version from the link, and **Save**.

After updating, check the version at the top of the file (`// @version`) to confirm you're on the
latest. Reload the poll tab.

---

## Privacy

Everything runs locally in your browser. The tool makes no network requests of its own and sends your
data nowhere. Your topic text and pill position are stored only on your device (`localStorage`).

## License

MIT — see [LICENSE](LICENSE).
