import { formatINR } from "../../utils/historyHelpers";
import "./history.css";

function MonthSummary({ month, previousMonth, budget }) {
  const total = month?.total || 0;
  const previousTotal = previousMonth?.total;
  const hasPrevious = previousTotal !== undefined;
  const difference = hasPrevious ? total - previousTotal : 0;
  const changePercent = hasPrevious && previousTotal > 0
    ? Math.round((difference / previousTotal) * 100)
    : total > 0 && hasPrevious ? 100 : 0;
  const budgetAmount = Number(budget) || 0;
  const budgetPercent = budgetAmount > 0 ? (total / budgetAmount) * 100 : 0;
  const topCategory = month?.categories[0];
  const biggestExpense = month?.biggestExpense;
  const changeClass = difference > 0 ? "increase" : difference < 0 ? "decrease" : "neutral";

  return (
    <section className="history-summary-grid" aria-label="Monthly summary">
      <article className="history-summary-card history-summary-total">
        <span className="history-summary-label">Total spent</span>
        <strong className="history-summary-value">{formatINR(total)}</strong>
        {hasPrevious ? (
          <span className={`history-change ${changeClass}`}>
            {previousTotal === 0 && total > 0
              ? "↑ New spending vs previous month"
              : `${difference > 0 ? "↑" : difference < 0 ? "↓" : "→"} ${changePercent}% vs previous month`}
          </span>
        ) : (
          <span className="history-change neutral">No earlier data</span>
        )}
      </article>
      <article className="history-summary-card">
        <span className="history-summary-label">Budget vs spent</span>
        {budgetAmount > 0 ? (
          <>
            <strong className="history-summary-value">{formatINR(total)} <small>of {formatINR(budgetAmount)}</small></strong>
            <div className={`history-budget-track${total > budgetAmount ? " over" : ""}`}>
              <span style={{ width: `${Math.min(budgetPercent, 100)}%` }} />
            </div>
            <span className="history-summary-detail">
              {total > budgetAmount ? `${formatINR(total - budgetAmount)} over budget` : `${Math.round(budgetPercent)}% used`}
            </span>
          </>
        ) : (
          <strong className="history-summary-value history-summary-muted">No budget set</strong>
        )}
      </article>
      <article className="history-summary-card">
        <span className="history-summary-label">Transactions</span>
        <strong className="history-summary-value">{month?.transactions.length || 0}</strong>
        <span className="history-summary-detail">in {month?.label || "this month"}</span>
      </article>
      <article className="history-summary-card">
        <span className="history-summary-label">Average per day</span>
        <strong className="history-summary-value">{formatINR(month?.averagePerDay || 0)}</strong>
        <span className="history-summary-detail">across calendar days</span>
      </article>
      <article className="history-summary-card">
        <span className="history-summary-label">Highest category</span>
        <strong className="history-summary-value">{topCategory?.name || "—"}</strong>
        <span className="history-summary-detail">{topCategory ? formatINR(topCategory.amount) : "No category spending"}</span>
      </article>
      <article className="history-summary-card">
        <span className="history-summary-label">Biggest expense</span>
        <strong className="history-summary-value history-summary-truncate" title={biggestExpense?.title || ""}>
          {biggestExpense?.title || "—"}
        </strong>
        <span className="history-summary-detail">{biggestExpense ? formatINR(biggestExpense.amount) : "No expenses"}</span>
      </article>
    </section>
  );
}

export default MonthSummary;
