import { google } from "googleapis";

function getAuth() {
  const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64!;
  if (!b64) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 missing");
  
  const json = JSON.parse(Buffer.from(b64, "base64").toString("utf-8"));
  const scopes = ["https://www.googleapis.com/auth/spreadsheets"];
  return new google.auth.GoogleAuth({ credentials: json, scopes });
}

export function sheetsClient() {
  const auth = getAuth();
  return google.sheets({ version: "v4", auth });
}

export async function listSheets(): Promise<string[]> {
  const sheets = sheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID!;
  if (!spreadsheetId) throw new Error("GOOGLE_SHEET_ID missing");
  
  const res = await sheets.spreadsheets.get({ spreadsheetId });
  return res.data.sheets?.map(sheet => sheet.properties?.title || "") || [];
}

export async function readSheet(sheetName: string): Promise<{ columns: string[], rows: Array<{ rowNumber: number, data: Record<string, any> }> }> {
  const sheets = sheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID!;
  
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A:ZZ`,
  });
  
  const values = res.data.values || [];
  const [header = [], ...rows] = values;
  
  // Process headers - handle empty/unnamed columns
  const columns = header.map((h: any, index: number) => {
    const headerText = String(h || "").trim();
    return headerText || `Unnamed: ${index + 1}`;
  });
  
  // Process rows
  const mapped = rows.map((r: any[], idx: number) => {
    const obj: Record<string, any> = {};
    columns.forEach((col, i) => {
      obj[col] = r[i] ?? "";
    });
    return { rowNumber: idx + 2, data: obj }; // +2 because sheets are 1-indexed and we skipped header
  });
  
  return { columns, rows: mapped };
}

export async function writeRows(sheetName: string, startRow: number, rows: Array<Record<string, any>>): Promise<void> {
  const sheets = sheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID!;
  
  // Convert rows to 2D array format
  const values = rows.map(row => Object.values(row));
  
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A${startRow}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values }
  });
}

export async function appendRows(sheetName: string, rows: Array<Record<string, any>>): Promise<void> {
  const sheets = sheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID!;
  
  // Convert rows to 2D array format
  const values = rows.map(row => Object.values(row));
  
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetName}!A:A`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values }
  });
}

export async function updateRow(sheetName: string, rowNumber: number, values: Record<string, any>): Promise<void> {
  const sheets = sheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID!;
  
  // Convert to 2D array format
  const valueArray = [Object.values(values)];
  
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A${rowNumber}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: valueArray }
  });
}

export async function deleteRow(sheetName: string, rowNumber: number): Promise<void> {
  const sheets = sheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID!;
  
  // First, get the sheet ID
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const sheet = spreadsheet.data.sheets?.find(s => s.properties?.title === sheetName);
  const sheetId = sheet?.properties?.sheetId;
  
  if (!sheetId) throw new Error(`Sheet ${sheetName} not found`);
  
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: rowNumber - 1, // Convert to 0-indexed
              endIndex: rowNumber // Delete just one row
            }
          }
        }
      ]
    }
  });
}
