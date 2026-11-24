import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatINR } from "../../utils/historyHelpers";
import "./history.css";

function CompareMonths({ months, groups, selectedMonth }) {
  const monthKeys = useMemo(() => months.map((month) => month.key), [months]);
  const [isComparing, setIsComparing] = useState(false);
  const [monthASelection, setMonthASelection] = useState(() => selectedMonth || monthKeys[0] || "");
  const [monthBSelection, setMonthBSelection] = useState(() => monthKeys.find((key) => key !== selectedMonth) || "");
  const monthA = monthKeys.includes(monthASelection) ? monthASelection : selectedMonth || monthKeys[0] || "";
  const monthB = monthKeys.includes(monthBSelection) && monthBSelection !== monthA
    ? monthBSelection
    : monthKeys.find((key) => key !== monthA) || "";

  const comparison = useMemo(() => {
    const dataA = groups.get(monthA);
    const dataB = groups.get(monthB);
    if (!dataA || !dataB || monthA === monthB) return null;

    const categories = new Map();
    [...dataA.categories, ...dataB.categories].forEach((category) => {
      if (!categories.has(category.name)) categories.set(category.name, { name: category.name, amountA: 0, amountB: 0 });
    });
    dataA.categories.forEach((category) => { categories.get(category.name).amountA = category.amount; });
    dataB.categories.forEach((category) => { categories.get(category.name).amountB = category.amount; });
    const categoryData = [...categories.values()].sort((a, b) => (b.amountA + b.amountB) - (a.amountA + a.amountB));
    const largestCategoryChange = [...categoryData]
      .sort((a, b) => Math.abs(b.amountA - b.amountB) - Math.abs(a.amountA - a.amountB))[0];
    const difference = dataA.total - dataB.total;
    const summary = difference === 0
      ? `Spending was the same in ${dataA.label} and ${dataB.label}.`
      : `You spent ${formatINR(Math.abs(difference))} ${difference < 0 ? "less" : "more"} in ${dataA.label} than in ${dataB.label}${largestCategoryChange ? `, mainly on ${largestCategoryChange.name}` : ""}.`;

    return { dataA, dataB, categoryData, summary };
  }, [groups, monthA, monthB]);

  const monthOptionsA = useMemo(() => months.filter((month) => month.key !== monthB), [months, monthB]);
  const monthOptionsB = useMemo(() => months.filter((month) => month.key !== monthA), [months, monthA]);

  return (
    <section className="history-section-card history-compare-section">
      <div className="history-section-heading">
        <div>
          <p className="history-kicker">MONTH TO MONTH</p>
          <h3>Compare spending</h3>
        </div>
        <button
          type="button"
          className={`history-secondary-button${isComparing ? " active" : ""}`}
          onClick={() => setIsComparing((open) => !open)}
          disabled={months.length < 2}
          aria-expanded={isComparing}
        >
          {isComparing ? "Close comparison" : "Compare"}
        </button>
      </div>
      {months.length < 2 && <p className="history-empty-inline">Add expenses in another month to compare spending.</p>}
      {isComparing && months.length > 1 && (
        <>
          <div className="history-compare-selectors">
            <label>
              <span>Month A</span>
              <select value={monthA} onChange={(event) => setMonthASelection(event.target.value)}>
                {monthOptionsA.map((month) => <option key={month.key} value={month.key}>{month.label}</option>)}
              </select>
            </label>
            <span className="history-compare-vs">vs</span>
            <label>
              <span>Month B</span>
              <select value={monthB} onChange={(event) => setMonthBSelection(event.target.value)}>
                {monthOptionsB.map((month) => <option key={month.key} value={month.key}>{month.label}</option>)}
              </select>
            </label>
          </div>
          {comparison && (
            <>
              <div className="history-compare-metrics">
                {[
                  { label: "Total spent", valueA: comparison.dataA.total, valueB: comparison.dataB.total },
                  { label: "Transactions", valueA: comparison.dataA.transactions.length, valueB: comparison.dataB.transactions.length, format: (value) => value.toLocaleString("en-IN") },
                  { label: "Average per day", valueA: comparison.dataA.averagePerDay, valueB: comparison.dataB.averagePerDay },
                ].map((metric) => (
                  <article className="history-compare-metric" key={metric.label}>
                    <span>{metric.label}</span>
                    <div>
                      <strong><i className="history-compare-dot month-a" />{metric.format ? metric.format(metric.valueA) : formatINR(metric.valueA)}</strong>
                      <strong><i className="history-compare-dot month-b" />{metric.format ? metric.format(metric.valueB) : formatINR(metric.valueB)}</strong>
                    </div>
                  </article>
                ))}
              </div>
              <div className="history-compare-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparison.categoryData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }} barCategoryGap="18%">
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--history-grid)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#9295a1", fontSize: 10 }} dy={6} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9295a1", fontSize: 9 }} tickFormatter={(value) => `₹${value / 1000}k`} />
                    <Tooltip cursor={false} formatter={(value) => formatINR(value)} contentStyle={{ borderRadius: 10, border: "1px solid var(--history-tooltip-border)", background: "var(--history-tooltip-bg)", color: "var(--history-tooltip-color)" }} />
                    <Legend />
                    <Bar dataKey="amountA" name={comparison.dataA.label} fill="#6c63ff" radius={[5, 5, 0, 0]} isAnimationActive animationDuration={400} />
                    <Bar dataKey="amountB" name={comparison.dataB.label} fill="#36b39a" radius={[5, 5, 0, 0]} isAnimationActive animationDuration={400} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="history-category-comparison">
                <h4>Category comparison</h4>
                <div className="history-category-compare-row history-category-compare-header">
                  <span>Category</span>
                  <span>{comparison.dataA.label}</span>
                  <span>{comparison.dataB.label}</span>
                </div>
                {comparison.categoryData.map((category) => (
                  <div className="history-category-compare-row" key={category.name}>
                    <strong>{category.name}</strong>
                    <span>{formatINR(category.amountA)}</span>
                    <span>{formatINR(category.amountB)}</span>
                  </div>
                ))}
              </div>
              <p className="history-compare-summary">{comparison.summary}</p>
            </>
          )}
        </>
      )}
    </section>
  );
}

export default CompareMonths;
