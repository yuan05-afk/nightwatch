import { describe, expect, it } from "vitest";
import { confidenceOf, rankScore, severityTier } from "@/lib/triage";

describe("incident priority", () => {
  it("never ranks a lower severity tier above a higher one, whatever the volume", () => {
    const criticalSmall = rankScore(severityTier("Botnet"), 0.6, 1);
    const highHuge = rankScore(severityTier("DDoS"), 1, 5_000_000);
    expect(criticalSmall).toBeGreaterThan(highHuge);
  });

  it("orders by confidence and volume inside a tier", () => {
    expect(rankScore(3, 0.99, 500)).toBeGreaterThan(rankScore(3, 0.99, 5));
    expect(rankScore(3, 0.99, 50)).toBeGreaterThan(rankScore(3, 0.6, 50));
  });

  it("maps families to industry severity levels", () => {
    expect(severityTier("Infiltration")).toBe(4);
    expect(severityTier("Brute Force")).toBe(3);
    expect(severityTier("Unknown")).toBe(2);
    expect(severityTier("PortScan")).toBe(1);
  });

  it("uses the anomaly score as confidence for unrecognized activity", () => {
    expect(confidenceOf("unknown", 0.2, 1)).toBeCloseTo(1);
    expect(confidenceOf("known", 0.93, 0)).toBeCloseTo(0.93);
  });
});
