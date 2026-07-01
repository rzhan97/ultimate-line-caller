import { NextResponse } from "next/server";
import { getValues, updateValues, setConfigValue, getConfigMap } from "@/lib/sheets";

export async function POST() {
  try {
    const config  = await getConfigMap();
    const gameId  = (config.current_game_id || "").trim();

    // Clear only the Points rows that belong to the current game
    const rows    = (await getValues("Points!A:Q")) as string[][];
    if (rows.length > 1) {
      const headers   = rows[0];
      const gameIdIdx = headers.indexOf("GameID");

      // Build a list of row indices (1-based, offset by header) to blank
      const blankRows: number[] = [];
      rows.slice(1).forEach((row, i) => {
        const rowGameId = (row[gameIdIdx] || "").trim();
        if (!gameId || rowGameId === gameId) blankRows.push(i + 2); // sheet row
      });

      // Blank them one by one (could batch but keeps it simple)
      for (const sheetRow of blankRows) {
        await updateValues(`Points!A${sheetRow}:Q${sheetRow}`, [
          new Array(rows[0].length).fill(""),
        ]);
      }
    }

    await Promise.all([
      setConfigValue("current_point_number", 1),
      setConfigValue("score_us", 0),
      setConfigValue("score_them", 0),
      setConfigValue("current_point_id", ""),
      setConfigValue("current_point_status", ""),
      setConfigValue("current_start_time", ""),
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("RESET GAME ERROR:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
