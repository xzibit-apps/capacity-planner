import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongo";
import Project from "@/models/Project";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    await dbConnect();

    const project = await Project.findOneAndUpdate(
      { id: params.id },
      body,
      { new: true, runValidators: true }
    );

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(project.toObject());
    
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json(
      { error: "Failed to update project" },
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

    const project = await Project.findOneAndDelete({ id: params.id });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Project deleted successfully" });
    
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json(
      { error: "Failed to delete project" },
      { status: 500 }
    );
  }
}
