import { describe, it, expect } from "vitest";
import { detectTv, keyToDir, isBackKey, scoreCandidate } from "./tv-mode";

const base = { width: 1920, coarse: false, touch: false };

describe("tv mode", () => {
  it("detects Google TV user agent", () => {
    expect(detectTv("Mozilla/5.0 (Linux; Android 12; Chromecast) AndroidTV", { ...base, touch: true })).toBe(true);
  });
  it("phone is not TV", () => {
    expect(detectTv("Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile", { width: 412, coarse: true, touch: true })).toBe(false);
  });
  it("?tv=1 forces TV mode on desktop", () => {
    expect(detectTv("Mozilla/5.0 (Macintosh)", { ...base, forced: "1" })).toBe(true);
  });
  it("maps arrows and back keys", () => {
    expect(keyToDir("ArrowLeft")).toBe("left");
    expect(isBackKey("GoBack")).toBe(true);
    expect(isBackKey("Unidentified", 4)).toBe(true);
    expect(isBackKey("Enter")).toBe(false);
  });
  it("prefers the aligned neighbour to the right", () => {
    const from = { left: 0, top: 0, right: 100, bottom: 100 };
    const aligned = scoreCandidate(from, { left: 120, top: 0, right: 220, bottom: 100 }, "right")!;
    const diagonal = scoreCandidate(from, { left: 120, top: 200, right: 220, bottom: 300 }, "right")!;
    expect(aligned).toBeLessThan(diagonal);
    expect(scoreCandidate(from, { left: -200, top: 0, right: -100, bottom: 100 }, "right")).toBeNull();
  });
});
