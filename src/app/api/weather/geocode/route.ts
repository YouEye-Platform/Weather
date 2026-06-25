import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { searchLocations } from "@/lib/weather/client";

export async function GET(request: NextRequest) {
  const session = await getSession("ye-weather");
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const results = await searchLocations(q, "en", session.userId);
  return NextResponse.json({ results });
}
