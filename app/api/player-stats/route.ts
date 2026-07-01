import { NextResponse } from "next/server";
import { getPlayers, getPoints, getConfigMap } from "@/lib/sheets";

export async function GET() {
  try {
    const [players, points, config] = await Promise.all([
      getPlayers(),
      getPoints(),
      getConfigMap(),
    ]);

    // day2_date in config as YYYY-MM-DD, defaults to today if not set
    const day2DateStr = (config.day2_date || "").trim();

    function getDay(isoString: string): 1 | 2 {
      if (!day2DateStr || !isoString) return 1;
      const pointDate = isoString.slice(0, 10); // YYYY-MM-DD
      return pointDate >= day2DateStr ? 2 : 1;
    }

    type DayStat = {
      totalPoints: number;
      totalSeconds: number;
      oPoints: number;
      dPoints: number;
      holds: number;
      breaks: number;
      conceded: number;
    };

    type PlayerStatEntry = {
      name: string;
      role: string;
      notes: string;
      totalPoints: number;
      totalSeconds: number;
      oPoints: number;
      dPoints: number;
      holds: number;
      breaks: number;
      conceded: number;
      day1: DayStat;
      day2: DayStat;
      recentPoints: Array<{
        pointNumber: string;
        lineType: string;
        possessionType: string;
        result: string;
        durationSec: number;
        startTime: string;
        day: number;
      }>;
    };

    const stats: Record<string, PlayerStatEntry> = {};

    const emptyDay = (): DayStat => ({
      totalPoints: 0,
      totalSeconds: 0,
      oPoints: 0,
      dPoints: 0,
      holds: 0,
      breaks: 0,
      conceded: 0,
    });

    // initialize from Players sheet
    for (const player of players) {
      const name = String(player.Name || "").trim();
      if (!name) continue;

      stats[name] = {
        name,
        role: (player.Role || "").trim().toLowerCase(),
        notes: (player.Notes || "").trim(),
        totalPoints: 0,
        totalSeconds: 0,
        oPoints: 0,
        dPoints: 0,
        holds: 0,
        breaks: 0,
        conceded: 0,
        day1: emptyDay(),
        day2: emptyDay(),
        recentPoints: [],
      };
    }

    // accumulate from completed points
    for (const point of points) {
      const status = String(point.Status || "").trim().toLowerCase();
      if (status !== "completed") continue;

      const durationSec = Number(point.DurationSec || 0);
      const lineType = String(point.LineType || "").trim().toUpperCase();
      const result = String(point.Result || "").trim().toLowerCase();
      const startTime = String(point.StartTime || "");
      const day = getDay(startTime);

      const names = String(point.PlayersCSV || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      for (const name of names) {
        if (!stats[name]) {
          stats[name] = {
            name,
            role: "",
            notes: "",
            totalPoints: 0,
            totalSeconds: 0,
            oPoints: 0,
            dPoints: 0,
            holds: 0,
            breaks: 0,
            conceded: 0,
            day1: emptyDay(),
            day2: emptyDay(),
            recentPoints: [],
          };
        }

        const s = stats[name];
        s.totalPoints += 1;
        s.totalSeconds += durationSec;

        if (lineType === "O") s.oPoints += 1;
        if (lineType === "D") s.dPoints += 1;
        if (result === "hold") s.holds += 1;
        if (result === "break") s.breaks += 1;
        if (result === "conceded") s.conceded += 1;

        const dayKey = day === 2 ? "day2" : "day1";
        s[dayKey].totalPoints += 1;
        s[dayKey].totalSeconds += durationSec;
        if (lineType === "O") s[dayKey].oPoints += 1;
        if (lineType === "D") s[dayKey].dPoints += 1;
        if (result === "hold") s[dayKey].holds += 1;
        if (result === "break") s[dayKey].breaks += 1;
        if (result === "conceded") s[dayKey].conceded += 1;

        // keep last 10 points per player
        if (s.recentPoints.length < 10) {
          s.recentPoints.push({
            pointNumber: String(point.PointNumber || ""),
            lineType,
            possessionType: String(point.PossessionType || ""),
            result: String(point.Result || ""),
            durationSec,
            startTime,
            day,
          });
        }
      }
    }

    const result = Object.values(stats)
      .map((p) => ({
        ...p,
        totalMinutes: Number((p.totalSeconds / 60).toFixed(1)),
        day1: { ...p.day1, totalMinutes: Number((p.day1.totalSeconds / 60).toFixed(1)) },
        day2: { ...p.day2, totalMinutes: Number((p.day2.totalSeconds / 60).toFixed(1)) },
      }))
      .sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
        return a.name.localeCompare(b.name);
      });

    return NextResponse.json(result);
  } catch (err) {
    console.error("PLAYER STATS ERROR:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
