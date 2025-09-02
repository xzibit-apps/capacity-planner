import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongo';
import Project from '@/models/Project';

export async function POST(request: NextRequest) {
  try {
    console.log('CSV import started');
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      console.log('No file provided');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log(`File received: ${file.name}, size: ${file.size} bytes`);

    // Check if it's a CSV file
    if (!file.name.toLowerCase().endsWith('.csv')) {
      console.log('Invalid file type');
      return NextResponse.json({ error: 'Only CSV files are supported' }, { status: 400 });
    }

    // Read the CSV file
    const text = await file.text();
    console.log(`CSV content length: ${text.length} characters`);
    
    // Handle different line endings and clean up the text
    const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = normalizedText.split('\n').filter(line => line.trim());
    console.log(`Number of non-empty lines: ${lines.length}`);
    
    if (lines.length < 2) {
      console.log('Insufficient lines in CSV');
      return NextResponse.json({ error: 'CSV file must have at least a header row and one data row' }, { status: 400 });
    }

    // Parse headers - handle potential quotes and clean up
    const headerLine = lines[0];
    console.log('Raw header line:', headerLine);
    const headers = headerLine.split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
    console.log('Headers found:', headers);
    
    // Expected headers for project import
    const expectedHeaders = [
      'Project Name', 'Truck Date', 'Lead Weeks', 'Probability',
      'CNC Hours', 'Build Hours', 'Paint Hours', 'AV Hours', 'Pack & Load Hours',
      'Onsite Hours', 'Onsite Weeks', 'Project Type', 'Curve Mode'
    ];

    // Check if all required headers are present
    const missingHeaders = expectedHeaders.filter(header => !headers.includes(header));
    if (missingHeaders.length > 0) {
      console.log('Missing headers:', missingHeaders);
      return NextResponse.json({ 
        error: `Missing required headers: ${missingHeaders.join(', ')}` 
      }, { status: 400 });
    }

    // Parse data rows
    const projects = [];
    console.log('Processing data rows...');
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      console.log(`Processing line ${i + 1}: "${line}"`);
      
      // Handle CSV parsing more robustly
      const values = line.split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
      console.log(`Line ${i + 1}: Parsed ${values.length} values:`, values);
      
      if (values.length < headers.length) {
        console.log(`Line ${i + 1}: Insufficient values (${values.length}/${headers.length})`);
        continue;
      }

      const project: any = {};
      
      headers.forEach((header, index) => {
        const value = values[index] || '';
        
        switch (header) {
          case 'Project Name':
            project.name = value;
            break;
          case 'Truck Date':
            project.truckDate = value;
            break;
          case 'Lead Weeks':
            project.weeksBefore = parseInt(value) || 0;
            break;
          case 'Probability':
            project.probability = parseInt(value) / 100 || 0.9;
            break;
          case 'CNC Hours':
          case 'Build Hours':
          case 'Paint Hours':
          case 'AV Hours':
          case 'Pack & Load Hours':
            if (!project.hoursBySkill) project.hoursBySkill = {};
            const skillName = header.replace(' Hours', '');
            project.hoursBySkill[skillName] = parseFloat(value) || 0;
            break;
          case 'Onsite Hours':
            if (!project.onsite) project.onsite = {};
            project.onsite.hours = parseFloat(value) || 0;
            break;
          case 'Onsite Weeks':
            if (!project.onsite) project.onsite = {};
            project.onsite.weeks = parseInt(value) || 0;
            break;
          case 'Project Type':
            project.projectType = value || null;
            break;
          case 'Curve Mode':
            project.curveMode = value || 'Mathematician';
            break;
        }
      });

      // Validate required fields
      if (project.name && project.truckDate) {
        projects.push(project);
        console.log(`Line ${i + 1}: Added project "${project.name}"`);
      } else {
        console.log(`Line ${i + 1}: Skipped - missing name or truck date`);
      }
    }

    if (projects.length === 0) {
      console.log('No valid projects found');
      return NextResponse.json({ error: 'No valid projects found in CSV' }, { status: 400 });
    }

    console.log(`Found ${projects.length} valid projects to import`);

    // Connect to database
    console.log('Connecting to database...');
    await dbConnect();
    console.log('Database connected successfully');
    
    // Process projects - update existing or create new
    console.log('Processing projects (update existing or create new)...');
    let createdCount = 0;
    let updatedCount = 0;
    const results = [];
    
    for (const projectData of projects) {
      try {
        // Check if project with same name and truck date already exists
        const existingProject = await Project.findOne({
          name: projectData.name,
          truckDate: projectData.truckDate
        });
        
        if (existingProject) {
          // Update existing project
          console.log(`Updating existing project: "${projectData.name}" (${projectData.truckDate})`);
          const updatedProject = await Project.findByIdAndUpdate(
            existingProject._id,
            { ...projectData, updatedAt: new Date() },
            { new: true, runValidators: true }
          );
          results.push(updatedProject);
          updatedCount++;
        } else {
          // Create new project
          console.log(`Creating new project: "${projectData.name}" (${projectData.truckDate})`);
          const newProject = new Project(projectData);
          const savedProject = await newProject.save();
          results.push(savedProject);
          createdCount++;
        }
      } catch (error) {
        console.error(`Error processing project "${projectData.name}":`, error);
        // Continue with other projects even if one fails
      }
    }
    
    console.log(`Import completed: ${createdCount} created, ${updatedCount} updated`);

    return NextResponse.json({ 
      message: `Successfully processed ${projects.length} projects`,
      totalProcessed: projects.length,
      created: createdCount,
      updated: updatedCount,
      projectIds: results.map(doc => doc._id)
    });

  } catch (error) {
    console.error('CSV import error:', error);
    return NextResponse.json({ 
      error: 'Failed to import CSV file',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
