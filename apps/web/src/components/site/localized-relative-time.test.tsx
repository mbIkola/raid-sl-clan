import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { I18N_STORAGE_KEY } from "../../lib/i18n/languages";
import { LocaleProvider } from "./locale-provider";
import { LocalizedRelativeTime } from "./localized-relative-time";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe("LocalizedRelativeTime", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
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
  });

  it("renders localized relative label", async () => {
    localStorage.setItem(I18N_STORAGE_KEY, "en");

    await act(async () => {
      root.render(
        <LocaleProvider>
          <LocalizedRelativeTime
            targetIso="2099-01-01T00:00:00.000Z"
            nowIso="2098-12-31T23:00:00.000Z"
          />
        </LocaleProvider>
      );
    });

    expect(container.textContent ?? "").toMatch(/hour/i);
  });

  it("selects day unit for large differences", async () => {
    localStorage.setItem(I18N_STORAGE_KEY, "en");

    await act(async () => {
      root.render(
        <LocaleProvider>
          <LocalizedRelativeTime
            targetIso="2099-01-03T23:00:00.000Z"
            nowIso="2099-01-01T23:00:00.000Z"
          />
        </LocaleProvider>
      );
    });

    expect(container.textContent ?? "").toMatch(/day/i);
  });

  it("renders fallback for invalid ISO input", async () => {
    localStorage.setItem(I18N_STORAGE_KEY, "en");

    await act(async () => {
      root.render(
        <LocaleProvider>
          <LocalizedRelativeTime targetIso="invalid-iso" nowIso="2098-12-31T23:00:00.000Z" />
        </LocaleProvider>
      );
    });

    expect(container.textContent).toBe("—");
  });

  it("renders deterministic placeholder on server render when nowIso is omitted", () => {
    const html = renderToString(<LocalizedRelativeTime targetIso="2099-01-01T00:00:00.000Z" />);
    expect(html).toContain("—");
  });
});
