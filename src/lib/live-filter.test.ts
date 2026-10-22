import { describe, it, expect } from "vitest";
import { isLiveVideo } from "./live-filter";

const normal = { snippet: { liveBroadcastContent: "none" }, contentDetails: { duration: "PT5M2S" } };

describe("isLiveVideo", () => {
  it("keeps a normal video", () => expect(isLiveVideo(normal)).toBe(false));
  it("drops a live stream in progress", () =>
    expect(isLiveVideo({ ...normal, snippet: { liveBroadcastContent: "live" } })).toBe(true));
  it("drops an upcoming stream", () =>
    expect(isLiveVideo({ ...normal, snippet: { liveBroadcastContent: "upcoming" } })).toBe(true));
  it("drops a past live recording", () =>
    expect(isLiveVideo({ ...normal, liveStreamingDetails: { actualEndTime: "2026-01-01" } })).toBe(true));
  it("drops a video without duration", () =>
    expect(isLiveVideo({ snippet: {}, contentDetails: { duration: "P0D" } })).toBe(true));
});
