const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/capacity-planner';

async function importSampleData() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db();
    const collection = db.collection('rows');

    // Read the sample data JSON file
    const dataPath = path.join(__dirname, '..', 'data', 'sample-data.json');
    const sampleData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

    // Clear existing data
    await collection.deleteMany({});

    // Import projects
    const projectRows = sampleData.projects.map((project, index) => ({
      sheet: "job-data",
      rowNumber: index + 1,
      data: {
        A: project.id,
        B: project.name,
        C: project.projectType || "",
        D: project.truckDate || "",
        E: project.weeksBefore || 0,
        F: "Active",
        G: project.probability || "",
        H: project.curveMode || "Mathematician",
        I: project.hoursBySkill?.CNC || 0,
        J: project.hoursBySkill?.Build || 0,
        K: project.hoursBySkill?.Paint || 0,
        L: project.hoursBySkill?.AV || 0,
        M: project.hoursBySkill?.["Pack & Load"] || 0,
        N: project.onsite?.hours || 0,
        O: project.onsite?.weeks || 0,
      },
      synced: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    // Import staff
    const staffRows = sampleData.staff.map((staff, index) => ({
      sheet: "employees",
      rowNumber: index + 1,
      data: {
        A: staff.id,
        B: staff.name,
        C: staff.dailyHours || 8,
        D: staff.utilisation || 0.85,
        E: staff.skills?.CNC || false,
        F: staff.skills?.Build || false,
        G: staff.skills?.Paint || false,
        H: staff.skills?.AV || false,
        I: staff.skills?.["Pack & Load"] || false,
      },
      synced: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    // Insert all data
    await collection.insertMany([...projectRows, ...staffRows]);

    console.log('Sample data imported successfully!');
    console.log(`Imported ${projectRows.length} projects and ${staffRows.length} staff members`);
    
  } catch (error) {
    console.error('Error importing sample data:', error);
  } finally {
    await client.close();
  }
}

importSampleData();
