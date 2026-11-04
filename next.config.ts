import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Authenticated CRM pages render per request using the current Supabase session.
  cacheComponents: false,
  partialPrefetching: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
