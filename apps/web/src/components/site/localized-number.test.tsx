import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LocalizedNumber } from "./localized-number";

declare global {
  // eslint-disable-next-line no-var
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
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("renders compact number format", async () => {
    await act(async () => {
      root.render(
        <LocalizedNumber
          value={1_200_000}
          locale="en-US"
          notation="compact"
          compactDisplay="short"
        />
      );
    });

    expect(container.textContent).toContain("M");
  });

  it("renders locale-aware grouped number format", async () => {
    await act(async () => {
      root.render(<LocalizedNumber value={12_345} locale="de-DE" />);
    });

    expect(container.textContent).toBe("12.345");
  });
});
