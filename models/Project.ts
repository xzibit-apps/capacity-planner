import mongoose, { Schema, Document } from 'mongoose';

export interface IProject extends Document {
  jobNumber: string; // Column 0: Job#
  jobName: string; // Column 1: Job Name
  jobType?: mongoose.Types.ObjectId; // Column 2: MUST FILL Job Type
  truckLoadDate: string | null; // Column 3: MUST FILL Truck Load Date
  weeksToBuild: number; // Column 4: Weeks to Build in Wkshop
  status?: string | null; // Column 5: Status
  probability?: number | null; // Column 6: Probability
  // Individual skill columns from the sheet
  cnc: number; // Column 7: CNC
  build: number; // Column 8: Build
  paint: number; // Column 9: Paint
  av: number; // Column 10: AV
  packAndLoad: number; // Column 11: Pack & Load
  tradeOnsite: number; // Column 12: Trade Onsite
  onsiteWeeks: number; // Column 13: Onsite Weeks (WHOLE NUMBERS)
  installDeadline?: string | null; // Column 14: Install Deadline
  hrsEstOnly?: boolean; // Column 15: Hrs est. only?
  pm?: string | null; // Column 16: PM
  notes?: string | null; // Column 17: Notes
  curveMode?: 'Mathematician' | 'Linear' | 'Triangular';
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>({
  jobNumber: {
    type: String,
    required: true,
  },
  jobName: {
    type: String,
    required: true,
  },
  jobType: {
    type: Schema.Types.ObjectId,
    ref: 'JobType',
    default: null,
  },
  truckLoadDate: {
    type: String,
    default: null,
  },
  weeksToBuild: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    default: null,
  },
  probability: {
    type: Number,
    default: null,
  },
  // Individual skill columns from the sheet
  cnc: {
    type: Number,
    default: 0,
  },
  build: {
    type: Number,
    default: 0,
  },
  paint: {
    type: Number,
    default: 0,
  },
  av: {
    type: Number,
    default: 0,
  },
  packAndLoad: {
    type: Number,
    default: 0,
  },
  tradeOnsite: {
    type: Number,
    default: 0,
  },
  onsiteWeeks: {
    type: Number,
    default: 0,
  },
  installDeadline: {
    type: String,
    default: null,
  },
  hrsEstOnly: {
    type: Boolean,
    default: false,
  },
  pm: {
    type: String,
    default: null,
  },
  notes: {
    type: String,
    default: null,
  },
  curveMode: {
    type: String,
    enum: ['Mathematician', 'Linear', 'Triangular'],
    default: 'Mathematician',
  },
}, {
  timestamps: true,
});

export default mongoose.models.Project || mongoose.model<IProject>('Project', ProjectSchema);
