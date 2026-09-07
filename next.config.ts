import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Pins the workspace root explicitly — this machine has other unrelated
  // projects with their own lockfiles higher up the directory tree, which
  // otherwise makes Next.js guess (and warn) about which one is authoritative.
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
