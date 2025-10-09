import mongoose, { Schema, Document, ObjectId } from "mongoose";

export interface ISheetProject extends Document {
  jobNo?: string | null;
  jobName?: string | null;
  jobType?: ObjectId | null;
  truckLoadDate?: string | null;
  weeksToBuildInWkshop?: number | null;
  status?: string | null;
  probability?: string | null;
  cnc?: string | null;
  build?: string | null;
  paint?: string | null;
  av?: string | null;
  packAndLoad?: string | null;
  tradeOnsite?: string | null;
  onsiteWeeks?: number | null;
  installDeadline?: string | null;
  hrsEstOnly?: string | null;
  pm?: string | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const SheetProjectSchema = new Schema<ISheetProject>(
  {
    jobNo: {
      type: String,
      required: false,
      default: null,
    },
    jobName: {
      type: String,
      required: false,
      default: null,
    },
    jobType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobType",
      default: null,
    },
    truckLoadDate: {
      type: String,
      required: false,
      default: null,
    },
    weeksToBuildInWkshop: {
      type: Number,
      required: false,
      default: 0,
    },
    status: {
      type: String,
      required: false,
      default: null,
    },
    probability: {
      type: String,
      required: false,
      default: null,
    },
    cnc: {
      type: String,
      required: false,
      default: null,
    },
    build: {
      type: String,
      required: false,
      default: null,
    },
    paint: {
      type: String,
      required: false,
      default: null,
    },
    av: {
      type: String,
      required: false,
      default: null,
    },
    packAndLoad: {
      type: String,
      required: false,
      default: null,
    },
    tradeOnsite: {
      type: String,
      required: false,
      default: null,
    },
    onsiteWeeks: {
      type: Number,
      required: false,
      default: 0,
    },
    installDeadline: {
      type: String,
      required: false,
      default: null,
    },
    hrsEstOnly: {
      type: String,
      required: false,
      default: null,
    },
    pm: {
      type: String,
      required: false,
      default: null,
    },
    notes: {
      type: String,
      required: false,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.SheetProject ||
  mongoose.model<ISheetProject>("SheetProject", SheetProjectSchema);
