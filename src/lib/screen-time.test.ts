import { describe, it, expect } from "vitest";
import { effectiveLimit, extendBonus } from "./screen-time";

describe("screen time extension", () => {
  it("effective limit is daily limit plus bonus", () => {
    expect(effectiveLimit(60, 0)).toBe(60);
    expect(effectiveLimit(60, 60)).toBe(120);
  });
  it("each extension adds exactly 60 minutes", () => {
    expect(extendBonus(0)).toBe(60);
    expect(extendBonus(60)).toBe(120);
  });
});
