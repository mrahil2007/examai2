// ─── THEME ────────────────────────────────────────────────────────────────────
export const G = {
  bg:      "#ffffff",
  bg2:     "#f8fafc",
  surface: "#f1f5f9",
  surf2:   "#e2e8f0",
  gold:    "#4d8c7a",
  goldL:   "#3a7a6a",
  saffron: "#0d9488",
  teal:    "#0d9488",
  text:    "#0f172a",
  muted:   "#64748b",
  border:  "rgba(77,140,122,0.25)",
  border2: "rgba(0,0,0,0.08)",
  error:   "#e53e3e",
  glow:    "rgba(77,140,122,0.15)",
} as const;

// ─── EXAMS ────────────────────────────────────────────────────────────────────
export const EXAMS = [
  "UPSC","JEE","NEET","CLAT-UG","CUET-UG","NDA","UGC-NET","GATE","GMAT","SSC","Banking","Railway","CAT","State PCS","General",
] as const;

export type Exam = typeof EXAMS[number];

// ─── EXAM META ────────────────────────────────────────────────────────────────
export const EXAM_META: Record<string, { icon: string; color: string; desc: string }> = {
  UPSC:       { icon: "🏛️", color: "#f0a500", desc: "Civil Services · IAS / IPS / IFS" },
  JEE:        { icon: "⚡", color: "#3b82f6", desc: "Engineering · IIT / NIT / IIIT" },
  NEET:       { icon: "🧬", color: "#22c55e", desc: "Medical · MBBS / BDS / AYUSH" },
  "CLAT-UG":  { icon: "⚖️", color: "#f97316", desc: "Law Entrance · NLUs" },
  "CUET-UG":  { icon: "📚", color: "#06b6d4", desc: "Central Universities Entrance Test" },
  NDA:        { icon: "🪖", color: "#6366f1", desc: "National Defence Academy" },
  "UGC-NET":  { icon: "🎓", color: "#22c55e", desc: "Assistant Professor / JRF Eligibility" },
  GATE:       { icon: "🛠️", color: "#14b8a6", desc: "Graduate Aptitude Test in Engineering" },
  GMAT:       { icon: "🎯", color: "#8b5cf6", desc: "MBA Admission Test · Business Schools" },
  SSC:        { icon: "📋", color: "#f97316", desc: "Staff Selection Commission · CGL / CHSL" },
  Banking:    { icon: "🏦", color: "#a855f7", desc: "IBPS PO / Clerk · SBI · RBI" },
  Railway:    { icon: "🚂", color: "#06b6d4", desc: "RRB NTPC / Group D / ALP" },
  CAT:        { icon: "📊", color: "#ec4899", desc: "MBA Entrance · IIM · Top B-Schools" },
  "State PCS":{ icon: "🗺️", color: "#84cc16", desc: "State Civil Services · SDM / DSP" },
  General:    { icon: "🌟", color: "#f0a500", desc: "General Preparation · All Exams" },
};

// ─── STATE PCS LIST ───────────────────────────────────────────────────────────
export const STATE_PCS_LIST = [
  "Uttar Pradesh (UPPSC)",
  "Bihar (BPSC)",
  "Madhya Pradesh (MPPSC)",
  "Rajasthan (RPSC)",
  "Maharashtra (MPSC)",
  "Gujarat (GPSC)",
  "Karnataka (KPSC)",
  "Tamil Nadu (TNPSC)",
  "Andhra Pradesh (APPSC)",
  "Telangana (TSPSC)",
  "Kerala (KPSC)",
  "Haryana (HPSC)",
  "Punjab (PPSC)",
  "Himachal Pradesh (HPPSC)",
  "Uttarakhand (UKPSC)",
  "Jharkhand (JPSC)",
  "Chhattisgarh (CGPSC)",
  "Odisha (OPSC)",
  "West Bengal (WBPSC)",
  "Assam (APSC)",
];

// ─── TOPIC PLACEHOLDERS ───────────────────────────────────────────────────────
export const TOPIC_PH: Record<string, string> = {
  UPSC:        "e.g. Indian Polity, Geography, Modern History…",
  JEE:         "e.g. Electrostatics, Organic Chemistry, Calculus…",
  NEET:        "e.g. Cell Biology, Human Physiology, Genetics…",
  "CLAT-UG":   "e.g. Legal Reasoning, Logical Reasoning, Current Affairs…",
  "CUET-UG":   "e.g. English, General Test, Domain Subjects…",
  NDA:         "e.g. Mathematics, General Ability, Defence Current Affairs…",
  "UGC-NET":   "e.g. Paper 1 Teaching Aptitude, Research Aptitude, Subject topics…",
  GATE:        "e.g. Signals & Systems, Data Structures, Control Systems…",
  GMAT:        "e.g. Quantitative Reasoning, Verbal, Data Insights…",
  SSC:         "e.g. Reasoning, English Grammar, GK…",
  Banking:     "e.g. Quantitative Aptitude, English, Banking Awareness…",
  Railway:     "e.g. General Science, Mathematics, General Awareness…",
  CAT:         "e.g. Verbal Ability, Data Interpretation, Logical Reasoning…",
  "State PCS": "e.g. State History, Economy, Polity…",
  General:     "e.g. Any topic you want to practice…",
};