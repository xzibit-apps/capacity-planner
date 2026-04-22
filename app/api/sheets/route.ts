import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    return NextResponse.json({
      ok: true,
      data: [
        { name: 'Capacity', slug: 'capacity', description: 'Capacity planning data' },
        { name: 'Demand', slug: 'demand', description: 'Demand forecasting data' },
        { name: 'Supply', slug: 'supply', description: 'Supply planning data' },
        { name: 'Projects', slug: 'projects', description: 'Project management data' },
        { name: 'Staff', slug: 'staff', description: 'Staff allocation data' },
      ],
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to fetch sheets' },
      { status: 500 }
    );
  }
}
