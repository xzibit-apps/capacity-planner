import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongo";
import Row from "@/models/Row";

export async function POST(request: NextRequest) {
  try {
    // Check if MongoDB URI is available
    if (!process.env.MONGODB_URI) {
      return NextResponse.json(
        { success: false, message: "MongoDB URI not configured" },
        { status: 500 }
      );
    }

    // Connect to MongoDB
    await dbConnect();
    console.log("✅ Connected to MongoDB");

    // Get the request body
    const body = await request.json();
    const { sheetSlug } = body;

    let deleteResult;
    
    if (sheetSlug) {
      // Delete data for specific sheet
      deleteResult = await Row.deleteMany({ sheet: sheetSlug });
      console.log(`🗑️ Deleted ${deleteResult.deletedCount} rows from sheet: ${sheetSlug}`);
    } else {
      // Delete all data
      deleteResult = await Row.deleteMany({});
      console.log(`🗑️ Deleted ${deleteResult.deletedCount} rows from all sheets`);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${deleteResult.deletedCount} rows`,
      deletedCount: deleteResult.deletedCount,
      sheetSlug: sheetSlug || 'all'
    });

  } catch (error: any) {
    console.error("❌ Clear data failed:", error);
    return NextResponse.json(
      {
        success: false,
        message: `Clear data failed: ${error.message}`,
        error: error.message
      },
      { status: 500 }
    );
  }
}
