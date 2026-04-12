import { NextResponse } from "next/server";
import { getPlayers, getPoints } from "@/lib/sheets";

export async function GET() {
  try {
    const [players, points] = await Promise.all([
      getPlayers(),
      getPoints(),
    ]);

    const stats: Record<
      string,
      {
        name: string;
        totalPoints: number;
        totalSeconds: number;
        totalMinutes: number;
        oPoints: number;
        dPoints: number;
      }
    > = {};

    // initialize from Players sheet
    for (const player of players) {
      const name = String(player.Name || "").trim();
      if (!name) continue;

      stats[name] = {
        name,
        totalPoints: 0,
        totalSeconds: 0,
        totalMinutes: 0,
        oPoints: 0,
        dPoints: 0,
      };
    }

    // accumulate from completed points
    for (const point of points) {
      const status = String(point.Status || "").trim().toLowerCase();
      if (status !== "completed") continue;

      const durationSec = Number(point.DurationSec || 0);
      const lineType = String(point.LineType || "").trim().toUpperCase();
      const names = String(point.PlayersCSV || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      for (const name of names) {
        if (!stats[name]) {
          stats[name] = {
            name,
            totalPoints: 0,
            totalSeconds: 0,
            totalMinutes: 0,
            oPoints: 0,
            dPoints: 0,
          };
        }

        stats[name].totalPoints += 1;
        stats[name].totalSeconds += durationSec;

        if (lineType === "O") stats[name].oPoints += 1;
        if (lineType === "D") stats[name].dPoints += 1;
      }
    }

    const result = Object.values(stats)
      .map((p) => ({
        ...p,
        totalMinutes: Number((p.totalSeconds / 60).toFixed(1)),
      }))
      .sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) {
          return b.totalPoints - a.totalPoints;
        }
        return a.name.localeCompare(b.name);
      });

    return NextResponse.json(result);
  } catch (err) {
    console.error("PLAYER STATS ERROR:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}