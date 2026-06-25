import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db/client";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession("ye-weather");
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Ownership check
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

  // If this is the user's default location, clear it
  await query(
    `UPDATE user_preferences SET default_location_id = NULL
     WHERE user_id = $1 AND default_location_id = $2`,
    [session.userId, id]
  );

  await query(`DELETE FROM saved_locations WHERE id = $1`, [id]);

  return NextResponse.json({ data: { deleted: true } });
}
