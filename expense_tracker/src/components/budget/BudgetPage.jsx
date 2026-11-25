import { useMemo, useState } from "react";
import { useExpenses } from "../../context/ExpenseContext";
import { buildBudgetHistory, formatBudgetMonth, getBudgetSummary } from "../../utils/budgetHelpers";
import { getDateKey } from "../../utils/dateHelpers";
import Modal from "../Modal";
import Addbudget from "../Addbudget";
import CurrentBudgetCard from "./CurrentBudgetCard";
import BudgetSummaryStrip from "./BudgetSummaryStrip";
import BudgetHistoryList from "./BudgetHistoryList";
import BudgetTrendChart from "./BudgetTrendChart";
import "./budget.css";

function formatINR(amount) {
  return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
}

function BudgetPage({ onBack }) {
  const { budget, budgets = {}, expenses, dispatch } = useExpenses();
  const [showAddBudget, setShowAddBudget] = useState(false);
  const [editMonth, setEditMonth] = useState("");
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [deleteEntry, setDeleteEntry] = useState(null);

  const currentMonth = getDateKey(new Date()).slice(0, 7);
  const history = useMemo(
    () => buildBudgetHistory(budgets, expenses, budget),
    [budgets, expenses, budget]
  );
  const summary = useMemo(() => getBudgetSummary(history), [history]);
  const currentEntry = useMemo(
    () => history.find((entry) => entry.month === currentMonth)
      || {
        month: currentMonth,
        amount: 0,
        spent: expenses.filter((expense) => typeof expense.date === "string" && expense.date.slice(0, 7) === currentMonth)
          .reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
        remaining: 0,
        transactionCount: 0,
        topCategory: null,
      },
    [history, expenses, currentMonth]
  );

  const openEdit = (month = "") => {
    setEditMonth(month);
    setShowAddBudget(true);
  };

  const deleteBudget = async () => {
    if (!deleteEntry) return;
    await dispatch({ type: "delete_budget", payload: deleteEntry.month });
    setDeleteEntry(null);
  };

  return (
    <div className="budget-page">
      <header className="budget-page-header">
        <div>
          <button type="button" className="budget-back" onClick={onBack} aria-label="Back to overview">←</button>
          <div><p className="dash-eyebrow">FINANCE</p><h1>Budget History</h1></div>
        </div>
        <button type="button" className="budget-add-button" onClick={() => openEdit()}>
          <span>+</span> Add Budget
        </button>
      </header>
      <p className="budget-subtitle">Your monthly budgets at a glance</p>

      {history.length === 0 ? (
        <div className="budget-empty-state">
          <strong>No budget set yet</strong>
          <button type="button" onClick={() => openEdit()}>Set Budget</button>
        </div>
      ) : (
        <>
          <CurrentBudgetCard entry={currentEntry} month={currentMonth} />
          <BudgetSummaryStrip summary={summary} />
          <BudgetTrendChart history={history} />
          <BudgetHistoryList
            history={history}
            onOpen={setSelectedEntry}
            onEdit={openEdit}
            onDelete={setDeleteEntry}
          />
        </>
      )}

      <Modal isOpen={showAddBudget} onClose={() => { setShowAddBudget(false); setEditMonth(""); }}>
        <Addbudget initialMonth={editMonth} onDone={() => { setShowAddBudget(false); setEditMonth(""); }} />
      </Modal>

      <Modal isOpen={Boolean(selectedEntry)} onClose={() => setSelectedEntry(null)} className="budget-detail-backdrop">
        {selectedEntry && (
          <section className="budget-detail-modal">
            <header className="modal-header">
              <div><p>BUDGET SUMMARY</p><h2>{formatBudgetMonth(selectedEntry.month)}</h2></div>
              <button type="button" className="modal-close" onClick={() => setSelectedEntry(null)} aria-label="Close">×</button>
            </header>
            <dl>
              <div><dt>Budget</dt><dd>{formatINR(selectedEntry.amount)}</dd></div>
              <div><dt>Spent</dt><dd>{formatINR(selectedEntry.spent)}</dd></div>
              <div><dt>Remaining</dt><dd className={selectedEntry.remaining < 0 ? "negative" : ""}>{formatINR(selectedEntry.remaining)}</dd></div>
              <div><dt>Transactions</dt><dd>{selectedEntry.transactionCount}</dd></div>
              <div className="budget-detail-category"><dt>Top category</dt><dd>{selectedEntry.topCategory || "No spending"}</dd></div>
            </dl>
            <footer>
              <button type="button" onClick={() => openEdit(selectedEntry.month)}>Edit budget</button>
              <button type="button" onClick={() => setSelectedEntry(null)}>Close</button>
            </footer>
          </section>
        )}
      </Modal>

      <Modal isOpen={Boolean(deleteEntry)} onClose={() => setDeleteEntry(null)} className="budget-delete-backdrop">
        <section className="budget-delete-modal">
          <div className="budget-delete-icon">!</div>
          <h2>Delete this month’s budget?</h2>
          <p>This cannot be undone.</p>
          <div>
            <button type="button" className="budget-delete-cancel" onClick={() => setDeleteEntry(null)}>Cancel</button>
            <button type="button" className="budget-delete-confirm" onClick={deleteBudget}>Delete</button>
          </div>
        </section>
      </Modal>
    </div>
  );
}

export default BudgetPage;
