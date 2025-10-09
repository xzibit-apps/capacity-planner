const axios = require('axios');

async function verifyImport() {
  try {
    console.log('🔍 Verifying imported data...\n');

    // Check projects
    console.log('📊 Checking projects...');
    const projectsResponse = await axios.get('http://localhost:3003/api/projects');
    console.log(`✅ Projects in database: ${projectsResponse.data.length}`);

    // Check staff
    console.log('👥 Checking staff...');
    const staffResponse = await axios.get('http://localhost:3003/api/staff');
    console.log(`✅ Staff in database: ${staffResponse.data.length}`);

    // Check curve library
    console.log('📈 Checking curve library...');
    const curveLibraryResponse = await axios.get('http://localhost:3003/api/curve-library/import');
    console.log(`✅ Curve library entries: ${curveLibraryResponse.data.curves.length}`);

    console.log('\n🎉 Data verification complete!');
    console.log('📊 Summary:');
    console.log(`   Projects: ${projectsResponse.data.length}`);
    console.log(`   Staff: ${staffResponse.data.length}`);
    console.log(`   Curve Library: ${curveLibraryResponse.data.curves.length} entries`);

    // Show some sample data
    if (projectsResponse.data.length > 0) {
      console.log('\n📋 Sample project:');
      console.log(`   ID: ${projectsResponse.data[0].id}`);
      console.log(`   Name: ${projectsResponse.data[0].name}`);
    }

    if (staffResponse.data.length > 0) {
      console.log('\n👤 Sample staff member:');
      console.log(`   ID: ${staffResponse.data[0].id}`);
      console.log(`   Name: ${staffResponse.data[0].name}`);
    }

    if (curveLibraryResponse.data.curves.length > 0) {
      console.log('\n📊 Sample curve library entry:');
      console.log(`   Name: ${curveLibraryResponse.data.curves[0].name}`);
      console.log(`   Skills: ${Object.keys(curveLibraryResponse.data.curves[0].curves).join(', ')}`);
    }

  } catch (error) {
    console.error('❌ Error verifying data:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the verification
verifyImport();
