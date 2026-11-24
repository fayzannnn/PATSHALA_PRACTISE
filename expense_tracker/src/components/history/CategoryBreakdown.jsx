import { useMemo } from "react";
import { formatINR } from "../../utils/historyHelpers";
import "./history.css";

function CategoryBreakdown({ month, previousMonth }) {
  const previousCategories = useMemo(
    () => new Map((previousMonth?.categories || []).map((category) => [category.name, category.amount])),
    [previousMonth]
  );

  return (
    <section className="history-section-card">
      <div className="history-section-heading">
        <div>
          <p className="history-kicker">WHERE IT WENT</p>
          <h3>Category breakdown</h3>
        </div>
      </div>
      {!month?.categories.length ? (
        <p className="history-empty-inline">No category spending for this month.</p>
      ) : (
        <div className="history-category-list">
          {month.categories.map((category) => {
            const percentage = month.total > 0 ? (category.amount / month.total) * 100 : 0;
            const previousAmount = previousCategories.get(category.name) || 0;
            const difference = previousMonth ? category.amount - previousAmount : null;
            const changeClass = difference > 0 ? "increase" : difference < 0 ? "decrease" : "neutral";

            return (
              <div className="history-category-row" key={category.name}>
                <div className="history-category-info">
                  <strong>{category.name}</strong>
                  <span>{formatINR(category.amount)} <small>{Math.round(percentage)}%</small></span>
                </div>
                <div className="history-category-track">
                  <span style={{ width: `${percentage}%` }} />
                </div>
                <span className={`history-category-change ${changeClass}`}>
                  {difference === null
                    ? "No earlier data"
                    : `${difference > 0 ? "+" : difference < 0 ? "-" : ""}${formatINR(Math.abs(difference))}`}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default CategoryBreakdown;
