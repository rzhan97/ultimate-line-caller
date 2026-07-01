import { NextResponse } from "next/server";
import { getConfigMap, getPlayers, getPoints, getGames } from "@/lib/sheets";

export async function GET() {
  try {
    const [config, players, allPoints, games] = await Promise.all([
      getConfigMap(), getPlayers(), getPoints(), getGames(),
    ]);

    const currentGameId = (config.current_game_id || "").trim();

    const availablePlayers = players
      .filter((p) => (p.Status || "").trim().toLowerCase() === "available")
      .map((p) => ({
        Name:          (p.Name || "").trim(),
        // your sheet uses "Line" column, not "PreferredLine"
        PreferredLine: (p.Line || "").trim().toUpperCase(),
        Role:          (p.Role || "").trim().toLowerCase(),
        Notes:         (p.Notes || "").trim(),
      }))
      .sort((a, b) => a.Name.localeCompare(b.Name));

    // Filter points to current game if set
    const gamePoints = currentGameId
      ? allPoints.filter((p) => (p.GameID || "") === currentGameId)
      : allPoints;

    const latestPoints = [...gamePoints]
      .sort((a, b) => Number(b.PointNumber || 0) - Number(a.PointNumber || 0))
      .slice(0, 15);

    // Map Games sheet columns to the shape the UI expects
    const mappedGames = games
      .filter((g) => g.GameID && g.GameID.startsWith("GAME_"))
      .map((g) => ({
        GameID:       g.GameID,
        Name:         g.GameName || g.GameID,   // sheet uses GameName
        Date:         g.Date || "",
        Opponent:     g.Opponent || "",
        Tournament:   g.Tournament || "",
        Day:          g.Day || "",              // may be empty — that's fine
        Status:       g.Status || "",
        ScoreUs:      g.ScoreUs || "",
        ScoreThem:    g.ScoreThem || "",
        Notes:        g.Notes || "",
      }));

    const currentGame = mappedGames.find((g) => g.GameID === currentGameId) || null;

    return NextResponse.json({ config, availablePlayers, latestPoints, allPoints, currentGame, games: mappedGames });
  } catch (err) {
    console.error("DASHBOARD ERROR:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
