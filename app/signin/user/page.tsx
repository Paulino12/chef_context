// app/dashboard/page.tsx  (Server Component)
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export default async function UserDetails() {
    const session = await getServerSession(authOptions)

    return (
        <div>
            Hello, {session?.user?.name}
        </div>
    )
}