import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    coverage: {
      include: ["lib/**/*.ts"],
      exclude: ["lib/db/types.ts", "lib/**/queries.ts", "lib/supabase/**"],
      // Floor just under the current level: CI fails if coverage drops.
      thresholds: { statements: 85, branches: 83, functions: 80, lines: 84 },
    },
    projects: [
      {
        // Pure business logic (outfit engine, weather rules, ...).
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/unit/**/*.test.ts"],
        },
      },
      {
        // Screens rendered in jsdom, network mocked with MSW.
        extends: true,
        test: {
          name: "integration",
          environment: "jsdom",
          include: ["tests/integration/**/*.test.{ts,tsx}"],
          setupFiles: ["tests/setup/integration.ts"],
          env: {
            NEXT_PUBLIC_SUPABASE_URL: "http://supabase.test",
            NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
          },
        },
      },
      {
        // Row Level Security against a local Supabase (`pnpm supabase start`).
        // Skipped when no local instance is running.
        extends: true,
        test: {
          name: "rls",
          environment: "node",
          include: ["tests/rls/**/*.test.ts"],
          globalSetup: ["tests/setup/supabase-local.ts"],
          testTimeout: 20_000,
          fileParallelism: false,
        },
      },
    ],
  },
});
