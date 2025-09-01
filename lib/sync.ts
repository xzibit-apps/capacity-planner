import { dbConnect } from './mongo';
import { readSheet, appendRows, updateRow, deleteRow } from './sheets';
import Row, { RowDoc } from '@/models/Row';
import { SHEETS } from '@/configs/sheets';

export async function pullFromSheets(sheetNames?: string[]): Promise<{ success: boolean; message: string; details?: any }> {
  try {
    await dbConnect();
    
    const sheetsToSync = sheetNames || SHEETS.map(s => s.name);
    const results: any[] = [];
    
    for (const sheetName of sheetsToSync) {
      try {
        const { columns, rows } = await readSheet(sheetName);
        
        // Upsert each row
        for (const { rowNumber, data } of rows) {
          await Row.findOneAndUpdate(
            { sheet: sheetName, rowNumber },
            { 
              sheet: sheetName, 
              rowNumber, 
              data, 
              synced: true 
            },
            { upsert: true, new: true }
          );
        }
        
        results.push({ sheet: sheetName, rowsProcessed: rows.length, success: true });
      } catch (error) {
        results.push({ sheet: sheetName, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }
    
    return {
      success: results.some(r => r.success),
      message: `Pull completed. ${results.filter(r => r.success).length}/${results.length} sheets processed successfully.`,
      details: results
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Pull failed',
      details: error
    };
  }
}

export async function pushToSheets(sheetNames?: string[]): Promise<{ success: boolean; message: string; details?: any }> {
  try {
    await dbConnect();
    
    const sheetsToSync = sheetNames || SHEETS.map(s => s.name);
    const results: any[] = [];
    
    for (const sheetName of sheetsToSync) {
      try {
        // Find rows that need to be synced
        const unsyncedRows = await Row.find({ 
          sheet: sheetName, 
          $or: [{ synced: false }, { rowNumber: { $exists: false } }] 
        }).sort({ rowNumber: 1 });
        
        let processedCount = 0;
        
        for (const row of unsyncedRows) {
          try {
            if (row.rowNumber) {
              // Update existing row
              await updateRow(sheetName, row.rowNumber, row.data);
            } else {
              // Append new row
              await appendRows(sheetName, [row.data]);
            }
            
            // Mark as synced
            row.synced = true;
            await row.save();
            processedCount++;
          } catch (error) {
            console.error(`Failed to sync row ${row._id} in sheet ${sheetName}:`, error);
          }
        }
        
        results.push({ sheet: sheetName, rowsProcessed: processedCount, success: true });
      } catch (error) {
        results.push({ sheet: sheetName, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }
    
    return {
      success: results.some(r => r.success),
      message: `Push completed. ${results.filter(r => r.success).length}/${results.length} sheets processed successfully.`,
      details: results
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Push failed',
      details: error
    };
  }
}

export async function deleteRowFromSheets(sheetName: string, rowNumber: number): Promise<void> {
  try {
    await deleteRow(sheetName, rowNumber);
    
    // Remove from MongoDB
    await Row.findOneAndDelete({ sheet: sheetName, rowNumber });
  } catch (error) {
    console.error(`Failed to delete row ${rowNumber} from sheet ${sheetName}:`, error);
    throw error;
  }
}
