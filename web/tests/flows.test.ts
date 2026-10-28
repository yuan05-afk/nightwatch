// The upload path must find every model feature in a real CICFlowMeter export.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { featureKey, parseFlowsCsv } from "@/lib/flows";
import type { Model } from "@/lib/scoring";
import { score } from "@/lib/scoring";

const model: Model = JSON.parse(readFileSync(join(__dirname, "..", "lib", "scoring", "model", "model.json"), "utf8"));
const sample = readFileSync(join(__dirname, "..", "public", "samples", "nightwatch-sample-flows.csv"), "utf8");

describe("CICFlowMeter CSV upload", () => {
  it("normalises headers the same way as the Python pipeline", () => {
    expect(featureKey("Flow Bytes/s")).toBe("f_flow_bytes_s");
    expect(featureKey(" Total Length of Fwd Packet ")).toBe("f_total_length_of_fwd_packet");
    expect(featureKey("Dst Port")).toBe("f_dst_port");
  });

  it("maps every model feature from the sample export", () => {
    const r = parseFlowsCsv(sample, model.features, 50_000);
    expect(r.missing).toEqual([]);
    expect(r.flows.length).toBe(2247);
    expect(r.flows[0].features).toHaveLength(model.features.length);
  });

  it("finds attacks in the held-out sample (147 botnet, 300 scan, 300 DDoS flows)", () => {
    const r = parseFlowsCsv(sample, model.features, 50_000);
    const flagged = r.flows.filter((f) => score(model, f.features).verdict !== "suppressed").length;
    expect(flagged).toBeGreaterThanOrEqual(700);
    expect(flagged).toBeLessThan(800); // the 1,500 benign rows must mostly stay quiet
  });

  it("rejects a file without the expected columns", () => {
    const r = parseFlowsCsv("a,b,c\n1,2,3\n", model.features, 10);
    expect(r.missing.length).toBeGreaterThan(0);
  });
});
