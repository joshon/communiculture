/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["@communiculture/db"],
  images: {
    domains: ["lh3.googleusercontent.com", "graph.facebook.com", "avatars.githubusercontent.com"],
  },
};

export default nextConfig;
