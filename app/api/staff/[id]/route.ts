import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongo";
import Staff from "@/models/Staff";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();

    const staff = await Staff.findById(params.id);

    if (!staff) {
      return NextResponse.json(
        { error: "Staff not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(staff.toObject());
    
  } catch (error) {
    console.error('Error fetching staff:', error);
    return NextResponse.json(
      { error: "Failed to fetch staff" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    await dbConnect();

    const staff = await Staff.findByIdAndUpdate(
      params.id,
      body,
      { new: true, runValidators: true }
    );

    if (!staff) {
      return NextResponse.json(
        { error: "Staff not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(staff.toObject());
    
  } catch (error) {
    console.error('Error updating staff:', error);
    return NextResponse.json(
      { error: "Failed to update staff" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();

    const staff = await Staff.findByIdAndDelete(params.id);

    if (!staff) {
      return NextResponse.json(
        { error: "Staff not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Staff deleted successfully" });
    
  } catch (error) {
    console.error('Error deleting staff:', error);
    return NextResponse.json(
      { error: "Failed to delete staff" },
      { status: 500 }
    );
  }
}
