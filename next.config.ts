import type { NextConfig } from "next";

const pagesBasePath = process.env.GITHUB_ACTIONS === "true"
  ? "/membrane-potential-curve"
  : "";

const nextConfig: NextConfig = {
  output: "export",
  basePath: pagesBasePath,
  assetPrefix: pagesBasePath || undefined,
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
