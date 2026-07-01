import { NextRequest, NextResponse } from "next/server";
import { setConfigValue } from "@/lib/sheets";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { key, value } = body;
    if (!key) return NextResponse.json({ error: "key required" }, { status: 400 });
    await setConfigValue(key, value ?? "");
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
