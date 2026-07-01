import { NextRequest, NextResponse } from "next/server";
import { getValues, updateValues, setConfigValue, getConfigMap } from "@/lib/sheets";

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json();
    const config = await getConfigMap();
    const gameId = (config.current_game_id || "").trim();

    if (!gameId)
      return NextResponse.json({ error: "No active game." }, { status: 400 });

    if ((config.current_point_status || "").toLowerCase() === "in progress")
      return NextResponse.json({ error: "A point is still in progress. End the point first." }, { status: 400 });

    const finalScoreUs   = Number(body.finalScoreUs   ?? config.score_us   ?? 0);
    const finalScoreThem = Number(body.finalScoreThem ?? config.score_them ?? 0);
    const notes          = String(body.notes || "");
    const endTime        = new Date().toISOString();

    // Games sheet: A:GameID  B:GameName  C:Date  D:Opponent  E:Tournament
    //              F:ScoreUs  G:ScoreThem  H:Status  I:Notes  J:EndTime
    const rows      = (await getValues("Games!A:J")) as string[][];
    if (rows.length < 2)
      return NextResponse.json({ error: "Games sheet is empty." }, { status: 400 });

    const headers   = rows[0];
    const gameIdIdx = headers.indexOf("GameID");
    const rowOffset = rows.slice(1).findIndex((r) => (r[gameIdIdx] || "") === gameId);

    if (rowOffset === -1)
      return NextResponse.json({ error: "Game not found in sheet." }, { status: 404 });

    const sheetRow = rowOffset + 2;

    // Update F:ScoreUs  G:ScoreThem  H:Status  I:Notes  J:EndTime
    await updateValues(`Games!F${sheetRow}:J${sheetRow}`, [[
      finalScoreUs, finalScoreThem, "Completed", notes, endTime,
    ]]);

    // Clear active game from config
    await Promise.all([
      setConfigValue("current_game_id", ""),
      setConfigValue("current_point_status", ""),
      setConfigValue("current_point_id", ""),
      setConfigValue("current_start_time", ""),
    ]);

    const outcome = finalScoreUs > finalScoreThem ? "Win"
                  : finalScoreUs < finalScoreThem ? "Loss" : "Draw";

    return NextResponse.json({ success: true, outcome, finalScoreUs, finalScoreThem });
  } catch (err) {
    console.error("END GAME ERROR:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
