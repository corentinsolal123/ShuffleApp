import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STALE_AFTER_MS, useOnResume } from "@/components/layout/use-on-resume";

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", { value: state, configurable: true });
  act(() => {
    document.dispatchEvent(new Event("visibilitychange"));
  });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
});

afterEach(() => {
  setVisibility("visible");
  vi.useRealTimers();
});

describe("useOnResume", () => {
  it("fires when the page comes back after a long absence", () => {
    const onResume = vi.fn();
    renderHook(() => useOnResume(onResume));

    setVisibility("hidden");
    vi.advanceTimersByTime(STALE_AFTER_MS);
    setVisibility("visible");

    expect(onResume).toHaveBeenCalledOnce();
  });

  it("ignores short app switches", () => {
    const onResume = vi.fn();
    renderHook(() => useOnResume(onResume));

    setVisibility("hidden");
    vi.advanceTimersByTime(STALE_AFTER_MS - 1);
    setVisibility("visible");

    expect(onResume).not.toHaveBeenCalled();
  });

  it("uses the latest callback without re-subscribing", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(({ callback }) => useOnResume(callback), { initialProps: { callback: first } });
    rerender({ callback: second });

    setVisibility("hidden");
    vi.advanceTimersByTime(STALE_AFTER_MS);
    setVisibility("visible");

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
  });
});
