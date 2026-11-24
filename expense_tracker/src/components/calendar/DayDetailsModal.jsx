import { useMemo } from "react";
import Modal from "../Modal";
import { formatDateKey } from "../../utils/dateHelpers";
import { formatINR } from "../../utils/historyHelpers";

function DayDetailsModal({ date, day, isCurrentMonth, onClose, onApply, onEdit, onDelete }) {
  const transactions = useMemo(() => [...(day?.transactions || [])]
    .sort((a, b) => Number(b.id) - Number(a.id)), [day]);

  return (
    <Modal isOpen={Boolean(date)} onClose={onClose}>
      {date && (
        <section className="calendar-day-modal">
          <header className="calendar-day-modal-heading">
            <div>
              <p className="calendar-kicker">DAILY SPENDING</p>
              <h2>{formatDateKey(date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</h2>
            </div>
            <button type="button" className="calendar-close-button" aria-label="Close day details" onClick={onClose}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
            </button>
          </header>
          <div className="calendar-day-total-card">
            <span>Total spent</span>
            <strong>{formatINR(day?.total || 0)}</strong>
            <small>{transactions.length} {transactions.length === 1 ? "transaction" : "transactions"}</small>
          </div>
          {transactions.length ? (
            <ul className="calendar-day-transactions">
              {transactions.map((expense) => (
                <li key={expense.id}>
                  <span className="calendar-transaction-category">{(expense.category || "O")[0].toUpperCase()}</span>
                  <span className="calendar-transaction-info">
                    <strong>{expense.title}</strong>
                    <small>{expense.category || "Other"}</small>
                  </span>
                  <strong className="calendar-transaction-amount">−{formatINR(expense.amount)}</strong>
                  {isCurrentMonth && (
                    <span className="calendar-transaction-actions">
                      <button type="button" aria-label={`Edit ${expense.title}`} onClick={() => onEdit(expense.id)}>
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                      </button>
                      <button type="button" aria-label={`Delete ${expense.title}`} onClick={() => onDelete(expense.id)}>
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M8 6V3h8v3M19 6l-1 15H6L5 6" /></svg>
                      </button>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="calendar-day-empty">No expenses on this day.</p>
          )}
          <footer className="calendar-day-modal-footer">
            <button type="button" className="calendar-primary-button" onClick={() => onApply(date)}>Apply to Overview</button>
          </footer>
        </section>
      )}
    </Modal>
  );
}

export default DayDetailsModal;
