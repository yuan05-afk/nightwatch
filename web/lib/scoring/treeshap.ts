// Path-dependent TreeSHAP (Lundberg et al. 2020), ported from LightGBM's tree.cpp so the
// contributions match booster.predict(pred_contrib=True). Cover = training data count.
import type { LgbmTree } from "./lgbm";

type PathElem = { d: number; z: number; o: number; w: number };

function extendPath(path: PathElem[], depth: number, z: number, o: number, d: number) {
  path[depth] = { d, z, o, w: depth === 0 ? 1 : 0 };
  for (let i = depth - 1; i >= 0; i--) {
    path[i + 1].w += (o * path[i].w * (i + 1)) / (depth + 1);
    path[i].w = (z * path[i].w * (depth - i)) / (depth + 1);
  }
}

function unwindPath(path: PathElem[], depth: number, index: number) {
  const o = path[index].o;
  const z = path[index].z;
  let next = path[depth].w;
  for (let i = depth - 1; i >= 0; i--) {
    if (o !== 0) {
      const tmp = path[i].w;
      path[i].w = (next * (depth + 1)) / ((i + 1) * o);
      next = tmp - (path[i].w * z * (depth - i)) / (depth + 1);
    } else {
      path[i].w = (path[i].w * (depth + 1)) / (z * (depth - i));
    }
  }
  for (let i = index; i < depth; i++) {
    path[i].d = path[i + 1].d;
    path[i].z = path[i + 1].z;
    path[i].o = path[i + 1].o;
  }
}

function unwoundPathSum(path: PathElem[], depth: number, index: number): number {
  const o = path[index].o;
  const z = path[index].z;
  let next = path[depth].w;
  let total = 0;
  for (let i = depth - 1; i >= 0; i--) {
    if (o !== 0) {
      const tmp = (next * (depth + 1)) / ((i + 1) * o);
      total += tmp;
      next = path[i].w - (tmp * z * (depth - i)) / (depth + 1);
    } else {
      total += path[i].w / z / ((depth - i) / (depth + 1));
    }
  }
  return total;
}

function recurse(
  tree: LgbmTree,
  x: ArrayLike<number>,
  phi: Float64Array,
  node: number,
  parentPath: PathElem[],
  depth: number,
  pz: number,
  po: number,
  pi: number,
) {
  const path = parentPath.slice(0, depth).map((e) => ({ ...e }));
  extendPath(path, depth, pz, po, pi);

  if (tree.f[node] === -1) {
    for (let i = 1; i <= depth; i++) {
      const w = unwoundPathSum(path, depth, i);
      phi[path[i].d] += w * (path[i].o - path[i].z) * tree.v[node];
    }
    return;
  }

  const f = tree.f[node];
  const goLeft = x[f] <= tree.t[node];
  const hot = goLeft ? tree.l[node] : tree.r[node];
  const cold = goLeft ? tree.r[node] : tree.l[node];
  const w = tree.c[node];
  const hotZ = tree.c[hot] / w;
  const coldZ = tree.c[cold] / w;

  let incomingZ = 1;
  let incomingO = 1;
  let k = 1;
  for (; k <= depth; k++) if (path[k].d === f) break;
  if (k <= depth) {
    incomingZ = path[k].z;
    incomingO = path[k].o;
    unwindPath(path, depth, k);
    depth -= 1;
  }
  recurse(tree, x, phi, hot, path, depth + 1, hotZ * incomingZ, incomingO, f);
  recurse(tree, x, phi, cold, path, depth + 1, coldZ * incomingZ, 0, f);
}

/** Cover-weighted mean leaf value: the tree's contribution to the SHAP base value. */
export function expectedValue(tree: LgbmTree): number {
  let num = 0;
  let den = 0;
  for (let i = 0; i < tree.f.length; i++) {
    if (tree.f[i] === -1) {
      num += tree.c[i] * tree.v[i];
      den += tree.c[i];
    }
  }
  return den > 0 ? num / den : 0;
}

/** SHAP values for one class: phi[0..nFeat-1] plus phi[nFeat] = base value (raw score space). */
export function shapForClass(
  trees: LgbmTree[],
  numClass: number,
  cls: number,
  nFeat: number,
  x: ArrayLike<number>,
): Float64Array {
  const phi = new Float64Array(nFeat + 1);
  for (let k = cls; k < trees.length; k += numClass) {
    const tree = trees[k];
    phi[nFeat] += expectedValue(tree);
    if (tree.f[0] !== -1) recurse(tree, x, phi, 0, [], 0, 1, 1, -1);
  }
  return phi;
}
