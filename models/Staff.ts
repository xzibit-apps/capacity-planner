import mongoose, { Schema, Document } from 'mongoose';

export interface IStaff extends Document {
  id: string;
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
    start: string;
    end: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const StaffSchema = new Schema<IStaff>({
  id: {
    type: String,
    required: true,
    unique: true,
  },
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
    start: { type: String, required: true },
    end: { type: String, required: true },
  }],
}, {
  timestamps: true,
});

export default mongoose.models.Staff || mongoose.model<IStaff>('Staff', StaffSchema);
