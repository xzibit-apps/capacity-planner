import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongo';
import Staff from '@/models/Staff';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    
    const { id } = params;
    const leaveData = await request.json();
    
    // Validate required fields
    if (!leaveData.date || !leaveData.leaveType) {
      return NextResponse.json(
        { error: 'Date and leave type are required' },
        { status: 400 }
      );
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(leaveData.date)) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    // Check if staff member exists
    const staff = await Staff.findById(id);
    if (!staff) {
      return NextResponse.json(
        { error: 'Staff member not found' },
        { status: 404 }
      );
    }

    console.log('Found staff:', staff.name);
    console.log('Current leave array:', staff.leave);
    console.log('Leave array type:', typeof staff.leave);

    // Ensure leave array exists and is initialized
    if (!staff.leave) {
      staff.leave = [];
    }

    // Clean up any existing malformed leave entries
    staff.leave = staff.leave.filter((leave: any) => 
      leave && typeof leave === 'object' && leave.date && typeof leave.date === 'string'
    );

    // Check if leave date already exists
    const existingLeave = staff.leave.find(
      (leave: any) => leave.date === leaveData.date
    );
    
    if (existingLeave) {
      return NextResponse.json(
        { error: 'Leave date already exists for this staff member' },
        { status: 409 }
      );
    }

    // Add new leave date
    const newLeave = {
      date: leaveData.date,
      leaveType: leaveData.leaveType,
      notes: leaveData.notes || ''
    };
    
    console.log('Adding new leave:', newLeave);
    staff.leave.push(newLeave);

    console.log('Leave array after push:', staff.leave);
    console.log('About to save staff...');

    await staff.save();

    console.log('Staff saved successfully');

    return NextResponse.json({
      message: 'Leave date added successfully',
      leave: staff.leave
    });

  } catch (error: any) {
    console.error('Error adding leave:', error);
    console.error('Error details:', {
      name: error?.name || 'Unknown',
      message: error?.message || 'Unknown error',
      stack: error?.stack || 'No stack trace'
    });
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
