import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18N_STORAGE_KEY } from "../../lib/i18n/languages";
import { useLocale } from "./locale-provider";

const reactActEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
reactActEnvironment.IS_REACT_ACT_ENVIRONMENT = true;

function Probe() {
  const { language, setLanguage } = useLocale();

  return (
    <button type="button" onClick={() => setLanguage("en")}>
      {language}
    </button>
  );
}

describe("LocaleProvider", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    localStorage.clear();
    document.documentElement.lang = "";

    Object.defineProperty(window.navigator, "languages", {
      configurable: true,
      value: ["uk-UA", "en-US"]
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.restoreAllMocks();
  });

  it("uses persisted value when available", async () => {
    localStorage.setItem(I18N_STORAGE_KEY, "ru");
    const { LocaleProvider } = await import("./locale-provider");

    await act(async () => {
      root.render(
        <LocaleProvider>
          <Probe />
        </LocaleProvider>
      );
    });

    expect(container.textContent).toBe("ru");
  });

  it("falls back to browser language and updates html lang on switch", async () => {
    const { LocaleProvider } = await import("./locale-provider");

    await act(async () => {
      root.render(
        <LocaleProvider>
          <Probe />
        </LocaleProvider>
      );
    });

    expect(container.textContent).toBe("uk");

    await act(async () => {
      container.querySelector("button")?.click();
    });

    expect(localStorage.getItem(I18N_STORAGE_KEY)).toBe("en");
    expect(document.documentElement.lang).toBe("en");
  });
});
