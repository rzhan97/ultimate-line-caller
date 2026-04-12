import { NextResponse } from "next/server";
import { getConfigMap, getPlayers, getPoints } from "@/lib/sheets";

export async function GET() {
  try {
    const [config, players, points] = await Promise.all([
      getConfigMap(),
      getPlayers(),
      getPoints(),
    ]);

    const availablePlayers = players.filter(
      (p) => (p.Status || "").trim().toLowerCase() === "available"
    );

    const latestPoints = [...points]
      .sort((a, b) => Number(b.PointNumber || 0) - Number(a.PointNumber || 0))
      .slice(0, 10);

    return NextResponse.json({
      config,
      availablePlayers,
      latestPoints,
    });
  } catch (err) {
    console.error("DASHBOARD ERROR:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}