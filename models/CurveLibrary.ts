import mongoose, { Schema, Document } from 'mongoose';

export interface ICurveLibrary extends Document {
  name: string;
  curves: Record<string, {
    breaks: number[];
    weights: number[];
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const CurveLibrarySchema = new Schema<ICurveLibrary>({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  curves: {
    type: Schema.Types.Mixed,
    required: true,
  },
}, {
  timestamps: true,
});

export default mongoose.models.CurveLibrary || mongoose.model<ICurveLibrary>('CurveLibrary', CurveLibrarySchema);
