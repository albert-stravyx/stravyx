import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    include: ["tests/contracts/**/*.test.ts", "packages/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@stravyx/types": path.resolve(__dirname, "packages/types/src/index.ts"),
      "@stravyx/api-client": path.resolve(__dirname, "packages/api-client/src/index.ts"),
    },
  },
});
