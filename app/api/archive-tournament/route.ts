import { NextResponse } from "next/server";
import { getValues, updateValues, setConfigValue } from "@/lib/sheets";

export async function POST() {
  try {
    // Mark all Active games as Completed
    const rows = (await getValues("Games!A:J")) as string[][];
    if (rows.length < 2) {
      return NextResponse.json({ success: true, archived: 0 });
    }

    const headers = rows[0];
    const statusIdx = headers.indexOf("Status");
    let archived = 0;

    for (let i = 1; i < rows.length; i++) {
      const status = (rows[i][statusIdx] || "").trim().toLowerCase();
      if (status === "active" || status === "") {
        const sheetRow = i + 1;
        // Set Status to "Completed" — column H (index 7 from A)
        await updateValues(`Games!H${sheetRow}`, [["Completed"]]);
        archived++;
      }
    }

    // Clear active game from config
    await Promise.all([
      setConfigValue("current_game_id", ""),
      setConfigValue("current_point_number", 1),
      setConfigValue("score_us", 0),
      setConfigValue("score_them", 0),
      setConfigValue("current_point_status", ""),
      setConfigValue("current_point_id", ""),
      setConfigValue("current_start_time", ""),
    ]);

    return NextResponse.json({ success: true, archived });
  } catch (err) {
    console.error("ARCHIVE TOURNAMENT ERROR:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
