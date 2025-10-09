import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongo';
import CurveLibrary from '@/models/CurveLibrary';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const body = await request.json();
    const { curveLibrary } = body;

    // Clear existing curve library data
    await CurveLibrary.deleteMany({});

    // Import curve library
    if (curveLibrary && typeof curveLibrary === 'object') {
      const curveDocuments = Object.entries(curveLibrary).map(([name, curves]) => ({
        name,
        curves,
      }));

      await CurveLibrary.insertMany(curveDocuments);
    }

    return NextResponse.json({
      success: true,
      message: 'Curve library imported successfully',
      curvesCount: Object.keys(curveLibrary || {}).length,
    });

  } catch (error) {
    console.error('Error importing curve library:', error);
    return NextResponse.json(
      { error: 'Failed to import curve library', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await dbConnect();
    
    const curves = await CurveLibrary.find({}).sort({ name: 1 });

    return NextResponse.json({
      curves: curves.map(c => c.toObject()),
    });

  } catch (error) {
    console.error('Error fetching curve library:', error);
    return NextResponse.json(
      { error: 'Failed to fetch curve library', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
