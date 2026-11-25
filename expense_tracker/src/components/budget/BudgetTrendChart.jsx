import { formatBudgetMonth } from "../../utils/budgetHelpers";

function formatINR(amount) {
  return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
}

function BudgetTrendChart({ history }) {
  const data = [...history].reverse().slice(-6);
  const max = Math.max(...data.map((entry) => entry.amount), 1);

  return (
    <section className="budget-trend-card">
      <div className="budget-trend-heading"><div><p>MONTHLY TREND</p><h2>Budget by month</h2></div></div>
      {data.length ? (
        <div className="budget-svg-chart" role="img" aria-label="Budget by month chart">
          <svg viewBox="0 0 720 210" preserveAspectRatio="none">
            {[0, 1, 2, 3].map((line) => (
              <line key={line} x1="0" x2="720" y1={20 + line * 42} y2={20 + line * 42} stroke="var(--dash-chart-grid, #ececf2)" strokeDasharray="4 5" />
            ))}
            {data.map((entry, index) => {
              const slot = 720 / data.length;
              const width = Math.min(54, slot * 0.55);
              const height = Math.max(4, (entry.amount / max) * 150);
              const x = slot * index + (slot - width) / 2;
              const y = 170 - height;
              return (
                <g key={entry.month}>
                  <rect className="budget-chart-bar" x={x} y={y} width={width} height={height} rx="7">
                    <title>{formatBudgetMonth(entry.month)}: {formatINR(entry.amount)}</title>
                  </rect>
                  <text x={slot * index + slot / 2} y="194" textAnchor="middle" className="budget-chart-label">
                    {formatBudgetMonth(entry.month).replace(/ \d{4}$/, "")}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      ) : <p className="budget-empty-chart">No budget trend yet.</p>}
    </section>
  );
}

export default BudgetTrendChart;
