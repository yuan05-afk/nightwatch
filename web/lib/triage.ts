// Incident grouping and ranking. Shared by the stream engine and the UI so the
// capacity slider and the database agree on order.

import type { Verdict } from "./scoring/conformal";

export const FAMILY_OF: Record<string, string> = {
  BENIGN: "Benign",
  "FTP-Patator": "Brute Force",
  "SSH-Patator": "Brute Force",
  "Web Brute Force": "Brute Force",
  "DoS Hulk": "DoS",
  "DoS GoldenEye": "DoS",
  "DoS Slowloris": "DoS",
  "DoS Slowhttptest": "DoS",
  DDoS: "DDoS",
  "Web XSS": "Web Injection",
  "Web SQL Injection": "Web Injection",
  Heartbleed: "Heartbleed",
  Infiltration: "Infiltration",
  PortScan: "PortScan",
  Botnet: "Botnet",
};

// Impact if real: data theft and footholds outrank noisy but recoverable floods.
export const SEVERITY: Record<string, number> = {
  Infiltration: 1.0,
  Heartbleed: 1.0,
  Botnet: 0.95,
  "Web Injection": 0.9,
  Unknown: 0.85,
  "Brute Force": 0.8,
  DDoS: 0.75,
  DoS: 0.7,
  PortScan: 0.5,
  Benign: 0.3,
};

/** Minutes an analyst needs to triage one incident; drives the capacity slider. */
export const MINUTES_PER_INCIDENT = 6;

export function familyOf(label: string): string {
  return FAMILY_OF[label] ?? "Unknown";
}

export function groupKey(verdict: Verdict, predicted: string, srcIp: string, dstIp: string): string {
  const fam = verdict === "unknown" ? "Unknown" : familyOf(predicted);
  return `${fam}|${srcIp}>${dstIp}`;
}

/** severity x confidence x volume. Unknowns use the anomaly score as confidence. */
export function rankScore(
  verdict: Verdict,
  predicted: string,
  maxProbability: number,
  maxAnomaly: number,
  flowCount: number,
): number {
  const fam = verdict === "unknown" ? "Unknown" : familyOf(predicted);
  const confidence = verdict === "unknown" ? 0.55 + 0.45 * Math.min(1, maxAnomaly) : maxProbability;
  return (SEVERITY[fam] ?? 0.6) * confidence * (1 + Math.log10(Math.max(1, flowCount)));
}

export function reviewableCount(capacityMinutes: number): number {
  return Math.max(0, Math.floor(capacityMinutes / MINUTES_PER_INCIDENT));
}
