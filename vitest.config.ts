import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "core",
          root: "packages/core",
          environment: "node",
          include: ["test/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "server",
          root: "apps/server",
          environment: "node",
          include: ["test/**/*.test.ts"],
          exclude: [...configDefaults.exclude, "test/**/*.integration.test.ts"],
        },
      },
      // Root stays at the repo root, so vitest never loads apps/plugin/vite.config.ts (mkcert, bridge proxy).
      {
        test: {
          name: "plugin",
          environment: "node",
          include: ["apps/plugin/test/**/*.test.ts"],
        },
      },
      // Root at the repo root here too, so vitest never loads apps/web/vite.config.ts.
      {
        test: {
          name: "web",
          environment: "node",
          include: ["apps/web/test/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "integration",
          root: "apps/server",
          environment: "node",
          include: ["test/**/*.integration.test.ts"],
          testTimeout: 180_000,
          hookTimeout: 180_000,
          fileParallelism: false,
        },
      },
    ],
  },
});
