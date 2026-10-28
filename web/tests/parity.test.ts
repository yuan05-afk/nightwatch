// The TypeScript scorer must reproduce Python (LightGBM + sklearn) on real held-out flows.
// Fixtures come from `uv run python -m nightwatch_ml.export`.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { anomalyScore } from "@/lib/scoring/iforest";
import { rawScores, softmax } from "@/lib/scoring/lgbm";
import type { Model } from "@/lib/scoring";
import { shapForClass } from "@/lib/scoring/treeshap";

const dir = join(__dirname, "..", "lib", "scoring", "model");
const model: Model = JSON.parse(readFileSync(join(dir, "model.json"), "utf8"));
const parity = JSON.parse(readFileSync(join(dir, "parity.json"), "utf8")) as {
  X: number[][];
  raw: number[][];
  proba: number[][];
  top: number[];
  contrib_top: number[][];
  anomaly: number[];
};
const TOL = 1e-6;

function maxAbsDiff(a: ArrayLike<number>, b: ArrayLike<number>) {
  let m = 0;
  for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i] - b[i]));
  return m;
}

describe("scorer parity with Python on real held-out flows", () => {
  it(`has a meaningful sample (${parity.X.length} flows)`, () => {
    expect(parity.X.length).toBeGreaterThanOrEqual(500);
  });

  it("raw scores and probabilities match LightGBM", () => {
    let worstRaw = 0;
    let worstP = 0;
    parity.X.forEach((x, i) => {
      const raw = rawScores(model.lgbm.trees, model.num_class, x);
      worstRaw = Math.max(worstRaw, maxAbsDiff(raw, parity.raw[i]));
      worstP = Math.max(worstP, maxAbsDiff(softmax(raw), parity.proba[i]));
    });
    expect(worstRaw).toBeLessThan(TOL);
    expect(worstP).toBeLessThan(TOL);
  });

  it("TreeSHAP contributions match LightGBM pred_contrib for the predicted class", () => {
    let worst = 0;
    parity.X.forEach((x, i) => {
      const phi = shapForClass(model.lgbm.trees, model.num_class, parity.top[i], model.features.length, x);
      worst = Math.max(worst, maxAbsDiff(phi, parity.contrib_top[i]));
    });
    expect(worst).toBeLessThan(TOL);
  });

  it("anomaly scores match sklearn IsolationForest", () => {
    let worst = 0;
    parity.X.forEach((x, i) => {
      worst = Math.max(worst, Math.abs(anomalyScore(model.iforest, x) - parity.anomaly[i]));
    });
    expect(worst).toBeLessThan(TOL);
  });
});
