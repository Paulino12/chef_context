import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

export type ChefContextSession = {
  user: {
    id: string;
    email: string;
    name: string;
  };
};

function getSupabasePublicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export async function getServerAccessSession(): Promise<ChefContextSession | null> {
  const supabaseEnv = getSupabasePublicEnv();
  if (!supabaseEnv) return null;

  const cookieStore = await cookies();
  const accessToken = cookieStore.get("sb-access-token")?.value?.trim() || "";
  if (!accessToken) return null;

  const supabase = createClient(supabaseEnv.url, supabaseEnv.anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const result = await supabase.auth.getUser(accessToken);
  if (result.error || !result.data.user) return null;

  const user = result.data.user;
  const email = user.email?.trim() || "";
  if (!email) return null;

  const name =
    typeof user.user_metadata?.name === "string" && user.user_metadata.name.trim()
      ? user.user_metadata.name.trim()
      : email;

  return {
    user: {
      id: user.id,
      email,
      name,
    },
  };
}
