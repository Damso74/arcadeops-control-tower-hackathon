import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the Turbopack workspace root to this repo so Next.js does not pick
  // an unrelated parent lockfile when the demo is checked out alongside
  // other Node projects.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
