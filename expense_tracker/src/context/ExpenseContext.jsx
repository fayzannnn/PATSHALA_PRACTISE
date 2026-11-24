import { createContext, useContext, useEffect, useReducer } from "react";

const ExpenseContext = createContext(null);
const TOKEN_KEY = "expense-tracker-token";

const initialState = { budget: 0, expenses: [], user: null, loading: true };

function reducer(state, action) {
  switch (action.type) {
    case "load":
      return { ...state, budget: action.payload.budget, expenses: action.payload.expenses, loading: false };
    case "auth":
      return { ...state, user: action.payload.user, loading: false };
    case "logout":
      return { ...initialState, loading: false };
    case "set_budget":
      return { ...state, budget: action.payload };
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
    if (!response.ok) throw new Error(data.message || "Something went wrong");
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

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    dispatchState({ type: "logout" });
  }

  async function dispatch(action) {
    if (action.type === "set_budget") {
      const data = await api("/api/budget", { method: "PUT", body: JSON.stringify({ amount: action.payload }) });
      dispatchState({ type: "set_budget", payload: data.budget });
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

  const totalSpent = state.expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const remaining = Number(state.budget) - totalSpent;

  return (
    <ExpenseContext.Provider value={{ ...state, totalSpent, remaining, dispatch, authenticate, logout }}>
      {children}
    </ExpenseContext.Provider>
  );
}

export function useExpenses() {
  const context = useContext(ExpenseContext);
  if (!context) throw new Error("useExpenses must be used inside ExpenseProvider");
  return context;
}
