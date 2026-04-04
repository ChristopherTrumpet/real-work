import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["dockerode", "ssh2", "tar-fs", "docker-modem"]
};

export default nextConfig;
