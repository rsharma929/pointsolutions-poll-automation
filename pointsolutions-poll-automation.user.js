// ==UserScript==
// @name         PointSolutions Browser Poll Automation
// @namespace    https://github.com/rsharma929/pointsolutions-poll-automation
// @version      7.0
// @description  Auto-answers PointSolutions / TurningPoint (ttpoll.com) browser polls: random MCQ, short answer submitted via the pink arrow, best-effort hotspot. Ignores the chat-support launcher. Set DEBUG=true for an on-screen readout and console DOM dumps.
// @author       Rohan
// @license      MIT
// @homepageURL  https://github.com/rsharma929/pointsolutions-poll-automation
// @supportURL   https://github.com/rsharma929/pointsolutions-poll-automation/issues
// @match        https://*.ttpoll.com/*
// @match        https://ttpoll.com/*
// @match        https://*.echo360.com/*
// @match        https://echo360.com/*
// @match        https://*.turningtechnologies.com/*
// @match        https://turningtechnologies.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    // ==========================================
    // 0. CONFIG
    // ==========================================
    // DEBUG = true adds an on-screen readout of what the script currently detects and
    // prints the surrounding DOM to the browser console (F12) whenever it acts. Use it
    // to diagnose an unrecognised question type, then set it back to false.
    const DEBUG = false;

    // Pool of answers used for short-answer / open-ended questions. One is picked at random.
    // Edit these to whatever you want typed into the box.
    const shortAnswerResponses = ["Yes", "Idk", "Not sure"];

    // Prefix used for all console output so it is easy to filter.
    const LOG_PREFIX = "[PollAutomation]";

    // ==========================================
    // 1. VISUAL STATUS INDICATOR
    // ==========================================
    let statusDiv = document.createElement('div');
    Object.assign(statusDiv.style, {
        position: 'fixed', bottom: '15px', left: '15px', padding: '8px 12px',
        background: 'rgba(20, 20, 20, 0.85)', color: '#ffffff', borderRadius: '6px',
        fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: '13px',
        fontWeight: '500', boxShadow: '0 4px 6px rgba(0,0,0,0.3)', zIndex: '999999',
        pointerEvents: 'none', transition: 'all 0.3s ease'
    });
    document.body.appendChild(statusDiv);

    function updateStatus(text, borderColor) {
        statusDiv.innerHTML = text;
        statusDiv.style.borderLeft = `5px solid ${borderColor}`;
    }
    updateStatus("🤖 Poll Automation: Active & Scanning", "#00bcd4");

    // Live "what I see right now" readout — only shown when DEBUG is on.
    let debugDiv = null;
    if (DEBUG) {
        debugDiv = document.createElement('div');
        Object.assign(debugDiv.style, {
            position: 'fixed', bottom: '60px', left: '15px', padding: '8px 12px',
            background: 'rgba(0, 30, 60, 0.9)', color: '#9fe8ff', borderRadius: '6px',
            fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '12px', lineHeight: '1.5',
            boxShadow: '0 4px 6px rgba(0,0,0,0.3)', zIndex: '999999', pointerEvents: 'none',
            whiteSpace: 'pre', borderLeft: '5px solid #00bcd4'
        });
        document.body.appendChild(debugDiv);
    }

    function updateDebug(mode, choices, texts, hots) {
        if (!debugDiv) return;
        debugDiv.textContent =
            `🔎 DEBUG readout\n` +
            `mode:     ${mode}\n` +
            `choices:  ${choices}\n` +
            `textbox:  ${texts}\n` +
            `hotspots: ${hots}`;
    }

    // ==========================================
    // 2. HELPERS
    // ==========================================
    let lastActiveCount = 0;
    let answeredCurrentBatch = false;

    function isElementVisible(el) {
        let rect = el.getBoundingClientRect();
        let style = window.getComputedStyle(el);
        return (rect.width > 0 && rect.height > 0 &&
                style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0');
    }

    function classStr(el) {
        if (!el) return "";
        return (typeof el.className === 'string' ? el.className : (el.className && el.className.baseVal) || "").toString().toLowerCase();
    }

    // True if the element is (or lives inside) a chat-support launcher / 3rd-party chat
    // widget — e.g. the bottom-right bubble that used to get clicked instead of an MCQ choice.
    // Matching is done on structural attributes (class/id/aria) walking up the ancestor
    // chain, because those are far more reliable than button text and won't accidentally
    // reject a legitimate answer choice whose label happens to be "Chat" or "Support".
    function isChatSupportElement(el) {
        // Structural markers that uniquely identify chat/support widgets.
        const structuralWords = ['intercom', 'zendesk', 'crisp', 'drift', 'beacon', 'hubspot',
                                 'launcher', 'chat-widget', 'chatwidget', 'livechat', 'helpdesk',
                                 'support-bubble', 'support-button', 'messaging'];
        // Multi-word phrases only ever seen on chat launchers — safe to match on button text
        // because no poll answer option would contain them verbatim.
        const textPhrases = ['chat with', 'live chat', 'need help', 'message us', 'contact support'];

        let node = el, hops = 0;
        while (node && hops < 12) {
            let c = classStr(node);
            let id = (node.id || "").toLowerCase();
            let aria = (node.getAttribute && (node.getAttribute('aria-label') || "").toLowerCase()) || "";
            let dt = String((node.getAttribute && node.getAttribute('data-tab')) || "").toLowerCase();
            if (structuralWords.some(w => c.includes(w) || id.includes(w) || aria.includes(w) || dt.includes(w))) {
                return true;
            }
            // Only inspect the clicked element's own text (hops === 0), and only against the
            // safe multi-word phrases above.
            if (hops === 0) {
                let ownText = (node.innerText || "").toLowerCase().trim();
                if (textPhrases.some(p => ownText.includes(p)) || aria.includes('chat')) return true;
            }
            node = node.parentElement;
            hops++;
        }
        return false;
    }

    // Positive signal that an image/canvas is an interactive hotspot answer target
    // (as opposed to a mirrored lecture slide or a decorative picture).
    function hasHotspotSignal(el) {
        let node = el, hops = 0;
        while (node && hops < 6) {
            let c = classStr(node), id = (node.id || "").toLowerCase();
            if (c.includes('hotspot') || id.includes('hotspot')) return true;
            node = node.parentElement; hops++;
        }
        let alt = (el.getAttribute('alt') || "").toLowerCase();
        let aria = (el.getAttribute('aria-label') || "").toLowerCase();
        return alt.includes('hotspot') || aria.includes('hotspot');
    }

    function isBadElement(el) {
        if (el.disabled) return true;
        if (el.tagName === 'IFRAME') return true;
        if (isChatSupportElement(el)) return true;
        return false;
    }

    // React-safe value setter: assigning .value directly does NOT tell React the field
    // changed, so the submit button stays disabled. This routes through the native setter.
    function setNativeValue(el, value) {
        const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype
                                                : window.HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
        setter.call(el, value);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Fire a realistic pointer+mouse sequence at a specific screen coordinate.
    function realClick(target, clientX, clientY) {
        const opts = { bubbles: true, cancelable: true, view: window, clientX, clientY, button: 0 };
        ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(type => {
            const Ctor = type.startsWith('pointer') && window.PointerEvent ? PointerEvent : MouseEvent;
            const evtOpts = Ctor === PointerEvent ? Object.assign({ pointerType: 'mouse', isPrimary: true }, opts) : opts;
            target.dispatchEvent(new Ctor(type, evtOpts));
        });
    }

    // Find the poll's submit control (the little pink arrow) near a given input.
    function findSubmitButton(input) {
        // Walk up a few levels to a container, then look for a button/role=button that
        // is NOT a chat send button. The arrow button has no text, so we match by
        // icon/aria/type rather than by the word "submit".
        let container = input;
        for (let i = 0; i < 5 && container.parentElement; i++) container = container.parentElement;

        let candidates = Array.from(container.querySelectorAll(
            'button, [role="button"], input[type="submit"]'
        )).filter(btn => isElementVisible(btn) && !isBadElement(btn));

        if (candidates.length === 0) return null;

        // Prefer: aria/type says submit, OR it contains an svg icon (the arrow) and has no text.
        let scored = candidates.map(btn => {
            let text = (btn.innerText || btn.value || "").toLowerCase().trim();
            let aria = (btn.getAttribute('aria-label') || "").toLowerCase();
            let type = (btn.getAttribute('type') || "").toLowerCase();
            let hasIcon = !!btn.querySelector('svg, i, [class*="icon" i], [class*="arrow" i]');
            let score = 0;
            if (aria.includes('submit') || aria.includes('send') || aria.includes('respond')) score += 5;
            if (type === 'submit') score += 4;
            if (hasIcon && text.length === 0) score += 3;   // the pink arrow icon button
            if (text.includes('submit') || text.includes('send') || text.includes('respond')) score += 3;
            // proximity: closer to the input in DOM order is better
            return { btn, score };
        }).sort((a, b) => b.score - a.score);

        return scored[0].score > 0 ? scored[0].btn : candidates[0];
    }

    // Print a detailed snapshot of an element (and its ancestor chain) to the console.
    // Only runs when DEBUG is on; used to capture the exact markup of a question the
    // heuristics don't yet handle.
    function dumpDebug(label, el) {
        if (!DEBUG || !el) return;
        console.groupCollapsed(`${LOG_PREFIX} DEBUG dump: ${label}`);
        console.log("element:", el);
        console.log("tag:", el.tagName, "| id:", el.id, "| class:", classStr(el));
        console.log("rect:", el.getBoundingClientRect());
        console.log("parent chain:");
        let n = el, hops = 0;
        while (n && hops < 6) { console.log("  ↳", n.tagName, el === n ? "(self)" : "", "id=" + (n.id || "-"), "class=" + classStr(n)); n = n.parentElement; hops++; }
        console.log("outerHTML (truncated):", (el.outerHTML || "").slice(0, 600));
        console.groupEnd();
    }

    // ==========================================
    // 3. MAIN LOOP
    // ==========================================
    // Runs once per second. The script cannot ask the page "what question type is this?",
    // so it *infers* the type from which interactive elements are on screen, and acts on
    // the first match in priority order: MCQ > short answer > hotspot. A per-question lock
    // (answeredCurrentBatch) guarantees only one response per question; the lock is reset
    // whenever the set of on-screen elements changes (i.e. a new question appears).
    setInterval(() => {
        // --- MULTIPLE CHOICE ---
        // Collect anything that looks like a selectable answer, then reject chat/support
        // widgets, hidden/disabled elements, and text-labelled submit buttons.
        let rawChoices = document.querySelectorAll(
            'input[type="radio"], input[type="checkbox"], [role="radio"], [role="checkbox"], [class*="answer" i], [class*="choice" i], [class*="option" i], button'
        );
        let currentChoices = Array.from(rawChoices).filter(el => {
            if (!isElementVisible(el) || isBadElement(el)) return false;
            let text = (el.innerText || "").toLowerCase().trim();
            let className = classStr(el);
            let isInput = el.tagName === 'INPUT';
            let isRole = el.getAttribute('role') === 'radio' || el.getAttribute('role') === 'checkbox';
            let hasGoodClass = className.includes('choice') || className.includes('answer') || className.includes('option');
            let isSubmitButton = text.includes('submit') || text.includes('send') || text.includes('respond') || className.includes('submit');
            let isShortTextButton = el.tagName === 'BUTTON' && text.length > 0 && text.length < 15 && !isSubmitButton;
            return isInput || isRole || hasGoodClass || isShortTextButton;
        });

        // Detect whether a choice is already selected (e.g. you answered manually) so the
        // script leaves it alone instead of toggling it back off.
        let isAnyChoiceSelected = currentChoices.some(el => {
            if (el.tagName === 'INPUT' && (el.type === 'radio' || el.type === 'checkbox')) return el.checked;
            return el.getAttribute('aria-checked') === 'true' || el.getAttribute('aria-selected') === 'true' ||
                   el.classList.contains('selected') || el.classList.contains('checked') || el.classList.contains('active');
        });

        // --- TEXT INPUT (short answer / open-ended) ---
        let rawTextInputs = document.querySelectorAll('input[type="text"], textarea, [role="textbox"]');
        let textInputs = Array.from(rawTextInputs).filter(el => {
            if (!isElementVisible(el) || isBadElement(el)) return false;
            let ph = (el.getAttribute('placeholder') || "").toLowerCase();
            if (ph.includes('search') || ph.includes('message') || ph.includes('chat')) return false;
            return true;
        });
        let isTextAlreadyFilled = textInputs.some(el => el.value && el.value.trim().length > 0);

        // --- HOTSPOT / IMAGE ---
        // Prefer a real photo <img>; fall back to canvas only if no image is present.
        let rawImgs = document.querySelectorAll('img, canvas, .hotspot-image, [class*="hotspot" i] img');
        let hotspotTargets = Array.from(rawImgs).filter(el => {
            if (!isElementVisible(el) || isBadElement(el)) return false;
            if (el.closest('button') || el.closest('a') || el.closest('[role="button"]')) return false;
            let rect = el.getBoundingClientRect();
            if (rect.width < 120 || rect.height < 80) return false; // skip tiny icons/avatars/logos
            let cls = classStr(el) + " " + classStr(el.parentElement);
            let bad = ['chart', 'result', 'graph', 'stats', 'poll-results', 'icon', 'logo', 'avatar'];
            if (bad.some(w => cls.includes(w))) return false;
            return true;
        });
        // Real images first (real hotspot targets), canvases last (usually placeholders).
        hotspotTargets.sort((a, b) => (a.tagName === 'IMG' ? -1 : 1) - (b.tagName === 'IMG' ? -1 : 1));

        let totalCount = currentChoices.length + textInputs.length + hotspotTargets.length;

        // Live readout of what the script currently detects (DEBUG only).
        let detectedMode = currentChoices.length > 0 ? "MCQ"
                         : textInputs.length > 0 ? "SHORT ANSWER"
                         : hotspotTargets.length > 0 ? (hotspotTargets.some(hasHotspotSignal) ? "HOTSPOT (signal)"
                                                        : hotspotTargets.some(t => t.tagName === 'IMG') ? "HOTSPOT? (image, no signal)"
                                                        : "IMAGE/CANVAS (slide? not clicking)")
                         : "none (slide / no question)";
        updateDebug(detectedMode, currentChoices.length, textInputs.length, hotspotTargets.length);

        // --- STATE ---
        if (totalCount === 0) {
            if (lastActiveCount > 0) updateStatus("👁️ Watching lecture slides...", "#9e9e9e");
            lastActiveCount = 0;
            answeredCurrentBatch = false;
            return;
        }
        if (totalCount !== lastActiveCount) {
            answeredCurrentBatch = false;
            lastActiveCount = totalCount;
        }
        if (isAnyChoiceSelected || isTextAlreadyFilled) {
            if (!answeredCurrentBatch) {
                answeredCurrentBatch = true;
                updateStatus("✅ Question already answered (Locked)", "#4caf50");
            }
        }

        // ==========================================
        // 4. ACT
        // ==========================================
        if (answeredCurrentBatch) return;

        // --- MCQ (auto-submits on click) ---
        if (currentChoices.length > 0) {
            let idx = Math.floor(Math.random() * currentChoices.length);
            currentChoices[idx].click();
            answeredCurrentBatch = true;
            updateStatus(`✅ Answered: Multiple Choice (Option ${idx + 1})`, "#4caf50");
            return;
        }

        // --- SHORT ANSWER (React-safe fill + pink arrow, with retries) ---
        if (textInputs.length > 0) {
            let word = shortAnswerResponses[Math.floor(Math.random() * shortAnswerResponses.length)];
            let input = textInputs[0];
            dumpDebug("short-answer input", input);
            setNativeValue(input, word);          // makes React register the text -> enables submit
            answeredCurrentBatch = true;          // stop re-typing every tick
            updateStatus(`⌛ Typed "${word}" — submitting…`, "#ff9800");

            // The pink arrow can render/enable a moment after typing, so retry a few times.
            let attempts = 0;
            const trySubmit = () => {
                attempts++;
                // Consider it done if the field cleared or the confirmation text appeared.
                let confirmed = (input.value || "").trim().length === 0 ||
                                /response received|thank|submitted|received/i.test(document.body.innerText);
                if (confirmed) {
                    updateStatus(`✅ Answered: Typed "${word}" + submitted`, "#4caf50");
                    return;
                }
                let btn = findSubmitButton(input);
                dumpDebug(`short-answer submit button (attempt ${attempts})`, btn);
                if (btn && isElementVisible(btn) && !btn.disabled) {
                    let r = btn.getBoundingClientRect();
                    realClick(btn, r.left + r.width / 2, r.top + r.height / 2);
                    updateStatus(`✅ Answered: Typed "${word}" + submitted`, "#4caf50");
                    // one more pass to verify it actually went through
                    if (attempts < 6) setTimeout(trySubmit, 500);
                } else if (attempts < 6) {
                    setTimeout(trySubmit, 400);   // button not ready yet — wait and retry
                } else {
                    updateStatus(`⚠️ Typed "${word}" — couldn't find/press submit (set DEBUG=true)`, "#ff5722");
                }
            };
            setTimeout(trySubmit, 300);
            return;
        }

        // --- HOTSPOT ---
        if (hotspotTargets.length > 0) {
            // Choose a target conservatively so we don't click slides / blank canvases:
            //   1. anything with an explicit hotspot signal (best), else
            //   2. a real <img> photo (a picture in the response area is almost always a hotspot).
            // A bare <canvas> with no signal is treated as a slide/placeholder and left alone.
            let signaled = hotspotTargets.find(hasHotspotSignal);
            let realImg = hotspotTargets.find(t => t.tagName === 'IMG');
            let target = signaled || realImg || null;

            if (!target) {
                dumpDebug("image/canvas present but no hotspot signal (treated as slide)", hotspotTargets[0]);
                updateStatus("🖼️ Image/canvas on screen — no hotspot signal, not clicking (set DEBUG=true if it IS a hotspot)", "#9e9e9e");
                return; // do NOT mark answered; if it becomes a real question we'll react
            }

            dumpDebug("hotspot target", target);
            let rect = target.getBoundingClientRect();
            // Random point in the middle 60% so we land solidly inside the image.
            let x = rect.left + rect.width * (0.2 + Math.random() * 0.6);
            let y = rect.top + rect.height * (0.2 + Math.random() * 0.6);
            realClick(target, x, y);
            // A single click drops the marker = the whole answer (no submit needed).

            answeredCurrentBatch = true;
            let how = signaled ? "signal" : "image";
            updateStatus(`✅ Answered: Hotspot clicked (${target.tagName}, via ${how})`, "#4caf50");
            return;
        }

    }, 1000);
})();
