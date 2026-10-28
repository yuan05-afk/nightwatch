import { describe, expect, it } from "vitest";
import { safeNext } from "@/lib/safe-next";

describe("post sign-in redirect", () => {
  it("keeps same-origin paths", () => {
    expect(safeNext("/reports/abc?x=1")).toBe("/reports/abc?x=1");
    expect(safeNext("/check")).toBe("/check");
  });

  it("falls back to the console for anything that could leave the site", () => {
    for (const bad of [null, "", "https://evil.com", "//evil.com", "/\\evil.com", "/\\/evil.com", "javascript:alert(1)", "console"]) {
      expect(safeNext(bad)).toBe("/console");
    }
  });
});
