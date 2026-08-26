const isProduction = process.env.NODE_ENV === "production";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath: isProduction ? "/NexusEarth" : "",
  assetPrefix: isProduction ? "/NexusEarth/" : "",
  trailingSlash: true,
  images: { unoptimized: true }
};

export default nextConfig;
