// Isolation Forest scoring matching sklearn: score = 2^(-mean(depth + c(leaf n)) / c(max_samples)).
// Each tree sees only its own feature subset (estimators_features_).

export type IForestTree = { f: number[]; t: number[]; l: number[]; r: number[]; v: number[] };

export type IForest = {
  trees: IForestTree[];
  features: number[][];
  max_samples: number;
  c_max_samples: number;
  threshold: number;
};

export function anomalyScore(model: IForest, x: ArrayLike<number>): number {
  let total = 0;
  for (let k = 0; k < model.trees.length; k++) {
    const tree = model.trees[k];
    const feats = model.features[k];
    let i = 0;
    while (tree.f[i] !== -1) {
      i = x[feats[tree.f[i]]] <= tree.t[i] ? tree.l[i] : tree.r[i];
    }
    total += tree.v[i];
  }
  return Math.pow(2, -(total / model.trees.length) / model.c_max_samples);
}
