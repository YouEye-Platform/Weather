import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { ensureSchema } from "@/lib/db/migrate";
import { query } from "@/lib/db/client";
import { emitLocationAddedEvent } from "@/lib/timeline/emit";
import type { SavedLocation } from "@/lib/weather/types";

export async function GET() {
  const session = await getSession("ye-weather");
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureSchema();

  const result = await query<SavedLocation>(
    `SELECT * FROM saved_locations WHERE user_id = $1 ORDER BY sort_order ASC, created_at ASC`,
    [session.userId]
  );

  return NextResponse.json({ data: result.rows });
}

export async function POST(request: NextRequest) {
  const session = await getSession("ye-weather");
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureSchema();

  let body: { name?: string; latitude?: number; longitude?: number; timezone?: string; country?: string; country_code?: string; admin1?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, latitude, longitude, timezone, country, country_code, admin1 } = body;
  if (!name || latitude === undefined || longitude === undefined) {
    return NextResponse.json({ error: "name, latitude, and longitude are required" }, { status: 400 });
  }

  const result = await query<SavedLocation>(
    `INSERT INTO saved_locations (user_id, name, latitude, longitude, timezone, country, country_code, admin1)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [session.userId, name, latitude, longitude, timezone ?? "UTC", country ?? null, country_code ?? null, admin1 ?? null]
  );

  const location = result.rows[0]!;

  // Emit timeline event (best-effort) — derive domain from request, never hardcode
  const domain = process.env.WEATHER_EXTERNAL_URL?.replace(/^https?:\/\//, "").replace(/\/$/, "") ?? request.headers.get("host") ?? "";
  if (domain) {
    emitLocationAddedEvent(session.userId, location.name, location.id, domain, location.latitude, location.longitude).catch(() => {});
  }

  return NextResponse.json({ data: location }, { status: 201 });
}
