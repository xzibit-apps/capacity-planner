import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongo";
import Staff from "@/models/Staff";

export async function GET() {
  try {
    await dbConnect();
    
    // Get all staff
    const staff = await Staff.find({}).sort({ createdAt: -1 });
    
    return NextResponse.json(staff.map(s => s.toObject()));
    
  } catch (error) {
    console.error('Error fetching staff:', error);
    return NextResponse.json(
      { error: "Failed to fetch staff" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    await dbConnect();

    const staff = new Staff(body);
    await staff.save();

    return NextResponse.json(staff.toObject(), { status: 201 });
    
  } catch (error) {
    console.error('Error creating staff:', error);
    return NextResponse.json(
      { error: "Failed to create staff" },
      { status: 500 }
    );
  }
}
