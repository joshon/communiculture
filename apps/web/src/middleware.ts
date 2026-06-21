export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/dashboard/:path*",
    // /continuum/:path* is intentionally NOT matched — continuum view pages are
    // publicly viewable. /continuum/new and /continuum/[id]/invite enforce auth
    // themselves (server-side redirect/notFound).
    "/profile/:path*",
    "/teams/:path*",
    "/billing/:path*",
  ],
};
