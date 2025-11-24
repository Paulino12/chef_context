import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { TOOLS } from "@/app/lib/tools";
import DashboardClient from "./components/DashboardClient";
export default async function Dashboard() {
  const session = await getServerSession(authOptions);

  return <DashboardClient name={session?.user?.name ?? "Chef"} tools={TOOLS} />;
}
