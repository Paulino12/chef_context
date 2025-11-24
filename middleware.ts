import { withAuth } from "next-auth/middleware";

// Explicitly tell middleware to use your custom page
export default withAuth({
  pages: { signIn: "/signin" },
});

export const config = {
  matcher: [
    "/dashboard/:path*", // protect dashboard and tools
    "/api/invoice-analyzer/:path*", // protect your proxy API route
    "/api/generate/:path*", // protect your proxy API route
  ],
};
