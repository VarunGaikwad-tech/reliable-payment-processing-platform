//Responsible for creating/configuring the Express application.
const express = require("express");
const errorHandler = require("./middleware/errorHandler");
const notFound = require("./middleware/notFound");
const requestId = require("./middleware/requestId");
const authRoutes = require("./routes/authRoutes");
const accountRoutes = require("./routes/accountRoutes");
const transactionRoutes = require("./routes/transactionRoutes");

const app = express();

app.use(requestId);
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Payment Processing System API",
  });
});
app.use("/api/auth", authRoutes);

app.use("/api/accounts", accountRoutes);

app.use("/api/transactions", transactionRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
