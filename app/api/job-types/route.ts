import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongo';
import JobType from '@/models/JobType';

export async function GET() {
  try {
    await dbConnect();
    
    const jobTypes = await JobType.find({ isActive: true }).sort({ name: 1 });
    
    return NextResponse.json(jobTypes);
  } catch (error: any) {
    console.error('Error fetching job types:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const jobTypeData = await request.json();
    
    // Validate required fields
    if (!jobTypeData.name) {
      return NextResponse.json(
        { error: 'Job type name is required' },
        { status: 400 }
      );
    }

    // Check if job type name already exists
    const existingJobType = await JobType.findOne({ 
      name: { $regex: new RegExp(`^${jobTypeData.name}$`, 'i') } 
    });
    
    if (existingJobType) {
      return NextResponse.json(
        { error: 'Job type with this name already exists' },
        { status: 409 }
      );
    }

    // Create new job type
    const newJobType = new JobType({
      name: jobTypeData.name,
      description: jobTypeData.description || '',
      isActive: true
    });

    await newJobType.save();

    return NextResponse.json({
      message: 'Job type created successfully',
      jobType: newJobType
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating job type:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
