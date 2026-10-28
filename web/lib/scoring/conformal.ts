// Mirrors ml/src/nightwatch_ml/conformal.py: class k is in the set when 1 - p_k <= q_k.

export type Verdict = "known" | "unknown" | "suppressed";

export function predictionSet(proba: ArrayLike<number>, thresholds: number[]): boolean[] {
  const out: boolean[] = new Array(proba.length);
  for (let k = 0; k < proba.length; k++) out[k] = 1 - proba[k] <= thresholds[k];
  return out;
}

/** known: single attack class. suppressed: only benign and not anomalous. unknown: everything else. */
export function verdictFor(set: boolean[], anomaly: number, anomalyThreshold: number, benignIndex = 0): Verdict {
  let size = 0;
  for (const inSet of set) if (inSet) size++;
  if (size === 1 && !set[benignIndex]) return "known";
  if (size === 1 && set[benignIndex] && anomaly < anomalyThreshold) return "suppressed";
  return "unknown";
}
