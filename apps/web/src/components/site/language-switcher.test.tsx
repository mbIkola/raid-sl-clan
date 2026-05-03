import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { I18N_STORAGE_KEY } from "../../lib/i18n/languages";
import { LanguageSwitcher } from "./language-switcher";
import { LocaleProvider } from "./locale-provider";

const reactActEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
reactActEnvironment.IS_REACT_ACT_ENVIRONMENT = true;

describe("LanguageSwitcher", () => {
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
      value: ["ru-RU", "en-US"]
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("renders supported endonym options", async () => {
    await act(async () => {
      root.render(
        <LocaleProvider>
          <LanguageSwitcher />
        </LocaleProvider>
      );
    });

    const options = Array.from(container.querySelectorAll("option")).map(
      (option) => option.textContent
    );
    expect(options).toEqual(["Русский", "Українська", "English"]);
  });

  it("updates selected value and persists language when changed", async () => {
    await act(async () => {
      root.render(
        <LocaleProvider>
          <LanguageSwitcher />
        </LocaleProvider>
      );
    });

    const select = container.querySelector("select");
    expect(select).not.toBeNull();

    await act(async () => {
      if (!select) {
        return;
      }
      select.value = "en";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(select?.value).toBe("en");
    expect(localStorage.getItem(I18N_STORAGE_KEY)).toBe("en");
    expect(document.documentElement.lang).toBe("en");
  });

  it("ignores invalid language values", async () => {
    await act(async () => {
      root.render(
        <LocaleProvider>
          <LanguageSwitcher />
        </LocaleProvider>
      );
    });

    const select = container.querySelector("select");
    expect(select).not.toBeNull();

    await act(async () => {
      if (!select) {
        return;
      }
      select.value = "xx";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(select?.value).toBe("ru");
    expect(localStorage.getItem(I18N_STORAGE_KEY)).toBe("ru");
    expect(document.documentElement.lang).toBe("ru");
  });
});
