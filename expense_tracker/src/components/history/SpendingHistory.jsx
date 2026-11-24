import { useMemo, useState } from "react";
import { useExpenses } from "../../context/ExpenseContext";
import { buildHistory, formatINR, getCurrentMonthKey } from "../../utils/historyHelpers";
import HistoryModal from "./HistoryModal";
import "./history.css";

function SpendingHistory({ onEdit }) {
  const { expenses } = useExpenses();
  const [isOpen, setIsOpen] = useState(false);
  const currentMonth = getCurrentMonthKey();
  const { months } = useMemo(() => buildHistory(expenses, currentMonth), [expenses, currentMonth]);
  const previewMonths = useMemo(() => months.slice(0, 3), [months]);

  return (
    <>
      <section className="dash-chart-panel history-preview-panel">
        <div className="history-preview-heading">
          <div>
            <p className="dash-panel-kicker">PAST SPENDING</p>
            <h2>Spending History</h2>
          </div>
          <button type="button" className="history-full-button" onClick={() => setIsOpen(true)}>
            View Full History
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
          </button>
        </div>
        {previewMonths.length ? (
          <div className="history-preview-list">
            {previewMonths.map((month) => (
              <div className="history-preview-month" key={month.key}>
                <div className="history-preview-month-name">
                  <strong>{month.label}</strong>
                  {month.isCurrent && <span className="history-current-badge">Current</span>}
                </div>
                <span>{month.transactions.length} {month.transactions.length === 1 ? "transaction" : "transactions"}</span>
                <strong className="history-preview-total">{formatINR(month.total)}</strong>
              </div>
            ))}
          </div>
        ) : (
          <p className="history-preview-empty">No history yet. Your past months will appear here.</p>
        )}
      </section>
      <HistoryModal isOpen={isOpen} onClose={() => setIsOpen(false)} onEdit={onEdit} />
    </>
  );
}

export default SpendingHistory;
