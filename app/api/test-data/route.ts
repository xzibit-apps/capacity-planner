import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongo";
import Row from "@/models/Row";

export async function GET() {
  try {
    await dbConnect();
    
    // Get all rows
    const allRows = await Row.find({}).lean();
    
    // Get count by sheet
    const sheetCounts = await Row.aggregate([
      {
        $group: {
          _id: "$sheet",
          count: { $sum: 1 }
        }
      }
    ]);
    
    return NextResponse.json({
      success: true,
      totalRows: allRows.length,
      sheetCounts,
      sampleRows: allRows.slice(0, 5) // First 5 rows as sample
    });
  } catch (error) {
    console.error("Test data error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
