// MongoDB Configuration
// You can use either:
// 1. MongoDB Atlas (cloud) - Get free cluster from https://cloud.mongodb.com
// 2. Local MongoDB - Install from https://www.mongodb.com/try/download/community

module.exports = {
  // Option 1: MongoDB Atlas (recommended for development)
  // Replace with your MongoDB Atlas connection string
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb+srv://username:password@cluster.mongodb.net/capacity-planner',
  
  // Option 2: Local MongoDB (if you install MongoDB locally)
  // MONGODB_URI: 'mongodb://localhost:27017/capacity-planner',
  
  // Excel file path
  EXCEL_FILE_PATH: './Capacity Planner - Shared with Sanjeev.xlsx',
  
  // Sheet mapping
  SHEET_MAPPING: {
    'Job Database': 'job-database',
    'Employee Availability': 'employee-availability', 
    'Employee Skills': 'employee-skills',
    'Calendar': 'calendar',
    'Graph': 'graph',
    'Calendar Calc': 'calendar-calc',
    'Stats': 'stats',
    'Calc Data': 'calc-data'
  }
};
