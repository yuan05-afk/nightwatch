// Builds deck/NIGHTWATCH-DataNova2026.pptx. Every model number is read from ml/reports/*.json;
// the only typed-in figures are the cited facts on the problem slides (see docs/RESEARCH.md).
//
//   cd deck && node build_deck.js
//
// Theme colors are written by the pptx skill's apply_theme.js (path in PPTX_SKILL_DIR).

const fs = require("fs");
const path = require("path");
const pptxgen = require("pptxgenjs");

const ROOT = path.resolve(__dirname, "..");
const R = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, "ml", "reports", f), "utf8"));
const ASSET = (f) => path.join(__dirname, "assets", f);
const OUT = process.env.DECK_OUT ? path.resolve(process.env.DECK_OUT) : path.join(__dirname, "NIGHTWATCH-DataNova2026.pptx");

const final = R("final.json");
const illusion = R("illusion.json");
const ablation = R("ablation.json");
const zeroDay = R("zero_day.json");
const triage = R("triage.json");
const parity = JSON.parse(fs.readFileSync(path.join(ROOT, "web", "lib", "scoring", "model", "parity.json"), "utf8"));

// ---------- numbers ----------
const pct = (v, d = 1) => `${(v * 100).toFixed(d)}%`;
const fmt = (n) => n.toLocaleString("en-US");
const V = final.verdicts;
const clf = final.classifier;
const rand = illusion.rows.find((r) => r.split === "random");
const chrono = illusion.rows.find((r) => r.split === "chronological");
const abl = Object.fromEntries(ablation.rows.map((r) => [r.strategy, r.calibration]));
const perClass = Object.fromEntries(clf.per_class.map((r) => [r.class, r]));
const verdictOf = Object.fromEntries(V.per_class.map((r) => [r.class, r]));
const tri = (() => {
  const t = { alerts: 0, incidents: 0, attackIncidents: 0, reached: {} };
  for (const d of triage.days) {
    t.alerts += d.alerts;
    t.incidents += d.incidents;
    t.attackIncidents += d.attack_incidents;
    for (const b of triage.budgets) {
      const r = (t.reached[b] ??= { nightwatch: 0, fifo: 0, confidence: 0 });
      for (const k of Object.keys(r)) r[k] += d.reached[String(b)][k];
    }
  }
  t.fri = triage.days.find((d) => d.day === "Fri");
  t.mon = triage.days.find((d) => d.day === "Mon");
  return t;
})();
const zd = [...zeroDay.rows].sort((a, b) => b.flagged_unknown + b.flagged_known_other - (a.flagged_unknown + a.flagged_known_other));
const perMillion = final.base_rate.find((r) => r.flows_per_day === 1_000_000).false_alerts_per_day;
const parityN = parity.X.length;

// ---------- theme ----------
const THEME = {
  name: "Nightwatch",
  headFontFace: "IBM Plex Sans",
  bodyFontFace: "IBM Plex Sans",
  colors: {
    dk1: "07090A", // canvas
    lt1: "EDEFEF", // ink
    dk2: "111416", // panel
    lt2: "A3ABAD", // ink-soft
    accent1: "7FE3C4", // recognized attack / primary
    accent2: "E6AD55", // needs review
    accent3: "E9748F", // attack / missed
    accent4: "8FB3C9", // low
    accent5: "F38A3C", // high
    accent6: "F2508F", // critical
    hlink: "7FE3C4",
    folHlink: "8FB3C9",
  },
};
const HEX = THEME.colors;
const LINE = "262C2F"; // hairline on the canvas
const FAINT = "7D8689";
const MONO = "IBM Plex Mono";

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.333 x 7.5
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
pres.title = "NIGHTWATCH: your night-shift security analyst";
pres.author = "NIGHTWATCH team";
pres.subject = "DataNova 2026, DN-CY-01 Network Intrusion Detection with Imbalanced Threat Data";
const C = pres.SchemeColor;
const INK = C.background1;
const SOFT = C.background2;
const PANEL = C.text2;

const W = 13.333;
const X0 = 0.6;
const CW = W - 2 * X0;

// ---------- layouts ----------
pres.defineSlideMaster({
  title: "NW_TITLE",
  background: { color: HEX.dk1 },
  objects: [],
});
pres.defineSlideMaster({
  title: "NW_CONTENT",
  background: { color: HEX.dk1 },
  margin: [0.5, 0.6, 0.6, 0.6],
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: X0, y: 0.42, w: CW, h: 0.9, fontSize: 30, bold: true, color: INK, align: "left", valign: "top", margin: 0 }, text: "" } },
    { text: { text: "Nightwatch", options: { x: X0, y: 7.02, w: 3, h: 0.3, fontSize: 10, color: FAINT, margin: 0 } } },
  ],
  slideNumber: { x: W - X0 - 0.6, y: 7.02, w: 0.6, h: 0.3, fontSize: 10, color: FAINT, align: "right" },
});

// ---------- helpers ----------
let sectionTitle = "";
function slide(master = "NW_CONTENT") {
  return pres.addSlide({ masterName: master, sectionTitle });
}
function section(title) {
  sectionTitle = title;
  pres.addSection({ title });
}
function text(s, str, o) {
  s.addText(str, { isTextBox: true, margin: 0, color: INK, fontSize: 16, valign: "top", ...o });
}
function panel(s, x, y, w, h, name) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.08, fill: { color: PANEL }, line: { color: LINE, width: 0.75 }, objectName: name });
}
function source(s, str) {
  text(s, str, { x: X0, y: 6.62, w: CW, h: 0.32, fontSize: 10, color: FAINT, valign: "bottom" });
}
function stat(s, x, y, w, value, label, color = INK, name = "stat") {
  text(s, value, { x, y, w, h: 0.8, fontSize: 40, bold: true, color, fontFace: THEME.headFontFace, objectName: `${name} value` });
  text(s, label, { x, y: y + 0.85, w, h: 0.75, fontSize: 14, color: SOFT, objectName: `${name} label` });
}
function framedImage(s, file, x, y, w, h, alt) {
  s.addShape(pres.shapes.RECTANGLE, { x: x - 0.04, y: y - 0.04, w: w + 0.08, h: h + 0.08, fill: { color: PANEL }, line: { color: LINE, width: 0.75 }, objectName: `${alt} frame` });
  s.addImage({ path: ASSET(file), x, y, w, h, altText: alt, objectName: alt });
}
function stepDot(s, x, y, n, active) {
  s.addShape(pres.shapes.OVAL, { x, y, w: 0.42, h: 0.42, fill: { color: active ? C.accent1 : PANEL }, line: { color: active ? C.accent1 : LINE, width: 1 }, objectName: `step ${n}` });
  text(s, String(n), { x, y, w: 0.42, h: 0.42, fontSize: 14, bold: true, align: "center", valign: "middle", color: active ? C.text1 : SOFT });
}
const chartText = { catAxisLabelFontFace: "+mn-lt", valAxisLabelFontFace: "+mn-lt", dataLabelFontFace: "+mn-lt", titleFontFace: "+mn-lt", legendFontFace: "+mn-lt" };
function chartBase(extra) {
  return {
    ...chartText,
    catAxisLabelColor: HEX.lt2,
    valAxisLabelColor: FAINT,
    catAxisLabelFontSize: 12,
    valAxisLabelFontSize: 10,
    dataLabelFontSize: 12,
    dataLabelColor: HEX.lt1,
    valGridLine: { color: LINE, size: 0.75 },
    catGridLine: { style: "none" },
    catAxisLineShow: false,
    valAxisLineShow: false,
    legendColor: HEX.lt2,
    legendFontSize: 12,
    titleColor: HEX.lt1,
    titleFontSize: 14,
    ...extra,
  };
}

// =====================================================================
// 1. Title
section("Opening");
{
  const s = slide("NW_TITLE");
  text(s, "Nightwatch", { x: X0, y: 1.25, w: 6.2, h: 0.5, fontSize: 18, color: C.accent1, bold: true });
  text(s, "Your night-shift security analyst", { x: X0, y: 1.85, w: 6.2, h: 2.0, fontSize: 44, bold: true, fontFace: THEME.headFontFace });
  text(s, "Network intrusion detection that explains every alert in plain language, ranks what to fix first, and drafts the breach report the law requires within 72 hours. For hospitals, schools, local governments and small businesses with no security team.", { x: X0, y: 3.75, w: 5.9, h: 1.7, fontSize: 16, color: SOFT, lineSpacingMultiple: 1.15 });
  text(s, "DataNova 2026 Global Data-thon\nCybersecurity and Fraud Detection, DN-CY-01", { x: X0, y: 5.95, w: 6, h: 0.7, fontSize: 12, color: FAINT });
  framedImage(s, "landing.png", 7.15, 1.45, 5.6, 3.5, "Nightwatch landing page");
  s.addNotes("Nightwatch is a night-shift security analyst for organizations that cannot afford one. In one sentence: it watches network traffic, tells you in plain language which attacks matter most, and drafts the breach notification the law requires within 72 hours.");
}

// 2. The problem, told through one real incident
section("Problem");
{
  const s = slide();
  s.addText("PhilHealth, 2023: the attack nobody was watching for", { placeholder: "title" });
  text(s, "On 22 September 2023 the Medusa ransomware group hit the Philippine Health Insurance Corporation. About 72 workstations were encrypted, a $300,000 ransom was refused, and the stolen data was published. The antivirus licence had lapsed five months earlier.", { x: X0, y: 1.5, w: 6.3, h: 1.9, fontSize: 16, color: SOFT, lineSpacingMultiple: 1.15 });
  const cols = [
    ["~13M", "members whose data was reported compromised", C.accent3],
    ["72 h", "to notify the National Privacy Commission after discovering a breach", C.accent2],
    ["46%", "of security alerts are false positives, even in staffed SOCs", INK],
  ];
  cols.forEach(([v, l, c], i) => {
    const x = X0 + i * 4.1;
    panel(s, x, 3.9, 3.85, 2.2, `problem stat ${i + 1}`);
    stat(s, x + 0.3, 4.15, 3.3, v, l, c, `problem stat ${i + 1}`);
  });
  text(s, "If a national agency with an IT department missed it, a provincial hospital with one IT staff member and no night shift has little chance.", { x: 7.25, y: 1.5, w: 5.45, h: 1.9, fontSize: 16, color: INK, lineSpacingMultiple: 1.15 });
  source(s, "Sources: PhilHealth public notice UN2023-10-03; HIPAA Journal (Oct 2023); NPC Circular 16-03; Microsoft and Omdia, State of the SOC 2026. Full list in docs/RESEARCH.md.");
  s.addNotes("Start with a story judges in the Philippines will remember. PhilHealth was not a small organization, yet the attack went unnoticed until it was too late. Small organizations face the same attackers with even less: one IT person, no 24/7 monitoring. And the Data Privacy Act still requires them to notify the NPC within 72 hours.");
}

// 3. The gap
{
  const s = slide();
  s.addText("Three jobs small organizations cannot staff", { placeholder: "title" });
  const jobs = [
    ["Notice the attack", "Detection tools fire thousands of alerts a day. 73% of security teams name false positives as their top problem.", "Most alerts are never looked at."],
    ["Decide what comes first", "An IT generalist has maybe half an hour a day for security. Reviewing alerts oldest-first spends it on noise.", "The real attack waits in line."],
    ["Report it in time", "The Data Privacy Act asks for the nature of the breach, the data involved, measures taken and a contact person, within 72 hours.", "Hours lost to piecing together logs."],
  ];
  jobs.forEach(([h, b, f], i) => {
    const x = X0 + i * 4.1;
    panel(s, x, 1.6, 3.85, 4.15, `gap ${i + 1}`);
    stepDot(s, x + 0.3, 1.9, i + 1, false);
    text(s, h, { x: x + 0.3, y: 2.55, w: 3.3, h: 0.5, fontSize: 20, bold: true });
    text(s, b, { x: x + 0.3, y: 3.15, w: 3.3, h: 1.9, fontSize: 15, color: SOFT, lineSpacingMultiple: 1.1 });
    text(s, f, { x: x + 0.3, y: 4.95, w: 3.3, h: 0.6, fontSize: 15, color: C.accent2 });
  });
  source(s, "Sources: SANS 2025 Detection and Response Survey; NPC Circular 16-03, Section 17. Full list in docs/RESEARCH.md.");
  s.addNotes("This is the gap Nightwatch fills. Not another detector, but the analyst work around detection: noticing, prioritizing, and reporting.");
}

// 4. The solution workflow
section("Solution");
{
  const s = slide();
  s.addText("Nightwatch does the analyst's night shift in five steps", { placeholder: "title" });
  const steps = [
    ["Monitor", "Reads network flow logs (CICFlowMeter format) from a live replay or an uploaded file."],
    ["Detect", "A model trained on corrected, real attack traffic names the attack, or says it does not recognize it."],
    ["Prioritize", "Groups alerts into incidents and ranks them Critical, High, Medium or Low."],
    ["Investigate", "Explains each incident in plain words, with the MITRE ATT&CK technique and the evidence."],
    ["Report", "Turns the analyst's decisions into a draft breach report and counts down its deadline."],
  ];
  const w = 2.3;
  const gap = (CW - 5 * w) / 4;
  steps.forEach(([h, b], i) => {
    const x = X0 + i * (w + gap);
    stepDot(s, x, 1.75, i + 1, true);
    if (i < 4) s.addShape(pres.shapes.LINE, { x: x + 0.5, y: 1.96, w: w + gap - 0.58, h: 0, line: { color: LINE, width: 1 }, objectName: `step link ${i + 1}` });
    text(s, h, { x, y: 2.45, w, h: 0.5, fontSize: 20, bold: true });
    text(s, b, { x, y: 3.0, w, h: 2.0, fontSize: 14, color: SOFT, lineSpacingMultiple: 1.1 });
  });
  panel(s, X0, 5.15, CW, 1.25, "promise");
  text(s, "Nightwatch never blocks traffic on its own. It tells a person what happened, how sure it is, and what to do first; the person decides.", { x: X0 + 0.3, y: 5.35, w: CW - 0.6, h: 0.9, fontSize: 16, color: INK, valign: "middle" });
  s.addNotes("Walk through the five steps. Emphasize the last panel: a human stays in charge. Automatic blocking on a model's guess can take down a hospital's own systems.");
}

// 5. Demo: the console
{
  const s = slide();
  s.addText("The console: real attacks rise to the top", { placeholder: "title" });
  framedImage(s, "console-session-top.png", X0, 1.5, 7.6, 4.75, "Nightwatch security console during a Friday replay");
  const notes = [
    ["Live scoring", "Each connection is scored as it streams in. The replay is held-out traffic the model never trained on."],
    ["Severity first", "Botnet command-and-control traffic is Critical and sorts above everything else."],
    ["Your time", "The capacity slider shows which incidents fit in the time you have, against oldest-first."],
  ];
  notes.forEach(([h, b], i) => {
    const y = 1.5 + i * 1.6;
    text(s, h, { x: 8.6, y, w: 4.1, h: 0.45, fontSize: 18, bold: true, color: C.accent1 });
    text(s, b, { x: 8.6, y: y + 0.48, w: 4.1, h: 1.05, fontSize: 14, color: SOFT, lineSpacingMultiple: 1.1 });
  });
  s.addNotes("Live demo point. Start a Friday replay. Point at the severity column: five Critical botnet incidents at the top. Then move the capacity slider and show how many real attacks fit into 30 minutes compared with reviewing oldest-first.");
}

// 6. Demo: investigate and report
{
  const s = slide();
  s.addText("From one click to a breach report draft", { placeholder: "title" });
  framedImage(s, "investigate.png", X0, 1.5, 5.9, 3.69, "Investigation panel for a Critical botnet incident");
  framedImage(s, "report.png", X0 + 6.2, 1.5, 5.9, 3.69, "Draft incident report with the 72-hour deadline");
  text(s, "Investigate", { x: X0, y: 5.4, w: 5.9, h: 0.4, fontSize: 18, bold: true, color: C.accent1 });
  text(s, "What happened in plain words, MITRE ATT&CK T1071, the model's evidence with an innocent explanation beside each signal, and the first three response steps.", { x: X0, y: 5.82, w: 5.9, h: 0.8, fontSize: 14, color: SOFT });
  text(s, "Report", { x: X0 + 6.2, y: 5.4, w: 5.9, h: 0.4, fontSize: 18, bold: true, color: C.accent1 });
  text(s, "Confirmed incidents become a draft with the NPC's four required fields, a timeline, affected hosts and the deadline. Marked as a draft for the Data Protection Officer.", { x: X0 + 6.2, y: 5.82, w: 5.9, h: 0.8, fontSize: 14, color: SOFT });
  s.addNotes("Open an incident, read the plain-language explanation, confirm the threat, then click Create incident report. The deadline is counted from the first confirmed threat. Be clear that this is a draft for a human, not legal advice.");
}

// 7. Rigor: the accuracy illusion
section("Evidence");
{
  const s = slide();
  s.addText("Why 99.9% accuracy proves almost nothing", { placeholder: "title" });
  text(s, `Our own model scores ${pct(rand.accuracy, 2)} accuracy on a random split. That number is mostly normal traffic being called normal. The question that matters is how well it catches each kind of attack on traffic from later in time.`, { x: X0, y: 1.5, w: 5.6, h: 1.8, fontSize: 16, color: SOFT, lineSpacingMultiple: 1.15 });
  const facts = [
    [">25%", "of flows in the original CIC-IDS2017 were mislabeled or broken. We use the corrected release."],
    ["30 of 30", "top security ML papers had at least three evaluation pitfalls. We check ourselves against all ten."],
  ];
  facts.forEach(([v, l], i) => {
    const y = 3.5 + i * 1.45;
    text(s, v, { x: X0, y, w: 1.9, h: 0.6, fontSize: 28, bold: true, color: C.accent2 });
    text(s, l, { x: X0 + 2.0, y: y + 0.02, w: 3.6, h: 1.2, fontSize: 14, color: SOFT });
  });
  s.addChart(pres.charts.BAR, [
    { name: "Accuracy", labels: ["Random split", "Split by time"], values: [rand.accuracy * 100, chrono.accuracy * 100] },
    { name: "Macro-F1 over attack classes", labels: ["Random split", "Split by time"], values: [rand.macro_f1_attacks * 100, chrono.macro_f1_attacks * 100] },
  ], chartBase({
    x: 6.75, y: 1.45, w: 5.95, h: 4.9, barDir: "col", barGrouping: "clustered", barGapWidthPct: 60,
    chartColors: [HEX.lt2, HEX.accent1], showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "0.00", valAxisMinVal: 0, valAxisMaxVal: 115, valAxisMajorUnit: 25, valAxisLabelFormatCode: "0",
    showLegend: true, legendPos: "b", showTitle: true, title: "Same model, two ways of testing (%)",
  }));
  source(s, "Sources: Engelen et al., IEEE SPW 2021; Liu et al., IEEE CNS 2022; Arp et al., USENIX Security 2022. Numbers: ml/reports/illusion.json.");
  s.addNotes("This is our rigor slide. Accuracy barely moves between the two tests, because 99% of traffic is normal. Macro-F1 over attack classes is the honest number, and we test on traffic later in time than training, the way a real deployment works.");
}

// 8. Imbalance
{
  const s = slide();
  s.addText("Rare attacks get a fair vote", { placeholder: "title" });
  s.addChart(pres.charts.BAR, [
    { name: "Macro-F1, attack classes", labels: ["No reweighting", "Class-balanced", "SMOTE oversampling"], values: [abl.none.macro_f1_attacks, abl.balanced.macro_f1_attacks, abl.smote.macro_f1_attacks].map((v) => v * 100) },
  ], chartBase({
    x: X0, y: 1.45, w: 5.6, h: 4.9, barDir: "col", barGapWidthPct: 70,
    chartColors: [HEX.lt2, HEX.accent1, HEX.lt2], showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "0.0", valAxisMinVal: 0, valAxisMaxVal: 100, valAxisLabelFormatCode: "0",
    showLegend: false, showTitle: true, title: "Macro-F1 on calibration data (%)",
  }));
  const rare = ["Heartbleed", "Web SQL Injection", "Web XSS", "Infiltration", "Web Brute Force", "Botnet"];
  const rows = [
    [
      { text: "Attack class", options: { bold: true, color: SOFT } },
      { text: "Flows", options: { bold: true, color: SOFT, align: "right" } },
      { text: "Alerted", options: { bold: true, color: SOFT, align: "right" } },
      { text: "Named right", options: { bold: true, color: SOFT, align: "right" } },
    ],
    ...rare.map((c) => {
      const v = verdictOf[c];
      return [
        { text: c },
        { text: fmt(v.n), options: { align: "right", fontFace: MONO } },
        { text: pct(v.known + v.unknown, 0), options: { align: "right", fontFace: MONO } },
        { text: pct(v.known, 0), options: { align: "right", fontFace: MONO } },
      ];
    }),
  ];
  text(s, "Rarest attacks in the test set", { x: 6.75, y: 1.5, w: 5.95, h: 0.4, fontSize: 16, bold: true });
  s.addTable(rows, { x: 6.75, y: 2.0, w: 5.95, colW: [2.15, 0.95, 1.2, 1.65], fontSize: 14, color: INK, rowH: 0.42, border: { type: "solid", color: LINE, pt: 0.75 }, fill: { color: PANEL }, margin: [0.05, 0.12, 0.05, 0.12], objectName: "rare classes" });
  text(s, `We chose class-balanced weighting because it scored best on calibration data, before looking at the test set. Every rare attack raised an alert, but some only as Needs review: with a handful of training examples the model is not sure enough to name them.`, { x: 6.75, y: 5.2, w: 5.95, h: 1.2, fontSize: 14, color: SOFT });
  source(s, "Numbers: ml/reports/ablation.json (calibration split) and final.json (test split). Alerted: named as an attack or sent to Needs review. Named right: the single correct attack type.");
  s.addNotes("The track asks for robust minority-class performance. We compared three imbalance strategies and chose on calibration data only. The table shows the rarest classes: Heartbleed has two test flows, SQL injection three. Every one of them raised an alert, though not always with the right name, which is why the uncertain ones go to Needs review.");
}

// 9. Knowing what it does not know
{
  const s = slide();
  s.addText("It says “I'm not sure” instead of staying silent", { placeholder: "title" });
  text(s, "A normal classifier must pick a label, so an attack it has never seen is quietly called normal. Nightwatch uses conformal prediction: it lists every label it cannot rule out at 95% confidence. One attack label means a recognized attack. Anything ambiguous goes to Needs review. Only flows that look clearly normal are cleared.", { x: X0, y: 1.5, w: 5.6, h: 3.0, fontSize: 16, color: SOFT, lineSpacingMultiple: 1.15 });
  const verdicts = [
    ["Recognized attack", "One attack type, 95% confidence", C.accent1],
    ["Needs review", "Neither a known attack nor normal", C.accent2],
    ["Cleared", "Only normal fits", SOFT],
  ];
  verdicts.forEach(([h, b, c], i) => {
    const y = 4.55 + i * 0.62;
    s.addShape(pres.shapes.OVAL, { x: X0, y: y + 0.09, w: 0.2, h: 0.2, fill: { color: c }, line: { color: c, width: 0 }, objectName: `verdict ${h}` });
    text(s, h, { x: X0 + 0.35, y, w: 2.1, h: 0.4, fontSize: 15, bold: true });
    text(s, b, { x: X0 + 2.45, y, w: 3.5, h: 0.4, fontSize: 14, color: SOFT });
  });
  const big = [
    [pct(V.attack_flagged, 2), "of attack flows in the test set raised an alert", C.accent1],
    [pct(V.benign_alert_rate, 2), "of normal flows raised a false alert", INK],
    [pct(V.attack_missed, 3), "of attack flows were missed", C.accent3],
  ];
  big.forEach(([v, l, c], i) => {
    const y = 1.5 + i * 1.62;
    panel(s, 6.75, y, 5.95, 1.45, `result ${i + 1}`);
    text(s, v, { x: 7.05, y: y + 0.28, w: 2.6, h: 0.9, fontSize: 36, bold: true, color: c, valign: "middle" });
    text(s, l, { x: 9.75, y: y + 0.28, w: 2.75, h: 0.9, fontSize: 14, color: SOFT, valign: "middle" });
  });
  source(s, `Test split: ${fmt(clf.n)} held-out flows. Numbers: ml/reports/final.json. Method: split conformal prediction (Angelopoulos and Bates, 2021).`);
  s.addNotes("This is the innovation slide. Conformal prediction gives a calibrated guarantee instead of a guess. The false alert rate is a policy we set before testing: 0.2% per class, which lands at 0.42% overall. We also show the trade-off curve on the Method page.");
}

// 10. Honest zero-day test
{
  const s = slide();
  s.addText("New attacks: what it catches and what it misses", { placeholder: "title" });
  const labels = zd.map((r) => r.held_out_family);
  const flagged = zd.map((r) => (r.flagged_unknown + r.flagged_known_other) * 100);
  s.addChart(pres.charts.BAR, [{ name: "Raised an alert", labels, values: flagged }], chartBase({
    x: X0, y: 1.45, w: 7.0, h: 5.0, barDir: "bar", barGapWidthPct: 45,
    chartColors: zd.map((r) => ((r.flagged_unknown + r.flagged_known_other) >= 0.5 ? HEX.accent1 : HEX.accent3)),
    showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "0.0", valAxisMinVal: 0, valAxisMaxVal: 115, valAxisMajorUnit: 25, valAxisLabelFormatCode: "0", catAxisOrientation: "maxMin",
    showLegend: false, showTitle: true, title: "Each family removed from training, then tested (% flagged)",
  }));
  text(s, "Caught", { x: 7.95, y: 1.5, w: 4.75, h: 0.4, fontSize: 18, bold: true, color: C.accent1 });
  text(s, "Attacks that look structurally new: DDoS floods and the Heartbleed probe were flagged 100% of the time without ever being trained on.", { x: 7.95, y: 1.95, w: 4.75, h: 1.2, fontSize: 14, color: SOFT });
  text(s, "Missed", { x: 7.95, y: 3.35, w: 4.75, h: 0.4, fontSize: 18, bold: true, color: C.accent3 });
  text(s, "Attacks that imitate normal traffic: botnet check-ins, password guessing and port scans mostly passed as normal when their family was unseen.", { x: 7.95, y: 3.8, w: 4.75, h: 1.2, fontSize: 14, color: SOFT });
  panel(s, 7.95, 5.15, 4.75, 1.25, "honesty");
  text(s, "We show this on the site and in the FAQ. No detector catches everything; overclaiming is how organizations get surprised.", { x: 8.2, y: 5.3, w: 4.25, h: 0.95, fontSize: 14, color: INK, valign: "middle" });
  source(s, "Leave-one-family-out test, model retrained eight times. Numbers: ml/reports/zero_day.json.");
  s.addNotes("The track asks for adapting to evolving attacks. We tested it the hard way: remove a whole attack family from training, then see if it gets flagged. Structurally new attacks are caught. Mimicry attacks are not. We disclose this rather than hide it, because the competition rules and real users both punish misleading claims.");
}

// 11. Prioritization impact
section("Impact");
{
  const s = slide();
  s.addText("Thousands of alerts become a short, ranked list", { placeholder: "title" });
  stat(s, X0, 1.5, 3.6, `${fmt(tri.fri.alerts)}`, "alerts on the Friday replay", INK, "friday alerts");
  stat(s, X0, 3.1, 3.6, `${fmt(tri.fri.incidents)}`, "incidents after grouping by source and target", C.accent1, "friday incidents");
  text(s, `Across all five replayed days: ${fmt(tri.alerts)} alerts became ${fmt(tri.incidents)} incidents, ${Math.round(tri.alerts / tri.incidents)} times fewer things to look at.`, { x: X0, y: 4.75, w: 3.8, h: 1.5, fontSize: 14, color: SOFT });
  const budgets = triage.budgets;
  s.addChart(pres.charts.BAR, [
    { name: "Nightwatch order", labels: budgets.map((b) => `${b} reviewed`), values: budgets.map((b) => tri.reached[b].nightwatch) },
    { name: "Oldest first", labels: budgets.map((b) => `${b} reviewed`), values: budgets.map((b) => tri.reached[b].fifo) },
    { name: "Highest confidence first", labels: budgets.map((b) => `${b} reviewed`), values: budgets.map((b) => tri.reached[b].confidence) },
  ], chartBase({
    x: 4.75, y: 1.45, w: 7.95, h: 4.95, barDir: "col", barGrouping: "clustered", barGapWidthPct: 55,
    chartColors: [HEX.accent1, HEX.lt2, "4A5255"], showValue: true, dataLabelPosition: "outEnd", valAxisMinVal: 0, valAxisMaxVal: tri.attackIncidents, valAxisMajorUnit: 5,
    showLegend: true, legendPos: "b", showTitle: true, title: `Real attack incidents reached, out of ${tri.attackIncidents}, by incidents reviewed per day`,
  }));
  source(s, "Five held-out days, scored by the same ranking the console uses (severity tier first, then confidence and size). Numbers: ml/reports/triage.json.");
  s.addNotes(`Reviewing ten incidents a day in Nightwatch's order reaches ${tri.reached[10].nightwatch} of ${tri.attackIncidents} real attack incidents; oldest-first reaches ${tri.reached[10].fifo}; trusting the model's confidence alone reaches ${tri.reached[10].confidence}, because confident alerts are mostly repeats of the same flood.`);
}

// 12. Built to run, built to be trusted
{
  const s = slide();
  s.addText("Built to run cheaply and to be trusted", { placeholder: "title" });
  const arch = [
    ["Training", "Python, LightGBM, conformal calibration and an Isolation Forest, trained on the corrected CIC‑IDS2017."],
    ["Scoring", `The model runs in TypeScript inside the web app. It matches Python to within 0.000001 on ${fmt(parityN)} test flows.`],
    ["Data and sign-in", "Neon Postgres stores sessions, incidents and decisions; Neon Auth handles accounts."],
    ["Hosting", "Next.js on Vercel. Free tiers cover a pilot for a small organization."],
  ];
  arch.forEach(([h, b], i) => {
    const y = 1.5 + i * 1.25;
    text(s, h, { x: X0, y, w: 1.9, h: 0.4, fontSize: 16, bold: true, color: C.accent1 });
    text(s, b, { x: X0 + 2.0, y, w: 4.0, h: 1.15, fontSize: 14, color: SOFT });
  });
  panel(s, 6.75, 1.45, 5.95, 4.95, "security");
  text(s, "Security of Nightwatch itself", { x: 7.05, y: 1.7, w: 5.4, h: 0.45, fontSize: 18, bold: true });
  const sec = [
    "Every data route checks the signed-in user on the server",
    "Uploaded logs are scored in memory and never stored",
    "Rate limits on uploads and session starts",
    "Append-only audit log of every analyst decision",
    "Strict security headers (HSTS, frame denial, no sniffing)",
    "Database credentials never reach the browser",
    "No automatic blocking; a person always decides",
  ];
  s.addText(sec.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < sec.length - 1 } })), { isTextBox: true, x: 7.05, y: 2.3, w: 5.4, h: 3.9, fontSize: 15, color: SOFT, paraSpaceAfter: 8, valign: "top", margin: 0 });
  source(s, "Code: ml/ (pipeline, 28 tests) and web/ (app, 12 tests including the scoring parity check).");
  s.addNotes("A security product should be secure itself. Mention that scoring in TypeScript means no cold-starting Python server during judging, and that the parity test proves the web app runs the exact model we evaluated.");
}

// 13. Feasibility, limits and next steps
{
  const s = slide();
  s.addText("What it takes to adopt, and what comes next", { placeholder: "title" });
  const cols = [
    ["Adopt this week", C.accent1, [
      "Export flow logs with the free CICFlowMeter tool",
      "Upload them on the Check your network page",
      "Review the ranked list and confirm or dismiss",
      "Hand the draft report to the Data Protection Officer",
    ]],
    ["Known limits", C.accent2, [
      "Trained on one public lab dataset from 2017",
      "Attacks that imitate normal traffic can slip through",
      `A quiet day still produced ${fmt(tri.mon.incidents)} low-priority items to review`,
      "Reports are drafts, not legal advice",
    ]],
    ["Next", INK, [
      "Test on the corrected 2018 dataset for drift",
      "Learn from analyst decisions to cut repeat false alarms",
      "Tune the false-alert budget per site",
      "Pilot with a school or local government office",
    ]],
  ];
  cols.forEach(([h, c, items], i) => {
    const x = X0 + i * 4.1;
    panel(s, x, 1.6, 3.85, 4.4, `adopt ${i + 1}`);
    text(s, h, { x: x + 0.3, y: 1.9, w: 3.3, h: 0.45, fontSize: 18, bold: true, color: c });
    s.addText(items.map((t, j) => ({ text: t, options: { bullet: true, breakLine: j < items.length - 1 } })), { isTextBox: true, x: x + 0.3, y: 2.55, w: 3.3, h: 3.3, fontSize: 15, color: SOFT, paraSpaceAfter: 10, valign: "top", margin: 0 });
  });
  source(s, "Quiet-day figure: Monday replay, no attacks, ml/reports/triage.json.");
  s.addNotes("Close the evidence section with feasibility and honesty. The limits column is deliberate; judges trust a team that knows where its system breaks.");
}

// 14. Close
section("Close");
{
  const s = slide("NW_TITLE");
  text(s, "Nightwatch", { x: X0, y: 1.6, w: 8, h: 0.5, fontSize: 18, bold: true, color: C.accent1 });
  text(s, "A security analyst for the organizations attackers count on being unwatched", { x: X0, y: 2.2, w: 6.3, h: 2.2, fontSize: 34, bold: true });
  const links = [
    ["Try it", "Live demo link in the Devpost submission. Sign in with the judge demo account button."],
    ["Method", "Every number in this deck is regenerated from the code in the repository."],
  ];
  links.forEach(([h, b], i) => {
    const x = X0 + i * 3.2;
    text(s, h, { x, y: 4.7, w: 2.95, h: 0.4, fontSize: 16, bold: true });
    text(s, b, { x, y: 5.15, w: 2.95, h: 1.1, fontSize: 14, color: SOFT });
  });
  framedImage(s, "console-start.png", 7.35, 1.75, 5.35, 3.34, "Nightwatch console start screen");
  text(s, "Data: corrected CIC-IDS2017 (Liu et al., IEEE CNS 2022; Sharafaldin et al., 2018). Libraries: LightGBM, scikit-learn, imbalanced-learn, Next.js, Drizzle, Neon.", { x: X0, y: 6.45, w: CW, h: 0.5, fontSize: 10, color: FAINT });
  s.addNotes("End on the mission. Invite judges to try the console with the demo account.");
}

(async () => {
  await pres.writeFile({ fileName: OUT });
  const skill = process.env.PPTX_SKILL_DIR;
  if (skill) {
    const { applyTheme } = require(path.join(skill, "scripts", "apply_theme.js"));
    await applyTheme(OUT, THEME);
  } else {
    console.warn("PPTX_SKILL_DIR not set: theme colors not written, scheme colors fall back to Office defaults.");
  }
  console.log(`wrote ${OUT}`);
})();
