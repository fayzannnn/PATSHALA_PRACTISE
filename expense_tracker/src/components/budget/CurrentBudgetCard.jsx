import { formatBudgetMonth } from "../../utils/budgetHelpers";

function formatINR(amount) {
  return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
}

function CurrentBudgetCard({ entry, month }) {
  const budget = entry?.amount || 0;
  const spent = entry?.spent || 0;
  const remaining = budget - spent;
  const percent = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;

  return (
    <section className="budget-current-card">
      <div className="budget-current-heading">
        <div><p>CURRENT MONTH</p><h2>{formatBudgetMonth(month)}</h2></div>
        <div className="budget-current-amount"><span>Budget</span><strong>{budget ? formatINR(budget) : "Not set"}</strong></div>
      </div>
      <div className="budget-current-stats">
        <div><span>Spent</span><strong>{formatINR(spent)}</strong></div>
        <div><span>Remaining</span><strong className={remaining < 0 ? "negative" : ""}>{formatINR(remaining)}</strong></div>
      </div>
      <div className={`budget-progress${spent > budget && budget > 0 ? " over" : ""}`}>
        <span style={{ width: `${percent}%` }} />
      </div>
      <p className="budget-progress-meta">
        {budget > 0 ? `${Math.round((spent / budget) * 100)}% used` : "No budget set for this month"}
      </p>
    </section>
  );
}

export default CurrentBudgetCard;
