import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Authenticated CRM pages render per request using the current Supabase session.
  cacheComponents: false,
  partialPrefetching: false,
};

export default nextConfig;
