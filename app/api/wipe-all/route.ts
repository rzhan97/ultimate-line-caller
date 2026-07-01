import { NextResponse } from "next/server";
import { getValues, updateValues, setConfigValue } from "@/lib/sheets";

export async function POST() {
  try {
    // Clear all Points rows (keep header row 1)
    const pointRows = await getValues("Points!A:Q");
    if (pointRows.length > 1) {
      const numCols = pointRows[0].length;
      const numDataRows = pointRows.length - 1;
      const emptyRows = Array.from({ length: numDataRows }, () =>
        new Array(numCols).fill("")
      );
      await updateValues(`Points!A2:Q${pointRows.length}`, emptyRows);
    }

    // Clear all Games rows (keep header row 1)
    const gameRows = await getValues("Games!A:J");
    if (gameRows.length > 1) {
      const numCols = gameRows[0].length;
      const numDataRows = gameRows.length - 1;
      const emptyRows = Array.from({ length: numDataRows }, () =>
        new Array(numCols).fill("")
      );
      await updateValues(`Games!A2:J${gameRows.length}`, emptyRows);
    }

    // Reset all config
    await Promise.all([
      setConfigValue("current_point_number", 1),
      setConfigValue("score_us", 0),
      setConfigValue("score_them", 0),
      setConfigValue("current_point_id", ""),
      setConfigValue("current_point_status", ""),
      setConfigValue("current_start_time", ""),
      setConfigValue("current_game_id", ""),
      setConfigValue("line_type", "O"),
      setConfigValue("possession_type", "Receive"),
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("WIPE ALL ERROR:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
