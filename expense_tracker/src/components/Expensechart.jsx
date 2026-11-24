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

function ExpenseChart() {
  const { expenses } = useExpenses();

  if (expenses.length === 0) {
    return (
      <div className="chart-card">
        <h3 className="chart-title">Spending by Category</h3>
        <p className="chart-empty">Add an expense to see the chart.</p>
      </div>
    );
  }

  // Add up the amounts of each category: { Food: 700, Travel: 1500, ... }
  const totals = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {});

  // Turn it into the array that Recharts needs: [{ name, value }, ...]
  const data = Object.entries(totals).map(([name, value]) => ({ name, value }));
  const total = data.reduce((sum, item) => sum + item.value, 0);

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
              <Tooltip formatter={(value) => formatINR(value)} />
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