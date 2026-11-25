import "dotenv/config";
import sqlite3 from "sqlite3";
import { MongoClient, ObjectId } from "mongodb";
import fs from "fs";
import path from "path";
import process from "node:process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlitePath = process.env.SQLITE_PATH || path.join(__dirname, "..", "data.sqlite");
const mongoUri = process.env.MONGODB_URI;
const databaseName = process.env.MONGODB_DB || "expense_tracker";

if (!mongoUri) {
  throw new Error("MONGODB_URI is required to migrate SQLite data.");
}
if (!fs.existsSync(sqlitePath)) {
  throw new Error(`SQLite database was not found at ${sqlitePath}. Set SQLITE_PATH to its location.`);
}

function openSqliteDatabase() {
  return new Promise((resolve, reject) => {
    const database = new sqlite3.Database(sqlitePath, sqlite3.OPEN_READONLY, (error) => {
      if (error) reject(error);
      else resolve(database);
    });
  });
}

function readAll(database, sql) {
  return new Promise((resolve, reject) => {
    database.all(sql, (error, rows) => error ? reject(error) : resolve(rows));
  });
}

function closeSqliteDatabase(database) {
  return new Promise((resolve, reject) => {
    database.close((error) => error ? reject(error) : resolve());
  });
}

const sqlite = await openSqliteDatabase();
const mongo = new MongoClient(mongoUri);

try {
  const [sqliteUsers, sqliteExpenses, sqliteBudgets, sqliteMonthlyBudgets, sqliteTokens] = await Promise.all([
    readAll(sqlite, "SELECT id, name, email, password_hash, created_at FROM users"),
    readAll(sqlite, "SELECT id, user_id, title, amount, category, date, created_at FROM expenses"),
    readAll(sqlite, "SELECT user_id, amount, updated_at FROM budgets"),
    readAll(sqlite, "SELECT user_id, month_key, amount, updated_at FROM monthly_budgets"),
    readAll(sqlite, "SELECT user_id, token_hash, expires_at, created_at FROM password_reset_tokens"),
  ]);

  await mongo.connect();
  const database = mongo.db(databaseName);
  const collections = ["users", "expenses", "budgets", "monthly_budgets", "password_reset_tokens"];
  const existingCounts = await Promise.all(
    collections.map(async (name) => [name, await database.collection(name).countDocuments()])
  );
  const occupied = existingCounts.filter(([, count]) => count > 0);
  if (occupied.length) {
    throw new Error(`Migration stopped to protect existing MongoDB data. Collections are not empty: ${occupied.map(([name]) => name).join(", ")}.`);
  }

  const userIds = new Map(sqliteUsers.map((user) => [user.id, new ObjectId()]));
  const session = mongo.startSession();

  try {
    await session.withTransaction(async () => {
      const users = database.collection("users");
      const expenses = database.collection("expenses");
      const budgets = database.collection("budgets");
      const monthlyBudgets = database.collection("monthly_budgets");
      const resetTokens = database.collection("password_reset_tokens");

      if (sqliteUsers.length) {
        await users.insertMany(sqliteUsers.map((user) => ({
          _id: userIds.get(user.id),
          name: user.name,
          email: user.email,
          password_hash: user.password_hash,
          created_at: user.created_at,
          legacy_sqlite_id: user.id,
        })), { session });
      }

      const mappedExpenses = sqliteExpenses.map((expense) => {
        const userId = userIds.get(expense.user_id);
        if (!userId) throw new Error(`Expense ${expense.id} references a missing SQLite user.`);
        return {
          user_id: userId,
          title: expense.title,
          amount: Number(expense.amount),
          category: expense.category,
          date: expense.date,
          created_at: expense.created_at,
          legacy_sqlite_id: expense.id,
        };
      });
      if (mappedExpenses.length) await expenses.insertMany(mappedExpenses, { session });

      const mappedBudgets = sqliteBudgets.map((budget) => {
        const userId = userIds.get(budget.user_id);
        if (!userId) throw new Error(`Budget references a missing SQLite user.`);
        return { user_id: userId, amount: Number(budget.amount), updated_at: budget.updated_at };
      });
      if (mappedBudgets.length) await budgets.insertMany(mappedBudgets, { session });

      const mappedMonthlyBudgets = sqliteMonthlyBudgets.map((budget) => {
        const userId = userIds.get(budget.user_id);
        if (!userId) throw new Error(`Monthly budget ${budget.month_key} references a missing SQLite user.`);
        return {
          user_id: userId,
          month_key: budget.month_key,
          amount: Number(budget.amount),
          updated_at: budget.updated_at,
        };
      });
      if (mappedMonthlyBudgets.length) await monthlyBudgets.insertMany(mappedMonthlyBudgets, { session });

      const mappedTokens = sqliteTokens.map((token) => {
        const userId = userIds.get(token.user_id);
        if (!userId) throw new Error("Password reset token references a missing SQLite user.");
        return {
          user_id: userId,
          token_hash: token.token_hash,
          expires_at: Number(token.expires_at),
          created_at: token.created_at,
        };
      });
      if (mappedTokens.length) await resetTokens.insertMany(mappedTokens, { session });
    });
  } finally {
    await session.endSession();
  }

  console.log("SQLite data migration completed.");
  console.log(`Users: ${sqliteUsers.length}; expenses: ${sqliteExpenses.length}; budgets: ${sqliteBudgets.length}; monthly budgets: ${sqliteMonthlyBudgets.length}; password reset tokens: ${sqliteTokens.length}.`);
} finally {
  if (mongo.close) await mongo.close();
  await closeSqliteDatabase(sqlite);
}
