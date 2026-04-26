import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

void initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {
  transpilePackages: ["@raid/core", "@raid/application", "@raid/ports", "@raid/platform"]
};

export default nextConfig;
