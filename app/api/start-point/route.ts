import { NextRequest, NextResponse } from "next/server";
import { appendValues, getConfigMap, setConfigValue } from "@/lib/sheets";

function makeId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const players: string[] = Array.isArray(body.players)
      ? body.players.map((x: string) => String(x).trim()).filter(Boolean)
      : [];

    if (players.length !== 7)
      return NextResponse.json({ error: "Need exactly 7 players." }, { status: 400 });
    if (new Set(players).size !== 7)
      return NextResponse.json({ error: "Duplicate players selected." }, { status: 400 });

    const config = await getConfigMap();

    if ((config.current_point_status || "").toLowerCase() === "in progress")
      return NextResponse.json({ error: "A point is already in progress." }, { status: 400 });

    const pointId       = makeId("PT");
    const pointNumber   = Number(config.current_point_number || 1);
    const lineType      = String(body.lineType || config.line_type || "O");
    const possessionType = String(body.possessionType || config.possession_type || "Receive");
    const scoreUs       = Number(config.score_us || 0);
    const scoreThem     = Number(config.score_them || 0);
    const startTime     = new Date().toISOString();
    const gameId        = String(config.current_game_id || "");

    // Points sheet columns A:Q
    // A:PointID  B:PointNumber  C:LineType  D:PossessionType  E:PlayersCSV
    // F:StartTime  G:EndTime  H:DurationSec  I:Result  J:ScoreUsAfter
    // K:ScoreThemAfter  L:Status  M:Notes  N:GameDay  O:SetPlay  P:SetPlaySuccess  Q:GameID
    await appendValues("Points!A:Q", [[
      pointId,
      pointNumber,
      lineType,
      possessionType,
      players.join(", "),
      startTime,
      "",           // G: EndTime
      "",           // H: DurationSec
      "",           // I: Result
      scoreUs,      // J: ScoreUsAfter
      scoreThem,    // K: ScoreThemAfter
      "In Progress",// L: Status
      "",           // M: Notes
      String(config.current_game_day || "1"), // N: GameDay
      "",           // O: SetPlay
      "",           // P: SetPlaySuccess
      gameId,       // Q: GameID
    ]]);

    await Promise.all([
      setConfigValue("current_point_id", pointId),
      setConfigValue("current_point_status", "In Progress"),
      setConfigValue("current_start_time", startTime),
      setConfigValue("line_type", lineType),
      setConfigValue("possession_type", possessionType),
    ]);

    return NextResponse.json({ success: true, pointId, pointNumber });
  } catch (err) {
    console.error("START POINT ERROR:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
