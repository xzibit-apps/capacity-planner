import { NextResponse } from 'next/server';

/**
 * Retired 2026-04-22 per Phase D-lite Part 3 (kb_decisions ADR — see git log).
 *
 * Google Sheets sync was the legacy pathway for importing project data into
 * cp_projects. Data entry now happens via:
 *   - Launcher Projects portal (/projects) for canonical project identity
 *   - CP job-data page for CP-specific fields (hours, curves)
 *
 * The cp_sheet_projects and cp_rows tables are preserved for historical data.
 * A future sprint may reintroduce a purpose-built import tool.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: 'Retired',
      message:
        'Google Sheets sync has been retired. Add projects via the Launcher Projects portal (https://xzibit-apps.vercel.app/projects) and enter CP-specific data (hours, curves) via the job-data page here. A replacement import tool may be built in a future sprint.',
    },
    { status: 410 }
  );
}
