import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerAccessSession } from "@/lib/supabase/serverSession";
import { countLibraryResults, MAX_LIBRARY_PAGE } from "@/lib/meal-library-pagination";

export const dynamic = "force-dynamic";

// Only reads are exposed. The browser never receives a database password and
// cannot invoke the earlier experimental Save/Open functionality.
export async function GET(request: NextRequest) {
  const headers = { "Cache-Control": "private, no-store" };
  const session = await getServerAccessSession();
  if (!session) return NextResponse.json({ error: "Please sign in to Chef Context." }, { status: 401, headers });
  const params = request.nextUrl.searchParams;
  const action = params.get("action") || "search";
  const countPages = params.get("count_pages") === "true" && action !== "summary";
  const page = countPages ? 0 : Number(params.get("page") || "0");
  const pageSize = Number(params.get("page_size") || "25");
  const query = params.get("query") || "";
  if (!["search", "summary", "appearances", "records"].includes(action) || !Number.isInteger(page) || page < 0 || page > MAX_LIBRARY_PAGE || ![10, 25, 50].includes(pageSize) || query.length > 240) {
    return NextResponse.json({ error: "Please check the search options." }, { status: 400, headers });
  }
  const token = (await cookies()).get("sb-access-token")?.value || "";
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  // Supabase validates the user's JWT and the function checks membership.
  // No caller-supplied user ID or privileged service key is used.
  const search = {
    action, page, page_size: pageSize, query, meal: params.get("meal"), course: params.get("course"),
    diet: params.get("diet"), from: params.get("from"), to: params.get("to"),
    alternatives: params.get("alternatives") === "true", dish_id: params.get("dish_id"), table: params.get("table"),
  };
  const { data, error } = await client.rpc("henbrook_meal_library", { p: search }).abortSignal(request.signal);
  if (error) {
    const forbidden = error.code === "42501";
    const invalid = ["22023", "22007", "22008"].includes(error.code);
    return NextResponse.json({ error: forbidden ? "Meal Library access has not been enabled for this account." : invalid ? "Please check your dates and search options." : "The meal library could not be loaded. Please try again." }, { status: forbidden ? 403 : invalid ? 400 : 503, headers });
  }
  if (countPages) {
    try {
      const totals = await countLibraryResults(data, pageSize, async (nextPage) => {
        const result = await client.rpc("henbrook_meal_library", {
          p: { ...search, page: nextPage },
        }).abortSignal(request.signal);
        if (result.error) throw result.error;
        return result.data;
      });
      return NextResponse.json(totals, { headers });
    } catch {
      return NextResponse.json({ error: "Page numbers could not be loaded. Please try again." }, { status: 503, headers });
    }
  }
  return NextResponse.json(data, { headers });
}
