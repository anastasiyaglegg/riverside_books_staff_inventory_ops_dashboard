import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // API-only app: no pages, only app/api/**/route.ts handlers.

  // firebase-admin pulls in jwks-rsa, which does a CommonJS require() of the
  // ESM-only "jose" package -- webpack bundling that combination throws
  // ERR_REQUIRE_ESM at runtime. Keep firebase-admin external so it loads via
  // native Node require() instead of being bundled.
  serverExternalPackages: ["firebase-admin"],
};

export default nextConfig;
