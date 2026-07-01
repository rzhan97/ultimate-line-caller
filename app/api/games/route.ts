import { NextRequest, NextResponse } from "next/server";
import { appendValues, getGames, getConfigMap, setConfigValue } from "@/lib/sheets";

function makeId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

export async function GET() {
  try {
    const [games, config] = await Promise.all([getGames(), getConfigMap()]);
    return NextResponse.json({ games, currentGameId: config.current_game_id || "" });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const gameName   = String(body.name || "").trim();
    const opponent   = String(body.opponent || "").trim();
    const date       = String(body.date || new Date().toISOString().slice(0, 10));
    const tournament = String(body.tournament || "").trim();

    if (!gameName)
      return NextResponse.json({ error: "Game name is required." }, { status: 400 });

    const gameId = makeId("GAME");

    // Games sheet: A:GameID  B:GameName  C:Date  D:Opponent  E:Tournament
    // F:ScoreUs  G:ScoreThem  H:Status  I:Notes  J:EndTime
    await appendValues("Games!A:J", [[
      gameId, gameName, date, opponent, tournament,
      0, 0, "Active", "", "",
    ]]);

    await Promise.all([
      setConfigValue("current_game_id", gameId),
      setConfigValue("current_point_number", 1),
      setConfigValue("score_us", 0),
      setConfigValue("score_them", 0),
      setConfigValue("current_point_status", ""),
      setConfigValue("current_point_id", ""),
      setConfigValue("current_start_time", ""),
    ]);

    return NextResponse.json({ success: true, gameId, name: gameName });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
