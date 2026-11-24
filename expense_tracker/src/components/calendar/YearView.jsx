import { useMemo } from "react";
import { getMonthKey, formatMonth } from "../../utils/dateHelpers";
import { formatINR } from "../../utils/historyHelpers";

function YearView({ year, months, selectedMonth, onSelectMonth }) {
  const monthCards = useMemo(() => Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const key = getMonthKey(year, month);
    return { key, month, label: formatMonth(year, month).split(" ")[0], total: months.get(key)?.total || 0 };
  }), [year, months]);

  return (
    <div className="calendar-year-grid">
      {monthCards.map((item) => (
        <button
          type="button"
          key={item.key}
          className={`calendar-year-month${item.key === selectedMonth ? " selected" : ""}`}
          onClick={() => onSelectMonth(item.month)}
        >
          <strong>{item.label}</strong>
          <span>{formatINR(item.total)}</span>
          {item.total > 0 && <i aria-hidden="true" />}
        </button>
      ))}
    </div>
  );
}

export default YearView;
