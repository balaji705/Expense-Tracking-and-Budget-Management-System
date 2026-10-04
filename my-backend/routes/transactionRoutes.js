
const express = require("express");
const mongoose = require("mongoose");
const Transaction = require("../models/Transaction");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// Every transaction route requires login.
router.use(authMiddleware);

// Get only the logged-in user's transactions.
router.get("/", async (req, res) => {
  try {
    const transactions = await Transaction.find({
      user: req.user.userId,
    }).sort({ date: -1 });

    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add a transaction for the logged-in user.
router.post("/", async (req, res) => {
  try {
    const { title, amount, type, category, date, description } = req.body;

    if (
      !title?.trim() ||
      !category?.trim() ||
      !["income", "expense"].includes(type)
    ) {
      return res.status(400).json({
        message: "Title, category, and a valid type are required.",
      });
    }

    if (
      amount === undefined ||
      !Number.isFinite(Number(amount)) ||
      Number(amount) <= 0
    ) {
      return res.status(400).json({
        message: "Amount must be greater than zero.",
      });
    }

    const transactionData = {
      user: req.user.userId,
      title: title.trim(),
      amount: Number(amount),
      type,
      category: category.trim(),
      description: description || "",
    };

    if (date) {
      transactionData.date = date;
    }

    const transaction = await Transaction.create(transactionData);

    res.status(201).json(transaction);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update only a transaction owned by the logged-in user.
router.put("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid transaction ID.",
      });
    }

    const allowedFields = [
      "title",
      "amount",
      "type",
      "category",
      "date",
      "description",
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const transaction = await Transaction.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.user.userId,
      },
      updates,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!transaction) {
      return res.status(404).json({
        message: "Transaction not found.",
      });
    }

    res.json(transaction);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete only a transaction owned by the logged-in user.
router.delete("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid transaction ID.",
      });
    }

    const transaction = await Transaction.findOneAndDelete({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!transaction) {
      return res.status(404).json({
        message: "Transaction not found.",
      });
    }

    res.json({
      message: "Transaction deleted successfully.",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
