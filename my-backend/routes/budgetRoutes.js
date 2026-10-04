
const express = require("express");
const mongoose = require("mongoose");
const Budget = require("../models/Budget");

const router = express.Router();

// View budgets for a month
router.get("/", async (req, res) => {
  try {
    const month = req.query.month;

    if (!month || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      return res.status(400).json({
        message: "Provide month in YYYY-MM format.",
      });
    }

    const budgets = await Budget.find({ month }).sort({ category: 1 });
    res.json(budgets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create or update a category budget
router.post("/", async (req, res) => {
  try {
    const { category, amount, month } = req.body;

    if (!category?.trim() ||
        !/^\d{4}-(0[1-9]|1[0-2])$/.test(month || "") ||
        !Number.isFinite(Number(amount)) ||
        Number(amount) <= 0) {
      return res.status(400).json({
        message: "Valid category, positive amount, and month are required.",
      });
    }

    const budget = await Budget.findOneAndUpdate(
      { category: category.trim(), month },
      { $set: { amount: Number(amount) } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    res.status(200).json(budget);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete a budget
router.delete("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid budget ID." });
    }

    const budget = await Budget.findByIdAndDelete(req.params.id);

    if (!budget) {
      return res.status(404).json({ message: "Budget not found." });
    }

    res.json({ message: "Budget deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
