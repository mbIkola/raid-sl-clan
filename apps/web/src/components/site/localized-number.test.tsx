import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { I18N_STORAGE_KEY } from "../../lib/i18n/languages";
import { LocaleProvider } from "./locale-provider";
import { LocalizedNumber } from "./localized-number";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe("LocalizedNumber", () => {
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

  it("renders compact number format using provider locale", async () => {
    localStorage.setItem(I18N_STORAGE_KEY, "en");

    await act(async () => {
      root.render(
        <LocaleProvider>
          <LocalizedNumber value={1_200_000} notation="compact" compactDisplay="short" />
        </LocaleProvider>
      );
    });

    expect(container.textContent).toContain("M");
  });

  it("renders locale-aware grouped number format from provider", async () => {
    localStorage.setItem(I18N_STORAGE_KEY, "ru");

    await act(async () => {
      root.render(
        <LocaleProvider>
          <LocalizedNumber value={12_345} />
        </LocaleProvider>
      );
    });

    expect(container.textContent ?? "").toMatch(/12[\s\u00A0\u202F]345/);
  });

  it("renders deterministic placeholder on server render", () => {
    const html = renderToString(<LocalizedNumber value={12_345} />);
    expect(html).toContain("—");
  });
});
