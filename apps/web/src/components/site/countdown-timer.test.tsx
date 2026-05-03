import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18N_STORAGE_KEY } from "../../lib/i18n/languages";
import { CountdownTimer } from "./countdown-timer";
import { LocaleProvider } from "./locale-provider";

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe("CountdownTimer", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-03T10:00:00.000Z"));
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    localStorage.clear();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.useRealTimers();
  });

  it("fires onTimerEnd exactly once after crossing zero", async () => {
    const onTimerEnd = vi.fn();
    localStorage.setItem(I18N_STORAGE_KEY, "en");

    await act(async () => {
      root.render(
        <LocaleProvider>
          <CountdownTimer
            targetIso="2026-05-03T10:00:02.000Z"
            endedLabel="Fusion ended"
            onTimerEnd={onTimerEnd}
          />
        </LocaleProvider>
      );
    });

    expect(container.textContent).toContain("0m 2s");

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    expect(container.textContent).toBe("Fusion ended");
    expect(onTimerEnd).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(10000);
    });

    expect(onTimerEnd).toHaveBeenCalledTimes(1);
  });

  it("renders neutral fallback for invalid target ISO", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    localStorage.setItem(I18N_STORAGE_KEY, "en");

    await act(async () => {
      root.render(
        <LocaleProvider>
          <CountdownTimer
            targetIso="invalid-iso"
            endedLabel="Ended"
          />
        </LocaleProvider>
      );
    });

    expect(container.textContent).toBe("—");
    expect(warnSpy).toHaveBeenCalledWith("[dashboard/countdown] invalid-target", {
      targetIso: "invalid-iso"
    });

    warnSpy.mockRestore();
  });
});
