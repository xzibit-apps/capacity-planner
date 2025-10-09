import mongoose, { Schema, Document } from 'mongoose';

export interface IStaff extends Document {
  name: string;
  dailyHours: number;
  utilisation: number;
  skills: {
    CNC: boolean;
    Build: boolean;
    Paint: boolean;
    AV: boolean;
    'Pack & Load': boolean;
  };
  leave: Array<{
    date: string; // Single date instead of range
    leaveType: string; // e.g., 'Annual', 'Sick', 'Personal', 'Holiday'
    notes?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const StaffSchema = new Schema<IStaff>({
  name: {
    type: String,
    required: true,
  },
  dailyHours: {
    type: Number,
    default: 8,
  },
  utilisation: {
    type: Number,
    default: 0.85,
  },
  skills: {
    CNC: { type: Boolean, default: false },
    Build: { type: Boolean, default: false },
    Paint: { type: Boolean, default: false },
    AV: { type: Boolean, default: false },
    'Pack & Load': { type: Boolean, default: false },
  },
  leave: [{
    date: { type: String, required: true }, // Single date in YYYY-MM-DD format
    leaveType: { type: String, required: true, default: 'Annual' }, // Type of leave
    notes: { type: String }, // Optional notes
  }],
}, {
  timestamps: true,
});

export default mongoose.models.Staff || mongoose.model<IStaff>('Staff', StaffSchema);
