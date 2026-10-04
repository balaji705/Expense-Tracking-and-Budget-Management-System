
const mongoose = require("mongoose");

const budgetSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    month: {
      type: String,
      required: true,
      match: /^\d{4}-(0[1-9]|1[0-2])$/,
    },
  },
  { timestamps: true }
);

budgetSchema.index({ month: 1, category: 1 }, { unique: true });

module.exports = mongoose.model("Budget", budgetSchema);
