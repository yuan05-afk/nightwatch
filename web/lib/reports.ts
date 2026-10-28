// Headline numbers for the site and deck, read from ml/reports via content/reports (sync_reports.py).
import ablation from "@/content/reports/ablation.json";
import anomalyAblation from "@/content/reports/anomaly_ablation.json";
import finalReport from "@/content/reports/final.json";
import illusion from "@/content/reports/illusion.json";
import noPort from "@/content/reports/no_port.json";
import operating from "@/content/reports/operating_curve.json";
import triage from "@/content/reports/triage.json";
import zeroDay from "@/content/reports/zero_day.json";

export { ablation, anomalyAblation, finalReport, illusion, noPort, operating, triage, zeroDay };

export function headline() {
  const v = finalReport.verdicts;
  const days = triage.days.filter((d) => d.alerts > 0);
  const alerts = days.reduce((s, d) => s + d.alerts, 0);
  const incidents = days.reduce((s, d) => s + d.incidents, 0);
  return {
    attackFlagged: v.attack_flagged,
    attackMissed: v.attack_missed,
    benignAlertRate: v.benign_alert_rate,
    macroF1Attacks: finalReport.classifier.macro_f1_attacks,
    alerts,
    incidents,
    compression: alerts / Math.max(1, incidents),
  };
}

export const pct = (x: number, digits = 1) => `${(x * 100).toFixed(digits)}%`;
