// ==UserScript==
// @name         PointSolutions Browser Poll Automation
// @namespace    https://github.com/rsharma929/pointsolutions-poll-automation
// @version      7.2
// @description  Auto-answers PointSolutions / TurningPoint (ttpoll.com / echo360) browser polls: random MCQ and short answer (submitted via the pink arrow), with a small random delay so it isn't instant. Short answers come from topic grab-bag pools keyed by a lecture topic you type in the pill. Ignores chat/support and the results/chart screen. Ctrl+Shift+D toggles an on-screen debug readout.
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
    const NS = "paPoll_";            // localStorage prefix

    // Small random "thinking" delay before answering (so responses aren't suspiciously instant).
    const MIN_DELAY_MS = 500;
    const MAX_DELAY_MS = 7500;
    const rint = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));

    const LOG_PREFIX = "[PollAutomation]";

    // DEBUG shows an on-screen readout of what the script detects. Toggle live with Ctrl+Shift+D.
    let DEBUG = false;
    try { DEBUG = localStorage.getItem(NS + "debug") === "1"; } catch (e) {}

    // Topic you type into the pill (e.g. a lecture title). Steers which short-answer pool is used.
    let topicVal = "";
    try { topicVal = localStorage.getItem(NS + "topic") || ""; } catch (e) {}

    // ==========================================
    // 0b. SHORT-ANSWER POOLS
    // ==========================================
    // The script can't read the question (that's the separate AI tool's job). Short answers come
    // from grab-bag pools: type a lecture topic in the pill and it matches the closest bank below,
    // each a mix of investigations (CBC shows up a lot), diagnoses, drugs, and basic-science
    // buzzwords (biochem / physio / path / histo / micro) so a random pick looks plausible for
    // whatever's asked. No match -> the words you typed + the general pool. Edit/extend freely.
    const GENERAL_POOL = ["CBC", "CBC with differential", "Basic metabolic panel", "Supportive care",
        "Monitor and reassess", "Further workup", "Inflammation", "Apoptosis", "ATP", "Negative feedback",
        "Homeostasis", "Oxidative stress", "Hypoxia", "Ischemia", "Necrosis", "Mitochondria",
        "Enzyme inhibition", "Membrane potential", "Depends on the mechanism"];

    const TOPIC_BANKS = [
        { keys: ["thyroid", "endocrine", "hormone", "pituitary", "adrenal", "diabet", "insulin", "cortisol"],
          answers: ["TSH and free T4", "CBC", "Thyroid ultrasound", "TPO antibodies", "Radioactive iodine uptake",
            "Fine needle aspiration", "Hashimoto thyroiditis", "Graves disease", "Levothyroxine", "Methimazole",
            "Hypothyroidism", "Hyperthyroidism", "Follicular cells", "Colloid", "Parafollicular C cells",
            "Thyroglobulin", "Negative feedback", "Goiter", "Myxedema", "Calcitonin", "Insulin resistance", "Cushing syndrome"] },
        { keys: ["genetic", "inherit", "bayesian", "mendel", "pedigree", "chromosom", "mutation", "dna", "allele"],
          answers: ["Autosomal recessive", "Autosomal dominant", "X-linked recessive", "X-linked dominant",
            "Mitochondrial inheritance", "Incomplete penetrance", "Variable expressivity", "Anticipation",
            "Carrier testing", "Karyotype", "Pedigree analysis", "Bayesian probability", "Hardy-Weinberg equilibrium",
            "De novo mutation", "Nondisjunction", "Trinucleotide repeat expansion", "Genomic imprinting", "Mosaicism",
            "Punnett square", "Consanguinity", "Frameshift mutation", "Missense mutation", "FISH", "CBC"] },
        { keys: ["cardio", "heart", "cardiac", "vascular", "coronary", "hypertens", "ecg", "ekg", "circulat"],
          answers: ["ECG", "Troponin", "CBC", "Echocardiogram", "Reduced ejection fraction", "Myocardial infarction",
            "Atherosclerosis", "Beta blocker", "ACE inhibitor", "Loop diuretic", "Afterload", "Preload", "Starling curve",
            "Cardiac output", "Automaticity", "Cardiac action potential", "Calcium channels", "Left ventricular hypertrophy",
            "Nitric oxide", "Baroreceptor reflex", "Angina", "Statin", "Ejection fraction"] },
        { keys: ["renal", "kidney", "nephro", "glomer", "urinary", "urine", "electrolyte"],
          answers: ["Urinalysis", "Basic metabolic panel", "CBC", "GFR", "Creatinine", "RAAS activation",
            "Acute tubular necrosis", "Loop diuretic", "Hyperkalemia", "Metabolic acidosis", "Nephrotic syndrome",
            "Nephritic syndrome", "Podocytes", "Juxtaglomerular apparatus", "Countercurrent multiplier", "Aldosterone",
            "ADH", "Proximal convoluted tubule", "Urinary casts", "BUN", "Renin", "Proteinuria"] },
        { keys: ["pulm", "respir", "lung", "airway", "breath", "ventilat"],
          answers: ["Chest X-ray", "Arterial blood gas", "CBC", "Spirometry", "Hypoxemia", "V/Q mismatch",
            "Bronchodilator", "Surfactant", "Pneumonia", "Obstructive pattern", "Restrictive pattern", "Type II pneumocytes",
            "Alveoli", "Oxygen dissociation curve", "Dead space", "Lung compliance", "Hypercapnia", "Pulmonary edema",
            "Cilia", "Goblet cells", "COPD"] },
        { keys: ["gastro", "liver", "hepat", "intestin", "bowel", "digest", "pancrea", "biliary", " gi "],
          answers: ["CBC", "Liver function tests", "Lipase", "PPI", "H. pylori", "Cirrhosis", "Portal hypertension",
            "Malabsorption", "Peptic ulcer", "Intestinal villi", "Brush border", "Parietal cells", "Bile", "Bilirubin",
            "Pancreatic enzymes", "Hepatocytes", "Chief cells", "Gastrin", "Secretin", "Hepatic steatosis", "Ascites"] },
        { keys: ["heme", "haema", "hemat", "blood", "anemia", "anaemia", "leukem", "coag", "platelet", "clott"],
          answers: ["CBC", "CBC with differential", "Peripheral blood smear", "Iron studies", "Iron deficiency anemia",
            "Hemolysis", "Thrombocytopenia", "Vitamin B12 deficiency", "Reticulocytes", "Hemoglobin", "Sickle cell",
            "Spherocytes", "Coagulation cascade", "Platelets", "Erythropoietin", "Hematocrit", "Megaloblastic anemia",
            "Ferritin", "Haptoglobin", "Bone marrow biopsy"] },
        { keys: ["neuro", "brain", "nerve", "cns", "spinal", "cerebr", "cognit", "psych"],
          answers: ["MRI brain", "Lumbar puncture", "CBC", "Acetylcholine", "Dopamine", "GABA", "Glutamate",
            "Upper motor neuron", "Lower motor neuron", "Demyelination", "Seizure", "Action potential", "Myelin sheath",
            "Oligodendrocytes", "Astrocytes", "Blood-brain barrier", "Resting membrane potential", "Reflex arc", "Stroke",
            "Multiple sclerosis", "Substantia nigra"] },
        { keys: ["micro", "infect", "bacteri", "virus", "viral", "antibiotic", "sepsis", "pathogen", "fung"],
          answers: ["CBC", "Blood cultures", "Gram stain", "Penicillin", "Vancomycin", "Gram-positive cocci",
            "Gram-negative rods", "Sepsis", "Endotoxin", "Exotoxin", "Beta-lactam", "Lipopolysaccharide", "Biofilm",
            "Catalase positive", "Coagulase positive", "Obligate anaerobe", "Culture and sensitivity", "Cell wall synthesis",
            "Leukocytosis", "Fever"] },
        { keys: ["immun", "antibody", "antigen", "complement", "hypersensitiv", "allerg", "autoimmun"],
          answers: ["CBC", "Flow cytometry", "IgG", "IgM", "IgE", "Complement activation", "T cells", "B cells",
            "MHC class I", "MHC class II", "Cytokines", "Type I hypersensitivity", "Type IV hypersensitivity", "Macrophages",
            "Neutrophils", "Antigen presentation", "Cytotoxic T cells", "Helper T cells", "Interleukins", "Clonal selection"] },
        { keys: ["biochem", "metabol", "enzyme", "glycol", "krebs", "citric", "lipid", "protein", "vitamin", "nutri"],
          answers: ["Glycolysis", "Citric acid cycle", "Oxidative phosphorylation", "ATP", "NADH", "Gluconeogenesis",
            "Beta oxidation", "Rate-limiting enzyme", "Allosteric regulation", "Michaelis-Menten", "Cofactor",
            "Pyruvate", "Acetyl-CoA", "Urea cycle", "Pentose phosphate pathway", "Vitamin B12", "Enzyme kinetics",
            "Feedback inhibition", "Lactate", "CBC"] },
        { keys: ["pharm", "drug", "medication", "receptor", "agonist", "dose", "kinetic"],
          answers: ["Beta blocker", "ACE inhibitor", "NSAID", "Statin", "Competitive inhibition", "Agonist", "Antagonist",
            "First-pass metabolism", "Half-life", "Cytochrome P450", "Volume of distribution", "Receptor binding",
            "Efficacy", "Potency", "Therapeutic index", "Loading dose", "Zero-order kinetics", "Bioavailability", "CBC"] },
        { keys: ["repro", "pregnan", "fetal", "foetal", "gonad", "menstru", "ovar", "testis", "obstet", "gynec"],
          answers: ["CBC", "Beta-hCG", "Pelvic ultrasound", "Estrogen", "Progesterone", "LH surge", "FSH",
            "Spermatogenesis", "Oogenesis", "Placenta", "Leydig cells", "Sertoli cells", "Corpus luteum", "Menstrual cycle",
            "Testosterone", "Meiosis", "Trophoblast", "GnRH", "Zona pellucida"] },
        { keys: ["musculo", "bone", "muscle", "skelet", "ortho", "skin", "derm", "joint", "connective"],
          answers: ["CBC", "X-ray", "Osteoblasts", "Osteoclasts", "Collagen", "Actin and myosin", "Sarcomere", "Calcium",
            "Vitamin D", "Rheumatoid arthritis", "Keratinocytes", "Melanocytes", "Fibroblasts", "Epidermis", "Troponin",
            "Osteoporosis", "Cross-bridge cycling", "Hydroxyapatite"] }
    ];

    const STOP = new Set(["the", "a", "an", "of", "to", "and", "or", "for", "in", "on", "with", "application",
        "calculation", "disorders", "disorder", "medical", "introduction", "overview", "lecture", "part"]);

    function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
    function matchBank(topic) {
        const t = " " + topic.toLowerCase() + " ";
        for (const b of TOPIC_BANKS) { if (b.keys.some(k => t.includes(k))) return b.answers; }
        return null;
    }
    function pickShortAnswer() {
        const topic = (topicVal || "").trim();
        if (topic) {
            const bank = matchBank(topic);
            if (bank) return pick(bank);
            const words = topic.split(/[^A-Za-z]+/).filter(w => w.length > 3 && !STOP.has(w.toLowerCase()))
                               .map(w => w[0].toUpperCase() + w.slice(1));
            if (words.length) return pick(words.concat(GENERAL_POOL));
        }
        return pick(GENERAL_POOL);
    }

    // ==========================================
    // 1. STATUS PILL (with topic box)
    // ==========================================
    const bar = document.createElement('div');
    Object.assign(bar.style, {
        position: 'fixed', bottom: '15px', left: '15px', padding: '8px 12px',
        background: 'rgba(20, 20, 20, 0.9)', color: '#ffffff', borderRadius: '8px',
        fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: '13px', fontWeight: '500',
        boxShadow: '0 4px 10px rgba(0,0,0,0.35)', zIndex: '999999', pointerEvents: 'auto',
        borderLeft: '5px solid #00bcd4', maxWidth: '280px'
    });
    const statusSpan = document.createElement('div');
    statusSpan.style.cssText = 'display:block;margin-bottom:6px';
    const topicWrap = document.createElement('div');
    topicWrap.style.cssText = 'display:flex;align-items:center;gap:6px';
    const topicLabel = document.createElement('span'); topicLabel.textContent = '📚';
    const topicInput = document.createElement('input');
    topicInput.type = 'text'; topicInput.placeholder = "lecture topic (optional)"; topicInput.value = topicVal;
    Object.assign(topicInput.style, {
        flex: '1', minWidth: '0', fontSize: '12px', padding: '3px 6px', borderRadius: '5px',
        border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.1)', color: '#fff', fontFamily: 'inherit'
    });
    topicInput.addEventListener('input', () => {
        topicVal = topicInput.value.trim();
        try { localStorage.setItem(NS + "topic", topicVal); } catch (e) {}
    });
    topicWrap.appendChild(topicLabel); topicWrap.appendChild(topicInput);
    bar.appendChild(statusSpan); bar.appendChild(topicWrap);
    document.body.appendChild(bar);

    function updateStatus(text, borderColor) {
        statusSpan.innerHTML = text;
        bar.style.borderLeft = `5px solid ${borderColor}`;
    }
    updateStatus("🤖 Poll Automation: Active", "#00bcd4");

    // Debug readout — created lazily, toggled with Ctrl+Shift+D.
    let debugDiv = null;
    function ensureDebug() {
        if (debugDiv || !DEBUG) return;
        debugDiv = document.createElement('div');
        Object.assign(debugDiv.style, {
            position: 'fixed', bottom: '92px', left: '15px', padding: '8px 12px',
            background: 'rgba(0, 30, 60, 0.9)', color: '#9fe8ff', borderRadius: '6px',
            fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '12px', lineHeight: '1.5',
            boxShadow: '0 4px 6px rgba(0,0,0,0.3)', zIndex: '999999', pointerEvents: 'none',
            whiteSpace: 'pre', borderLeft: '5px solid #00bcd4'
        });
        document.body.appendChild(debugDiv);
    }
    function removeDebug() { if (debugDiv) { debugDiv.remove(); debugDiv = null; } }
    function updateDebug(mode, choices, texts) {
        if (!debugDiv) return;
        debugDiv.textContent = `🔎 DEBUG\nmode:    ${mode}\nchoices: ${choices}\ntextbox: ${texts}`;
    }
    window.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
            DEBUG = !DEBUG;
            try { localStorage.setItem(NS + "debug", DEBUG ? "1" : "0"); } catch (_) {}
            if (DEBUG) ensureDebug(); else removeDebug();
        }
    });
    if (DEBUG) ensureDebug();

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

    // True if the element is (or lives inside) a chat-support launcher / 3rd-party chat widget.
    function isChatSupportElement(el) {
        const structuralWords = ['intercom', 'zendesk', 'crisp', 'drift', 'beacon', 'hubspot',
                                 'launcher', 'chat-widget', 'chatwidget', 'livechat', 'helpdesk',
                                 'support-bubble', 'support-button', 'messaging'];
        const textPhrases = ['chat with', 'live chat', 'need help', 'message us', 'contact support'];
        let node = el, hops = 0;
        while (node && hops < 12) {
            let c = classStr(node);
            let id = (node.id || "").toLowerCase();
            let aria = (node.getAttribute && (node.getAttribute('aria-label') || "").toLowerCase()) || "";
            let dt = String((node.getAttribute && node.getAttribute('data-tab')) || "").toLowerCase();
            if (structuralWords.some(w => c.includes(w) || id.includes(w) || aria.includes(w) || dt.includes(w))) return true;
            if (hops === 0) {
                let ownText = (node.innerText || "").toLowerCase().trim();
                if (textPhrases.some(p => ownText.includes(p)) || aria.includes('chat')) return true;
            }
            node = node.parentElement;
            hops++;
        }
        return false;
    }

    // Words that mark a control as UI chrome / navigation / chat — never an answer choice.
    const NON_ANSWER_WORDS = ['chat', 'messaging', 'support', 'help', 'close', 'menu',
        'settings', 'navbar', 'navigation', 'exit', 'leave', 'confirm', 'cancel', 'dismiss',
        'logout', 'log out', 'sign out', 'signout', 'intercom', 'zendesk', 'crisp', 'drift',
        'hubspot', 'launcher', 'widget', 'bubble', 'beacon', 'livechat'];

    const NAV_WORDS = ['leave', 'exit', 'close', 'menu', 'settings', 'confirm', 'cancel',
        'dismiss', 'logout', 'log out', 'sign out', 'signout', 'navbar', 'navigation'];

    function matchesWords(el, words, includeOwnText) {
        let aria = (el.getAttribute && (el.getAttribute('aria-label') || "").toLowerCase()) || "";
        let id = (el.id || "").toLowerCase();
        let cls = classStr(el);
        let pCls = classStr(el.parentElement);
        let pId = (el.parentElement && (el.parentElement.id || "").toLowerCase()) || "";
        let text = "";
        if (includeOwnText) { text = (el.innerText || "").toLowerCase().trim(); if (text.length > 20) text = ""; }
        return words.some(w => aria.includes(w) || id.includes(w) || cls.includes(w) ||
                               pCls.includes(w) || pId.includes(w) || (text && text.includes(w)));
    }

    function isNonAnswerButton(el) {
        if (el.disabled) return true;
        if (el.tagName === 'IFRAME') return true;
        if (el.getAttribute && el.getAttribute('role') === 'tab') return true; // Polling/Messaging tabs
        if (isChatSupportElement(el)) return true;
        return matchesWords(el, NON_ANSWER_WORDS, true);
    }

    // Lighter filter for text boxes: reject disabled elements, iframes, and chat/support widgets.
    function isBadElement(el) {
        if (el.disabled) return true;
        if (el.tagName === 'IFRAME') return true;
        if (isChatSupportElement(el)) return true;
        return false;
    }

    // Framework-safe value setter (works for Angular's ngModel and React): assigning .value
    // directly doesn't fire the framework's listeners, so route through the native setter +
    // dispatch input/change so the submit (pink arrow) enables.
    function setNativeValue(el, value) {
        const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype
                                                : window.HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
        setter.call(el, value);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    }

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
        let container = input;
        for (let i = 0; i < 5 && container.parentElement; i++) container = container.parentElement;
        let candidates = Array.from(container.querySelectorAll(
            'button, [role="button"], input[type="submit"]'
        )).filter(btn => isElementVisible(btn) && !btn.disabled &&
                         !isChatSupportElement(btn) && !matchesWords(btn, NAV_WORDS, true));
        if (candidates.length === 0) return null;
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
            return { btn, score };
        }).sort((a, b) => b.score - a.score);
        return scored[0].score > 0 ? scored[0].btn : candidates[0];
    }

    // True when the results / chart screen is showing (between questions) — never answer there.
    // Confirmed from the real DOM: the chart shows a "correctAnswer" marker and an active
    // "Chart" toggle (btn-primary). During a live question neither is present, so this guard
    // can only PREVENT a wrong click on results — it never affects real question answering.
    function onResultsScreen() {
        if (document.querySelector('.correctAnswer, .correctAnswerIcon, [class*="correctAnswer" i]')) return true;
        const chart = Array.from(document.querySelectorAll('button')).find(b =>
            (b.innerText || "").trim().toLowerCase() === 'chart' && classStr(b).includes('btn-primary'));
        return !!chart;
    }

    function isChoiceSelected(el) {
        if (el.tagName === 'INPUT' && (el.type === 'radio' || el.type === 'checkbox')) return el.checked;
        return el.getAttribute('aria-checked') === 'true' || el.getAttribute('aria-selected') === 'true' ||
               el.classList.contains('selected') || el.classList.contains('checked') || el.classList.contains('active');
    }

    function dumpDebug(label, el) {
        if (!DEBUG || !el) return;
        console.groupCollapsed(`${LOG_PREFIX} DEBUG dump: ${label}`);
        console.log("element:", el, "| tag:", el.tagName, "| class:", classStr(el));
        console.log("outerHTML (truncated):", (el.outerHTML || "").slice(0, 600));
        console.groupEnd();
    }

    // ==========================================
    // 3. MAIN LOOP
    // ==========================================
    // Runs once per second. Infers the type from on-screen elements and answers the first match
    // in priority: MCQ > short answer. A per-question lock guarantees one response per question;
    // the lock resets when the on-screen element set changes (a new question appears).
    setInterval(() => {
        // Skip the results / chart screen entirely.
        if (onResultsScreen()) {
            if (lastActiveCount > 0) updateStatus("📊 Results shown — waiting", "#9e9e9e");
            lastActiveCount = 0; answeredCurrentBatch = false;
            updateDebug("results screen", 0, 0);
            return;
        }

        // --- MULTIPLE CHOICE --- (detection UNCHANGED from v7.1)
        let rawChoices = document.querySelectorAll(
            'input[type="radio"], input[type="checkbox"], [role="radio"], [role="checkbox"], [class*="answer" i], [class*="choice" i], [class*="option" i], button'
        );
        let currentChoices = Array.from(rawChoices).filter(el => {
            if (!isElementVisible(el) || isNonAnswerButton(el)) return false;
            let text = (el.innerText || "").toLowerCase().trim();
            let className = classStr(el);
            let isInput = el.tagName === 'INPUT';
            let isRole = el.getAttribute('role') === 'radio' || el.getAttribute('role') === 'checkbox';
            let hasGoodClass = className.includes('choice') || className.includes('answer') || className.includes('option');
            let isSubmitButton = text.includes('submit') || text.includes('send') || text.includes('respond') || className.includes('submit');
            let isShortTextButton = el.tagName === 'BUTTON' && text.length > 0 && text.length < 15 && !isSubmitButton;
            return isInput || isRole || hasGoodClass || isShortTextButton;
        });
        let isAnyChoiceSelected = currentChoices.some(isChoiceSelected);

        // --- TEXT INPUT (short answer) ---
        let rawTextInputs = document.querySelectorAll('input[type="text"], textarea, [role="textbox"]');
        let textInputs = Array.from(rawTextInputs).filter(el => {
            if (!isElementVisible(el) || isBadElement(el)) return false;
            let ph = (el.getAttribute('placeholder') || "").toLowerCase();
            if (ph.includes('search') || ph.includes('message') || ph.includes('chat')) return false;
            return true;
        });
        let isTextAlreadyFilled = textInputs.some(el => el.value && el.value.trim().length > 0);

        let totalCount = currentChoices.length + textInputs.length;

        let detectedMode = currentChoices.length > 0 ? "MCQ"
                         : textInputs.length > 0 ? "SHORT ANSWER"
                         : "none (slide / no question)";
        updateDebug(detectedMode, currentChoices.length, textInputs.length);

        // --- STATE ---
        if (totalCount === 0) {
            if (lastActiveCount > 0) updateStatus("👁️ Watching lecture slides…", "#9e9e9e");
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
                updateStatus("✅ Already answered (locked)", "#4caf50");
            }
        }

        // ==========================================
        // 4. ACT
        // ==========================================
        if (answeredCurrentBatch) return;

        // --- MCQ (click mechanism UNCHANGED from v7.1 — .click(); only a delay wraps it) ---
        // Two rules when the timer fires, in this order:
        //   1. If ANY choice is already selected, do NOT click — clicking a selected choice
        //      would deselect it. (Covers you answering by hand during the delay.)
        //   2. Otherwise ANSWER. Prefer the choice we picked; if it got re-rendered away
        //      during the delay, click another still-valid choice from the same question
        //      instead of skipping — you'd rather it answer than miss.
        if (currentChoices.length > 0) {
            let idx = Math.floor(Math.random() * currentChoices.length);
            let target = currentChoices[idx];
            let snapshot = currentChoices;
            answeredCurrentBatch = true;                 // lock now so we act exactly once
            updateStatus("🤔 Thinking…", "#ff9800");
            setTimeout(() => {
                if (snapshot.some(isChoiceSelected)) {   // answered during the delay — never deselect
                    updateStatus("✅ Already answered", "#4caf50"); return;
                }
                let el = (document.contains(target) && isElementVisible(target)) ? target
                       : snapshot.find(c => document.contains(c) && isElementVisible(c));
                if (!el) { updateStatus("↩︎ Question changed — skipped", "#9e9e9e"); return; }
                el.click();                              // same mechanism as v7.1
                updateStatus("✅ MCQ answered", "#4caf50");
            }, rint(MIN_DELAY_MS, MAX_DELAY_MS));
            return;
        }

        // --- SHORT ANSWER (fill + pink arrow; submit mechanism UNCHANGED) ---
        if (textInputs.length > 0) {
            let input = textInputs[0];
            let word = pickShortAnswer();
            answeredCurrentBatch = true;
            updateStatus("🤔 Thinking…", "#ff9800");
            setTimeout(() => {
                if (!document.contains(input) || !isElementVisible(input)) {
                    // box got re-rendered during the delay — grab a fresh one so we still answer
                    input = textInputs.find(el => document.contains(el) && isElementVisible(el));
                }
                if (!input || !document.contains(input) || !isElementVisible(input)) {
                    updateStatus("↩︎ Question changed — skipped", "#9e9e9e"); return;
                }
                dumpDebug("short-answer input", input);
                setNativeValue(input, word);
                updateStatus(`⌛ Typed "${word}" — submitting…`, "#ff9800");
                let attempts = 0;
                const trySubmit = () => {
                    attempts++;
                    let confirmed = (input.value || "").trim().length === 0 ||
                                    /response received|thank|submitted|received/i.test(document.body.innerText);
                    if (confirmed) { updateStatus(`✅ Typed "${word}" + submitted`, "#4caf50"); return; }
                    let btn = findSubmitButton(input);
                    dumpDebug(`short-answer submit button (attempt ${attempts})`, btn);
                    if (btn && isElementVisible(btn) && !btn.disabled) {
                        let r = btn.getBoundingClientRect();
                        realClick(btn, r.left + r.width / 2, r.top + r.height / 2);
                        updateStatus(`✅ Typed "${word}" + submitted`, "#4caf50");
                        if (attempts < 6) setTimeout(trySubmit, 500);
                    } else if (attempts < 6) {
                        setTimeout(trySubmit, 400);
                    } else {
                        updateStatus(`⚠️ Typed "${word}" — couldn't find submit (Ctrl+Shift+D to debug)`, "#ff5722");
                    }
                };
                setTimeout(trySubmit, 300);
            }, rint(MIN_DELAY_MS, MAX_DELAY_MS));
            return;
        }

    }, 1000);
})();
