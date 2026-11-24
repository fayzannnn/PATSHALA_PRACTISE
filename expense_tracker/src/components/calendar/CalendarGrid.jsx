import { useMemo } from "react";
import { getDateKey } from "../../utils/dateHelpers";
import { formatINR } from "../../utils/historyHelpers";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const CATEGORY_COLORS = {
  food: "#f59e0b",
  travel: "#3b82f6",
  shopping: "#ec4899",
  bills: "#8b5cf6",
  others: "#10b981",
};

function CalendarGrid({ year, month, days, today, selectedDate, rangeStart, rangeEnd, rangeMode, onSelectDay }) {
  const cells = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1);
    const offset = (firstDay.getDay() + 6) % 7;
    const dayCount = new Date(year, month, 0).getDate();
    const count = Math.ceil((offset + dayCount) / 7) * 7;
    return Array.from({ length: count }, (_, index) => {
      const date = new Date(year, month - 1, index - offset + 1);
      return {
        key: getDateKey(date),
        dayNumber: date.getDate(),
        inMonth: date.getMonth() === month - 1,
      };
    });
  }, [year, month]);

  const maxSpending = useMemo(
    () => Math.max(0, ...[...days.values()].map((day) => day.total)),
    [days]
  );

  return (
    <div className="calendar-grid-wrap">
      <div className="calendar-weekdays" aria-hidden="true">
        {WEEKDAYS.map((day) => <span key={day}>{day}</span>)}
      </div>
      <div className="calendar-grid">
        {cells.map((cell) => {
          const day = days.get(cell.key);
          const transactions = (day?.transactions || []).slice(0, 3);
          const isInRange = rangeStart && rangeEnd && cell.key >= rangeStart && cell.key <= rangeEnd;
          const heat = day?.total && maxSpending ? Math.min(.34, .06 + (day.total / maxSpending) * .28) : 0;
          const style = heat ? { "--calendar-heat": `rgba(108, 99, 255, ${heat})` } : undefined;

          return (
            <button
              type="button"
              key={cell.key}
              className={[
                "calendar-day-cell",
                cell.inMonth ? "" : "outside-month",
                cell.key === today ? "today" : "",
                cell.key === selectedDate ? "selected" : "",
                isInRange ? "in-range" : "",
                cell.key === rangeStart || cell.key === rangeEnd ? "range-edge" : "",
                day?.transactions.length ? "has-expenses" : "",
                rangeMode ? "range-selectable" : "",
              ].filter(Boolean).join(" ")}
              style={style}
              aria-label={`${cell.key}${day ? `, ${formatINR(day.total)}, ${day.transactions.length} transactions` : ", no expenses"}`}
              onClick={() => onSelectDay(cell.key)}
            >
              <span className="calendar-day-number">{cell.dayNumber}</span>
              {day && (
                <>
                  <span className="calendar-day-total">{formatINR(day.total)}</span>
                  {transactions.length > 0 && (
                    <span className="calendar-day-dots" aria-hidden="true">
                      {transactions.map((expense, index) => {
                        const category = (expense.category || "").toLowerCase();
                        return <i key={`${expense.id}-${index}`} style={{ backgroundColor: CATEGORY_COLORS[category] || "#8b5cf6" }} />;
                      })}
                    </span>
                  )}
                </>
              )}
              <span className="calendar-day-tooltip">
                {formatINR(day?.total || 0)} · {day?.transactions.length || 0} {(day?.transactions.length || 0) === 1 ? "transaction" : "transactions"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default CalendarGrid;
