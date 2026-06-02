import path from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../../"),
  transpilePackages: ["@communiculture/db"],
  images: {
    domains: ["lh3.googleusercontent.com", "graph.facebook.com", "avatars.githubusercontent.com"],
  },
};

export default nextConfig;
