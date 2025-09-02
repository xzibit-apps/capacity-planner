import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongo';
import Staff from '@/models/Staff';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; date: string } }
) {
  try {
    await dbConnect();
    
    const { id, date } = params;
    const decodedDate = decodeURIComponent(date);
    
    // Check if staff member exists
    const staff = await Staff.findById(id);
    if (!staff) {
      return NextResponse.json(
        { error: 'Staff member not found' },
        { status: 404 }
      );
    }

    // Find and remove the specific leave date
    const leaveIndex = staff.leave.findIndex(
      (leave: any) => leave.date === decodedDate
    );
    
    if (leaveIndex === -1) {
      return NextResponse.json(
        { error: 'Leave date not found' },
        { status: 404 }
      );
    }

    // Remove the leave date
    staff.leave.splice(leaveIndex, 1);
    await staff.save();

    return NextResponse.json({
      message: 'Leave date removed successfully',
      leave: staff.leave
    });

  } catch (error) {
    console.error('Error removing leave:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
