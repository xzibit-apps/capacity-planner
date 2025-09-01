import mongoose, { Schema, Document } from 'mongoose';

export interface IProject extends Document {
  id: string;
  name: string;
  truckDate: string | null;
  weeksBefore: number;
  hoursBySkill: {
    CNC: number;
    Build: number;
    Paint: number;
    AV: number;
    'Pack & Load': number;
  };
  probability?: number | null;
  onsite?: {
    hours: number;
    weeks: number;
  };
  projectType?: string | null;
  curveMode?: 'Mathematician' | 'Linear' | 'Triangular';
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>({
  id: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  truckDate: {
    type: String,
    default: null,
  },
  weeksBefore: {
    type: Number,
    default: 0,
  },
  hoursBySkill: {
    CNC: { type: Number, default: 0 },
    Build: { type: Number, default: 0 },
    Paint: { type: Number, default: 0 },
    AV: { type: Number, default: 0 },
    'Pack & Load': { type: Number, default: 0 },
  },
  probability: {
    type: Number,
    default: null,
  },
  onsite: {
    hours: { type: Number, default: 0 },
    weeks: { type: Number, default: 0 },
  },
  projectType: {
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
