import { google } from "googleapis";
import Project from "@/models/Project";
import { dbConnect } from "@/lib/mongo";
import JobType from "@/models/JobType";

export async function POST() {
  await dbConnect();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!spreadsheetId) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Spreadsheet ID not configured.",
      }),
      { status: 500 }
    );
  }

  // Construct credentials from environment variables
  const credentials = {
    type: process.env.GOOGLE_SERVICE_ACCOUNT_TYPE || "service_account",
    project_id: process.env.GOOGLE_SERVICE_ACCOUNT_PROJECT_ID || "primoaire",
    private_key_id: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_ID || "",
    private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n') || "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC+7HXbtW3WeNgw\ndXHsKYw6URNuXvPCuEGhPUOs8NlOAV9dMJWnKNSl0YoFTUm0APGpDD8gmfrO5c4M\n1y3y8DJATqb/KgbZQBCeM6E6cSLXVrIHtd64QNHteIuEmLvwI6apWwQbXIuXrDbi\nUSgfAfZolyxVbK2dp4eKJUfzQMf4vEe1Yehoaq5uYExidRulS3h6Std1Qx+Q3glz\n/PIiLWkXd9D/qDGpuEKUygWiwXWOdmyyW4RSpPfD1Ve85+M2Tt8mZ9BoNyyODlgq\nKivtbnZrI1GIl+lvXRTMvci8cLVF6PXkpcxdNIivWHAPfAHxpELABLHp5pFwNFLI\na08wQqzDAgMBAAECggEAHm615pyHx9ehVjASRaY7FOdBeqal95QZL1NYSzkPhPCR\nETCiWhpsXYtbPbcbwsEibri7WJNSuCdHQyK1efOG1FtKdoJuGbOth8S2XrNpQ1Et\nYC9BiLXEVd7mFkT7iAPsF931zKAMHClg4jg0y08rxht6qe8rHrsfzrRclfiYfMbN\nAqM+k5aw45rmKvGrqoVP0qB7q/Hkmv2f8HLsuuXYQmAziy6g9Bg6QTeaigld98BD\njS0RfJNGnG7Yjj5EDHgCf2KhiCTR62ZSqOJC3IjeJO53tdxeVfTDVReezm/P/kkl\nNxisWlytrcp9q0BsIsd6Xu1nG4c9weKCJhM9Pbv3cQKBgQDizyyELtuMU/9Hgpi1\nZVFy7UOu32ccDkQgiPuFYHr8//WbAgEdqUW8Rstw27Wq70Z2MmzRRXlHG7GSPo39\n7ek7oQz8ikLSjHnDvgUNskVM8vveeP19vsbF/aOhkXv9p5J1H04gLucP8Y+35fWp\nNTXUSpIRAn66kF28pTfmACe62QKBgQDXfvD7NBiJNbE3ks8oxoZBDa+sF281gXOy\nvbrG9+P+k4w6TX1ZUfu1wQ34Bz8XTpjbvpiPaW0PVNcRO10deU9a8sevqy9zaeno\nr6D8o1n6Yaq61OJoK1YYMkWSgwIFkgIEkUcWUxXucPo6G8yQUcHUoa3JION9nIu8\nS7M4JtIK+wKBgQDL1/Eld8ugSlnz1j8TQNU8GlwrTeOoxnWaXCLaU8UVn6PIx3tj\nQiBHv8TWUNDsqRJF5roAN5VxQEWOr6QEJY/qJKu8STMXcmN5dk2qap94MiYGY+1H\n129kwLoQ2uV6KuIpW5JmwGCw5qUJXac1hXo0qzSuDvUBDgEBK+iaUWdjuQKBgDYu\npqyilqC5LUvJz+hysgLdTBQ6+C091TdV2QZ6AYta0eE+5ot0v5MdbUO1nrlfe7OU\noos8eL1oGYMtp+XnQHqfnHGg2xdrw/JLZnDfKZp4wBKlwB9s9gKzcSa7ZeC8q2E2\nnecREOyY33GI19BZniC2Xhm5+Tj2CXRYnEE8EYfNAoGBAIgm193eBmnXBpD5olMb\nsKGj7n+0q+6GuoubKCAhkAcrcs3NFuTsLF1BMAY1uwxqq4VBcQQ9JH86QELK1OAC\nSK36kX5LAgQAqo7XBuEYKPbKmkjPJNAFPMmkxWQgRw1BY8q9klF5iwluO7vt1oNf\npHh0+GwOHQERMxBL/jv+RI4J\n-----END PRIVATE KEY-----\n",
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL || "upwork-sanjeev@primoaire.iam.gserviceaccount.com",
    client_id: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_ID || "",
    auth_uri: process.env.GOOGLE_SERVICE_ACCOUNT_AUTH_URI || "https://accounts.google.com/o/oauth2/auth",
    token_uri: process.env.GOOGLE_SERVICE_ACCOUNT_TOKEN_URI || "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: process.env.GOOGLE_SERVICE_ACCOUNT_AUTH_PROVIDER_X509_CERT_URL || "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_X509_CERT_URL || "https://www.googleapis.com/robot/v1/metadata/x509/upwork-sanjeev%40primoaire.iam.gserviceaccount.com",
    universe_domain: process.env.GOOGLE_SERVICE_ACCOUNT_UNIVERSE_DOMAIN || ""
  };

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  try {
    const sheetMeta = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    const sheetName = sheetMeta.data.sheets?.[0].properties?.title;

    if (!sheetName) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No sheets found in spreadsheet.",
        }),
        { status: 400 }
      );
    }

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: sheetName,
    });

    const rows = response.data.values || [];
    

    if (rows.length < 3) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "Not enough data in the sheet to extract job details (expected at least 3 rows).",
        }),
        { status: 400 }
      );
    }

    

    // Skip header rows (first 2 rows)
    const jobsToImport = rows.slice(2);
    let createdCount = 0;
    let updatedCount = 0;
    const errors = [];

    for (const jobData of jobsToImport) {
      try {
        const getValue = (value: string | undefined) =>
          value === undefined || value === "" ? null : value;

        // Debug: Log the raw row data to see what we're actually getting
        console.log('Raw row data:', jobData);
        console.log('Row length:', jobData.length);
        
        // Check if this is the specific row we're debugging (Job# 1009.07)
        if (jobData[0] === '1009.07') {
          console.log('=== DEBUGGING ROW 1009.07 ===');
          console.log('Column positions and values:');
          for (let i = 0; i < Math.min(jobData.length, 20); i++) {
            console.log(`Column ${i}: "${jobData[i]}"`);
          }
        }
        
        // Map columns according to the ACTUAL spreadsheet structure from API
        const jobNumber = getValue(jobData[0]);        // Column 0: Job#
        const jobName = getValue(jobData[1]);          // Column 1: Job Name
        const jobType = getValue(jobData[2]);          // Column 2: MUST FILL Job Type
        const truckLoadDate = getValue(jobData[3]);    // Column 3: MUST FILL Truck Load Date
        const weeksToBuild = getValue(jobData[4]);     // Column 4: Weeks to Build in Wkshop
        const status = getValue(jobData[5]);           // Column 5: Status
        const probability = getValue(jobData[6]);      // Column 6: Probability
        
        // Individual skill columns from the sheet
        const cnc = getValue(jobData[7]);              // Column 7: CNC
        const build = getValue(jobData[8]);            // Column 8: Build
        const paint = getValue(jobData[9]);            // Column 9: Paint
        const av = getValue(jobData[10]);              // Column 10: AV
        const packAndLoad = getValue(jobData[11]);     // Column 11: Pack & Load
        const tradeOnsite = getValue(jobData[12]);     // Column 12: Trade Onsite
        const onsiteWeeks = getValue(jobData[13]);     // Column 13: Onsite Weeks (WHOLE NUMBERS)
        const installDeadline = getValue(jobData[14]); // Column 14: Install Deadline
        const hrsEstOnly = getValue(jobData[15]);      // Column 15: Hrs est. only?
        const pm = getValue(jobData[16]);              // Column 16: PM
        const notes = getValue(jobData[17]);           // Column 17: Notes
        
        // Additional debugging for the specific row
        if (jobData[0] === '1009.07') {
          console.log('=== COLUMN MAPPING DEBUG ===');
          console.log('cnc:', cnc, 'from position 7:', jobData[7]);
          console.log('build:', build, 'from position 8:', jobData[8]);
          console.log('paint:', paint, 'from position 9:', jobData[9]);
          console.log('av:', av, 'from position 10:', jobData[10]);
          console.log('packAndLoad:', packAndLoad, 'from position 11:', jobData[11]);
          console.log('tradeOnsite:', tradeOnsite, 'from position 12:', jobData[12]);
          console.log('onsiteWeeks:', onsiteWeeks, 'from position 13:', jobData[13]);
          console.log('pm:', pm, 'from position 16:', jobData[16]);
          console.log('notes:', notes, 'from position 17:', jobData[17]);
        }
        
        // Debug: Log the extracted values
        console.log('Extracted values:', {
          jobNumber, jobName, jobType, truckLoadDate, weeksToBuild, status, probability,
          cnc, build, paint, av, packAndLoad, tradeOnsite, onsiteWeeks, installDeadline, hrsEstOnly, pm, notes
        });

        if (!jobNumber || !jobName) {
          console.log("Skipping empty row (Job# or Job Name is missing):", jobData);
          continue;
        }

        // Handle job type - get existing or create new
        let jobTypeId = null;
        if (jobType) {
          let existingJobType = await JobType.findOne({ 
            name: { $regex: new RegExp(`^${jobType}$`, 'i') } 
          });
          
          if (!existingJobType) {
            // Create new job type
            const newJobType = new JobType({
              name: jobType,
              description: `Auto-created from Google Sheets sync`,
              isActive: true
            });
            existingJobType = await newJobType.save();
            console.log(`Created new job type: ${jobType}`);
          }
          jobTypeId = existingJobType._id;
        }

        // Check if project already exists - improved duplicate detection
        let existingProject = null;
        
        // First try to find by jobName + truckLoadDate (most specific)
        if (truckLoadDate) {
          existingProject = await Project.findOne({
            jobName: jobName,
            truckLoadDate: truckLoadDate
          });
        }
        
        // If not found and no truck date, try to find by jobName only (for projects without dates)
        if (!existingProject && !truckLoadDate) {
          existingProject = await Project.findOne({
            jobName: jobName
          });
        }
        
        // Additional check: if still not found, try by jobNumber (should be unique)
        if (!existingProject) {
          existingProject = await Project.findOne({
            jobNumber: jobNumber
          });
        }

                // Prepare project data with CORRECT field mapping based on actual sheet structure
        const projectData = {
          jobNumber: jobNumber, // Column 0: Job#
          jobName: jobName, // Column 1: Job Name
          jobType: jobTypeId, // Column 2: MUST FILL Job Type
          truckLoadDate: truckLoadDate, // Column 3: MUST FILL Truck Load Date
          weeksToBuild: Number(weeksToBuild) || 0, // Column 4: Weeks to Build in Wkshop
          status: status || null, // Column 5: Status field
          probability: probability ? Number(String(probability).replace('%', '')) / 100 : null, // Column 6: Probability
          // Individual skill columns
          cnc: Number(cnc) || 0, // Column 7: CNC
          build: Number(build) || 0, // Column 8: Build
          paint: Number(paint) || 0, // Column 9: Paint
          av: Number(av) || 0, // Column 10: AV
          packAndLoad: Number(packAndLoad) || 0, // Column 11: Pack & Load
          tradeOnsite: Number(tradeOnsite) || 0, // Column 12: Trade Onsite
          onsiteWeeks: Number(onsiteWeeks) || 0, // Column 13: Onsite Weeks
          installDeadline: installDeadline, // Column 14: Install Deadline
          hrsEstOnly: hrsEstOnly === 'TRUE' || hrsEstOnly === 'true' || hrsEstOnly === '1', // Column 15: Hrs est. only?
          pm: pm, // Column 16: PM
          notes: notes, // Column 17: Notes
          curveMode: 'Mathematician' as const, // Default curve mode
        };

        if (existingProject) {
          // Update existing project
          await Project.findByIdAndUpdate(existingProject._id, projectData, { new: true });
          updatedCount++;
          console.log(`Updated existing project: ${jobName} (${truckLoadDate}) - Found by: ${existingProject.jobNumber ? 'jobNumber' : existingProject.truckLoadDate ? 'jobName+truckDate' : 'jobName'}`);
        } else {
          // Create new project
          const newProject = new Project(projectData);
          await newProject.save();
          createdCount++;
          console.log(`Created new project: ${jobName} (${truckLoadDate}) - No existing project found`);
        }
      } catch (error: any) {
        console.error(`Error processing row:`, jobData, error);
        errors.push({
          row: jobData,
          error: error.message
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sync completed successfully. ${createdCount} project(s) created, ${updatedCount} project(s) updated.`,
        created: createdCount,
        updated: updatedCount,
        errors: errors.length > 0 ? errors : undefined,
        totalProcessed: jobsToImport.length
      }),
      { status: 200 }
    );
  } catch (err: any) {
    console.error("The API returned an error:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || "An unknown error occurred.",
      }),
      { status: 500 }
    );
  }
}
