import { describe, it, expect } from "vitest";
import { isLovableHost } from "./lovable-host";

describe("isLovableHost", () => {
  it("allows the Lovable preview", () => {
    expect(isLovableHost("id-preview--714b6fcd-20e1-4355-88ac-f160e385a63a.lovable.app")).toBe(true);
  });
  it("blocks the published addresses", () => {
    expect(isLovableHost("kidsafe-play.mediaatlastv.com")).toBe(false);
    expect(isLovableHost("kidsafe-play.lovable.app")).toBe(false);
  });
});
