const mongoose = require('mongoose');

const RowSchema = new mongoose.Schema(
  {
    sheet: { type: String, required: true, index: true },
    rowNumber: { type: Number, index: true },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    synced: { type: Boolean, default: false },
  },
  { timestamps: true }
);

RowSchema.index({ sheet: 1, rowNumber: 1 });

module.exports = mongoose.models.Row || mongoose.model('Row', RowSchema);
