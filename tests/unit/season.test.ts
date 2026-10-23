import { describe, expect, it } from "vitest";
import { seasonForDate } from "@/lib/season";

describe("seasonForDate", () => {
  it.each([
    ["2026-01-15", "winter"],
    ["2026-02-28", "winter"],
    ["2026-03-01", "spring"],
    ["2026-05-31", "spring"],
    ["2026-06-01", "summer"],
    ["2026-08-31", "summer"],
    ["2026-09-01", "autumn"],
    ["2026-11-30", "autumn"],
    ["2026-12-01", "winter"],
  ])("%s is %s", (day, season) => {
    expect(seasonForDate(new Date(`${day}T12:00:00`))).toBe(season);
  });
});
