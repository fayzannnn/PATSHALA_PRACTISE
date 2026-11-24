import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatINR, formatMonth } from "../../utils/historyHelpers";
import "./history.css";

function MonthlyTrendChart({ months, selectedMonth, onSelect }) {
  const data = useMemo(() => months
    .slice(0, 6)
    .reverse()
    .map((month) => ({
      monthKey: month.key,
      name: formatMonth(month.key).split(" ")[0],
      total: month.total,
    })), [months]);

  return (
    <section className="history-section-card">
      <div className="history-section-heading">
        <div>
          <p className="history-kicker">OVER TIME</p>
          <h3>Monthly spending trend</h3>
        </div>
        <span className="history-trend-hint">Select a bar to view that month</span>
      </div>
      <div className="history-trend-chart">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 12, left: -14, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--history-grid)" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#9295a1", fontSize: 11 }} dy={7} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9295a1", fontSize: 10 }} tickFormatter={(value) => `₹${value / 1000}k`} />
            <Tooltip cursor={false} formatter={(value) => formatINR(value)} contentStyle={{ borderRadius: 10, border: "1px solid var(--history-tooltip-border)", background: "var(--history-tooltip-bg)", color: "var(--history-tooltip-color)" }} />
            <Bar dataKey="total" radius={[6, 6, 0, 0]} barCategoryGap="28%" isAnimationActive animationDuration={450}>
              {data.map((item) => (
                <Cell
                  key={item.monthKey}
                  fill={item.monthKey === selectedMonth ? "#6c63ff" : "#b9b3ff"}
                  cursor="pointer"
                  onClick={() => onSelect(item.monthKey)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export default MonthlyTrendChart;
