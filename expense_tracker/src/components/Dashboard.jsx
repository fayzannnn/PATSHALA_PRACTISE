import { useEffect, useMemo, useRef, useState } from "react";
import { useExpenses } from "../context/ExpenseContext";
import ExpenseChart from "./Expensechart";
import Addbudget from "./Addbudget";
import AddExpense from "./AddExpense";
import Modal from "./Modal";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import "./Dashboard.css";

const formatINR = (n) => `₹${Number(n).toLocaleString("en-IN")}`;
const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const formatDate = (date) => date
  ? new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
  : "Date not set";

function TransactionItem({ expense, onEdit, onDelete }) {
  return (
    <li className="dash-expense" key={expense.id}>
      <span className={`dash-expense-icon category-${expense.category?.toLowerCase()}`}>{expense.category?.[0] || "E"}</span>
      <div className="dash-expense-info">
        <span className="dash-expense-title">{expense.title}</span>
        <span className="dash-expense-category">{expense.category} · {formatDate(expense.date)}</span>
      </div>
      <span className="dash-expense-amount">-{formatINR(expense.amount)}</span>
      <div className="dash-expense-actions">
        <button className="dash-small-btn" onClick={() => onEdit(expense.id)} aria-label={`Edit ${expense.title}`}><Icon name="edit" size={15}/></button>
        <button className="dash-small-btn delete" onClick={() => onDelete(expense.id)} aria-label={`Delete ${expense.title}`}><Icon name="trash" size={15}/></button>
      </div>
    </li>
  );
}

function Icon({ name, size = 20 }) {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
    wallet: <><path d="M20 7V5a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h15v12H5a3 3 0 0 1-3-3V6"/><path d="M16 13h3"/></>,
    receipt: <><path d="M6 3v18l3-2 3 2 3-2 3 2V3l-3 2-3-2-3 2-3-2Z"/><path d="M9 9h6M9 13h6"/></>,
    chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    edit: <><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></>,
    trash: <><path d="M3 6h18M8 6V3h8v3M19 6l-1 15H6L5 6M10 11v6M14 11v6"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,
    moon: <path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z"/>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function Dashboard({ onEdit, userName = "Alex" }) {
  const { budget, totalSpent, remaining, expenses, monthlyExpenses, dispatch, user, logout } = useExpenses();
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("expense-tracker-theme") === "dark");
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [showAddBudget, setShowAddBudget] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [range, setRange] = useState("week");
  const [isRangeMenuOpen, setIsRangeMenuOpen] = useState(false);
  const rangeSelectorRef = useRef(null);
  const displayName = user?.name || userName;
  const spentPercent = budget > 0 ? Math.min((totalSpent / budget) * 100, 100) : 0;

  useEffect(() => {
    const theme = darkMode ? "dark" : "light";
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("expense-tracker-theme", theme);
  }, [darkMode]);

  useEffect(() => {
    if (!isRangeMenuOpen) return undefined;

    const handleOutsideClick = (event) => {
      if (!rangeSelectorRef.current?.contains(event.target)) setIsRangeMenuOpen(false);
    };
    const handleEscape = (event) => {
      if (event.key === "Escape") setIsRangeMenuOpen(false);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isRangeMenuOpen]);

  const categoryData = ["Food", "Travel", "Shopping", "Bills", "Others"].map((name) => ({
    name,
    amount: monthlyExpenses
      .filter((expense) => expense.category === name)
      .reduce((sum, expense) => sum + Number(expense.amount), 0),
  })).filter((item) => item.amount > 0);

  const { weeklyData, monthlyData } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    const weekly = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      return {
        name: date.toLocaleDateString("en-US", { weekday: "short" }),
        date: dateKey(date),
        amount: 0,
      };
    });
    const weeklyDataByDate = new Map(weekly.map((day, index) => [day.date, index]));

    const year = today.getFullYear();
    const month = today.getMonth();
    const currentMonth = `${year}-${String(month + 1).padStart(2, "0")}`;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthly = Array.from({ length: Math.ceil(daysInMonth / 7) }, (_, index) => ({
      name: `Week ${index + 1}`,
      amount: 0,
    }));

    expenses.forEach((expense) => {
      if (typeof expense.date !== "string") return;

      const weekIndex = weeklyDataByDate.get(expense.date);
      if (weekIndex !== undefined) weekly[weekIndex].amount += Number(expense.amount || 0);

      if (expense.date.slice(0, 7) === currentMonth) {
        const dayOfMonth = Number(expense.date.slice(8, 10));
        const monthWeekIndex = Math.floor((dayOfMonth - 1) / 7);
        if (monthly[monthWeekIndex]) monthly[monthWeekIndex].amount += Number(expense.amount || 0);
      }
    });

    return { weeklyData: weekly, monthlyData: monthly };
  }, [expenses]);

  const chartData = range === "week" ? weeklyData : monthlyData;
  const hasSpending = chartData.some((day) => day.amount > 0);
  const selectedRangeLabel = range === "week" ? "This week" : "This month";

  return (
    <div className={`dash-page${darkMode ? " dark-theme" : ""}`}>
      <aside className="dash-sidebar">
        <div className="dash-brand"><span className="dash-brand-mark">E</span><span>Expenso</span></div>
        <nav className="dash-nav" aria-label="Main navigation">
          <button className="dash-nav-item active"><Icon name="grid" /><span>Overview</span></button>
          <button className="dash-nav-item" onClick={() => setShowAddExpense(true)}><Icon name="receipt" /><span>Transactions</span></button>
          <button className="dash-nav-item" onClick={() => setShowAddBudget(true)}><Icon name="wallet" /><span>Budget</span></button>
          <button className="dash-nav-item"><Icon name="chart" /><span>Analytics</span></button>
        </nav>
        <button
          className="dash-theme-toggle"
          type="button"
          role="switch"
          aria-checked={darkMode}
          aria-label={`Switch to ${darkMode ? "light" : "dark"} mode`}
          onClick={() => setDarkMode((enabled) => !enabled)}
        >
          <Icon name={darkMode ? "sun" : "moon"} size={18} />
          <span>{darkMode ? "Light mode" : "Dark mode"}</span>
          <span className="dash-theme-switch" aria-hidden="true"><span /></span>
        </button>
        <button className="dash-profile" onClick={logout} title="Sign out">
          <span className="dash-avatar">{displayName[0]?.toUpperCase()}</span>
          <span><strong>{displayName}</strong><small>Sign out</small></span>
        </button>
      </aside>

      <main className="dash-main">
        <header className="dash-topbar">
          <div>
            <p className="dash-eyebrow">OVERVIEW</p>
            <h1>Good morning, {displayName}</h1>
          </div>
          <div className="dash-top-actions">
            <label className="dash-search"><Icon name="search" size={18}/><input aria-label="Search" placeholder="Search" /></label>
            <button className="dash-icon-btn" aria-label="Notifications"><Icon name="bell" size={19}/><span /></button>
            <button className="dash-add-btn" onClick={() => setShowAddExpense(true)}><Icon name="plus" size={18}/> Add expense</button>
          </div>
        </header>

        <section className="dash-cards">
          <div className="dash-card balance-card">
            <div className="dash-card-head"><span>Available balance</span><span className="dash-card-icon"><Icon name="wallet"/></span></div>
            <p className="dash-card-value">{formatINR(remaining)}</p>
            <div className="dash-progress"><span style={{ width: `${spentPercent}%` }}/></div>
            <p className="dash-card-meta">{Math.round(spentPercent)}% of monthly budget used</p>
          </div>
          <div className="dash-card">
            <div className="dash-card-head"><span>Total spent</span><span className="dash-trend up">+8.2%</span></div>
            <p className="dash-card-value">{formatINR(totalSpent)}</p>
            <p className="dash-card-meta">{monthlyExpenses.length} transactions this month</p>
          </div>
          <div className="dash-card">
            <div className="dash-card-head"><span>Monthly budget</span><button className="dash-edit-budget" onClick={() => setShowAddBudget(true)}><Icon name="edit" size={14}/> Edit</button></div>
            <p className="dash-card-value">{formatINR(budget)}</p>
            <p className="dash-card-meta">{formatINR(Math.max(remaining, 0))} remaining</p>
          </div>
        </section>

        {remaining < 0 && (
          <p className="dash-warning">Warning: you are over budget!</p>
        )}

        <section className="dash-chart-grid">
          <div className="dash-chart-panel">
            <div className="dash-panel-head">
              <div><p className="dash-panel-kicker">SPENDING ACTIVITY</p><h2>{range === "week" ? "Weekly spending" : "Monthly spending"}</h2></div>
              <div className="dash-range-selector" ref={rangeSelectorRef}>
                <button
                  type="button"
                  className="dash-period dash-period-button"
                  aria-haspopup="menu"
                  aria-expanded={isRangeMenuOpen}
                  onClick={() => setIsRangeMenuOpen((open) => !open)}
                >
                  {selectedRangeLabel}
                  <svg viewBox="0 0 12 12" aria-hidden="true"><path d="m3 4.5 3 3 3-3" /></svg>
                </button>
                {isRangeMenuOpen && (
                  <div className="dash-range-menu" role="menu" aria-label="Spending range">
                    {[
                      { value: "week", label: "This week" },
                      { value: "month", label: "This month" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={`dash-range-option${range === option.value ? " selected" : ""}`}
                        role="menuitemradio"
                        aria-checked={range === option.value}
                        onClick={() => {
                          setRange(option.value);
                          setIsRangeMenuOpen(false);
                        }}
                      >
                        <span>{option.label}</span>
                        {range === option.value && <span className="dash-range-check" aria-hidden="true">✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="dash-area-chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart key={range} data={chartData} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="spendingFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6c63ff" stopOpacity={0.24}/>
                      <stop offset="100%" stopColor="#6c63ff" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ececf2"/>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill:"#9295a1", fontSize:12 }} dy={8}/>
                  <YAxis domain={hasSpending ? [0, "auto"] : [0, 1]} axisLine={false} tickLine={false} tick={{ fill:"#9295a1", fontSize:12 }} tickFormatter={(value) => `₹${value/1000}k`}/>
                  <Tooltip formatter={(value) => formatINR(value)} contentStyle={{ borderRadius:10, border:"1px solid #eee", boxShadow:"0 8px 24px rgba(20,20,40,.08)" }}/>
                  <Area type="monotone" dataKey="amount" stroke="#6c63ff" strokeWidth={3} fill="url(#spendingFill)" activeDot={{ r:5, fill:"#6c63ff", stroke:"#fff", strokeWidth:3 }} isAnimationActive animationDuration={650} animationEasing="ease-in-out"/>
                </AreaChart>
              </ResponsiveContainer>
              {!hasSpending && <span className="dash-chart-empty">No spending yet</span>}
            </div>
          </div>

          <ExpenseChart />
        </section>

        <section className="dash-bottom-grid">
          <div className="dash-chart-panel category-panel">
            <div className="dash-panel-head">
              <div><p className="dash-panel-kicker">BREAKDOWN</p><h2>Spending by category</h2></div>
            </div>
            <div className="dash-bar-chart">
              {categoryData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee"/>
                    <XAxis type="number" hide/>
                    <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} width={82} tick={{ fill:"#55586a", fontSize:12 }}/>
                    <Tooltip formatter={(value) => formatINR(value)} cursor={{ fill:"#f7f7fb" }}/>
                    <Bar dataKey="amount" fill="#7267ef" radius={[0,6,6,0]} barSize={14}/>
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="dash-empty">No category data yet.</p>}
            </div>
          </div>

          <div className="dash-chart-panel transactions-panel">
            <div className="dash-panel-head">
              <div><p className="dash-panel-kicker">LATEST</p><h2>Recent transactions</h2></div>
              <button className="dash-view-all" onClick={() => setShowAllTransactions(true)}>View all</button>
            </div>
            {expenses.length === 0 ? (
              <p className="dash-empty">No expenses yet.</p>
            ) : (
              <ul className="dash-list">
                {[...expenses].reverse().slice(0,5).map((expense) => (
                  <TransactionItem
                    key={expense.id}
                    expense={expense}
                    onEdit={onEdit}
                    onDelete={(id) => dispatch({ type: "delete_expense", payload: id })}
                  />
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>
      <Modal isOpen={showAddBudget} onClose={() => setShowAddBudget(false)}>
        <Addbudget onDone={() => setShowAddBudget(false)} />
      </Modal>
      <Modal isOpen={showAddExpense} onClose={() => setShowAddExpense(false)}>
        <AddExpense onDone={() => setShowAddExpense(false)} />
      </Modal>
      <Modal isOpen={showAllTransactions} onClose={() => setShowAllTransactions(false)}>
        <section className="transactions-modal">
          <header className="modal-header">
            <h2>All transactions</h2>
            <button type="button" className="modal-close" onClick={() => setShowAllTransactions(false)} aria-label="Close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M5 5l14 14M19 5L5 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </header>
          {expenses.length === 0 ? (
            <p className="dash-empty">No expenses yet.</p>
          ) : (
            <ul className="dash-list">
              {[...expenses].reverse().map((expense) => (
                <TransactionItem
                  key={expense.id}
                  expense={expense}
                  onEdit={onEdit}
                  onDelete={(id) => dispatch({ type: "delete_expense", payload: id })}
                />
              ))}
            </ul>
          )}
        </section>
      </Modal>
    </div>
  );
}

export default Dashboard;