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
    // from grab-bag pools: type a lecture topic in the pill and it matches the closest of the 20
    // banks below (first bank with a matching trigger word wins), each a mix of investigations
    // (CBC shows up a lot), diagnoses, drugs, and basic-science buzzwords (biochem / physio / path /
    // histo / micro) so a random pick looks plausible for whatever's asked. No match -> the words
    // you typed + the general pool. Edit/extend freely — keys are matched as lowercase substrings.
    const GENERAL_POOL = ["CBC", "CBC with differential", "Basic metabolic panel", "Comprehensive metabolic panel",
        "Supportive care", "Monitor and reassess", "Further workup", "Reassurance and follow-up", "Inflammation",
        "Apoptosis", "ATP", "Negative feedback", "Positive feedback", "Homeostasis", "Oxidative stress", "Hypoxia",
        "Ischemia", "Necrosis", "Mitochondria", "Enzyme inhibition", "Membrane potential", "Signal transduction",
        "Gene expression", "Cell signaling", "Protein folding", "Diffusion", "Active transport", "Multifactorial",
        "Idiopathic", "Depends on the mechanism"];

    const TOPIC_BANKS = [
        { keys: ["thyroid", "endocrine", "hormone", "pituitary", "adrenal", "diabet", "insulin", "cortisol", "glucose",
            "hypoglyc", "hyperglyc", "acromegal", "cushing", "addison", "parathyroid", "aldosteron", "glucagon",
            "prolactin", "growth hormone", "goiter", "thyrotox", "gland", "hypercalc", "hypocalc"],
          answers: ["TSH and free T4", "Free T3", "CBC", "Thyroid ultrasound", "TPO antibodies", "Radioactive iodine uptake scan",
            "Fine needle aspiration", "Hashimoto thyroiditis", "Graves disease", "Levothyroxine", "Methimazole",
            "Propylthiouracil", "Hypothyroidism", "Hyperthyroidism", "Follicular cells", "Colloid", "Parafollicular C cells",
            "Thyroglobulin", "Negative feedback", "Goiter", "Myxedema", "Calcitonin", "Insulin resistance", "Cushing syndrome",
            "Addison disease", "Pheochromocytoma", "Plasma metanephrines", "ACTH", "Aldosterone", "Dexamethasone suppression test",
            "Hemoglobin A1c", "Metformin", "Diabetic ketoacidosis", "Parathyroid hormone", "Hypercalcemia", "Prolactinoma",
            "Acromegaly", "Growth hormone", "Somatostatin", "Adrenal cortex"] },
        { keys: ["genetic", "inherit", "bayesian", "mendel", "pedigree", "chromosom", "mutation", "dna", "allele",
            "genotype", "phenotype", "trisomy", "aneuploid", "karyotype", "hereditary", "congenital", "deletion",
            "translocation", "imprint", "penetrance", "expressivity", "polymorphism", "genomic", "locus"],
          answers: ["Autosomal recessive", "Autosomal dominant", "X-linked recessive", "X-linked dominant",
            "Mitochondrial inheritance", "Incomplete penetrance", "Variable expressivity", "Anticipation",
            "Carrier testing", "Karyotype", "Pedigree analysis", "Bayesian probability", "Hardy-Weinberg equilibrium",
            "De novo mutation", "Nondisjunction", "Trinucleotide repeat expansion", "Genomic imprinting", "Mosaicism",
            "Punnett square", "Consanguinity", "Frameshift mutation", "Missense mutation", "Nonsense mutation",
            "Silent mutation", "FISH", "Chromosomal microarray", "CBC", "Trisomy 21", "Loss of heterozygosity",
            "Codominance", "Pleiotropy", "Locus heterogeneity", "Allelic heterogeneity", "Point mutation",
            "Uniparental disomy", "Lyonization", "Founder effect", "Gene therapy", "Linkage disequilibrium", "Meiotic nondisjunction"] },
        { keys: ["cardio", "heart", "cardiac", "vascular", "coronary", "hypertens", "ecg", "ekg", "circulat",
            "arrhythmi", "myocard", "valve", "aort", "atrial", "ventric", "ischem", "angina", "atheroscler",
            "blood pressure", "pericard", "endocard", "murmur", "tachycard", "bradycard"],
          answers: ["ECG", "Troponin", "CBC", "Echocardiogram", "Reduced ejection fraction", "Myocardial infarction",
            "Atherosclerosis", "Beta blocker", "ACE inhibitor", "Loop diuretic", "Afterload", "Preload", "Frank-Starling mechanism",
            "Cardiac output", "Automaticity", "Cardiac action potential", "L-type calcium channels", "Left ventricular hypertrophy",
            "Nitric oxide", "Baroreceptor reflex", "Angina pectoris", "Statin", "Ejection fraction", "Atrial fibrillation",
            "BNP", "Lipid panel", "Coronary angiography", "Stress test", "Nitroglycerin", "Aspirin", "Heparin",
            "Stroke volume", "Sinoatrial node", "AV node", "Purkinje fibers", "Hypertension", "Heart failure",
            "Aortic stenosis", "Mitral regurgitation", "Pericarditis"] },
        { keys: ["renal", "kidney", "nephro", "glomer", "urinary", "urine", "electrolyte", "acid-base", "dialysis",
            "diuretic", "sodium", "potassium", "filtrat", "creatinine", "proteinuria", "hematuria", "uremi", "nephron",
            "bladder", "ureter", "acidosis", "alkalosis", "renin", "pyelonephr"],
          answers: ["Urinalysis", "Basic metabolic panel", "CBC", "GFR", "Creatinine", "RAAS activation",
            "Acute tubular necrosis", "Loop diuretic", "Hyperkalemia", "Metabolic acidosis", "Nephrotic syndrome",
            "Nephritic syndrome", "Podocytes", "Juxtaglomerular apparatus", "Countercurrent multiplier", "Aldosterone",
            "ADH", "Proximal convoluted tubule", "Urinary casts", "BUN", "Renin", "Proteinuria", "Thiazide diuretic",
            "Spironolactone", "Chronic kidney disease", "Glomerulonephritis", "Renal clearance", "Filtration fraction",
            "Distal convoluted tubule", "Loop of Henle", "Macula densa", "Angiotensin II", "Erythropoietin", "Hematuria",
            "Red cell casts", "Sodium reabsorption", "Bicarbonate", "Anion gap", "Dialysis", "Acute kidney injury"] },
        { keys: ["pulm", "respir", "lung", "airway", "breath", "ventilat", "asthma", "copd", "bronch", "alveol",
            "oxygen", "hypox", "pneumo", "pleur", "gas exchang", "spiromet", "dyspnea", "tidal", "emphysem",
            "embolism", "hypercapn", "trachea", "atelectas"],
          answers: ["Chest X-ray", "Arterial blood gas", "CBC", "Spirometry", "Hypoxemia", "V/Q mismatch",
            "Bronchodilator", "Surfactant", "Pneumonia", "Obstructive pattern", "Restrictive pattern", "Type II pneumocytes",
            "Alveoli", "Oxygen-hemoglobin dissociation curve", "Dead space", "Lung compliance", "Hypercapnia", "Pulmonary edema",
            "Cilia", "Goblet cells", "COPD", "Asthma", "Albuterol", "Inhaled corticosteroids", "Pulmonary embolism",
            "CT pulmonary angiogram", "FEV1/FVC ratio", "Tidal volume", "Residual volume", "Partial pressure of oxygen",
            "Hypoventilation", "Pulmonary fibrosis", "Club cells", "Type I pneumocytes", "Respiratory acidosis",
            "Bronchoconstriction", "Pleural effusion", "Pulse oximetry", "Hypoxic pulmonary vasoconstriction", "Carbon dioxide transport"] },
        { keys: ["gastro", "liver", "hepat", "intestin", "bowel", "digest", "pancrea", "biliary", " gi ", "stomach",
            "colorect", "esophag", "duoden", "jaundice", "cirrhos", "ulcer", "absorpt", "bile", "gallbladder",
            "portal", "ascites", "diarrhea", "constipat", "splanchnic"],
          answers: ["CBC", "Liver function tests", "Lipase", "Amylase", "PPI", "H. pylori", "Cirrhosis", "Portal hypertension",
            "Malabsorption", "Peptic ulcer", "Intestinal villi", "Brush border", "Parietal cells", "Bile", "Bilirubin",
            "Pancreatic enzymes", "Hepatocytes", "Chief cells", "Gastrin", "Secretin", "Hepatic steatosis", "Ascites",
            "Cholecystitis", "Abdominal ultrasound", "Upper endoscopy", "Colonoscopy", "Inflammatory bowel disease",
            "Pancreatitis", "Jaundice", "Kupffer cells", "Enterohepatic circulation", "Cholecystokinin", "Hydrochloric acid",
            "Pepsin", "Intrinsic factor", "Bile salts", "Alkaline phosphatase", "Portal triad", "Omeprazole", "Liver biopsy"] },
        { keys: ["heme", "haema", "hemat", "blood", "anemia", "anaemia", "leukem", "coag", "platelet", "clott",
            "thrombo", "hemoglobin", "bleeding", "bone marrow", "lymphoma", "sickle", "transfus", "iron", "erythro",
            "neutropen", "hemostas", "spleen"],
          answers: ["CBC", "CBC with differential", "Peripheral blood smear", "Iron studies", "Iron deficiency anemia",
            "Hemolysis", "Thrombocytopenia", "Vitamin B12 deficiency", "Reticulocyte count", "Hemoglobin", "Sickle cell disease",
            "Spherocytes", "Coagulation cascade", "Platelets", "Erythropoietin", "Hematocrit", "Megaloblastic anemia",
            "Ferritin", "Haptoglobin", "Bone marrow biopsy", "Prothrombin time", "Partial thromboplastin time", "Folate deficiency",
            "Thalassemia", "Von Willebrand factor", "Fibrinogen", "Factor VIII", "Warfarin", "Heparin", "Vitamin K",
            "D-dimer", "Schistocytes", "Hemophilia", "Leukocytosis", "Blast cells", "Howell-Jolly bodies", "Target cells",
            "Direct Coombs test", "Hemoglobin electrophoresis", "Anisocytosis"] },
        { keys: ["neuro", "brain", "nerve", "cns", "spinal", "cerebr", "demyelin", "synap", "neurotransmit", "seizure",
            "stroke", "cortex", "motor", "sensory", "reflex", "axon", "glia", "parkinson", "alzheimer", "meningitis",
            "cerebell", "cranial"],
          answers: ["MRI brain", "Lumbar puncture", "CBC", "Acetylcholine", "Dopamine", "GABA", "Glutamate",
            "Upper motor neuron", "Lower motor neuron", "Demyelination", "Seizure", "Action potential", "Myelin sheath",
            "Oligodendrocytes", "Astrocytes", "Blood-brain barrier", "Resting membrane potential", "Reflex arc", "Ischemic stroke",
            "Multiple sclerosis", "Substantia nigra", "CT head", "Norepinephrine", "Serotonin", "Saltatory conduction",
            "Nodes of Ranvier", "Schwann cells", "Microglia", "Neuromuscular junction", "Parkinson disease", "Alzheimer disease",
            "Basal ganglia", "Cerebellum", "Corticospinal tract", "Dorsal columns", "CSF analysis", "Long-term potentiation",
            "Voltage-gated sodium channels", "Levodopa", "Spinal reflex"] },
        { keys: ["micro", "infect", "bacteri", "virus", "viral", "antibiotic", "sepsis", "pathogen", "fung", "parasit",
            "gram stain", "gram-negative", "gram-positive", "culture", "vaccin", "antimicrob", "resistance", "toxin",
            "biofilm", "mycobacter", "staph", "strep", "protozoa", "immuniz", "epidemic"],
          answers: ["CBC", "Blood cultures", "Gram stain", "Penicillin", "Vancomycin", "Gram-positive cocci",
            "Gram-negative rods", "Sepsis", "Endotoxin", "Exotoxin", "Beta-lactam", "Lipopolysaccharide", "Biofilm",
            "Catalase positive", "Coagulase positive", "Obligate anaerobe", "Culture and sensitivity", "Cell wall synthesis inhibition",
            "Leukocytosis", "Fever", "Ceftriaxone", "Azithromycin", "Methicillin resistance", "Peptidoglycan", "Spore formation",
            "Acid-fast stain", "Mycobacterium tuberculosis", "Polymerase chain reaction", "Antigenic shift", "Reverse transcriptase",
            "Bacterial capsule", "Flagella", "Lytic cycle", "Beta-hemolysis", "Minimum inhibitory concentration", "Fluoroquinolone",
            "Aminoglycoside", "Protein synthesis inhibition", "Viral envelope", "Opportunistic infection"] },
        { keys: ["immun", "antibody", "antigen", "complement", "hypersensitiv", "allerg", "autoimmun", "inflammat",
            "cytokine", "lymphocyte", "t cell", "b cell", "mhc", "interleukin", "interferon", "tolerance", "transplant",
            "phagocyt", "innate", "adaptive", "immunoglobulin", "chemokine"],
          answers: ["CBC", "Flow cytometry", "IgG", "IgM", "IgA", "IgE", "IgD", "Complement activation", "T cells", "B cells",
            "MHC class I", "MHC class II", "Cytokines", "Type I hypersensitivity", "Type II hypersensitivity",
            "Type III hypersensitivity", "Type IV hypersensitivity", "Macrophages", "Neutrophils", "Antigen presentation",
            "Cytotoxic T cells", "Helper T cells", "Interleukins", "Clonal selection", "Natural killer cells", "Dendritic cells",
            "Interferon gamma", "Tumor necrosis factor", "Central tolerance", "Opsonization", "Memory B cells", "Plasma cells",
            "Histamine", "Mast cells", "Regulatory T cells", "Antibody class switching", "Membrane attack complex",
            "Toll-like receptors", "Perforin", "Immunodeficiency"] },
        { keys: ["biochem", "metabol", "enzyme", "glycol", "krebs", "citric", "lipid", "protein", "atp",
            "carbohydrate", "amino acid", "catabol", "anabol", "mitochond", "cofactor", "phosphoryl", "substrate",
            "molecular", "nucleotide", "pathway", "oxidative", "bioenerget"],
          answers: ["Glycolysis", "Citric acid cycle", "Oxidative phosphorylation", "ATP", "NADH", "FADH2", "Gluconeogenesis",
            "Beta oxidation", "Rate-limiting enzyme", "Allosteric regulation", "Michaelis-Menten kinetics", "Cofactor",
            "Pyruvate", "Acetyl-CoA", "Urea cycle", "Pentose phosphate pathway", "Vitamin B12", "Enzyme kinetics",
            "Feedback inhibition", "Lactate", "CBC", "Km", "Vmax", "Competitive inhibitor", "Noncompetitive inhibitor",
            "Electron transport chain", "Glycogen synthesis", "Glycogenolysis", "Ketone bodies", "Fatty acid synthesis",
            "Cholesterol synthesis", "Phosphofructokinase-1", "Hexokinase", "Coenzyme A", "NADPH", "Substrate-level phosphorylation",
            "Lipoprotein lipase", "Glucose-6-phosphate", "Thiamine", "Proteolysis"] },
        { keys: ["pharm", "drug", "medication", "receptor", "agonist", "dose", "kinetic", "antagonist", "bioavail",
            "clearance", "half-life", "potency", "efficacy", "toxicity", "adverse", "therapeutic", "inhibitor",
            "dosing", "excretion", "distribution", "p450", "prodrug"],
          answers: ["Beta blocker", "ACE inhibitor", "NSAID", "Statin", "Competitive inhibition", "Agonist", "Antagonist",
            "First-pass metabolism", "Half-life", "Cytochrome P450", "Volume of distribution", "Receptor binding",
            "Efficacy", "Potency", "Therapeutic index", "Loading dose", "Zero-order kinetics", "First-order kinetics",
            "Bioavailability", "CBC", "Partial agonist", "Inverse agonist", "Noncompetitive antagonist", "ED50", "LD50",
            "Steady state", "Renal excretion", "Hepatic metabolism", "Enzyme induction", "Enzyme inhibition", "Maintenance dose",
            "Clearance", "Tolerance", "Drug-drug interaction", "Phase I metabolism", "Phase II metabolism", "Prodrug",
            "Receptor downregulation", "Cholinergic", "Adrenergic"] },
        { keys: ["repro", "pregnan", "fetal", "foetal", "gonad", "menstru", "ovar", "testis", "obstet", "gynec",
            "uterus", "sperm", "estrogen", "progesteron", "testosteron", "fertil", "placenta", "contracept", "puberty",
            "lactation", "oocyte", "androgen"],
          answers: ["CBC", "Beta-hCG", "Pelvic ultrasound", "Estrogen", "Progesterone", "LH surge", "FSH",
            "Spermatogenesis", "Oogenesis", "Placenta", "Leydig cells", "Sertoli cells", "Corpus luteum", "Menstrual cycle",
            "Testosterone", "Meiosis", "Trophoblast", "Zona pellucida", "Ovulation", "Follicular phase", "Luteal phase",
            "Inhibin", "Human chorionic gonadotropin", "Dihydrotestosterone", "Aromatase", "Endometrium", "Seminiferous tubules",
            "Acrosome reaction", "Capacitation", "Blastocyst", "Implantation", "Granulosa cells", "Theca cells", "GnRH",
            "Prolactin", "Oxytocin", "Amniotic fluid", "Gametogenesis", "Spermatozoa", "Progesterone withdrawal"] },
        { keys: ["musculo", "bone", "muscle", "skelet", "ortho", "skin", "derm", "joint", "connective", "cartilage",
            "collagen", "tendon", "fracture", "arthrit", "osteo", "sarcomere", "myofiber", "ligament", "keratin",
            "epidermis", "contraction", "actin"],
          answers: ["CBC", "X-ray", "Osteoblasts", "Osteoclasts", "Collagen", "Actin and myosin", "Sarcomere", "Calcium",
            "Vitamin D", "Rheumatoid arthritis", "Keratinocytes", "Melanocytes", "Fibroblasts", "Epidermis", "Troponin",
            "Osteoporosis", "Cross-bridge cycling", "Hydroxyapatite", "Osteoarthritis", "Gout", "Uric acid", "Synovial fluid",
            "Z-line", "Tropomyosin", "Sarcoplasmic reticulum", "Myosin ATPase", "Type I collagen", "Osteoid",
            "Parathyroid hormone", "Alkaline phosphatase", "Dermis", "Stratum corneum", "Elastin", "Chondrocytes",
            "Rhabdomyolysis", "Creatine kinase", "Motor unit", "Fast-twitch fibers", "Slow-twitch fibers", "DEXA scan"] },
        { keys: ["embryo", "developmen", "gastrula", "neural tube", "organogen", "germ layer", "teratogen", "morphogen",
            "pharyngeal", "somite", "notochord", "ectoderm", "mesoderm", "endoderm", "cleavage", "fetal circ", "branchial",
            "neural crest", "limb bud", "congenital malform", "neurulat", "primitive streak"],
          answers: ["Ectoderm", "Mesoderm", "Endoderm", "Neural crest cells", "Neural tube", "Notochord", "Gastrulation",
            "Somites", "Pharyngeal arches", "Teratogen", "Folic acid", "Neural tube defect", "Organogenesis", "Morphogen gradient",
            "Sonic hedgehog", "HOX genes", "Blastocyst", "Trophoblast", "Yolk sac", "Allantois", "Foramen ovale",
            "Ductus arteriosus", "Ductus venosus", "Branchial clefts", "Limb buds", "Apoptosis", "Fetal hemoglobin",
            "Placental circulation", "Germ layers", "Primitive streak", "Cleavage", "Neurulation", "Cardiac looping",
            "Spina bifida", "Cleft palate", "Retinoic acid", "CBC", "Obstetric ultrasound", "Amniocentesis", "Umbilical vessels"] },
        { keys: ["histolog", "cytolog", "organelle", "epitheli", "cytoskelet", "membrane transport", "ribosom", "golgi",
            "endoplasm", "lysosom", "nucleolus", "microtubul", "cell junction", "cilia", "secretory", "connective tissue",
            "histochem", "microscop", "cell cycle", "membrane protein", "intracellular", "extracellular"],
          answers: ["Epithelial tissue", "Simple squamous epithelium", "Stratified squamous epithelium", "Columnar epithelium",
            "Connective tissue", "Golgi apparatus", "Rough endoplasmic reticulum", "Smooth endoplasmic reticulum", "Lysosomes",
            "Peroxisomes", "Mitochondria", "Ribosomes", "Nucleus", "Nucleolus", "Cytoskeleton", "Microtubules", "Actin filaments",
            "Intermediate filaments", "Tight junctions", "Desmosomes", "Gap junctions", "Basement membrane", "Cilia", "Microvilli",
            "Cell membrane", "Phospholipid bilayer", "Sodium-potassium pump", "Endocytosis", "Exocytosis", "Hematoxylin and eosin stain",
            "Apoptosis", "Cell cycle", "Mitosis", "G1 phase", "S phase", "Centrioles", "Flagella", "Collagen fibers",
            "Elastic fibers", "CBC"] },
        { keys: ["biostat", "statisti", "epidemiolog", "sensitiv", "specific", "prevalenc", "incidence", "p-value",
            "confidence interval", "correlat", "regression", "cohort", "case-control", "randomiz", "bias", "hypothesis test",
            "risk ratio", "odds ratio", "screening", "likelihood ratio", "predictive value", "meta-analys", "confound", "significance"],
          answers: ["Sensitivity", "Specificity", "Positive predictive value", "Negative predictive value", "Prevalence",
            "Incidence", "P-value", "Confidence interval", "Relative risk", "Odds ratio", "Absolute risk reduction",
            "Number needed to treat", "Cohort study", "Case-control study", "Randomized controlled trial", "Selection bias",
            "Recall bias", "Confounding", "Null hypothesis", "Type I error", "Type II error", "Statistical power", "Mean",
            "Median", "Mode", "Standard deviation", "Normal distribution", "Correlation coefficient", "Linear regression",
            "Meta-analysis", "Systematic review", "Hazard ratio", "Likelihood ratio", "Attributable risk", "Lead-time bias",
            "Chi-square test", "Student t-test", "Kaplan-Meier curve", "Intention-to-treat analysis", "Cross-sectional study"] },
        { keys: ["neoplas", "oncolog", "cancer", "tumor", "tumour", "carcinoma", "malignan", "metasta", "carcinogen",
            "sarcoma", "oncogene", "apopto", "angiogen", "chemotherap", "radiation therap", "biopsy", "tumor grad",
            "tumor stag", "dysplasia", "proliferat", "benign", "mitotic"],
          answers: ["Biopsy", "CBC", "Oncogene", "Tumor suppressor gene", "p53", "Metastasis", "Carcinoma in situ",
            "Adenocarcinoma", "Squamous cell carcinoma", "Angiogenesis", "Evasion of apoptosis", "Dysplasia", "Anaplasia",
            "Tumor grading", "Tumor staging", "TNM staging", "Chemotherapy", "Radiation therapy", "Tumor markers",
            "Proto-oncogene", "RAS mutation", "Loss of heterozygosity", "Immunohistochemistry", "Mitotic index", "Benign tumor",
            "Malignant tumor", "Carcinogen", "Metaplasia", "Hyperplasia", "Neovascularization", "Cachexia", "Tumor microenvironment",
            "Monoclonal origin", "Telomerase activation", "Loss of contact inhibition", "BRCA mutation", "Lymphatic spread",
            "Paraneoplastic syndrome", "Necrosis", "Flow cytometry"] },
        { keys: ["psych", "behavior", "mood", "depress", "anxiety", "schizophren", "bipolar", "cognitive", "mental health",
            "mental illness", "addiction", "substance", "antidepress", "antipsychot", "personality", "delirium", "dementia",
            "post-traumatic", "phobia", "ocd", "dopamine reward", "withdrawal"],
          answers: ["Selective serotonin reuptake inhibitor", "Serotonin", "Dopamine", "Norepinephrine", "GABA",
            "Major depressive disorder", "Generalized anxiety disorder", "Bipolar disorder", "Schizophrenia", "Antipsychotics",
            "Benzodiazepines", "Fluoxetine", "Sertraline", "Lithium", "Dopamine hypothesis", "Positive symptoms", "Negative symptoms",
            "Cognitive behavioral therapy", "Monoamine hypothesis", "Tricyclic antidepressants", "MAO inhibitors",
            "Serotonin syndrome", "Extrapyramidal symptoms", "Tardive dyskinesia", "Dependence", "Tolerance", "Withdrawal",
            "Reward pathway", "Nucleus accumbens", "Limbic system", "Amygdala", "Hippocampus", "Classical conditioning",
            "Operant conditioning", "Delirium", "Dementia", "Post-traumatic stress disorder", "Obsessive-compulsive disorder",
            "CBC", "Mental status exam"] },
        { keys: ["nutrit", "vitamin", "mineral", "deficienc", "malnutrit", "diet", "folate", "folic", "thiamine", "scurvy",
            "rickets", "trace element", "zinc", "niacin", "cobalamin", "retinol", "calciferol", "tocopherol", "biotin",
            "pyridoxine", "micronutrient", "antioxidant", "riboflavin"],
          answers: ["Vitamin A", "Vitamin B1 (thiamine)", "Vitamin B2 (riboflavin)", "Vitamin B3 (niacin)", "Vitamin B6 (pyridoxine)",
            "Vitamin B9 (folate)", "Vitamin B12 (cobalamin)", "Vitamin C", "Vitamin D", "Vitamin E", "Vitamin K", "Scurvy",
            "Rickets", "Beriberi", "Pellagra", "Wernicke encephalopathy", "Iron", "Zinc", "Iodine", "Calcium", "Magnesium",
            "Folate deficiency", "Megaloblastic anemia", "Night blindness", "Fat-soluble vitamins", "Water-soluble vitamins",
            "Intrinsic factor", "Antioxidant", "Collagen synthesis", "Marasmus", "Kwashiorkor", "Albumin", "Prealbumin", "CBC",
            "Body mass index", "Basal metabolic rate", "Omega-3 fatty acids", "Selenium", "Copper", "Homocysteine"] }
    ];

    const STOP = new Set(["the", "a", "an", "of", "to", "and", "or", "for", "in", "on", "with", "application",
        "calculation", "disorders", "disorder", "medical", "introduction", "overview", "lecture", "part", "approach",
        "clinical", "basic", "science", "sciences", "principles", "foundations", "systems", "system", "week", "module",
        "unit", "case", "cases", "review", "intro", "physiology", "pathology", "biology", "function", "structure"]);

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
