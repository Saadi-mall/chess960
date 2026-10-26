import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useHistoryNav } from "./useHistoryNav";

describe("useHistoryNav", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("follows new moves while on the latest position, and stays put after stepping back", () => {
    const { result, rerender } = renderHook(({ length }) => useHistoryNav(length), { initialProps: { length: 2 } });
    expect(result.current.ply).toBe(2);

    rerender({ length: 3 });
    expect(result.current.ply).toBe(3);

    act(() => result.current.prev());
    expect(result.current.ply).toBe(2);
    expect(result.current.isLatest).toBe(false);

    rerender({ length: 4 });
    expect(result.current.ply).toBe(2);

    act(() => result.current.last());
    expect(result.current.ply).toBe(4);
    rerender({ length: 5 });
    expect(result.current.ply).toBe(5);
  });

  it("clamps first/prev/next at the ends", () => {
    const { result } = renderHook(() => useHistoryNav(2));
    act(() => result.current.next());
    expect(result.current.ply).toBe(2);
    act(() => result.current.first());
    act(() => result.current.prev());
    expect(result.current.ply).toBe(0);
  });

  it("replays from the start when play is pressed at the end, then stops", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useHistoryNav(2));

    act(() => result.current.togglePlay());
    expect(result.current.ply).toBe(0);
    expect(result.current.playing).toBe(true);

    act(() => vi.advanceTimersByTime(700));
    expect(result.current.ply).toBe(1);
    act(() => vi.advanceTimersByTime(700));
    expect(result.current.ply).toBe(2);
    expect(result.current.playing).toBe(false);
  });
});
