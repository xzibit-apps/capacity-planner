const XLSX = require('xlsx');
const mongoose = require('mongoose');
const path = require('path');
const config = require('./config');

// Import the Row model
const Row = require('./RowModel');

async function connectDB() {
  try {
    await mongoose.connect(config.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    console.log('\n💡 To fix this:');
    console.log('1. Get free MongoDB Atlas cluster: https://cloud.mongodb.com');
    console.log('2. Update MONGODB_URI in scripts/config.js');
    console.log('3. Or install local MongoDB: https://www.mongodb.com/try/download/community');
    process.exit(1);
  }
}

function cleanValue(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  return String(value);
}

function processSheetData(sheetName, sheetData) {
  const rows = XLSX.utils.sheet_to_json(sheetData, { header: 1 });
  
  if (rows.length === 0) {
    console.log(`⚠️  Sheet "${sheetName}" is empty`);
    return [];
  }

  // Get headers from first row
  const headers = rows[0].map(header => cleanValue(header) || `Column_${headers.length + 1}`);
  
  // Process data rows (skip header row)
  const processedRows = rows.slice(1).map((row, index) => {
    const data = {};
    
    headers.forEach((header, colIndex) => {
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

async function importExcelData() {
  try {
    // Connect to MongoDB
    await connectDB();

    // Read Excel file
    const excelPath = path.join(__dirname, '..', config.EXCEL_FILE_PATH);
    console.log(`📖 Reading Excel file: ${excelPath}`);
    
    const workbook = XLSX.readFile(excelPath);
    const sheetNames = workbook.SheetNames;
    
    console.log(`📊 Found ${sheetNames.length} sheets:`, sheetNames);

    let totalRowsImported = 0;

    // Process each sheet
    for (const sheetName of sheetNames) {
      console.log(`\n🔄 Processing sheet: "${sheetName}"`);
      
      // Check if this sheet is in our mapping
      if (!config.SHEET_MAPPING[sheetName]) {
        console.log(`⚠️  Skipping sheet "${sheetName}" - not in our mapping`);
        continue;
      }

      const sheetData = workbook.Sheets[sheetName];
      const processedRows = processSheetData(sheetName, sheetData);
      
      if (processedRows.length === 0) {
        console.log(`⚠️  No data rows found in "${sheetName}"`);
        continue;
      }

      // Clear existing data for this sheet
      await Row.deleteMany({ sheet: sheetName });
      console.log(`🗑️  Cleared existing data for "${sheetName}"`);

      // Insert new data
      const result = await Row.insertMany(processedRows);
      console.log(`✅ Imported ${result.length} rows for "${sheetName}"`);
      
      totalRowsImported += result.length;
    }

    console.log(`\n🎉 Import completed! Total rows imported: ${totalRowsImported}`);
    
    // Show summary
    const summary = await Row.aggregate([
      { $group: { _id: '$sheet', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    
    console.log('\n📋 Import Summary:');
    summary.forEach(item => {
      console.log(`  ${item._id}: ${item.count} rows`);
    });

  } catch (error) {
    console.error('❌ Import failed:', error);
  } finally {
    // Close MongoDB connection
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the import
if (require.main === module) {
  importExcelData();
}

module.exports = { importExcelData };
