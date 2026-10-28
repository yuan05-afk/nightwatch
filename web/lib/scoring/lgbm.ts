// LightGBM multiclass inference from the flattened dump written by ml/src/nightwatch_ml/export.py.
// Trees are interleaved by class: tree k contributes to class k % numClass.

export type LgbmTree = {
  f: number[]; // split feature, -1 at leaves
  t: number[]; // threshold (go left when x <= t)
  l: number[];
  r: number[];
  v: number[]; // leaf value at leaves, internal value elsewhere
  c: number[]; // training data count (cover), used by TreeSHAP
};

export function leafIndex(tree: LgbmTree, x: ArrayLike<number>): number {
  let i = 0;
  while (tree.f[i] !== -1) {
    i = x[tree.f[i]] <= tree.t[i] ? tree.l[i] : tree.r[i];
  }
  return i;
}

export function rawScores(trees: LgbmTree[], numClass: number, x: ArrayLike<number>): Float64Array {
  const out = new Float64Array(numClass);
  for (let k = 0; k < trees.length; k++) {
    const tree = trees[k];
    out[k % numClass] += tree.v[leafIndex(tree, x)];
  }
  return out;
}

export function softmax(raw: ArrayLike<number>): Float64Array {
  let max = -Infinity;
  for (let i = 0; i < raw.length; i++) if (raw[i] > max) max = raw[i];
  const out = new Float64Array(raw.length);
  let sum = 0;
  for (let i = 0; i < raw.length; i++) {
    out[i] = Math.exp(raw[i] - max);
    sum += out[i];
  }
  for (let i = 0; i < raw.length; i++) out[i] /= sum;
  return out;
}
