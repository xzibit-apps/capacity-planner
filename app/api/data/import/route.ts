import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, verifyAdmin } from '@/lib/auth';
import { supabase, toProject, toStaff } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { data: projects } = await supabase.from('cp_projects').select('*').order('job_number', { ascending: true });
    const { data: staffData } = await supabase.from('cp_staff').select('*').order('name', { ascending: true });
    const { data: leaveData } = await supabase.from('cp_staff_leave').select('*');

    const leaveByStaff: Record<string, unknown[]> = {};
    (leaveData || []).forEach((l: Record<string, unknown>) => {
      const key = String(l.staff_mongo_id ?? '');
      if (!leaveByStaff[key]) leaveByStaff[key] = [];
      leaveByStaff[key].push(l);
    });

    return NextResponse.json({
      projects: (projects || []).map(toProject),
      staff: (staffData || []).map((s: Record<string, unknown>) => toStaff(s, (leaveByStaff[String(s.mongo_id ?? '')] || []) as Record<string, unknown>[])),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to fetch data', details: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const body = await request.json();
    const { projects, staff } = body;

    let projectsCount = 0;
    let staffCount = 0;

    if (projects && Array.isArray(projects) && projects.length > 0) {
      // Clear existing projects
      await supabase.from('cp_projects').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      const projectDocuments = projects.map((project: Record<string, unknown>) => ({
        mongo_id: project.id || (Date.now().toString(16) + Math.random().toString(16).slice(2, 10)),
        job_number: project.id || '',
        job_name: project.name || '',
        truck_load_date: project.truckDate || null,
        weeks_to_build: (project.weeksBefore as number) || 0,
        cnc: (project.hoursBySkill as Record<string, number>)?.CNC || 0,
        build: (project.hoursBySkill as Record<string, number>)?.Build || 0,
        paint: (project.hoursBySkill as Record<string, number>)?.Paint || 0,
        av: (project.hoursBySkill as Record<string, number>)?.AV || 0,
        pack_and_load: (project.hoursBySkill as Record<string, number>)?.['Pack & Load'] || 0,
        trade_onsite: (project.onsite as Record<string, number>)?.hours || 0,
        onsite_weeks: (project.onsite as Record<string, number>)?.weeks || 0,
        probability: project.probability || null,
        curve_mode: project.curveMode || 'Mathematician',
      }));

      const { error } = await supabase.from('cp_projects').insert(projectDocuments);
      if (error) throw error;
      projectsCount = projects.length;
    }

    if (staff && Array.isArray(staff) && staff.length > 0) {
      // Clear existing staff and leave
      await supabase.from('cp_staff_leave').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('cp_staff').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      for (const member of staff as Record<string, unknown>[]) {
        const mongoId = member.id || (Date.now().toString(16) + Math.random().toString(16).slice(2, 10));
        const memberName = String(member.name ?? '');
        const { error } = await supabase.from('cp_staff').insert({
          mongo_id: mongoId,
          slug: member.id || memberName.toLowerCase().replace(/\s+/g, '_'),
          name: memberName,
          daily_hours: (member.dailyHours as number) || 8,
          utilisation: (member.utilisation as number) || 0.85,
          skills: member.skills || { CNC: false, Build: false, Paint: false, AV: false, 'Pack & Load': false },
        });
        if (error) throw error;

        if (member.leave && Array.isArray(member.leave)) {
          for (const leave of member.leave as Record<string, unknown>[]) {
            await supabase.from('cp_staff_leave').insert({
              staff_mongo_id: mongoId,
              date: leave.date,
              leave_type: leave.leaveType || 'Annual',
              notes: leave.notes || '',
            });
          }
        }
        staffCount++;
      }
    }

    return NextResponse.json({ success: true, message: 'Data imported successfully', projectsCount, staffCount });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to import data', details: message }, { status: 500 });
  }
}
