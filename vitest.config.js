import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["data/**/*.test.js", "agents/**/*.test.js"],
    exclude: ["node_modules/**"],
  },
});
