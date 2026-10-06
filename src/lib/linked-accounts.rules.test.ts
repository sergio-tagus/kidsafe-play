import { describe, it, expect } from "vitest";
import { validateLinkEmail } from "./linked-accounts.rules";

describe("linked account rules", () => {
  it("allows at most 3 linked emails", () => {
    expect(validateLinkEmail("d@x.com", "me@x.com", ["a@x.com", "b@x.com", "c@x.com"])).toBe("limit");
    expect(validateLinkEmail("c@x.com", "me@x.com", ["a@x.com", "b@x.com"])).toBeNull();
  });
  it("rejects the account's own email", () => {
    expect(validateLinkEmail("ME@x.com", "me@x.com", [])).toBe("own");
  });
  it("rejects an email already linked", () => {
    expect(validateLinkEmail("A@x.com ", "me@x.com", ["a@x.com"])).toBe("duplicate");
  });
});
