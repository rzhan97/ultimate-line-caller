import { NextRequest, NextResponse } from "next/server";
import { getPlayers, getPoints, getConfigMap } from "@/lib/sheets";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filterGameId = searchParams.get("gameId") || "";

    const [players, allPoints, config] = await Promise.all([
      getPlayers(),
      getPoints(),
      getConfigMap(),
    ]);

    const currentGameId = (config.current_game_id || "").trim();
    const gameIdToUse = filterGameId || currentGameId;

    // day2_date separates day 1 / day 2 within a tournament
    const day2DateStr = (config.day2_date || "").trim();
    function getDay(point: Record<string, string>): 1 | 2 {
      // Use the GameDay column directly if it has a value
      const gameDay = (point.GameDay || "").trim();
      if (gameDay === "2") return 2;
      if (gameDay === "1") return 1;
      // Fall back to date-based logic
      if (!day2DateStr) return 1;
      const startTime = (point.StartTime || "");
      if (!startTime) return 1;
      return startTime.slice(0, 10) >= day2DateStr ? 2 : 1;
    }

    // Filter to current game if set
    const points = gameIdToUse
      ? allPoints.filter((p) => (p.GameID || "") === gameIdToUse)
      : allPoints;

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
      // derived
      holdRate: number;      // holds / (holds + conceded)
      breakRate: number;     // breaks / dPoints (break efficiency)
      oHoldRate: number;     // O holds / O points
      dBreakRate: number;    // D breaks / D points
      avgPointDuration: number;
      day1: DayStat;
      day2: DayStat;
      setPlayCount: number;
      setPlaySuccess: number;
      setPlaySuccessRate: number;
      recentPoints: Array<{
        pointNumber: string;
        lineType: string;
        possessionType: string;
        result: string;
        durationSec: number;
        startTime: string;
        day: number;
        setPlay: string;
        setPlaySuccess: string;
      }>;
    };

    const stats: Record<string, PlayerStatEntry> = {};
    const emptyDay = (): DayStat => ({
      totalPoints: 0, totalSeconds: 0, oPoints: 0, dPoints: 0,
      holds: 0, breaks: 0, conceded: 0,
    });

    for (const player of players) {
      const name = String(player.Name || "").trim();
      if (!name) continue;
      stats[name] = {
        name,
        role: (player.Role || "").trim().toLowerCase(),
        notes: (player.Notes || "").trim(),
        totalPoints: 0, totalSeconds: 0, oPoints: 0, dPoints: 0,
        holds: 0, breaks: 0, conceded: 0,
        holdRate: 0, breakRate: 0, oHoldRate: 0, dBreakRate: 0, avgPointDuration: 0,
        day1: emptyDay(), day2: emptyDay(),
        setPlayCount: 0, setPlaySuccess: 0, setPlaySuccessRate: 0,
        recentPoints: [],
      };
    }

    for (const point of points) {
      const status = String(point.Status || "").trim().toLowerCase();
      if (status !== "completed") continue;

      const durationSec = Number(point.DurationSec || 0);
      const lineType = String(point.LineType || "").trim().toUpperCase();
      // Normalise result — handle any capitalisation and common variants
      const rawResult = String(point.Result || "").trim().toLowerCase();
      const result =
        rawResult.startsWith("hold")    ? "hold"     :
        rawResult.startsWith("break")   ? "break"    :
        rawResult.startsWith("conced")  ? "conceded" :
        rawResult.startsWith("lost")    ? "conceded" :
        rawResult.startsWith("loss")    ? "conceded" :
        rawResult; // keep unknown values as-is for debugging
      const startTime = String(point.StartTime || "");
      const day = getDay(point);
      const setPlay           = String(point.SetPlay || "").trim();
      const setPlaySuccessVal = String(point.SetPlaySuccess || "").trim().toLowerCase();

      const names = String(point.PlayersCSV || "")
        .split(",").map((s) => s.trim()).filter(Boolean);

      for (const name of names) {
        if (!stats[name]) {
          stats[name] = {
            name, role: "", notes: "",
            totalPoints: 0, totalSeconds: 0, oPoints: 0, dPoints: 0,
            holds: 0, breaks: 0, conceded: 0,
            holdRate: 0, breakRate: 0, oHoldRate: 0, dBreakRate: 0, avgPointDuration: 0,
            day1: emptyDay(), day2: emptyDay(),
            setPlayCount: 0, setPlaySuccess: 0, setPlaySuccessRate: 0,
            recentPoints: [],
          };
        }

        const s = stats[name];
        s.totalPoints += 1;
        s.totalSeconds += durationSec;
        if (lineType === "O") s.oPoints += 1;
        if (lineType === "D") s.dPoints += 1;
        if (result === "hold")     s.holds += 1;
        if (result === "break")    s.breaks += 1;
        if (result === "conceded") s.conceded += 1;

        if (setPlay) {
          s.setPlayCount += 1;
          if (setPlaySuccessVal === "yes") s.setPlaySuccess += 1;
        }

        const dk = day === 2 ? "day2" : "day1";
        s[dk].totalPoints += 1;
        s[dk].totalSeconds += durationSec;
        if (lineType === "O") s[dk].oPoints += 1;
        if (lineType === "D") s[dk].dPoints += 1;
        if (result === "hold") s[dk].holds += 1;
        if (result === "break") s[dk].breaks += 1;
        if (result === "conceded") s[dk].conceded += 1;

        if (s.recentPoints.length < 15) {
          s.recentPoints.push({
            pointNumber: String(point.PointNumber || ""),
            lineType, possessionType: String(point.PossessionType || ""),
            result: String(point.Result || ""),
            durationSec, startTime, day, setPlay, setPlaySuccess: setPlaySuccessVal,
          });
        }
      }
    }

    const result = Object.values(stats).map((p) => {
      // Hold% = O holds / O points played (how often O line converted)
      const oHoldRate  = p.oPoints > 0 ? Math.round((p.holds  / p.oPoints)  * 100) : 0;
      // Break% = D breaks / D points played (how often D line broke)
      const dBreakRate = p.dPoints > 0 ? Math.round((p.breaks / p.dPoints)  * 100) : 0;
      // Overall hold% across all points (scored / played)
      const scoredPts  = p.holds + p.breaks;
      const holdRate   = p.totalPoints > 0 ? Math.round((scoredPts / p.totalPoints) * 100) : 0;
      // Break% alias (same as dBreakRate for overall)
      const breakRate  = dBreakRate;
      const avgPointDuration = p.totalPoints > 0 ? Math.round(p.totalSeconds / p.totalPoints) : 0;
      const setPlaySuccessRate = p.setPlayCount > 0
        ? Math.round((p.setPlaySuccess / p.setPlayCount) * 100) : 0;

      return {
        ...p,
        totalMinutes: Number((p.totalSeconds / 60).toFixed(1)),
        holdRate,
        breakRate,
        oHoldRate,
        dBreakRate,
        avgPointDuration,
        setPlaySuccessRate,
        day1: { ...p.day1, totalMinutes: Number((p.day1.totalSeconds / 60).toFixed(1)) },
        day2: { ...p.day2, totalMinutes: Number((p.day2.totalSeconds / 60).toFixed(1)) },
      };
    }).sort((a, b) => {
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
