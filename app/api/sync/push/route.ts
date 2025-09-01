import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pushToSheets } from "@/lib/sync";

const pushSchema = z.object({
  sheets: z.array(z.string()).optional()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = pushSchema.parse(body);

    const result = await pushToSheets(validated.sheets);

    if (result.success) {
      return NextResponse.json({ ok: true, data: result });
    } else {
      return NextResponse.json(
        { ok: false, error: result.message, details: result.details },
        { status: 500 }
      );
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Push failed" },
      { status: 500 }
    );
  }
}
