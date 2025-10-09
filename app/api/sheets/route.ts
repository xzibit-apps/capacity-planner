import { NextResponse } from "next/server";


export async function GET() {
  try {
    return NextResponse.json({ 
      ok: true, 
      data: [
        { name: 'Capacity', slug: 'capacity', description: 'Capacity planning data' },
        { name: 'Demand', slug: 'demand', description: 'Demand forecasting data' },
        { name: 'Supply', slug: 'supply', description: 'Supply planning data' },
        { name: 'Projects', slug: 'projects', description: 'Project management data' },
        { name: 'Staff', slug: 'staff', description: 'Staff allocation data' }
      ]
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to fetch sheets" },
      { status: 500 }
    );
  }
}
