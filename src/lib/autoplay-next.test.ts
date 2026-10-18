import { describe, it, expect } from "vitest";
import { AUTOPLAY_NEXT_SECONDS, pickNextVideo, seekTarget, formatTime } from "./autoplay-next";
import { isDoubleBack } from "./tv-mode";

describe("autoplay next", () => {
  it("waits 10 seconds", () => expect(AUTOPLAY_NEXT_SECONDS).toBe(10));
  it("suggests the first related video that isn't the current one", () => {
    const list = [{ youtube_video_id: "a" }, { youtube_video_id: "b" }];
    expect(pickNextVideo(list, "a")?.youtube_video_id).toBe("b");
    expect(pickNextVideo(list, "x")?.youtube_video_id).toBe("a");
    expect(pickNextVideo([{ youtube_video_id: "a" }], "a")).toBeNull();
  });
  it("seeks 10 s within the video", () => {
    expect(seekTarget(5, -10, 100)).toBe(0);
    expect(seekTarget(95, 10, 100)).toBe(100);
    expect(seekTarget(30, 10, 100)).toBe(40);
  });
  it("formats time", () => expect(formatTime(75)).toBe("1:15"));
});

describe("double back", () => {
  it("exits when Back is pressed twice within 1.5 s", () => {
    expect(isDoubleBack(1000, 2400)).toBe(true);
    expect(isDoubleBack(1000, 2600)).toBe(false);
    expect(isDoubleBack(0, 100)).toBe(false);
  });
});
