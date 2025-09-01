import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongo';
import Project from '@/models/Project';
import Staff from '@/models/Staff';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const body = await request.json();
    const { projects, staff } = body;

    let projectsCount = 0;
    let staffCount = 0;

    // Import projects if provided
    if (projects && Array.isArray(projects) && projects.length > 0) {
      // Clear existing projects
      await Project.deleteMany({});
      
      const projectDocuments = projects.map((project: any) => ({
        id: project.id,
        name: project.name,
        truckDate: project.truckDate,
        weeksBefore: project.weeksBefore || 0,
        hoursBySkill: {
          CNC: project.hoursBySkill?.CNC || 0,
          Build: project.hoursBySkill?.Build || 0,
          Paint: project.hoursBySkill?.Paint || 0,
          AV: project.hoursBySkill?.AV || 0,
          'Pack & Load': project.hoursBySkill?.['Pack & Load'] || 0,
        },
        probability: project.probability,
        onsite: project.onsite ? {
          hours: project.onsite.hours || 0,
          weeks: project.onsite.weeks || 0,
        } : undefined,
        projectType: project.projectType,
        curveMode: project.curveMode || 'Mathematician',
      }));

      await Project.insertMany(projectDocuments);
      projectsCount = projects.length;
    }

    // Import staff if provided
    if (staff && Array.isArray(staff) && staff.length > 0) {
      // Clear existing staff
      await Staff.deleteMany({});
      
      const staffDocuments = staff.map((member: any) => ({
        id: member.id,
        name: member.name,
        dailyHours: member.dailyHours || 8,
        utilisation: member.utilisation || 0.85,
        skills: {
          CNC: member.skills?.CNC || false,
          Build: member.skills?.Build || false,
          Paint: member.skills?.Paint || false,
          AV: member.skills?.AV || false,
          'Pack & Load': member.skills?.['Pack & Load'] || false,
        },
        leave: member.leave || [],
      }));

      await Staff.insertMany(staffDocuments);
      staffCount = staff.length;
    }

    return NextResponse.json({
      success: true,
      message: 'Data imported successfully',
      projectsCount,
      staffCount,
    });

  } catch (error) {
    console.error('Error importing data:', error);
    return NextResponse.json(
      { error: 'Failed to import data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await dbConnect();
    
    const projects = await Project.find({}).sort({ id: 1 });
    const staff = await Staff.find({}).sort({ id: 1 });

    return NextResponse.json({
      projects: projects.map(p => p.toObject()),
      staff: staff.map(s => s.toObject()),
    });

  } catch (error) {
    console.error('Error fetching data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
