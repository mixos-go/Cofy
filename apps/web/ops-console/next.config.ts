import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The framework's version is not a secret, and leaking it only helps someone fingerprint us.
  poweredByHeader: false
};

export default nextConfig;
