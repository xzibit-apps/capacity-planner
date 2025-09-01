import { NextResponse } from "next/server";
import { SHEETS } from "@/configs/sheets";

export async function GET() {
  try {
    return NextResponse.json({ 
      ok: true, 
      data: SHEETS 
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to fetch sheets" },
      { status: 500 }
    );
  }
}
