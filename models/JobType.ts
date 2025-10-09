import mongoose, { Schema, Document } from 'mongoose';

export interface IJobType extends Document {
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const JobTypeSchema = new Schema<IJobType>({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
});

export default mongoose.models.JobType || mongoose.model<IJobType>('JobType', JobTypeSchema);
