import "dotenv/config";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { MongoClient, ObjectId } from "mongodb";
import path from "path";
import process from "node:process";
import { createHash, randomBytes } from "crypto";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";

const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || "development";
const JWT_SECRET = process.env.JWT_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL || (NODE_ENV === "production" ? "" : "http://127.0.0.1:5173");
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || "expense_tracker";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

if (NODE_ENV === "production" && !JWT_SECRET) {
  throw new Error("JWT_SECRET is required when NODE_ENV=production");
}
if (NODE_ENV === "production" && !FRONTEND_URL) {
  throw new Error("FRONTEND_URL is required when NODE_ENV=production");
}
if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is required. Add your MongoDB Atlas connection string to the server environment.");
}

const serverJWTSecret = JWT_SECRET || "development-expense-tracker-secret";
const mongoClient = new MongoClient(MONGODB_URI);
await mongoClient.connect();
const database = mongoClient.db(MONGODB_DB);
const users = database.collection("users");
const passwordResetTokens = database.collection("password_reset_tokens");
const expenses = database.collection("expenses");
const budgets = database.collection("budgets");
const monthlyBudgets = database.collection("monthly_budgets");

await Promise.all([
  users.createIndex({ email: 1 }, { unique: true }),
  passwordResetTokens.createIndex({ token_hash: 1 }, { unique: true }),
  passwordResetTokens.createIndex({ user_id: 1 }),
  expenses.createIndex({ user_id: 1, date: -1, _id: -1 }),
  budgets.createIndex({ user_id: 1 }, { unique: true }),
  monthlyBudgets.createIndex({ user_id: 1, month_key: 1 }, { unique: true }),
]);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

function publicUser(user) {
  return { id: user._id.toString(), name: user.name, email: user.email };
}

function publicExpense(expense) {
  return {
    id: expense._id.toString(),
    title: expense.title,
    amount: expense.amount,
    category: expense.category,
    date: expense.date,
    created_at: expense.created_at,
  };
}

function signToken(user) {
  return jwt.sign({ id: user._id.toString() }, serverJWTSecret, { expiresIn: "7d" });
}

function auth(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ message: "Authentication required" });
  try {
    const payload = jwt.verify(token, serverJWTSecret);
    if (typeof payload.id !== "string" || !ObjectId.isValid(payload.id)) {
      return res.status(401).json({ message: "Invalid or expired session" });
    }
    req.userId = new ObjectId(payload.id);
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired session" });
  }
}

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getLocalDateString(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function validMonth(month) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(month);
}

app.post("/api/auth/signup", async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    if (name.length < 2) return res.status(400).json({ message: "Please enter your name" });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: "Please enter a valid email" });
    if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });

    const existing = await users.findOne({ email }, { projection: { _id: 1 } });
    if (existing) return res.status(409).json({ message: "An account with this email already exists" });

    const user = {
      name,
      email,
      password_hash: await bcrypt.hash(password, 10),
      created_at: new Date().toISOString(),
    };
    const result = await users.insertOne(user);
    user._id = result.insertedId;
    await budgets.updateOne(
      { user_id: user._id },
      { $setOnInsert: { user_id: user._id, amount: 0, updated_at: new Date().toISOString() } },
      { upsert: true }
    );
    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "An account with this email already exists" });
    console.error("Could not create account:", error);
    res.status(500).json({ message: "Could not create account" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const user = await users.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (error) {
    console.error("Could not sign in:", error);
    res.status(500).json({ message: "Could not sign in" });
  }
});

app.post("/api/auth/forgot-password", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: "Please enter a valid email address" });
  }

  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  if (!smtpHost || !smtpUser || !smtpPass || !Number.isInteger(smtpPort)) {
    return res.status(503).json({ message: "Password reset email is not configured. Set the SMTP variables in the server environment." });
  }

  const user = await users.findOne({ email }, { projection: { _id: 1, email: 1 } });
  if (user) {
    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = Date.now() + 60 * 60 * 1000;

    await passwordResetTokens.deleteMany({ user_id: user._id });
    await passwordResetTokens.insertOne({
      user_id: user._id,
      token_hash: tokenHash,
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
    });

    const resetUrl = new URL("/", FRONTEND_URL);
    resetUrl.searchParams.set("resetToken", token);
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: process.env.SMTP_SECURE === "true" || smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });

    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || smtpUser,
        to: user.email,
        subject: "Reset your Expenso password",
        text: `Use this link to reset your password. It expires in one hour: ${resetUrl}`,
        html: `<p>We received a request to reset your Expenso password.</p><p><a href="${resetUrl}">Reset your password</a></p><p>This link expires in one hour. If you did not request this, you can ignore this email.</p>`,
      });
    } catch (error) {
      await passwordResetTokens.deleteOne({ token_hash: tokenHash });
      console.error("Could not send password reset email:", error);
      return res.status(503).json({ message: "Could not send the reset email. Please try again later." });
    }
  }

  res.json({ message: "If an account exists for this email, a password reset link will be sent." });
});

app.post("/api/auth/reset-password", async (req, res) => {
  const token = String(req.body.token || "");
  const password = String(req.body.password || "");
  if (token.length !== 64) return res.status(400).json({ message: "This password reset link is invalid or expired." });
  if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const reset = await passwordResetTokens.findOne({ token_hash: tokenHash, expires_at: { $gt: Date.now() } });
  if (!reset) return res.status(400).json({ message: "This password reset link is invalid or expired." });

  const passwordHash = await bcrypt.hash(password, 10);
  const result = await users.updateOne({ _id: reset.user_id }, { $set: { password_hash: passwordHash } });
  if (!result.matchedCount) return res.status(400).json({ message: "This password reset link is invalid or expired." });
  await passwordResetTokens.deleteMany({ user_id: reset.user_id });
  res.json({ message: "Password reset successfully. Please sign in." });
});

app.get("/api/auth/me", auth, async (req, res) => {
  const user = await users.findOne({ _id: req.userId }, { projection: { name: 1, email: 1 } });
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json({ user: publicUser(user) });
});

app.get("/api/expenses", auth, async (req, res) => {
  const expenseRows = await expenses.find({ user_id: req.userId })
    .sort({ date: -1, _id: -1 })
    .toArray();
  const [legacyBudget, budgetRows] = await Promise.all([
    budgets.findOne({ user_id: req.userId }, { projection: { amount: 1 } }),
    monthlyBudgets.find({ user_id: req.userId }).toArray(),
  ]);
  const budgetMap = Object.fromEntries(budgetRows.map((row) => [row.month_key, Number(row.amount)]));
  const month = currentMonthKey();
  const legacyAmount = Number(legacyBudget?.amount || 0);
  res.json({
    budget: budgetMap[month] ?? legacyAmount,
    budgets: budgetMap,
    expenses: expenseRows.map(publicExpense),
  });
});

app.put("/api/budget", auth, async (req, res) => {
  const amount = Number(req.body.amount);
  const month = String(req.body.month || currentMonthKey());
  if (!Number.isFinite(amount) || amount < 0) return res.status(400).json({ message: "Budget must be zero or a positive amount" });
  if (!validMonth(month)) return res.status(400).json({ message: "Budget month must use YYYY-MM format" });

  const updatedAt = new Date().toISOString();
  await monthlyBudgets.updateOne(
    { user_id: req.userId, month_key: month },
    { $set: { amount, updated_at: updatedAt }, $setOnInsert: { user_id: req.userId, month_key: month, created_at: updatedAt } },
    { upsert: true }
  );
  res.json({ budget: amount, month });
});

app.delete("/api/budget/:month", auth, async (req, res) => {
  const month = req.params.month;
  if (!validMonth(month)) return res.status(400).json({ message: "Budget month must use YYYY-MM format" });
  await monthlyBudgets.deleteOne({ user_id: req.userId, month_key: month });
  if (month === currentMonthKey()) {
    await budgets.updateOne(
      { user_id: req.userId },
      { $set: { amount: 0, updated_at: new Date().toISOString() } },
      { upsert: true }
    );
  }
  res.status(204).send();
});

app.post("/api/expenses", auth, async (req, res) => {
  const title = String(req.body.title || "").trim();
  const amount = Number(req.body.amount);
  const category = String(req.body.category || "").trim();
  const date = String(req.body.date || getLocalDateString());
  if (!title || !category || !Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ message: "Title, category and a positive amount are required" });
  }

  const expense = {
    user_id: req.userId,
    title,
    amount,
    category,
    date,
    created_at: new Date().toISOString(),
  };
  const result = await expenses.insertOne(expense);
  expense._id = result.insertedId;
  res.status(201).json(publicExpense(expense));
});

app.put("/api/expenses/:id", auth, async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) return res.status(404).json({ message: "Expense not found" });
  const title = String(req.body.title || "").trim();
  const amount = Number(req.body.amount);
  const category = String(req.body.category || "").trim();
  const date = String(req.body.date || getLocalDateString());
  if (!title || !category || !Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ message: "Title, category and a positive amount are required" });
  }

  const id = new ObjectId(req.params.id);
  const result = await expenses.updateOne(
    { _id: id, user_id: req.userId },
    { $set: { title, amount, category, date, updated_at: new Date().toISOString() } }
  );
  if (!result.matchedCount) return res.status(404).json({ message: "Expense not found" });
  const expense = await expenses.findOne({ _id: id, user_id: req.userId });
  res.json(publicExpense(expense));
});

app.delete("/api/expenses/:id", auth, async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) return res.status(404).json({ message: "Expense not found" });
  const result = await expenses.deleteOne({ _id: new ObjectId(req.params.id), user_id: req.userId });
  if (result.deletedCount === 0) return res.status(404).json({ message: "Expense not found" });
  res.status(204).send();
});

const distPath = path.join(__dirname, "dist");
app.use(express.static(distPath));
app.use((req, res, next) => {
  if (req.method !== "GET" || req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(distPath, "index.html"), (error) => {
    if (error) next(error);
  });
});

app.listen(PORT, "0.0.0.0", () =>
  console.log(`Expense Tracker listening on port ${PORT}`)
);
