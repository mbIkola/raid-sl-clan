import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: {
    include: [
      "packages/**/test/**/*.test.ts",
      "apps/web/scripts/**/*.test.ts",
      "apps/web/src/**/*.test.ts",
      "apps/web/src/**/*.test.tsx"
    ],
    environmentMatchGlobs: [
      ["apps/web/src/**/*.test.tsx", "jsdom"]
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"]
    }
  },
  resolve: {
    alias: {
      "@raid/core": resolve(__dirname, "packages/core/src/index.ts"),
      "@raid/application": resolve(__dirname, "packages/application/src/index.ts"),
      "@raid/ports": resolve(__dirname, "packages/ports/src/index.ts"),
      "@raid/platform": resolve(__dirname, "packages/platform/src/index.ts")
    }
  }
});
