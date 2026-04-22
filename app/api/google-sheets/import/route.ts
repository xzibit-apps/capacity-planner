import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!spreadsheetId) {
    return NextResponse.json({ success: false, error: "Spreadsheet ID not configured." }, { status: 500 });
  }

  const credentials = {
    type: process.env.GOOGLE_SERVICE_ACCOUNT_TYPE || "service_account",
    project_id: process.env.GOOGLE_SERVICE_ACCOUNT_PROJECT_ID || "primoaire",
    private_key_id: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_ID || "",
    private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n') || "",
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL || "upwork-sanjeev@primoaire.iam.gserviceaccount.com",
    client_id: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_ID || "",
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
  };

  const auth2 = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const sheets = google.sheets({ version: "v4", auth: auth2 });

  try {
    const sheetMeta = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetName = sheetMeta.data.sheets?.[0].properties?.title;

    if (!sheetName) {
      return NextResponse.json({ success: false, error: "No sheets found in spreadsheet." }, { status: 400 });
    }

    const response = await sheets.spreadsheets.values.get({ spreadsheetId, range: sheetName });
    const rows = response.data.values || [];

    if (rows.length < 3) {
      return NextResponse.json({ success: false, error: "Not enough data in the sheet." }, { status: 400 });
    }

    const jobsToImport = rows.slice(2);
    let createdCount = 0;
    let updatedCount = 0;
    const errors: Array<{ row: unknown; error: string }> = [];

    // Fetch all existing job types
    const { data: existingJobTypes } = await supabase.from('cp_job_types').select('mongo_id, name');
    const jobTypeMap: Record<string, string> = {};
    (existingJobTypes || []).forEach((jt: Record<string, unknown>) => {
      jobTypeMap[String(jt.name ?? '').toLowerCase()] = String(jt.mongo_id ?? '');
    });

    for (const jobData of jobsToImport) {
      try {
        const getValue = (value: string | undefined) => (value === undefined || value === "" ? null : value);

        const jobNumber = getValue(jobData[0]);
        const jobName = getValue(jobData[1]);
        const jobType = getValue(jobData[2]);
        const truckLoadDate = getValue(jobData[3]);
        const weeksToBuild = getValue(jobData[4]);
        const status = getValue(jobData[5]);
        const probability = getValue(jobData[6]);
        const cnc = getValue(jobData[7]);
        const build = getValue(jobData[8]);
        const paint = getValue(jobData[9]);
        const av = getValue(jobData[10]);
        const packAndLoad = getValue(jobData[11]);
        const tradeOnsite = getValue(jobData[12]);
        const onsiteWeeks = getValue(jobData[13]);
        const installDeadline = getValue(jobData[14]);
        const hrsEstOnly = getValue(jobData[15]);
        const pm = getValue(jobData[16]);
        const notes = getValue(jobData[17]);

        if (!jobNumber || !jobName) continue;

        // Handle job type
        let jobTypeMongoId = null;
        if (jobType) {
          const key = jobType.toLowerCase();
          if (jobTypeMap[key]) {
            jobTypeMongoId = jobTypeMap[key];
          } else {
            // Create new job type
            const newMongoId = Date.now().toString(16) + Math.random().toString(16).slice(2, 10);
            const { data: newJt } = await supabase.from('cp_job_types')
              .insert({ mongo_id: newMongoId, name: jobType, description: 'Auto-created from Google Sheets sync', is_active: true })
              .select().single();
            if (newJt) {
              jobTypeMap[key] = (newJt as Record<string, unknown>).mongo_id as string;
              jobTypeMongoId = (newJt as Record<string, unknown>).mongo_id;
            }
          }
        }

        const projectData = {
          job_number: jobNumber,
          job_name: jobName,
          job_type_mongo_id: jobTypeMongoId,
          truck_load_date: truckLoadDate,
          weeks_to_build: Number(weeksToBuild) || 0,
          status: status || null,
          probability: probability ? Number(String(probability).replace('%', '')) / 100 : null,
          cnc: Number(cnc) || 0,
          build: Number(build) || 0,
          paint: Number(paint) || 0,
          av: Number(av) || 0,
          pack_and_load: Number(packAndLoad) || 0,
          trade_onsite: Number(tradeOnsite) || 0,
          onsite_weeks: Number(onsiteWeeks) || 0,
          install_deadline: installDeadline,
          hrs_est_only: hrsEstOnly === 'TRUE' || hrsEstOnly === 'true' || hrsEstOnly === '1',
          pm: pm,
          notes: notes,
          curve_mode: 'Mathematician',
        };

        // Check if project exists by jobNumber
        const { data: existing } = await supabase.from('cp_projects')
          .select('id, mongo_id').eq('job_number', jobNumber).single();

        if (existing) {
          await supabase.from('cp_projects').update({ ...projectData, updated_at: new Date().toISOString() }).eq('id', (existing as Record<string, unknown>).id);
          updatedCount++;
        } else {
          const mongoId = Date.now().toString(16) + Math.random().toString(16).slice(2, 10);
          await supabase.from('cp_projects').insert({ ...projectData, mongo_id: mongoId });
          createdCount++;
        }
      } catch (err: unknown) {
        errors.push({ row: jobData, error: err instanceof Error ? err.message : 'Unknown error' });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sync completed. ${createdCount} created, ${updatedCount} updated.`,
      created: createdCount,
      updated: updatedCount,
      errors: errors.length > 0 ? errors : undefined,
      totalProcessed: jobsToImport.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
