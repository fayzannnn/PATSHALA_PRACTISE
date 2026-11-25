import { getDateKey, parseDateKey } from "./dateHelpers";

export const DEFAULT_TRANSACTION_FILTERS = {
  search: "",
  date: "all",
  customStart: "",
  customEnd: "",
  categories: [],
  minAmount: "",
  maxAmount: "",
  paymentMethod: "all",
  sort: "newest",
  groupByDate: false,
  page: 1,
  pageSize: 10,
};

export function parseLocalDate(value) {
  if (typeof value !== "string") return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return parseDateKey(value);
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

export function formatTransactionDate(value) {
  const date = parseLocalDate(value);
  return date ? date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Date not set";
}

export function getDateRange(dateFilter, customStart = "", customEnd = "", today = new Date()) {
  const todayKey = getDateKey(today);
  if (dateFilter === "all") return null;
  if (dateFilter === "today") return { start: todayKey, end: todayKey };
  if (dateFilter === "week") {
    const start = new Date(today);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start: getDateKey(start), end: getDateKey(end) };
  }
  if (dateFilter === "month") {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { start: getDateKey(start), end: getDateKey(end) };
  }
  if (dateFilter === "lastMonth") {
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const end = new Date(today.getFullYear(), today.getMonth(), 0);
    return { start: getDateKey(start), end: getDateKey(end) };
  }
  if (dateFilter === "last3") {
    const start = new Date(today.getFullYear(), today.getMonth() - 2, 1);
    return { start: getDateKey(start), end: todayKey };
  }
  if (dateFilter === "year") {
    return { start: `${today.getFullYear()}-01-01`, end: `${today.getFullYear()}-12-31` };
  }
  if (dateFilter === "custom") {
    if (!customStart && !customEnd) return null;
    return { start: customStart, end: customEnd };
  }
  return null;
}

export function filterAndSortTransactions(expenses, filters = {}, today = new Date()) {
  const range = getDateRange(filters.date || "all", filters.customStart, filters.customEnd, today);
  const search = String(filters.search || "").trim().toLocaleLowerCase();
  const minAmount = filters.minAmount === "" ? null : Number(filters.minAmount);
  const maxAmount = filters.maxAmount === "" ? null : Number(filters.maxAmount);

  const filtered = expenses.filter((expense) => {
    const date = typeof expense.date === "string" ? expense.date : "";
    if (range) {
      if (range.start && date < range.start) return false;
      if (range.end && date > range.end) return false;
    }
    if (filters.categories?.length && !filters.categories.includes(expense.category)) return false;
    if (filters.paymentMethod && filters.paymentMethod !== "all") {
      if (String(expense.payment_method || expense.paymentMethod || "") !== filters.paymentMethod) return false;
    }
    const amount = Number(expense.amount || 0);
    if (minAmount !== null && Number.isFinite(minAmount) && amount < minAmount) return false;
    if (maxAmount !== null && Number.isFinite(maxAmount) && amount > maxAmount) return false;
    if (search) {
      const searchable = [
        expense.title,
        expense.category,
        expense.note,
        expense.description,
        expense.payment_method,
        expense.paymentMethod,
        expense.amount,
      ].filter((value) => value !== undefined && value !== null).join(" ").toLocaleLowerCase();
      if (!searchable.includes(search)) return false;
    }
    return true;
  });

  return [...filtered].sort((left, right) => {
    switch (filters.sort) {
      case "oldest":
        return String(left.date).localeCompare(String(right.date)) || Number(left.id) - Number(right.id);
      case "amountDesc":
        return Number(right.amount || 0) - Number(left.amount || 0) || String(right.date).localeCompare(String(left.date));
      case "amountAsc":
        return Number(left.amount || 0) - Number(right.amount || 0) || String(right.date).localeCompare(String(left.date));
      case "title":
        return String(left.title || "").localeCompare(String(right.title || ""));
      case "category":
        return String(left.category || "").localeCompare(String(right.category || ""));
      default:
        return String(right.date).localeCompare(String(left.date)) || Number(right.id) - Number(left.id);
    }
  });
}

export function groupTransactionsByDate(transactions, today = new Date()) {
  const groups = new Map();
  const todayKey = getDateKey(today);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = getDateKey(yesterday);

  transactions.forEach((expense) => {
    const key = typeof expense.date === "string" ? expense.date : "unknown";
    if (!groups.has(key)) groups.set(key, { key, label: "", total: 0, transactions: [] });
    const group = groups.get(key);
    group.total += Number(expense.amount || 0);
    group.transactions.push(expense);
  });

  return [...groups.entries()].map(([, group]) => ({
    ...group,
    label: group.key === todayKey
      ? "Today"
      : group.key === yesterdayKey
        ? "Yesterday"
        : formatTransactionDate(group.key),
  }));
}

export function getTransactionSummary(transactions) {
  const amounts = transactions.map((expense) => Number(expense.amount || 0));
  const total = amounts.reduce((sum, amount) => sum + amount, 0);
  return {
    total,
    count: transactions.length,
    average: transactions.length ? total / transactions.length : 0,
    highest: amounts.length ? Math.max(...amounts) : 0,
  };
}
