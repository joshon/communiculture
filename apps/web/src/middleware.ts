export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/continuum/:path*",
    "/profile/:path*",
    "/teams/:path*",
    "/billing/:path*",
  ],
};
