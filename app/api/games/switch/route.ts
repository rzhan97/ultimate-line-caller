import { NextRequest, NextResponse } from "next/server";
import { getValues, setConfigValue, getConfigMap } from "@/lib/sheets";

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json();
    const gameId = String(body.gameId || "").trim();

    if (!gameId)
      return NextResponse.json({ error: "gameId is required." }, { status: 400 });

    // Verify game exists in Games sheet
    const rows     = (await getValues("Games!A:J")) as string[][];
    const headers  = rows[0] || [];
    const gameIdIdx = headers.indexOf("GameID");
    const found    = rows.slice(1).find((r) => (r[gameIdIdx] || "") === gameId);

    if (!found)
      return NextResponse.json({ error: "Game not found." }, { status: 404 });

    // Restore score + point number from this game's Points rows
    const pointRows   = (await getValues("Points!A:Q")) as string[][];
    const ph          = pointRows[0] || [];
    const pGameIdx    = ph.indexOf("GameID");
    const pNumIdx     = ph.indexOf("PointNumber");
    const pScoreUsIdx = ph.indexOf("ScoreUsAfter");
    const pScoreThIdx = ph.indexOf("ScoreThemAfter");
    const pStatusIdx  = ph.indexOf("Status");

    const gamePoints      = pointRows.slice(1).filter((r) => (r[pGameIdx] || "") === gameId);
    const completedPoints = gamePoints.filter((r) => (r[pStatusIdx] || "").toLowerCase() === "completed");

    let scoreUs = 0, scoreThem = 0, nextPointNumber = 1;
    if (completedPoints.length > 0) {
      const last = completedPoints[completedPoints.length - 1];
      scoreUs    = Number(last[pScoreUsIdx] || 0);
      scoreThem  = Number(last[pScoreThIdx] || 0);
      nextPointNumber = Math.max(...gamePoints.map((r) => Number(r[pNumIdx] || 0))) + 1;
    }

    const config      = await getConfigMap();
    const inProgress  = (config.current_point_status || "").toLowerCase() === "in progress"
                      && (config.current_game_id || "") === gameId;

    await Promise.all([
      setConfigValue("current_game_id", gameId),
      setConfigValue("score_us",            inProgress ? config.score_us    : scoreUs),
      setConfigValue("score_them",          inProgress ? config.score_them  : scoreThem),
      setConfigValue("current_point_number", inProgress ? config.current_point_number : nextPointNumber),
      ...(!inProgress ? [
        setConfigValue("current_point_status", ""),
        setConfigValue("current_point_id", ""),
        setConfigValue("current_start_time", ""),
      ] : []),
    ]);

    return NextResponse.json({ success: true, gameId });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
