import { NextResponse } from "next/server";
import { getConfigMap, getPlayers, getPoints } from "@/lib/sheets";

export async function GET() {
  try {
    const [config, players, points] = await Promise.all([
      getConfigMap(),
      getPlayers(),
      getPoints(),
    ]);

    const availablePlayers = players
      .filter((p) => (p.Status || "").trim().toLowerCase() === "available")
      .map((p) => ({
        Name: (p.Name || "").trim(),
        PreferredLine: (p.PreferredLine || p.Line || "").trim().toUpperCase(),
        Role: (p.Role || "").trim().toLowerCase(),
        Notes: (p.Notes || "").trim(),
      }))
      .sort((a, b) => a.Name.localeCompare(b.Name));

    const latestPoints = [...points]
      .sort((a, b) => Number(b.PointNumber || 0) - Number(a.PointNumber || 0))
      .slice(0, 15);

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
