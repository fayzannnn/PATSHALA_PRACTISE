import { parseDateKey } from "./dateHelpers";

export function normalizeMonthlyBudgets(budgets = {}, legacyBudget = 0) {
  const normalized = {};
  Object.entries(budgets || {}).forEach(([monthKey, value]) => {
    if (/^\d{4}-\d{2}$/.test(monthKey)) {
      normalized[monthKey] = { month: monthKey, amount: Number(value || 0) };
    }
  });
  if (!Object.keys(normalized).length && Number(legacyBudget) > 0) {
    const now = new Date();
    const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    normalized[key] = { month: key, amount: Number(legacyBudget) };
  }
  return normalized;
}

export function getMonthExpenses(expenses = [], monthKey) {
  return expenses.filter((expense) => (
    typeof expense.date === "string"
    && parseDateKey(expense.date)
    && expense.date.slice(0, 7) === monthKey
  ));
}

export function buildBudgetHistory(budgets = {}, expenses = [], legacyBudget = 0) {
  const normalized = normalizeMonthlyBudgets(budgets, legacyBudget);
  const entries = Object.values(normalized)
    .map((entry) => {
      const monthExpenses = getMonthExpenses(expenses, entry.month);
      const spent = monthExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
      const budget = Number(entry.amount || 0);
      const categoryTotals = new Map();
      monthExpenses.forEach((expense) => {
        const category = expense.category || "Others";
        categoryTotals.set(category, (categoryTotals.get(category) || 0) + Number(expense.amount || 0));
      });
      const topCategory = [...categoryTotals.entries()]
        .sort((left, right) => right[1] - left[1])[0]?.[0] || null;
      return {
        month: entry.month,
        amount: budget,
        spent,
        remaining: budget - spent,
        percent: budget > 0 ? (spent / budget) * 100 : 0,
        transactionCount: monthExpenses.length,
        topCategory,
      };
    })
    .sort((left, right) => right.month.localeCompare(left.month));

  return entries.map((entry, index) => ({
    ...entry,
    change: index < entries.length - 1
      ? entry.amount - entries[index + 1].amount
      : null,
  }));
}

export function getBudgetSummary(history = []) {
  if (!history.length) return { highest: null, lowest: null, average: 0 };
  const amounts = history.map((entry) => entry.amount);
  const highestAmount = Math.max(...amounts);
  const lowestAmount = Math.min(...amounts);
  return {
    highest: history.find((entry) => entry.amount === highestAmount) || null,
    lowest: history.find((entry) => entry.amount === lowestAmount) || null,
    average: amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length,
  };
}

export function formatBudgetMonth(monthKey) {
  const [year, month] = String(monthKey).split("-").map(Number);
  if (!year || !month) return monthKey;
  return new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}
