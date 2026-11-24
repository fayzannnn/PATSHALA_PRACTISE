export const formatINR = (amount) => `₹${Number(amount || 0).toLocaleString("en-IN")}`;

export function getMonthKey(date) {
  if (typeof date !== "string") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > new Date(Number(match[1]), month, 0).getDate()) return null;
  return `${match[1]}-${match[2]}`;
}

export function getCurrentMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function getPreviousMonthKey(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  const previous = new Date(year, month - 2, 1);
  return getCurrentMonthKey(previous);
}

export function formatMonth(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

export function formatExpenseDate(date) {
  if (typeof date !== "string") return "Date not set";
  const parsedDate = new Date(`${date}T00:00:00`);
  return Number.isNaN(parsedDate.getTime())
    ? "Date not set"
    : parsedDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function buildHistory(expenses, currentMonth) {
  const groups = new Map();

  expenses.forEach((expense) => {
    const key = getMonthKey(expense.date);
    if (!key) return;

    if (!groups.has(key)) {
      const [year, month] = key.split("-").map(Number);
      groups.set(key, {
        key,
        label: formatMonth(key),
        year,
        month,
        isCurrent: key === currentMonth,
        total: 0,
        transactions: [],
        categories: new Map(),
        biggestExpense: null,
        daysInMonth: new Date(year, month, 0).getDate(),
      });
    }

    const group = groups.get(key);
    const amount = Number(expense.amount) || 0;
    group.total += amount;
    group.transactions.push(expense);

    const categoryName = expense.category || "Other";
    const category = group.categories.get(categoryName) || { name: categoryName, amount: 0, count: 0 };
    category.amount += amount;
    category.count += 1;
    group.categories.set(categoryName, category);

    if (!group.biggestExpense || amount > Number(group.biggestExpense.amount)) {
      group.biggestExpense = expense;
    }
  });

  const months = [...groups.values()]
    .map((group) => ({
      ...group,
      categories: [...group.categories.values()].sort((a, b) => b.amount - a.amount),
      averagePerDay: group.total / group.daysInMonth,
    }))
    .sort((a, b) => b.key.localeCompare(a.key));

  return { groups: new Map(months.map((month) => [month.key, month])), months };
}

export function getDefaultHistoryMonth(months, currentMonth) {
  const availableMonths = new Set(months.map((month) => month.key));
  const previousMonth = getPreviousMonthKey(currentMonth);
  if (availableMonths.has(previousMonth)) return previousMonth;
  if (availableMonths.has(currentMonth)) return currentMonth;
  return months[0]?.key || "";
}
