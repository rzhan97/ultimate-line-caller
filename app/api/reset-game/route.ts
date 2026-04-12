import { NextResponse } from "next/server";
import { getValues, updateValues, setConfigValue } from "@/lib/sheets";

export async function POST() {
  try {
    // 🔥 clear Points (keep header only)
    const rows = await getValues("Points!A:M");

    if (rows.length > 1) {
      const emptyRows = rows.slice(1).map(() =>
        new Array(rows[0].length).fill("")
      );

      await updateValues("Points!A2:M", emptyRows);
    }

    // 🔁 reset config
    await Promise.all([
      setConfigValue("current_point_number", 1),
      setConfigValue("score_us", 0),
      setConfigValue("score_them", 0),
      setConfigValue("current_point_id", ""),
      setConfigValue("current_point_status", ""),
      setConfigValue("current_start_time", ""),
      setConfigValue("line_type", "O"),
      setConfigValue("possession_type", "Receive"),
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("RESET GAME ERROR:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}