import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db/client";

export async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession("ye-weather");
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Verify ownership
  const locResult = await query<{ id: string; user_id: string }>(
    `SELECT id, user_id FROM saved_locations WHERE id = $1`,
    [id]
  );
  const loc = locResult.rows[0];
  if (!loc) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }
  if (loc.user_id !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Upsert preferences with default_location_id
  await query(
    `INSERT INTO user_preferences (user_id, default_location_id, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (user_id) DO UPDATE SET default_location_id = $2, updated_at = NOW()`,
    [session.userId, id]
  );

  return NextResponse.json({ data: { default_location_id: id } });
}
