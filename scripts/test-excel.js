const XLSX = require('xlsx');
const path = require('path');

function testExcelFile() {
  try {
    const excelPath = path.join(__dirname, '..', 'Capacity Planner - Shared with Sanjeev.xlsx');
    console.log(`📖 Reading Excel file: ${excelPath}`);
    
    const workbook = XLSX.readFile(excelPath);
    const sheetNames = workbook.SheetNames;
    
    console.log(`\n📊 Found ${sheetNames.length} sheets:`);
    sheetNames.forEach((name, index) => {
      console.log(`  ${index + 1}. ${name}`);
    });

    console.log('\n🔍 Analyzing each sheet:');
    
    sheetNames.forEach(sheetName => {
      const sheetData = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheetData, { header: 1 });
      
      console.log(`\n📋 Sheet: "${sheetName}"`);
      console.log(`   Rows: ${rows.length}`);
      
      if (rows.length > 0) {
        const headers = rows[0];
        console.log(`   Columns: ${headers.length}`);
        console.log(`   Headers: ${headers.slice(0, 5).map(h => `"${h || 'empty'}"`).join(', ')}${headers.length > 5 ? '...' : ''}`);
        
        if (rows.length > 1) {
          console.log(`   Data rows: ${rows.length - 1}`);
        }
      } else {
        console.log(`   ⚠️  Empty sheet`);
      }
    });

    console.log('\n✅ Excel file analysis complete!');
    console.log('\n💡 Next steps:');
    console.log('1. Update MongoDB connection in scripts/config.js');
    console.log('2. Run: npm run import-excel');

  } catch (error) {
    console.error('❌ Error reading Excel file:', error.message);
    console.log('\n💡 Make sure:');
    console.log('1. Excel file is in the project root directory');
    console.log('2. File name matches exactly: "Capacity Planner - Shared with Sanjeev.xlsx"');
    console.log('3. File is not corrupted or password protected');
  }
}

testExcelFile();
