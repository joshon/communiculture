/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["@communiculture/db"],
  images: {
    domains: ["lh3.googleusercontent.com", "graph.facebook.com", "avatars.githubusercontent.com"],
  },
  // Canonicalize the apex domain to www (NEXTAUTH_URL is www). Without this, a
  // visitor on communiculture.org starts the Google OAuth flow there — setting
  // the state/PKCE cookies on the apex host — but the callback lands on www,
  // which can't read those cookies, so the first sign-in fails and only the
  // retry (now on www) works.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "communiculture.org" }],
        destination: "https://www.communiculture.org/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
