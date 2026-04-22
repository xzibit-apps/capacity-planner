import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    if (!file.name.toLowerCase().endsWith('.csv')) {
      return NextResponse.json({ error: 'Only CSV files are supported' }, { status: 400 });
    }

    const text = await file.text();
    const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = normalizedText.split('\n').filter(line => line.trim());

    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV file must have at least a header row and one data row' }, { status: 400 });
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
    const expectedHeaders = [
      'Project Name', 'Truck Date', 'Lead Weeks', 'Probability',
      'CNC Hours', 'Build Hours', 'Paint Hours', 'AV Hours', 'Pack & Load Hours',
      'Onsite Hours', 'Onsite Weeks', 'Project Type', 'Curve Mode'
    ];

    const missingHeaders = expectedHeaders.filter(header => !headers.includes(header));
    if (missingHeaders.length > 0) {
      return NextResponse.json({ error: `Missing required headers: ${missingHeaders.join(', ')}` }, { status: 400 });
    }

    interface ProjectRecord {
      name?: string;
      truckDate?: string;
      weeksBefore?: number;
      probability?: number;
      hoursBySkill?: Record<string, number>;
      onsite?: { hours?: number; weeks?: number };
      projectType?: string | null;
      curveMode?: string;
    }
    const projects: ProjectRecord[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const values = line.split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
      if (values.length < headers.length) continue;

      const project: ProjectRecord = {};
      headers.forEach((header, index) => {
        const value = values[index] || '';
        switch (header) {
          case 'Project Name': project.name = value; break;
          case 'Truck Date': project.truckDate = value; break;
          case 'Lead Weeks': project.weeksBefore = parseInt(value) || 0; break;
          case 'Probability': project.probability = parseInt(value) / 100 || 0.9; break;
          case 'CNC Hours': case 'Build Hours': case 'Paint Hours': case 'AV Hours': case 'Pack & Load Hours':
            if (!project.hoursBySkill) project.hoursBySkill = {};
            project.hoursBySkill[header.replace(' Hours', '')] = parseFloat(value) || 0;
            break;
          case 'Onsite Hours':
            if (!project.onsite) project.onsite = {};
            project.onsite.hours = parseFloat(value) || 0;
            break;
          case 'Onsite Weeks':
            if (!project.onsite) project.onsite = {};
            project.onsite.weeks = parseInt(value) || 0;
            break;
          case 'Project Type': project.projectType = value || null; break;
          case 'Curve Mode': project.curveMode = value || 'Mathematician'; break;
        }
      });

      if (project.name && project.truckDate) projects.push(project);
    }

    if (projects.length === 0) {
      return NextResponse.json({ error: 'No valid projects found in CSV' }, { status: 400 });
    }

    let createdCount = 0;
    let updatedCount = 0;
    const resultIds: string[] = [];

    for (const projectData of projects) {
      const row = {
        job_name: projectData.name,
        truck_load_date: projectData.truckDate,
        weeks_to_build: projectData.weeksBefore || 0,
        probability: projectData.probability || null,
        cnc: projectData.hoursBySkill?.CNC || 0,
        build: projectData.hoursBySkill?.Build || 0,
        paint: projectData.hoursBySkill?.Paint || 0,
        av: projectData.hoursBySkill?.AV || 0,
        pack_and_load: projectData.hoursBySkill?.['Pack & Load'] || 0,
        trade_onsite: projectData.onsite?.hours || 0,
        onsite_weeks: projectData.onsite?.weeks || 0,
        curve_mode: projectData.curveMode || 'Mathematician',
      };

      const { data: existing } = await supabase.from('cp_projects')
        .select('id, mongo_id').eq('job_name', projectData.name!).eq('truck_load_date', projectData.truckDate!).single();

      if (existing) {
        const existingRow = existing as Record<string, unknown>;
        await supabase.from('cp_projects').update({ ...row, updated_at: new Date().toISOString() }).eq('id', existingRow.id);
        resultIds.push(String(existingRow.mongo_id ?? ''));
        updatedCount++;
      } else {
        const mongoId = Date.now().toString(16) + Math.random().toString(16).slice(2, 10);
        await supabase.from('cp_projects').insert({ ...row, mongo_id: mongoId, job_number: mongoId });
        resultIds.push(mongoId);
        createdCount++;
      }
    }

    return NextResponse.json({
      message: `Successfully processed ${projects.length} projects`,
      totalProcessed: projects.length,
      created: createdCount,
      updated: updatedCount,
      projectIds: resultIds,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to import CSV file', details: message }, { status: 500 });
  }
}
