import { formatBudgetMonth } from "../../utils/budgetHelpers";

function formatINR(amount) {
  return `₹${Math.abs(Number(amount || 0)).toLocaleString("en-IN")}`;
}

function BudgetHistoryRow({ entry, isFirst, onOpen, onEdit, onDelete }) {
  const over = entry.spent > entry.amount;
  const percent = entry.amount > 0 ? Math.min((entry.spent / entry.amount) * 100, 100) : 0;
  const change = entry.change;

  return (
    <article className="budget-history-row" onClick={() => onOpen(entry)}>
      <div className="budget-row-month">
        <span className="budget-month-icon">{entry.month.slice(5)}</span>
        <div><strong>{formatBudgetMonth(entry.month)}</strong><small>{entry.transactionCount} transaction{entry.transactionCount === 1 ? "" : "s"}</small></div>
      </div>
      <div className="budget-row-value"><span>Budget</span><strong>{formatINR(entry.amount)}</strong></div>
      <div className="budget-row-value"><span>Spent</span><strong>{formatINR(entry.spent)}</strong></div>
      <div className="budget-row-progress">
        <div className={`budget-progress small${over ? " over" : ""}`}><span style={{ width: `${percent}%` }} /></div>
        <small>{Math.round(entry.amount > 0 ? (entry.spent / entry.amount) * 100 : 0)}% used</small>
      </div>
      <span className={`budget-status${over ? " over" : " within"}`}>{over ? "Over budget" : "Within budget"}</span>
      {!isFirst && change !== null && (
        <span className={`budget-change${change >= 0 ? " positive" : " negative"}`}>
          {change >= 0 ? "+" : "-"}{formatINR(change)}
        </span>
      )}
      <div className="budget-row-actions" onClick={(event) => event.stopPropagation()}>
        <button type="button" onClick={() => onEdit(entry.month)} aria-label={`Edit ${formatBudgetMonth(entry.month)} budget`}>Edit</button>
        <button type="button" className="delete" onClick={() => onDelete(entry)} aria-label={`Delete ${formatBudgetMonth(entry.month)} budget`}>Delete</button>
      </div>
    </article>
  );
}

export default BudgetHistoryRow;
