import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LanguageSwitcher } from "./language-switcher";
import { LocaleProvider } from "./locale-provider";

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe("LanguageSwitcher", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
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
});
