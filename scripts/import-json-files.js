const fs = require('fs');
const path = require('path');
const axios = require('axios');

async function importJsonFiles() {
  try {
    console.log('🚀 Starting JSON files import...\n');

    // Read JSON files from root directory
    const projectsPath = path.join(__dirname, '..', 'projects.json');
    const staffPath = path.join(__dirname, '..', 'staff.json');
    const curveLibraryPath = path.join(__dirname, '..', 'curve-library.json');

    console.log('📖 Reading JSON files...');
    
    const projects = JSON.parse(fs.readFileSync(projectsPath, 'utf8'));
    const staff = JSON.parse(fs.readFileSync(staffPath, 'utf8'));
    const curveLibrary = JSON.parse(fs.readFileSync(curveLibraryPath, 'utf8'));

    console.log(`✅ Files loaded:`);
    console.log(`   📊 Projects: ${projects.length}`);
    console.log(`   👥 Staff: ${staff.length}`);
    console.log(`   📈 Curve Library: ${Object.keys(curveLibrary).length} curves\n`);

    // Import projects
    console.log('📤 Importing projects...');
    const projectsResponse = await axios.post('http://localhost:3003/api/data/import', {
      projects,
      staff: []
    });
    console.log(`✅ Projects imported: ${projectsResponse.data.projectsCount}`);

    // Import staff
    console.log('📤 Importing staff...');
    const staffResponse = await axios.post('http://localhost:3003/api/data/import', {
      projects: [],
      staff
    });
    console.log(`✅ Staff imported: ${staffResponse.data.staffCount}`);

    // Import curve library
    console.log('📤 Importing curve library...');
    const curveLibraryResponse = await axios.post('http://localhost:3003/api/curve-library/import', {
      curveLibrary
    });
    console.log(`✅ Curve library imported: ${curveLibraryResponse.data.curvesCount} curves`);

    console.log('\n🎉 All data imported successfully!');
    console.log(`📊 Total imported:`);
    console.log(`   Projects: ${projects.length}`);
    console.log(`   Staff: ${staff.length}`);
    console.log(`   Curve Library: ${Object.keys(curveLibrary).length} curves`);

  } catch (error) {
    console.error('❌ Error importing data:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the import
importJsonFiles();
