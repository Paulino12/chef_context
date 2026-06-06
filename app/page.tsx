import HomeClient from "@/app/components/home-client";
import { Tool, TOOLS } from "@/app/lib/tools";
import { getServerAccessSession } from "@/lib/supabase/serverSession";

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
  const session = await getServerAccessSession();
  const isSignedIn = Boolean(session);

  return <HomeClient tools={getToolsForSession(isSignedIn)} isSignedIn={isSignedIn} />;
}
