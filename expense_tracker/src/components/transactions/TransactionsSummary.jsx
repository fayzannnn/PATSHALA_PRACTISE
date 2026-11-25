function formatINR(amount) {
  return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
}

function TransactionsSummary({ summary, categoryTotals }) {
  const total = categoryTotals.reduce((sum, item) => sum + item.amount, 0);

  return (
    <>
      <section className="transactions-summary-strip" aria-label="Filtered transaction summary">
        <div><span>Total spent</span><strong>{formatINR(summary.total)}</strong></div>
        <div><span>Transactions</span><strong>{summary.count}</strong></div>
        <div><span>Average</span><strong>{formatINR(summary.average)}</strong></div>
        <div><span>Highest</span><strong>{formatINR(summary.highest)}</strong></div>
      </section>

      {total > 0 && (
        <section className="transactions-category-breakdown" aria-label="Category breakdown">
          <div className="category-breakdown-bar">
            {categoryTotals.map((item) => (
              <span
                key={item.name}
                style={{ width: `${(item.amount / total) * 100}%`, background: item.color }}
                title={`${item.name}: ${formatINR(item.amount)}`}
              />
            ))}
          </div>
          <div className="category-breakdown-legend">
            {categoryTotals.map((item) => (
              <span key={item.name}><i style={{ background: item.color }} />{item.name} <b>{Math.round((item.amount / total) * 100)}%</b></span>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

export default TransactionsSummary;
