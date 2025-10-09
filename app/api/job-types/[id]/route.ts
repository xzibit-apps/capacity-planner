import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongo';
import JobType from '@/models/JobType';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    
    const { id } = params;
    
    const jobType = await JobType.findById(id);
    
    if (!jobType) {
      return NextResponse.json(
        { error: 'Job type not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(jobType);
  } catch (error: any) {
    console.error('Error fetching job type:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    
    const { id } = params;
    const updateData = await request.json();
    
    // Validate required fields
    if (!updateData.name) {
      return NextResponse.json(
        { error: 'Job type name is required' },
        { status: 400 }
      );
    }

    // Check if job type name already exists (excluding current job type)
    const existingJobType = await JobType.findOne({ 
      _id: { $ne: id },
      name: { $regex: new RegExp(`^${updateData.name}$`, 'i') } 
    });
    
    if (existingJobType) {
      return NextResponse.json(
        { error: 'Job type with this name already exists' },
        { status: 409 }
      );
    }

    // Update job type
    const updatedJobType = await JobType.findByIdAndUpdate(
      id,
      {
        name: updateData.name,
        description: updateData.description || '',
        isActive: updateData.isActive !== undefined ? updateData.isActive : true
      },
      { new: true, runValidators: true }
    );

    if (!updatedJobType) {
      return NextResponse.json(
        { error: 'Job type not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Job type updated successfully',
      jobType: updatedJobType
    });

  } catch (error: any) {
    console.error('Error updating job type:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message || 'Unknown error' },
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
    
    const { id } = params;
    
    // Check if job type is being used by any projects
    const Project = (await import('@/models/Project')).default;
    const projectsUsingJobType = await Project.find({ jobType: id });
    
    if (projectsUsingJobType.length > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete job type. It is being used by projects.',
          projectCount: projectsUsingJobType.length
        },
        { status: 400 }
      );
    }
    
    // Soft delete by setting isActive to false
    const deletedJobType = await JobType.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!deletedJobType) {
      return NextResponse.json(
        { error: 'Job type not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Job type deleted successfully',
      jobType: deletedJobType
    });

  } catch (error: any) {
    console.error('Error deleting job type:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
