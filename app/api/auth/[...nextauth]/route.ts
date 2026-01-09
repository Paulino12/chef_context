import NextAuth, { NextAuthOptions } from "next-auth";
import Google from "next-auth/providers/google";
// Starting with just Google. Add others or Credentials later.

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" }, // no DB required
  pages: {
    signIn: "/signin", // use our custon page
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_ID!,
      clientSecret: process.env.GOOGLE_SECRET!,
    }),
  ],
  jwt: {
    // Defaults to `session.maxAge`.
    maxAge: 60 * 60, // 1 hour
  },
  callbacks: {
    async jwt({ token }) {
      // enrich token if needed
      return token;
    },
    async session({ session }) {
      // expose fields to the client if needed
      return session;
    },
    // Optional: restrict allowed emails (e.g., your domain)
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
