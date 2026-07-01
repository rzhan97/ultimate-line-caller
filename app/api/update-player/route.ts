import { NextRequest, NextResponse } from "next/server";
import { getValues, updateValues } from "@/lib/sheets";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, notes } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }

    const rows = (await getValues("Players!A:G")) as string[][];
    if (rows.length < 2) {
      return NextResponse.json({ error: "Players sheet is empty." }, { status: 400 });
    }

    const headers = rows[0];
    const nameIndex = headers.indexOf("Name");
    const notesIndex = headers.indexOf("Notes");

    if (nameIndex === -1) {
      return NextResponse.json({ error: "Name column not found." }, { status: 400 });
    }

    // Find player row
    const rowOffset = rows.slice(1).findIndex(
      (row) => (row[nameIndex] || "").trim().toLowerCase() === name.trim().toLowerCase()
    );

    if (rowOffset === -1) {
      return NextResponse.json({ error: "Player not found." }, { status: 404 });
    }

    const sheetRow = rowOffset + 2; // 1-based + header row

    // If Notes column doesn't exist, use column H (index 7)
    const targetNotesIndex = notesIndex !== -1 ? notesIndex : 7;
    const colLetter = String.fromCharCode(65 + targetNotesIndex); // A=65

    await updateValues(`Players!${colLetter}${sheetRow}`, [[notes ?? ""]]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("UPDATE PLAYER ERROR:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
