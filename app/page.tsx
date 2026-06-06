import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import HomeClient from "@/app/components/home-client";
import { Tool, TOOLS } from "@/app/lib/tools";

function getToolsForSession(isSignedIn: boolean): Tool[] {
  if (isSignedIn) return TOOLS;

  return TOOLS.map((tool) =>
    tool.external
      ? {
          ...tool,
          href: "/signin?callbackUrl=/dashboard",
          cta: "Sign in to open",
          external: false,
          status: "Sign in required",
        }
      : tool,
  );
}

export default async function Home() {
  const session = await getServerSession(authOptions);
  const isSignedIn = Boolean(session);

  return <HomeClient tools={getToolsForSession(isSignedIn)} isSignedIn={isSignedIn} />;
}
