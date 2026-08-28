import path from "node:path";
import { fileURLToPath } from "node:url";

const isProduction = process.env.NODE_ENV === "production";
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath: isProduction ? "/NexusEarth" : "",
  assetPrefix: isProduction ? "/NexusEarth/" : "",
  trailingSlash: true,
  images: { unoptimized: true },
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@spz-loader/core": path.join(projectRoot, "lib/cesium/spz-loader-stub.js")
    };
    return config;
  }
};

export default nextConfig;
