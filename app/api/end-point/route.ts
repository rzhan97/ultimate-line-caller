import { NextRequest, NextResponse } from "next/server";
import { getConfigMap, getValues, setConfigValue, updateValues } from "@/lib/sheets";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const config = await getConfigMap();
  const currentPointId = (config.current_point_id || "").trim();

  if (!currentPointId) {
    return NextResponse.json(
      { error: "No active point. Please start a point first." },
      { status: 400 }
    );
  }

  const rows = (await getValues("Points!A:M")) as string[][];
  if (rows.length < 2) {
    return NextResponse.json({ error: "Points sheet is empty." }, { status: 400 });
  }

  const headers = rows[0];
  const data = rows.slice(1);

  const pointIdIndex = headers.indexOf("PointID");
  const startTimeIndex = headers.indexOf("StartTime");

  const rowOffset = data.findIndex((row) => row[pointIdIndex] === currentPointId);
  if (rowOffset === -1) {
    return NextResponse.json({ error: "Active point row not found." }, { status: 404 });
  }

  const sheetRow = rowOffset + 2;
  const startTime = new Date(data[rowOffset][startTimeIndex]);
  const endTime = new Date();
  const durationSec = Math.round((endTime.getTime() - startTime.getTime()) / 1000);

  const result = String(body.result || "unknown");
  const scoreUsAfter = Number(body.scoreUsAfter ?? config.score_us ?? 0);
  const scoreThemAfter = Number(body.scoreThemAfter ?? config.score_them ?? 0);
  const notes = String(body.notes || "");

  await updateValues(`Points!G${sheetRow}:M${sheetRow}`, [[
    endTime.toISOString(),
    durationSec,
    result,
    scoreUsAfter,
    scoreThemAfter,
    "Completed",
    notes,
  ]]);

  await Promise.all([
    setConfigValue("score_us", scoreUsAfter),
    setConfigValue("score_them", scoreThemAfter),
    setConfigValue("current_point_status", ""),
    setConfigValue("current_point_id", ""),
    setConfigValue("current_start_time", ""),
    setConfigValue(
      "current_point_number",
      Number(config.current_point_number || 1) + 1
    ),
  ]);

  return NextResponse.json({ success: true, durationSec });
}