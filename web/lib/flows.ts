// Parse a CICFlowMeter CSV export into model-ordered feature vectors.
// Header normalisation must match ml/src/nightwatch_ml/data.py: f_ + non-alphanumerics -> "_", lowercased.

export type ParsedFlow = { srcIp: string; dstIp: string; dstPort: number; features: number[] };
export type ParseResult = { flows: ParsedFlow[]; missing: string[]; skipped: number };

export function featureKey(header: string): string {
  return `f_${header.trim().replace(/[^0-9a-zA-Z]+/g, "_").replace(/^_+|_+$/g, "").toLowerCase()}`;
}

export function parseFlowsCsv(text: string, featureOrder: string[], maxRows: number): ParseResult {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return { flows: [], missing: ["(no data rows)"], skipped: 0 };
  const header = lines[0].split(",").map((h) => h.trim());
  const keyIndex = new Map(header.map((h, i) => [featureKey(h), i]));
  const col = (name: string) => header.findIndex((h) => h.toLowerCase() === name.toLowerCase());
  const src = col("Src IP");
  const dst = col("Dst IP");
  const missing = featureOrder.filter((f) => !keyIndex.has(f));
  if (src < 0) missing.push("Src IP");
  if (dst < 0) missing.push("Dst IP");
  if (missing.length) return { flows: [], missing, skipped: 0 };

  const idx = featureOrder.map((f) => keyIndex.get(f)!);
  const portIdx = keyIndex.get("f_dst_port")!;
  const flows: ParsedFlow[] = [];
  let skipped = 0;
  for (let r = 1; r < lines.length && flows.length < maxRows; r++) {
    const cells = lines[r].split(",");
    if (cells.length < header.length) {
      skipped++;
      continue;
    }
    const features = idx.map((i) => {
      const v = Number(cells[i]);
      return Number.isFinite(v) ? Math.fround(v) : -1; // same NaN/inf policy as training
    });
    flows.push({ srcIp: cells[src].trim(), dstIp: cells[dst].trim(), dstPort: Number(cells[portIdx]) || 0, features });
  }
  return { flows, missing: [], skipped };
}
