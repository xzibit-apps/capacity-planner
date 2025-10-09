import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongo";
import Project from "@/models/Project";

export async function GET() {
  try {
    await dbConnect();
    
    // Get all projects
    const projects = await Project.find({}).sort({ createdAt: -1 });
    
    return NextResponse.json(projects.map(p => p.toObject()));
    
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    await dbConnect();

    const project = new Project(body);
    await project.save();

    return NextResponse.json(project.toObject(), { status: 201 });
    
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}
