import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LocalizedDateTime } from "./localized-date-time";

declare global {
  // eslint-disable-next-line no-var
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
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("renders timezone-formatted date text", async () => {
    await act(async () => {
      root.render(
        <LocalizedDateTime iso="2026-05-03T10:00:00.000Z" locale="en-GB" timeZone="UTC" />
      );
    });

    expect(container.textContent).toContain("03");
    expect(container.textContent).toContain("May");
  });

  it("renders fallback for null ISO", async () => {
    await act(async () => {
      root.render(<LocalizedDateTime iso={null} locale="en-GB" timeZone="UTC" />);
    });

    expect(container.textContent).toBe("—");
  });
});
