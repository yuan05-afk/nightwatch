// NIGHTWATCH scorer: detector probabilities, conformal set, anomaly score, verdict,
// and (on demand) TreeSHAP drivers for the predicted class. Pure TypeScript.
import { predictionSet, verdictFor, type Verdict } from "./conformal";
import { anomalyScore, type IForest } from "./iforest";
import { rawScores, softmax, type LgbmTree } from "./lgbm";
import { shapForClass } from "./treeshap";

export type Model = {
  version: string;
  strategy: string;
  classes: string[];
  features: string[];
  num_class: number;
  lgbm: { trees: LgbmTree[] };
  conformal: { alpha: number; thresholds: number[] };
  iforest: IForest;
};

export type Score = {
  verdict: Verdict;
  predicted: string;
  probability: number;
  set: string[];
  anomaly: number;
  anomalous: boolean;
  proba: number[];
};

export type Driver = { feature: string; value: number; contribution: number };

export function score(model: Model, x: ArrayLike<number>): Score {
  const proba = softmax(rawScores(model.lgbm.trees, model.num_class, x));
  const set = predictionSet(proba, model.conformal.thresholds);
  const anomaly = anomalyScore(model.iforest, x);
  let top = 0;
  for (let k = 1; k < proba.length; k++) if (proba[k] > proba[top]) top = k;
  return {
    verdict: verdictFor(set, anomaly, model.iforest.threshold),
    predicted: model.classes[top],
    probability: proba[top],
    set: model.classes.filter((_, k) => set[k]),
    anomaly,
    anomalous: anomaly >= model.iforest.threshold,
    proba: Array.from(proba),
  };
}

/** Top-n features pushing the predicted class up or down (raw log-odds space). */
export function drivers(model: Model, x: ArrayLike<number>, cls: string, n = 6): Driver[] {
  const k = model.classes.indexOf(cls);
  const phi = shapForClass(model.lgbm.trees, model.num_class, k, model.features.length, x);
  return model.features
    .map((feature, i) => ({ feature, value: x[i], contribution: phi[i] }))
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .slice(0, n);
}
