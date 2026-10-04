
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const budgetRoutes = require("./routes/budgetRoutes");
const app = express();
const transactionRoutes = require("./routes/transactionRoutes");
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());
app.use("/api/auth", require("./routes/auth"));
app.use("/api/budgets", budgetRoutes);

app.use("/api/transactions", transactionRoutes);
app.get("/", (req, res) => {
  res.json({
    message: "Expense Tracker API is running!",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    database: mongoose.connection.readyState === 1
      ? "Connected"
      : "Disconnected",
  });
});

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected successfully!");

    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Startup error:", error.message);
    process.exit(1);
  }
}

startServer();
