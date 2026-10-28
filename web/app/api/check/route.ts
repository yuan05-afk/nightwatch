import { audit, rateLimit, requireUser, tooMany } from "@/lib/guard";
import { parseFlowsCsv } from "@/lib/flows";
import { score, type Model } from "@/lib/scoring";
import modelJson from "@/lib/scoring/model/model.json";
import { familyOf, groupKey, rankScore } from "@/lib/triage";

const model = modelJson as unknown as Model;
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 20_000;

export const maxDuration = 30;

/** Score an uploaded CICFlowMeter CSV in memory. Nothing from the file is stored. */
export async function POST(req: Request) {
  const user = await requireUser();
  if (user instanceof Response) return user;
  if (!(await rateLimit(`check:${user.id}`, 10, 60))) return tooMany();

  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_BYTES) return Response.json({ error: "The file is larger than 5 MB. Split it and upload the parts." }, { status: 413 });
  const text = await req.text();
  if (text.length > MAX_BYTES) return Response.json({ error: "The file is larger than 5 MB. Split it and upload the parts." }, { status: 413 });

  const parsed = parseFlowsCsv(text, model.features, MAX_ROWS);
  if (parsed.missing.length) {
    return Response.json(
      { error: `This doesn't look like a CICFlowMeter export. Missing columns: ${parsed.missing.slice(0, 6).join(", ")}${parsed.missing.length > 6 ? "…" : ""}` },
      { status: 400 },
    );
  }

  const t0 = performance.now();
  const counts = { known: 0, unknown: 0, suppressed: 0 };
  const groups = new Map<string, { verdict: "known" | "unknown"; predicted: string; family: string; srcIp: string; dstIp: string; dstPort: number; flows: number; maxP: number; maxA: number }>();
  for (const f of parsed.flows) {
    const s = score(model, f.features);
    counts[s.verdict]++;
    if (s.verdict === "suppressed") continue;
    const key = groupKey(s.verdict, s.predicted, f.srcIp, f.dstIp);
    const g = groups.get(key);
    if (g) {
      g.flows++;
      g.maxP = Math.max(g.maxP, s.probability);
      g.maxA = Math.max(g.maxA, s.anomaly);
    } else {
      groups.set(key, {
        verdict: s.verdict,
        predicted: s.predicted,
        family: s.verdict === "unknown" ? "Unknown" : familyOf(s.predicted),
        srcIp: f.srcIp,
        dstIp: f.dstIp,
        dstPort: f.dstPort,
        flows: 1,
        maxP: s.probability,
        maxA: s.anomaly,
      });
    }
  }
  const incidents = [...groups.values()]
    .map((g) => ({ ...g, rank: rankScore(g.verdict, g.predicted, g.maxP, g.maxA, g.flows) }))
    .sort((a, b) => b.rank - a.rank);
  const ms = performance.now() - t0;

  await audit(req, user.id, "check.upload", undefined, { rows: parsed.flows.length, incidents: incidents.length });
  return Response.json({
    rows: parsed.flows.length,
    truncated: parsed.flows.length >= MAX_ROWS,
    skipped: parsed.skipped,
    counts,
    incidents: incidents.slice(0, 100),
    totalIncidents: incidents.length,
    microsPerFlow: parsed.flows.length ? (ms * 1000) / parsed.flows.length : 0,
  });
}
