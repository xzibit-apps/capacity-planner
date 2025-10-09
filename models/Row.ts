import mongoose, { Schema, Document } from "mongoose";

export interface RowDoc extends Document {
  sheet: string;
  rowNumber?: number;
  excelRowIndex?: number;
  data: Record<string, any>;
  synced: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RowSchema = new Schema(
  {
    sheet: { type: String, required: true, index: true },
    rowNumber: { type: Number, index: true },
    excelRowIndex: { type: Number },
    data: { type: Schema.Types.Mixed, default: {} },
    synced: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Compound index for efficient queries
RowSchema.index({ sheet: 1, rowNumber: 1 });

export default mongoose.models.Row || mongoose.model<RowDoc>("Row", RowSchema);
