import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { SHEETS } from "@/configs/sheets";

// Import the Row model
import Row from "@/models/Row";

// Dynamic import for XLSX
const XLSX = require('xlsx');

// Sheet mapping from Excel to our app
const SHEET_MAPPING = {
  'Job Database': 'job-database',
  'Employee Availability': 'employee-availability', 
  'Employee Skills': 'employee-skills',
  'Calendar': 'calendar',
  'Graph': 'graph',
  'Calendar Calc': 'calendar-calc',
  'Stats': 'stats',
  'Calc Data': 'calc-data'
};

async function connectDB(mongoUri: string) {
  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    throw new Error('Failed to connect to MongoDB');
  }
}

function cleanValue(value: any): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  return String(value);
}

function processSheetData(sheetName: string, sheetData: any) {
  const rows = XLSX.utils.sheet_to_json(sheetData, { header: 1 });
  
  if (rows.length === 0) {
    console.log(`⚠️  Sheet "${sheetName}" is empty`);
    return [];
  }

  // Get headers from first row
  const firstRow = rows[0] as any[];
  const headers: string[] = firstRow.map((header: any) => cleanValue(header) || `Column_${firstRow.length + 1}`);
  
  // Process data rows (skip header row)
  const processedRows = rows.slice(1).map((row: any, index: number) => {
    const data: Record<string, any> = {};
    
    headers.forEach((header: string, colIndex: number) => {
      const value = row[colIndex];
      data[header] = cleanValue(value);
    });

    return {
      sheet: sheetName,
      rowNumber: index + 2, // Excel rows are 1-based, but we skip header
      data: data,
      synced: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  });

  return processedRows;
}

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting Excel import via API...');

    // Check MongoDB URI
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      return NextResponse.json(
        { error: "MONGODB_URI environment variable is not set" },
        { status: 500 }
      );
    }

    // Connect to MongoDB
    await connectDB(MONGODB_URI);

    // Parse the form data to get the uploaded file
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    // Check file type
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return NextResponse.json(
        { error: "Please upload an Excel file (.xlsx or .xls)" },
        { status: 400 }
      );
    }

    console.log(`📖 Processing uploaded file: ${file.name} (${file.size} bytes)`);

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Read Excel from buffer
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetNames = workbook.SheetNames;
    
    console.log(`📊 Found ${sheetNames.length} sheets:`, sheetNames);

    let totalRowsImported = 0;
    const importResults: Array<{
      sheet: string;
      rowsImported: number;
      status: 'success' | 'skipped' | 'error';
      error?: string;
    }> = [];

    // Process each sheet
    for (const sheetName of sheetNames) {
      console.log(`\n🔄 Processing sheet: "${sheetName}"`);
      
      try {
        // Check if this sheet is in our mapping
        if (!SHEET_MAPPING[sheetName as keyof typeof SHEET_MAPPING]) {
          console.log(`⚠️  Skipping sheet "${sheetName}" - not in our mapping`);
          importResults.push({
            sheet: sheetName,
            rowsImported: 0,
            status: 'skipped'
          });
          continue;
        }

        const sheetData = workbook.Sheets[sheetName];
        const processedRows = processSheetData(sheetName, sheetData);
        
        if (processedRows.length === 0) {
          console.log(`⚠️  No data rows found in "${sheetName}"`);
          importResults.push({
            sheet: sheetName,
            rowsImported: 0,
            status: 'skipped'
          });
          continue;
        }

        // Clear existing data for this sheet
        await Row.deleteMany({ sheet: sheetName });
        console.log(`🗑️  Cleared existing data for "${sheetName}"`);

        // Insert new data
        const result = await Row.insertMany(processedRows);
        console.log(`✅ Imported ${result.length} rows for "${sheetName}"`);
        
        totalRowsImported += result.length;
        importResults.push({
          sheet: sheetName,
          rowsImported: result.length,
          status: 'success'
        });

      } catch (error) {
        console.error(`❌ Error processing sheet "${sheetName}":`, error);
        importResults.push({
          sheet: sheetName,
          rowsImported: 0,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    console.log(`\n🎉 Import completed! Total rows imported: ${totalRowsImported}`);
    
    // Show summary
    const summary = await Row.aggregate([
      { $group: { _id: '$sheet', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    
    console.log('\n📋 Import Summary:');
    summary.forEach((item: any) => {
      console.log(`  ${item._id}: ${item.count} rows`);
    });

    // Close MongoDB connection
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');

    return NextResponse.json({
      success: true,
      message: `Import completed successfully! Total rows imported: ${totalRowsImported}`,
      totalRowsImported,
      importResults,
      summary: summary.map((item: any) => ({
        sheet: item._id,
        count: item.count
      }))
    });

  } catch (error: any) {
    console.error('❌ Import failed:', error);
    
    // Try to disconnect if connected
    try {
      await mongoose.disconnect();
    } catch (disconnectError) {
      console.error('Error disconnecting from MongoDB:', disconnectError);
    }

    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Import failed',
        message: 'Failed to import Excel data'
      },
      { status: 500 }
    );
  }
}
