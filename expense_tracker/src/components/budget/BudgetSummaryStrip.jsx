function formatINR(amount) {
  return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
}

function BudgetSummaryStrip({ summary }) {
  return (
    <section className="budget-summary-strip">
      <div>
        <span>Highest budget month</span>
        <strong>{summary.highest ? formatINR(summary.highest.amount) : "—"}</strong>
        {summary.highest && <small>{summary.highest.month}</small>}
      </div>
      <div>
        <span>Lowest budget month</span>
        <strong>{summary.lowest ? formatINR(summary.lowest.amount) : "—"}</strong>
        {summary.lowest && <small>{summary.lowest.month}</small>}
      </div>
      <div>
        <span>Average monthly budget</span>
        <strong>{formatINR(summary.average)}</strong>
      </div>
    </section>
  );
}

export default BudgetSummaryStrip;
