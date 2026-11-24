import { createContext, useContext, useEffect, useReducer, useState } from "react";

const ExpenseContext = createContext(null);
const TOKEN_KEY = "expense-tracker-token";
const PERIOD_STORAGE_KEY = "expense-tracker-period";

const initialState = { budget: 0, budgets: {}, expenses: [], user: null, loading: true };

const currentMonthKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

function formatPeriodDate(date) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function isValidDate(value) {
  if (typeof value !== "string") return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return year >= 1000 && year <= 9999 && month >= 1 && month <= 12
    && day >= 1 && day <= new Date(year, month, 0).getDate();
}

function createDefaultPeriod(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const monthKey = `${year}-${String(month).padStart(2, "0")}`;
  const endDay = new Date(year, month, 0).getDate();
  const startDate = `${monthKey}-01`;
  const endDate = `${monthKey}-${String(endDay).padStart(2, "0")}`;

  return {
    type: "month",
    month,
    year,
    startDate,
    endDate,
    label: date.toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
  };
}

function normalizePeriod(period) {
  if (!period || typeof period !== "object" || Array.isArray(period)) return null;

  if (period.type === "all") {
    return { type: "all", month: null, year: null, startDate: null, endDate: null, label: "All time" };
  }

  if (period.type === "month") {
    const month = Number(period.month);
    const year = Number(period.year);
    if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year) || year < 1000 || year > 9999) {
      return null;
    }
    const monthKey = `${year}-${String(month).padStart(2, "0")}`;
    const lastDay = new Date(year, month, 0).getDate();
    return {
      type: "month",
      month,
      year,
      startDate: `${monthKey}-01`,
      endDate: `${monthKey}-${String(lastDay).padStart(2, "0")}`,
      label: new Date(year, month - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
    };
  }

  if (period.type === "day") {
    const day = period.startDate || period.endDate;
    if (!isValidDate(day)) return null;
    const [year, month] = day.split("-").map(Number);
    return {
      type: "day",
      month,
      year,
      startDate: day,
      endDate: day,
      label: formatPeriodDate(day),
    };
  }

  if (period.type === "range") {
    const { startDate, endDate } = period;
    if (!isValidDate(startDate) || !isValidDate(endDate) || startDate > endDate) return null;
    return {
      type: "range",
      month: null,
      year: null,
      startDate,
      endDate,
      label: `${formatPeriodDate(startDate)} – ${formatPeriodDate(endDate)}`,
    };
  }

  return null;
}

function loadStoredPeriod() {
  const defaultPeriod = createDefaultPeriod();
  const storedValue = localStorage.getItem(PERIOD_STORAGE_KEY);
  if (!storedValue) return defaultPeriod;

  let savedPeriod;
  try {
    savedPeriod = JSON.parse(storedValue);
  } catch (error) {
    if (error instanceof SyntaxError) return defaultPeriod;
    throw error;
  }

  return normalizePeriod(savedPeriod) || defaultPeriod;
}

function reducer(state, action) {
  switch (action.type) {
    case "load":
      return {
        ...state,
        budget: action.payload.budget,
        budgets: action.payload.budgets || {},
        expenses: action.payload.expenses,
        loading: false,
      };
    case "auth":
      return { ...state, user: action.payload.user, loading: false };
    case "logout":
      return { ...initialState, loading: false };
    case "set_budget": {
      const month = action.payload.month || currentMonthKey();
      const amount = Number(action.payload.amount ?? action.payload.budget);
      return {
        ...state,
        budget: month === currentMonthKey() ? amount : state.budget,
        budgets: { ...state.budgets, [month]: amount },
      };
    }
    case "add_expense":
      return { ...state, expenses: [action.payload, ...state.expenses] };
    case "edit_expense":
      return { ...state, expenses: state.expenses.map((expense) => expense.id === action.payload.id ? action.payload : expense) };
    case "delete_expense":
      return { ...state, expenses: state.expenses.filter((expense) => expense.id !== action.payload) };
    default:
      return state;
  }
}

export function ExpenseProvider({ children }) {
  const [state, dispatchState] = useReducer(reducer, initialState);
  const [activePeriod, setActivePeriod] = useState(loadStoredPeriod);

  useEffect(() => {
    localStorage.setItem(PERIOD_STORAGE_KEY, JSON.stringify(activePeriod));
  }, [activePeriod]);

  function setPeriod(period) {
    const normalizedPeriod = normalizePeriod(period);
    if (!normalizedPeriod) throw new TypeError("Invalid period. Choose all, a valid month, day, or date range.");
    setActivePeriod(normalizedPeriod);
  }

  function clearPeriod() {
    setActivePeriod(createDefaultPeriod());
  }

  async function api(path, options = {}) {
    const token = localStorage.getItem(TOKEN_KEY);
    const response = await fetch(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
    if (response.status === 204) return null;
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 502 || response.status === 503 && !data.message) {
        throw new Error("Cannot reach the API server. Restart the app with `npm run dev` to start the frontend and backend.");
      }
      throw new Error(data.message || `Request failed (${response.status})`);
    }
    return data;
  }

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      dispatchState({ type: "auth", payload: { user: null } });
      return;
    }
    Promise.all([api("/api/auth/me"), api("/api/expenses")])
      .then(([me, data]) => {
        dispatchState({ type: "auth", payload: { user: me.user } });
        dispatchState({ type: "load", payload: data });
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        dispatchState({ type: "logout" });
      });
  }, []);

  async function authenticate(mode, credentials) {
    const data = await api(`/api/auth/${mode}`, {
      method: "POST",
      body: JSON.stringify(credentials),
    });
    localStorage.setItem(TOKEN_KEY, data.token);
    dispatchState({ type: "auth", payload: { user: data.user } });
    const financeData = await api("/api/expenses");
    dispatchState({ type: "load", payload: financeData });
  }

  async function requestPasswordReset(email) {
    return api("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  async function resetPassword(token, password) {
    return api("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    });
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    dispatchState({ type: "logout" });
  }

  async function dispatch(action) {
    if (action.type === "set_budget") {
      const payload = typeof action.payload === "number"
        ? { amount: action.payload, month: currentMonthKey() }
        : action.payload;
      const data = await api("/api/budget", { method: "PUT", body: JSON.stringify(payload) });
      dispatchState({ type: "set_budget", payload: { month: data.month, amount: data.budget } });
    } else if (action.type === "add_expense") {
      const expense = await api("/api/expenses", { method: "POST", body: JSON.stringify(action.payload) });
      dispatchState({ type: "add_expense", payload: expense });
    } else if (action.type === "edit_expense") {
      const expense = await api(`/api/expenses/${action.payload.id}`, { method: "PUT", body: JSON.stringify(action.payload) });
      dispatchState({ type: "edit_expense", payload: expense });
    } else if (action.type === "delete_expense") {
      await api(`/api/expenses/${action.payload}`, { method: "DELETE" });
      dispatchState({ type: "delete_expense", payload: action.payload });
    }
  }

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthlyExpenses = state.expenses.filter(
    (expense) => typeof expense.date === "string" && expense.date.slice(0, 7) === currentMonth
  );
  const totalSpent = monthlyExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const remaining = Number(state.budget) - totalSpent;

  return (
    <ExpenseContext.Provider value={{
      ...state,
      monthlyExpenses,
      totalSpent,
      remaining,
      dispatch,
      authenticate,
      requestPasswordReset,
      resetPassword,
      logout,
      activePeriod,
      setPeriod,
      clearPeriod,
    }}>
      {children}
    </ExpenseContext.Provider>
  );
}

export function useExpenses() {
  const context = useContext(ExpenseContext);
  if (!context) throw new Error("useExpenses must be used inside ExpenseProvider");
  return context;
}
