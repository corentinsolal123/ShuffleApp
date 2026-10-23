import type { NextConfig } from "next";
import { withSerwist } from "@serwist/turbopack";

// Cache Components is left off: every screen is per-user and dynamic, and the
// Serwist route handler relies on classic route segment config.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withSerwist(nextConfig);
