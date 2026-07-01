import { NextRequest, NextResponse } from "next/server";
import { getValues, updateValues } from "@/lib/sheets";

export async function POST(req: NextRequest) {
  try {
    const body        = await req.json();
    const { name, notes } = body;

    if (!name)
      return NextResponse.json({ error: "Name is required." }, { status: 400 });

    // Players: A:PlayerID  B:Name  C:Role  D:Line  E:Status  F:MaxConsecutive  G:Priority  H:Notes
    const rows = (await getValues("Players!A:H")) as string[][];
    if (rows.length < 2)
      return NextResponse.json({ error: "Players sheet is empty." }, { status: 400 });

    const headers   = rows[0];
    const nameIdx   = headers.indexOf("Name");
    const notesIdx  = headers.indexOf("Notes"); // column H (index 7)

    if (nameIdx === -1)
      return NextResponse.json({ error: "Name column not found." }, { status: 400 });

    const rowOffset = rows.slice(1).findIndex(
      (row) => (row[nameIdx] || "").trim().toLowerCase() === name.trim().toLowerCase()
    );

    if (rowOffset === -1)
      return NextResponse.json({ error: "Player not found." }, { status: 404 });

    const sheetRow        = rowOffset + 2;
    const targetIdx       = notesIdx !== -1 ? notesIdx : 7; // default to H
    const colLetter       = String.fromCharCode(65 + targetIdx);

    await updateValues(`Players!${colLetter}${sheetRow}`, [[notes ?? ""]]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("UPDATE PLAYER ERROR:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
