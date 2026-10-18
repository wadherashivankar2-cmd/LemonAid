import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const DATA_FILE_PATH = path.join(process.cwd(), "data", "tributes.json");
const DEFAULT_COUNT = 1420;

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
  const count = await fetchCurrentCount();
  return NextResponse.json({ count });
}

export async function POST(request: NextRequest) {
  // 1. Server-Side Cookie Guard: reject double increment if cookie present
  const tributeCookie = request.cookies.get("lemonaid_tribute_paid");
  if (tributeCookie) {
    const currentCount = await fetchCurrentCount();
    return NextResponse.json(
      { count: currentCount, message: "Already recorded" },
      { status: 200 }
    );
  }

  // 2. Increment tribute in Supabase
  let newCount: number | null = null;
  try {
    const { data: rpcCount, error: rpcError } = await supabase.rpc("increment_tribute");
    if (!rpcError && typeof rpcCount === "number") {
      newCount = rpcCount;
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
          newCount = updatedData.count;
        }
      }
    }
  } catch (err) {
    console.warn("[API/TRIBUTE] Error updating Supabase tribute:", err);
  }

  if (newCount === null) {
    newCount = getFallbackCount() + 1;
  }

  saveFallbackCount(newCount);

  // 3. Attach permanent cookie to the response
  const response = NextResponse.json({ count: newCount });
  response.cookies.set("lemonaid_tribute_paid", "true", {
    path: "/",
    maxAge: 60 * 60 * 24 * 365 * 5, // 5 years
    sameSite: "lax",
    httpOnly: true,
  });

  return response;
}
