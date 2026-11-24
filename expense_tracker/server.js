import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import sqlite3 from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "development-expense-tracker-secret-change-in-production";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const db = new sqlite3.Database(path.join(__dirname, "data.sqlite"));
const run = (sql, params = []) => new Promise((resolve, reject) =>
  db.run(sql, params, function (error) { error ? reject(error) : resolve({ lastID: this.lastID, changes: this.changes }); })
);
const get = (sql, params = []) => new Promise((resolve, reject) =>
  db.get(sql, params, (error, row) => error ? reject(error) : resolve(row))
);
const all = (sql, params = []) => new Promise((resolve, reject) =>
  db.all(sql, params, (error, rows) => error ? reject(error) : resolve(rows))
);

await run(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)`);
await run(`CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  amount REAL NOT NULL,
  category TEXT NOT NULL,
  date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
)`);
await run(`CREATE TABLE IF NOT EXISTS budgets (
  user_id INTEGER PRIMARY KEY,
  amount REAL NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
)`);

function publicUser(row) {
  return { id: row.id, name: row.name, email: row.email };
}

function signToken(user) {
  return jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "7d" });
}

function auth(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ message: "Authentication required" });
  try {
    req.userId = jwt.verify(token, JWT_SECRET).id;
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired session" });
  }
}

app.post("/api/auth/signup", async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    if (name.length < 2) return res.status(400).json({ message: "Please enter your name" });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: "Please enter a valid email" });
    if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });

    const existing = await get("SELECT id FROM users WHERE email = ?", [email]);
    if (existing) return res.status(409).json({ message: "An account with this email already exists" });

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await run("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)", [name, email, passwordHash]);
    const user = await get("SELECT id, name, email FROM users WHERE id = ?", [result.lastID]);
    await run("INSERT OR IGNORE INTO budgets (user_id, amount) VALUES (?, 0)", [user.id]);
    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  } catch (error) {
    res.status(500).json({ message: "Could not create account", detail: error.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const user = await get("SELECT * FROM users WHERE email = ?", [email]);
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (error) {
    res.status(500).json({ message: "Could not sign in", detail: error.message });
  }
});

app.get("/api/auth/me", auth, async (req, res) => {
  const user = await get("SELECT id, name, email FROM users WHERE id = ?", [req.userId]);
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json({ user: publicUser(user) });
});

app.get("/api/expenses", auth, async (req, res) => {
  const expenses = await all(
    "SELECT id, title, amount, category, date FROM expenses WHERE user_id = ? ORDER BY date DESC, id DESC",
    [req.userId]
  );
  const budgetRow = await get("SELECT amount FROM budgets WHERE user_id = ?", [req.userId]);
  res.json({ budget: Number(budgetRow?.amount || 0), expenses });
});

app.put("/api/budget", auth, async (req, res) => {
  const amount = Number(req.body.amount);
  if (!Number.isFinite(amount) || amount < 0) return res.status(400).json({ message: "Budget must be zero or a positive amount" });
  await run(
    `INSERT INTO budgets (user_id, amount, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(user_id) DO UPDATE SET amount = excluded.amount, updated_at = CURRENT_TIMESTAMP`,
    [req.userId, amount]
  );
  res.json({ budget: amount });
});

app.post("/api/expenses", auth, async (req, res) => {
  const title = String(req.body.title || "").trim();
  const amount = Number(req.body.amount);
  const category = String(req.body.category || "").trim();
  const date = String(req.body.date || new Date().toISOString().slice(0, 10));
  if (!title || !category || !Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ message: "Title, category and a positive amount are required" });
  }
  const result = await run(
    "INSERT INTO expenses (user_id, title, amount, category, date) VALUES (?, ?, ?, ?, ?)",
    [req.userId, title, amount, category, date]
  );
  const expense = await get("SELECT id, title, amount, category, date FROM expenses WHERE id = ? AND user_id = ?", [result.lastID, req.userId]);
  res.status(201).json(expense);
});

app.put("/api/expenses/:id", auth, async (req, res) => {
  const title = String(req.body.title || "").trim();
  const amount = Number(req.body.amount);
  const category = String(req.body.category || "").trim();
  const date = String(req.body.date || new Date().toISOString().slice(0, 10));
  if (!title || !category || !Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ message: "Title, category and a positive amount are required" });
  }
  await run(
    "UPDATE expenses SET title = ?, amount = ?, category = ?, date = ? WHERE id = ? AND user_id = ?",
    [title, amount, category, date, req.params.id, req.userId]
  );
  const expense = await get("SELECT id, title, amount, category, date FROM expenses WHERE id = ? AND user_id = ?", [req.params.id, req.userId]);
  if (!expense) return res.status(404).json({ message: "Expense not found" });
  res.json(expense);
});

app.delete("/api/expenses/:id", auth, async (req, res) => {
  const result = await run("DELETE FROM expenses WHERE id = ? AND user_id = ?", [req.params.id, req.userId]);
  if (result.changes === 0) return res.status(404).json({ message: "Expense not found" });
  res.status(204).send();
});

app.listen(PORT, "127.0.0.1", () =>
  console.log(`Expense Tracker API listening on http://127.0.0.1:${PORT}`)
);
