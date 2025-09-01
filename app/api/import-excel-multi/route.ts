import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongo";
import Row from "@/models/Row";
import { SHEETS } from "@/configs/sheets";

const XLSX = require('xlsx');

// Function to convert column index to Excel column letter (A, B, C, etc.)
function columnToLetter(column: number): string {
  let temp, letter = '';
  while (column > 0) {
    temp = (column - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    column = (column - temp - 1) / 26;
  }
  return letter;
}

// Function to get Excel cell reference (e.g., A4, H8)
function getCellReference(rowIndex: number, colIndex: number): string {
  const colLetter = columnToLetter(colIndex + 1); // +1 because Excel columns start at 1
  const rowNumber = rowIndex + 1; // +1 because Excel rows start at 1
  return `${colLetter}${rowNumber}`;
}

// Function to process a single sheet
function processSheetData(sheetName: string, sheetData: any[], workbook: any): any[] {
  const rows: any[] = [];
  
  // Find the corresponding sheet configuration
  const sheetConfig = SHEETS.find(sheet => sheet.name === sheetName);
  if (!sheetConfig) {
    console.log(`No configuration found for sheet: ${sheetName}`);
    return rows;
  }

  // Get the range of the sheet
  const range = XLSX.utils.decode_range(sheetData['!ref'] || 'A1');
  
  // Process each row
  for (let rowIndex = range.s.r; rowIndex <= range.e.r; rowIndex++) {
    const rowData: Record<string, any> = {};
    let hasData = false;
    
    // Process each column in the row
    for (let colIndex = range.s.c; colIndex <= range.e.c; colIndex++) {
      const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
      const cellValue = sheetData[cellAddress];
      
      if (cellValue && cellValue.v !== undefined) {
        // Get the Excel cell reference (e.g., A4, H8)
        const cellRef = getCellReference(rowIndex, colIndex);
        
        // Use the cell reference as the key
        rowData[cellRef] = cellValue.v;
        hasData = true;
      }
    }
    
    // Only add rows that have data
    if (hasData) {
      rows.push({
        sheet: sheetConfig.slug,
        rowNumber: rowIndex + 1, // Excel row number
        data: rowData,
        synced: false,
        excelRowIndex: rowIndex,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
  }
  
  return rows;
}

export async function POST(request: NextRequest) {
  try {
    // Check if MongoDB URI is available
    if (!process.env.MONGODB_URI) {
      return NextResponse.json(
        { success: false, message: "MongoDB URI not configured" },
        { status: 500 }
      );
    }

    // Connect to MongoDB
    await dbConnect();
    console.log("✅ Connected to MongoDB");

    // Clear existing data before importing
    console.log("🗑️ Clearing existing data...");
    await Row.deleteMany({});
    console.log("✅ Existing data cleared");

    // Get the uploaded file
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { success: false, message: "No file uploaded" },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    console.log("📖 Reading Excel file:", file.name);

    // Read the workbook
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    console.log("📊 Workbook sheets:", workbook.SheetNames);

    let totalRowsImported = 0;
    const importResults: any[] = [];

    // Process each sheet
    for (const sheetName of workbook.SheetNames) {
      console.log(`\n🔄 Processing sheet: ${sheetName}`);
      
      // Get sheet data
      const sheetData = workbook.Sheets[sheetName];
      if (!sheetData) {
        console.log(`⚠️ No data found in sheet: ${sheetName}`);
        continue;
      }

      // Process the sheet data
      const rows = processSheetData(sheetName, sheetData, workbook);
      
      if (rows.length === 0) {
        console.log(`⚠️ No data rows found in sheet: ${sheetName}`);
        continue;
      }

      // Insert rows into MongoDB
      const result = await Row.insertMany(rows);
      console.log(`✅ Imported ${result.length} rows from sheet: ${sheetName}`);
      
      totalRowsImported += result.length;
      importResults.push({
        sheetName,
        sheetSlug: rows[0]?.sheet,
        rowsImported: result.length,
        sampleData: rows.slice(0, 2).map(row => ({
          rowNumber: row.rowNumber,
          cellCount: Object.keys(row.data).length,
          sampleCells: Object.keys(row.data).slice(0, 5)
        }))
      });
    }

    console.log(`\n🎉 Import completed! Total rows imported: ${totalRowsImported}`);

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${totalRowsImported} rows from ${importResults.length} sheets`,
      totalRowsImported,
      sheetsProcessed: importResults.length,
      results: importResults
    });

  } catch (error: any) {
    console.error("❌ Import failed:", error);
    return NextResponse.json(
      {
        success: false,
        message: `Import failed: ${error.message}`,
        error: error.message
      },
      { status: 500 }
    );
  }
}
