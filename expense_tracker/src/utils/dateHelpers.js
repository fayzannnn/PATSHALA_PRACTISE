const monthFormat = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" });

export function getDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function parseDateKey(value) {
  if (typeof value !== "string") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  if (year < 1000 || year > 9999 || month < 1 || month > 12 || day < 1 || day > new Date(year, month, 0).getDate()) {
    return null;
  }
  return new Date(year, month - 1, day);
}

export function getMonthKey(year, month) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function getMonthStart(year, month) {
  return getDateKey(new Date(year, month - 1, 1));
}

export function getMonthEnd(year, month) {
  return getDateKey(new Date(year, month, 0));
}

export function formatMonth(year, month) {
  return monthFormat.format(new Date(year, month - 1, 1));
}

export function formatDateKey(dateKey, options = { day: "numeric", month: "short", year: "numeric" }) {
  const date = parseDateKey(dateKey);
  return date ? date.toLocaleDateString("en-IN", options) : "";
}

export function createMonthPeriod(year, month) {
  if (!Number.isInteger(year) || year < 1000 || year > 9999 || !Number.isInteger(month) || month < 1 || month > 12) {
    return null;
  }
  return {
    type: "month",
    month,
    year,
    startDate: getMonthStart(year, month),
    endDate: getMonthEnd(year, month),
    label: formatMonth(year, month),
  };
}

export function createDayPeriod(dateKey) {
  const date = parseDateKey(dateKey);
  if (!date) return null;
  return {
    type: "day",
    month: date.getMonth() + 1,
    year: date.getFullYear(),
    startDate: dateKey,
    endDate: dateKey,
    label: formatDateKey(dateKey),
  };
}

export function createRangePeriod(startDate, endDate, label) {
  if (!parseDateKey(startDate) || !parseDateKey(endDate) || startDate > endDate) return null;
  return {
    type: "range",
    month: null,
    year: null,
    startDate,
    endDate,
    label: label || `${formatDateKey(startDate)} – ${formatDateKey(endDate)}`,
  };
}

export function filterExpensesByPeriod(expenses, period) {
  if (!period || period.type === "all") return expenses;
  return expenses.filter((expense) => {
    if (typeof expense.date !== "string") return false;
    if (period.type === "month") return expense.date.slice(0, 7) === getMonthKey(period.year, period.month);
    if (period.type === "day") return expense.date === period.startDate;
    return expense.date >= period.startDate && expense.date <= period.endDate;
  });
}

export function groupExpensesByDay(expenses) {
  const days = new Map();
  expenses.forEach((expense) => {
    const date = expense.date;
    if (!parseDateKey(date)) return;
    const day = days.get(date) || { date, total: 0, transactions: [], categories: [] };
    day.total += Number(expense.amount) || 0;
    day.transactions.push(expense);
    if (expense.category && !day.categories.includes(expense.category)) day.categories.push(expense.category);
    days.set(date, day);
  });
  return days;
}

export function groupExpensesByMonth(expenses) {
  const months = new Map();
  expenses.forEach((expense) => {
    if (!parseDateKey(expense.date)) return;
    const key = expense.date.slice(0, 7);
    const [year, month] = key.split("-").map(Number);
    const info = months.get(key) || { key, year, month, total: 0, count: 0, transactions: [] };
    info.total += Number(expense.amount) || 0;
    info.count += 1;
    info.transactions.push(expense);
    months.set(key, info);
  });
  return months;
}

export function getBudgetForPeriod(period, budgets, legacyCurrentBudget, currentMonthKey) {
  if (!period || period.type === "all") {
    const historicalBudgets = Object.entries(budgets || {})
      .filter(([month]) => month !== currentMonthKey)
      .reduce((sum, [, amount]) => sum + (Number(amount) || 0), 0);
    return historicalBudgets + (Number(budgets?.[currentMonthKey] ?? legacyCurrentBudget) || 0);
  }

  const start = period.startDate;
  const end = period.endDate;
  if (!parseDateKey(start) || !parseDateKey(end)) return 0;
  const cursor = parseDateKey(start);
  const last = parseDateKey(end);
  let total = 0;

  while (cursor <= last) {
    const monthKey = getMonthKey(cursor.getFullYear(), cursor.getMonth() + 1);
    total += Number(budgets?.[monthKey] ?? (monthKey === currentMonthKey ? legacyCurrentBudget : 0)) || 0;
    cursor.setDate(1);
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return total;
}

export function shiftMonth(year, month, offset) {
  const date = new Date(year, month - 1 + offset, 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}
