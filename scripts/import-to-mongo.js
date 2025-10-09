const fs = require('fs');
const path = require('path');
const axios = require('axios');

async function importToMongo() {
  try {
    // Read the extracted data
    const dataPath = path.join(__dirname, '..', 'data', 'extracted-data.json');
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

    console.log('📊 Data loaded:');
    console.log(`   Projects: ${data.projects.length}`);
    console.log(`   Staff: ${data.staff.length}`);

    // Import to MongoDB via API
    const response = await axios.post('http://localhost:3000/api/data/import', data);

    console.log('✅ Data imported successfully!');
    console.log(`📈 Response:`, response.data);

  } catch (error) {
    console.error('❌ Error importing data:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the import
importToMongo();
