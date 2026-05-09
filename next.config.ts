import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the Turbopack workspace root to this repo so Next.js does not pick
  // an unrelated parent lockfile when the demo is checked out alongside
  // other Node projects.
  turbopack: {
    root: path.resolve(__dirname),
  },
  // `standalone` produces `.next/standalone/server.js` with a minimal
  // node_modules subset — the format consumed by our Dockerfile and any
  // plain-Node host (Vultr VPS, Coolify, Fly, Render…). Vercel ignores
  // this output and uses its native runtime, so there is no downside to
  // enabling it everywhere.
  output: "standalone",
};

export default nextConfig;
