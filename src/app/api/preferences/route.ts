import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { ensureSchema } from "@/lib/db/migrate";
import { query } from "@/lib/db/client";
import type { UserPreferences } from "@/lib/weather/types";

export async function GET() {
  const session = await getSession("ye-weather");
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureSchema();

  const result = await query<UserPreferences>(
    `SELECT temperature_unit, wind_speed_unit, precipitation_unit, default_location_id
     FROM user_preferences WHERE user_id = $1`,
    [session.userId]
  );

  if (result.rows[0]) {
    return NextResponse.json({ data: result.rows[0] });
  }

  // Auto-create defaults
  const defaults: UserPreferences = {
    temperature_unit: "celsius",
    wind_speed_unit: "kmh",
    precipitation_unit: "mm",
    default_location_id: null,
  };
  await query(
    `INSERT INTO user_preferences (user_id, temperature_unit, wind_speed_unit, precipitation_unit)
     VALUES ($1, $2, $3, $4) ON CONFLICT (user_id) DO NOTHING`,
    [session.userId, defaults.temperature_unit, defaults.wind_speed_unit, defaults.precipitation_unit]
  );

  return NextResponse.json({ data: defaults });
}

export async function PUT(request: NextRequest) {
  const session = await getSession("ye-weather");
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureSchema();

  let body: { temperature_unit?: string; wind_speed_unit?: string; precipitation_unit?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const validTempUnits = ["celsius", "fahrenheit"];
  const validWindUnits = ["kmh", "mph", "ms", "knots"];
  const validPrecipUnits = ["mm", "inch"];

  if (body.temperature_unit && !validTempUnits.includes(body.temperature_unit)) {
    return NextResponse.json({ error: "Invalid temperature_unit" }, { status: 400 });
  }
  if (body.wind_speed_unit && !validWindUnits.includes(body.wind_speed_unit)) {
    return NextResponse.json({ error: "Invalid wind_speed_unit" }, { status: 400 });
  }
  if (body.precipitation_unit && !validPrecipUnits.includes(body.precipitation_unit)) {
    return NextResponse.json({ error: "Invalid precipitation_unit" }, { status: 400 });
  }

  await query(
    `INSERT INTO user_preferences (user_id, temperature_unit, wind_speed_unit, precipitation_unit, updated_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       temperature_unit = COALESCE($2, user_preferences.temperature_unit),
       wind_speed_unit = COALESCE($3, user_preferences.wind_speed_unit),
       precipitation_unit = COALESCE($4, user_preferences.precipitation_unit),
       updated_at = NOW()`,
    [
      session.userId,
      body.temperature_unit ?? null,
      body.wind_speed_unit ?? null,
      body.precipitation_unit ?? null,
    ]
  );

  const result = await query<UserPreferences>(
    `SELECT temperature_unit, wind_speed_unit, precipitation_unit, default_location_id
     FROM user_preferences WHERE user_id = $1`,
    [session.userId]
  );

  return NextResponse.json({ data: result.rows[0] });
}
