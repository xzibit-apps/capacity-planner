import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import Row from "@/models/Row";
import { dbConnect } from "@/lib/mongo";

// Validation schemas
const createRowSchema = z.object({
  data: z.record(z.any())
});

const updateRowSchema = z.object({
  _id: z.string(),
  changes: z.record(z.any())
});

const deleteRowSchema = z.object({
  _id: z.string()
});

export async function GET(
  request: NextRequest,
  { params }: { params: { sheet: string } }
) {
  try {
    await dbConnect();
    
    // Validate sheet parameter
    const validSheets = ['capacity', 'demand', 'supply', 'projects', 'staff'];
    if (!validSheets.includes(params.sheet)) {
      return NextResponse.json(
        { ok: false, error: "Unknown sheet" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "100");
    const skip = (page - 1) * limit;

    const rows = await Row.find({ sheet: params.sheet })
      .sort({ rowNumber: 1, createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Row.countDocuments({ sheet: params.sheet });

    return NextResponse.json({
      ok: true,
      rows: rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to fetch rows" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { sheet: string } }
) {
  try {
    await dbConnect();
    
    // Validate sheet parameter
    const validSheets = ['capacity', 'demand', 'supply', 'projects', 'staff'];
    if (!validSheets.includes(params.sheet)) {
      return NextResponse.json(
        { ok: false, error: "Unknown sheet" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validated = createRowSchema.parse(body);

    const row = await Row.create({
      sheet: params.sheet,
      data: validated.data,
      synced: false
    });

    return NextResponse.json({ ok: true, data: row });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to create row" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { sheet: string } }
) {
  try {
    await dbConnect();
    
    // Validate sheet parameter
    const validSheets = ['capacity', 'demand', 'supply', 'projects', 'staff'];
    if (!validSheets.includes(params.sheet)) {
      return NextResponse.json(
        { ok: false, error: "Unknown sheet" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validated = updateRowSchema.parse(body);

    const updateData: any = { synced: false };
    Object.entries(validated.changes).forEach(([key, value]) => {
      updateData[`data.${key}`] = value;
    });

    const row = await Row.findByIdAndUpdate(
      validated._id,
      { $set: updateData },
      { new: true }
    );

    if (!row) {
      return NextResponse.json(
        { ok: false, error: "Row not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data: row });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to update row" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { sheet: string } }
) {
  try {
    await dbConnect();
    
    // Validate sheet parameter
    const validSheets = ['capacity', 'demand', 'supply', 'projects', 'staff'];
    if (!validSheets.includes(params.sheet)) {
      return NextResponse.json(
        { ok: false, error: "Unknown sheet" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validated = deleteRowSchema.parse(body);

    const row = await Row.findById(validated._id);
    if (!row) {
      return NextResponse.json(
        { ok: false, error: "Row not found" },
        { status: 404 }
      );
    }

    // If row has a rowNumber, it exists in Google Sheets and should be deleted there too
    if (row.rowNumber) {
      // Note: This would require additional implementation for Google Sheets deletion
      // For now, we'll just delete from MongoDB
      console.log(`Row ${row.rowNumber} in sheet ${params.sheet} should be deleted from Google Sheets`);
    }

    await Row.findByIdAndDelete(validated._id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to delete row" },
      { status: 500 }
    );
  }
}
