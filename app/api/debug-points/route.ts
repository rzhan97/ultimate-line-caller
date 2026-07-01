import { NextResponse } from "next/server";
import { getValues } from "@/lib/sheets";

export async function GET() {
  try {
    // Read raw rows so we can see exactly what headers and values exist
    const rows = (await getValues("Points!A:Q")) as string[][];

    if (rows.length < 1) {
      return NextResponse.json({ error: "Points sheet is empty" });
    }

    const headers = rows[0];
    const dataRows = rows.slice(1).filter((r) => r.some((c) => c));

    // Find key column indices
    const idx = (name: string) => headers.indexOf(name);
    const statusIdx = idx("Status");
    const resultIdx = idx("Result");
    const lineTypeIdx = idx("LineType");
    const gameIdIdx = idx("GameID");

    // All completed rows
    const completed = dataRows.filter(
      (r) => (r[statusIdx] || "").trim().toLowerCase() === "completed"
    );

    // Unique result values across ALL rows (not just completed)
    const allResultValues = [...new Set(
      dataRows.map((r) => r[resultIdx] || "(blank)")
    )];

    // Unique status values
    const allStatusValues = [...new Set(
      dataRows.map((r) => r[statusIdx] || "(blank)")
    )];

    // Sample of first 5 raw rows (just cols L-Q by index)
    const rawSample = dataRows.slice(0, 8).map((r) => ({
      raw_L: r[11] || "(blank)",  // index 11 = col L
      raw_M: r[12] || "(blank)",
      raw_N: r[13] || "(blank)",
      raw_O: r[14] || "(blank)",
      raw_P: r[15] || "(blank)",
      raw_Q: r[16] || "(blank)",
    }));

    return NextResponse.json({
      // Header row — shows exactly what names the sheet has
      headers,

      // Column indices found
      columnIndices: {
        Status: statusIdx,
        Result: resultIdx,
        LineType: lineTypeIdx,
        GameID: gameIdIdx,
      },

      totalDataRows: dataRows.length,
      completedRows: completed.length,

      // What values are actually in Status column
      allStatusValues,

      // What values are actually in Result column
      allResultValues,

      // Sample of completed rows
      completedSample: completed.slice(0, 5).map((r) => ({
        PointNumber: r[1],
        LineType:    r[lineTypeIdx] || "(blank)",
        Status:      r[statusIdx]   || "(blank)",
        Result:      r[resultIdx]   || "(blank)",
        GameID:      r[gameIdIdx]   || "(blank)",
      })),

      // Raw L-Q columns to check structure
      rawSample,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
