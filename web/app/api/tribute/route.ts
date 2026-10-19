import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const BASE_TRIBUTE_COUNT = 65;
const DATA_FILE_PATH = path.join(process.cwd(), "data", "tributes.json");
const DEFAULT_COUNT = 0;

function getFallbackCount(): number {
  try {
    if (fs.existsSync(DATA_FILE_PATH)) {
      const raw = fs.readFileSync(DATA_FILE_PATH, "utf-8");
      const parsed = JSON.parse(raw);
      if (typeof parsed.count === "number") return parsed.count;
    }
  } catch {}
  return DEFAULT_COUNT;
}

function saveFallbackCount(count: number): void {
  try {
    const dir = path.dirname(DATA_FILE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify({ count }, null, 2), "utf-8");
  } catch {}
}

async function fetchCurrentCount(): Promise<number> {
  try {
    const { data, error } = await supabase
      .from("tributes")
      .select("count")
      .eq("id", 1)
      .single();

    if (!error && data && typeof data.count === "number") {
      return data.count;
    }

    if (error) {
      console.warn("[API/TRIBUTE] Supabase GET query error:", error.message);
    }
  } catch (err) {
    console.warn("[API/TRIBUTE] Error querying Supabase tributes:", err);
  }

  return getFallbackCount();
}

export async function GET() {
  const dbCount = await fetchCurrentCount();
  const totalCount = (dbCount || 0) + BASE_TRIBUTE_COUNT;
  return NextResponse.json({ count: totalCount });
}

export async function POST(request: NextRequest) {
  // 1. Server-Side Cookie Guard: reject double increment if cookie present
  const tributeCookie = request.cookies.get("lemonaid_tribute_paid");
  if (tributeCookie) {
    const dbCount = await fetchCurrentCount();
    const totalCount = (dbCount || 0) + BASE_TRIBUTE_COUNT;
    return NextResponse.json(
      { count: totalCount, message: "Already recorded" },
      { status: 200 }
    );
  }

  // 2. Increment tribute in Supabase
  let newDbCount: number | null = null;
  try {
    const { data: rpcCount, error: rpcError } = await supabase.rpc("increment_tribute");
    if (!rpcError && typeof rpcCount === "number") {
      newDbCount = rpcCount;
    } else {
      // Direct table increment fallback if RPC not yet created
      const { data: currentData, error: readError } = await supabase
        .from("tributes")
        .select("count")
        .eq("id", 1)
        .single();

      if (!readError && currentData) {
        const nextCount = (currentData.count || 0) + 1;
        const { data: updatedData, error: updateError } = await supabase
          .from("tributes")
          .update({ count: nextCount })
          .eq("id", 1)
          .select("count")
          .single();

        if (!updateError && updatedData) {
          newDbCount = updatedData.count;
        }
      }
    }
  } catch (err) {
    console.warn("[API/TRIBUTE] Error updating Supabase tribute:", err);
  }

  if (newDbCount === null) {
    newDbCount = getFallbackCount() + 1;
  }

  saveFallbackCount(newDbCount);

  // 3. Attach permanent cookie to the response
  const updatedCount = (newDbCount || 1) + BASE_TRIBUTE_COUNT;
  const response = NextResponse.json({ count: updatedCount });
  response.cookies.set("lemonaid_tribute_paid", "true", {
    path: "/",
    maxAge: 60 * 60 * 24 * 365 * 5, // 5 years
    sameSite: "lax",
    httpOnly: true,
  });

  return response;
}
