import { useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { useExpenses } from "../context/ExpenseContext";
import "./Expensechart.css";

// One color per category (keys are lowercase so "Food" and "food" both work)
const COLORS = {
  food: "#f59e0b",
  travel: "#3b82f6",
  shopping: "#ec4899",
  bills: "#8b5cf6",
  others: "#10b981",
};
const FALLBACK_COLOR = "#9ca3af";

const getColor = (name) => COLORS[name.toLowerCase()] ?? FALLBACK_COLOR;
const formatINR = (n) => `₹${Number(n).toLocaleString("en-IN")}`;

function ExpenseChart({ expenses: selectedExpenses }) {
  const { monthlyExpenses } = useExpenses();
  const expenses = selectedExpenses ?? monthlyExpenses;
  const totals = useMemo(() => expenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + Number(expense.amount || 0);
    return acc;
  }, {}), [expenses]);
  const data = useMemo(() => Object.entries(totals).map(([name, value]) => ({ name, value })), [totals]);
  const total = useMemo(() => data.reduce((sum, item) => sum + item.value, 0), [data]);

  if (expenses.length === 0) {
    return (
      <div className="chart-card">
        <h3 className="chart-title">Spending by Category</h3>
        <p className="chart-empty">Add an expense to see the chart.</p>
      </div>
    );
  }

  return (
    <div className="chart-card">
      <h3 className="chart-title">Spending by Category</h3>

      <div className="chart-body">
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius="60%"
                outerRadius="92%"
                paddingAngle={3}
                stroke="none"
              >
                {data.map((item) => (
                  <Cell key={item.name} fill={getColor(item.name)} />
                ))}
              </Pie>
              <Tooltip
                cursor={false}
                formatter={(value) => formatINR(value)}
                contentStyle={{
                  borderRadius: 10,
                  border: "1px solid var(--dash-chart-tooltip-border)",
                  background: "var(--dash-chart-tooltip-bg)",
                  color: "var(--dash-chart-tooltip-color)",
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Text in the middle of the donut */}
          <div className="chart-center">
            <span className="chart-center-label">Total Spent</span>
            <span className="chart-center-value">{formatINR(total)}</span>
          </div>
        </div>

        {/* Color key */}
        <ul className="chart-legend">
          {data.map((item) => (
            <li key={item.name} className="chart-legend-item">
              <span
                className="chart-dot"
                style={{ background: getColor(item.name) }}
              />
              <span className="chart-legend-name">{item.name}</span>
              <span className="chart-legend-amount">{formatINR(item.value)}</span>
              <span className="chart-legend-percent">
                {Math.round((item.value / total) * 100)}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default ExpenseChart;