import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("public manifest", () => {
  it("keeps the web manifest as a static asset contract", () => {
    const manifest = JSON.parse(
      readFileSync(new URL("../../public/manifest.webmanifest", import.meta.url), "utf8")
    ) as {
      name: string;
      short_name: string;
      icons: Array<{ src: string; sizes: string; type: string }>;
    };

    expect(manifest.name).toBe("Raid SL Clan");
    expect(manifest.short_name).toBe("Raid SL Clan");
    expect(manifest.icons).toEqual([
      {
        src: "/meta/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png"
      },
      {
        src: "/meta/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png"
      }
    ]);
  });
});
