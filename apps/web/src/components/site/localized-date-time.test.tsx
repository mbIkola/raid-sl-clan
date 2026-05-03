import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { I18N_STORAGE_KEY } from "../../lib/i18n/languages";
import { LocaleProvider } from "./locale-provider";
import { LocalizedDateTime } from "./localized-date-time";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe("LocalizedDateTime", () => {
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

  it("renders timezone-formatted date text from provider locale", async () => {
    localStorage.setItem(I18N_STORAGE_KEY, "en");

    await act(async () => {
      root.render(
        <LocaleProvider>
          <LocalizedDateTime iso="2026-05-03T10:00:00.000Z" />
        </LocaleProvider>
      );
    });

    expect(container.textContent).toContain("03");
    expect(container.textContent ?? "").toMatch(/May/i);
  });

  it("renders fallback for null ISO", async () => {
    localStorage.setItem(I18N_STORAGE_KEY, "en");

    await act(async () => {
      root.render(
        <LocaleProvider>
          <LocalizedDateTime iso={null} />
        </LocaleProvider>
      );
    });

    expect(container.textContent).toBe("—");
  });

  it("renders deterministic placeholder on server render", () => {
    const html = renderToString(<LocalizedDateTime iso="2026-05-03T10:00:00.000Z" />);
    expect(html).toContain("—");
  });
});
