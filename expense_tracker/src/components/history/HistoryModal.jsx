import { useMemo, useState } from "react";
import { useExpenses } from "../../context/ExpenseContext";
import {
  buildHistory,
  formatExpenseDate,
  formatINR,
  getCurrentMonthKey,
  getDefaultHistoryMonth,
  getPreviousMonthKey,
} from "../../utils/historyHelpers";
import Modal from "../Modal";
import CategoryBreakdown from "./CategoryBreakdown";
import CompareMonths from "./CompareMonths";
import MonthSelector from "./MonthSelector";
import MonthSummary from "./MonthSummary";
import MonthlyTrendChart from "./MonthlyTrendChart";
import "./history.css";

function HistoryModal({ isOpen, onClose, onEdit }) {
  const { expenses, budget, budgets = {}, dispatch } = useExpenses();
  const currentMonth = getCurrentMonthKey();
  const { groups, months } = useMemo(() => buildHistory(expenses, currentMonth), [expenses, currentMonth]);
  const defaultMonth = useMemo(() => getDefaultHistoryMonth(months, currentMonth), [months, currentMonth]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [search, setSearch] = useState("");
  const displayedMonth = groups.has(selectedMonth) ? selectedMonth : defaultMonth;
  const month = groups.get(displayedMonth);
  const previousMonth = month ? groups.get(getPreviousMonthKey(month.key)) : null;
  const selectedBudget = budgets[displayedMonth]
    ?? (displayedMonth === currentMonth ? budget : undefined);

  const handleMonthChange = (nextMonth) => {
    setSelectedMonth(nextMonth);
    setCategoryFilter("all");
    setSearch("");
  };

  const categories = useMemo(() => [...new Set((month?.transactions || []).map((expense) => expense.category || "Other"))].sort(),
    [month]);
  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return [...(month?.transactions || [])]
      .filter((expense) => categoryFilter === "all" || (expense.category || "Other") === categoryFilter)
      .filter((expense) => !query || [expense.title, expense.category, expense.date]
        .some((value) => String(value || "").toLocaleLowerCase().includes(query)))
      .sort((a, b) => b.date.localeCompare(a.date) || Number(b.id) - Number(a.id));
  }, [month, categoryFilter, search]);

  const exportCSV = () => {
    if (!month) return;
    const escapeCell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const rows = [
      ["Title", "Category", "Date", "Amount"],
      ...month.transactions.map((expense) => [expense.title, expense.category, expense.date, Number(expense.amount) || 0]),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map(escapeCell).join(",")).join("\r\n")}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `spending-history-${displayedMonth}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="history-modal-backdrop">
      <section className="history-modal" aria-label="Spending history">
        <header className="history-modal-header">
          <div>
            <p className="history-kicker">YOUR FINANCES</p>
            <h2>Spending history</h2>
          </div>
          <button type="button" className="history-close-button" onClick={onClose} aria-label="Close spending history">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
          </button>
        </header>

        {months.length === 0 ? (
          <div className="history-empty-state">
            <span className="history-empty-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M4 19V5m0 14h16M8 15v-4m4 4V7m4 8v-6" /></svg>
            </span>
            <h3>No history yet</h3>
            <p>Your past months will appear here.</p>
          </div>
        ) : (
          <>
            <div className="history-modal-toolbar">
              <MonthSelector months={months} selectedMonth={displayedMonth} onChange={handleMonthChange} />
              <button type="button" className="history-secondary-button" onClick={exportCSV}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 17v4h14v-4" /></svg>
                Export CSV
              </button>
            </div>
            <div className="history-modal-scroll">
              {month && (
                <div className="history-month-content" key={month.key}>
                  <MonthlyTrendChart months={months} selectedMonth={displayedMonth} onSelect={handleMonthChange} />
                  <MonthSummary month={month} previousMonth={previousMonth} budget={selectedBudget} />
                  <CategoryBreakdown month={month} previousMonth={previousMonth} />
                  <CompareMonths months={months} groups={groups} selectedMonth={displayedMonth} />
                  <section className="history-section-card history-transactions-section">
                    <div className="history-section-heading">
                      <div>
                        <p className="history-kicker">TRANSACTION DETAILS</p>
                        <h3>Transactions <span>({filteredTransactions.length})</span></h3>
                      </div>
                      {displayedMonth === currentMonth && <span className="history-readonly-note">Current month · editable</span>}
                    </div>
                    <div className="history-transaction-filters">
                      <label>
                        <span className="history-visually-hidden">Filter by category</span>
                        <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                          <option value="all">All categories</option>
                          {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                        </select>
                      </label>
                      <label className="history-search">
                        <span className="history-visually-hidden">Search transactions</span>
                        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m16 16 5 5" /></svg>
                        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search transactions" />
                      </label>
                    </div>
                    {filteredTransactions.length ? (
                      <ul className="history-transactions-list">
                        {filteredTransactions.map((expense) => (
                          <li className="history-transaction" key={expense.id}>
                            <span className="history-transaction-icon">{(expense.category || "E")[0].toUpperCase()}</span>
                            <div className="history-transaction-info">
                              <strong>{expense.title}</strong>
                              <span>{expense.category || "Other"} · {formatExpenseDate(expense.date)}</span>
                            </div>
                            <strong className="history-transaction-amount">−{formatINR(expense.amount)}</strong>
                            {displayedMonth === currentMonth && (
                              <span className="history-transaction-actions">
                                <button type="button" onClick={() => onEdit(expense.id)} aria-label={`Edit ${expense.title}`}>
                                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                                </button>
                                <button type="button" onClick={() => dispatch({ type: "delete_expense", payload: expense.id })} aria-label={`Delete ${expense.title}`}>
                                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M8 6V3h8v3M19 6l-1 15H6L5 6" /></svg>
                                </button>
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="history-empty-inline">No transactions match these filters.</p>
                    )}
                  </section>
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </Modal>
  );
}

export default HistoryModal;
