import { TOOLS } from "@/app/lib/tools";
import { getServerAccessSession } from "@/lib/supabase/serverSession";
import DashboardClient from "./components/DashboardClient";

export default async function Dashboard() {
  const session = await getServerAccessSession();

  return <DashboardClient name={session?.user.name ?? "Chef"} tools={TOOLS} />;
}
