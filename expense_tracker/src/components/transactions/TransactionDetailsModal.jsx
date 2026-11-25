import Modal from "../Modal";
import { formatTransactionDate } from "../../utils/transactionHelpers";

function formatINR(amount) {
  return `₹${Number(amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function formatTimestamp(value) {
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : String(value);
}

function TransactionDetailsModal({ expense, onClose, onEdit, onDelete, readOnly }) {
  if (!expense) return null;
  const note = expense.note || expense.description;
  const paymentMethod = expense.payment_method || expense.paymentMethod;
  const time = expense.time || expense.transaction_time;

  return (
    <Modal isOpen={Boolean(expense)} onClose={onClose} className="transaction-detail-backdrop">
      <section className="transaction-details-modal">
        <header className="modal-header">
          <div><p>TRANSACTION DETAILS</p><h2>{expense.title}</h2></div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </header>
        <div className="transaction-detail-amount"><span>Amount</span><strong>-{formatINR(expense.amount)}</strong></div>
        <dl className="transaction-detail-grid">
          <div><dt>Title</dt><dd>{expense.title}</dd></div>
          <div><dt>Category</dt><dd>{expense.category || "Others"}</dd></div>
          <div><dt>Date</dt><dd>{formatTransactionDate(expense.date)}</dd></div>
          {time && <div><dt>Time</dt><dd>{time}</dd></div>}
          {note && <div className="full"><dt>Note</dt><dd>{note}</dd></div>}
          {paymentMethod && <div><dt>Payment method</dt><dd>{paymentMethod}</dd></div>}
          {expense.created_at && <div><dt>Created</dt><dd>{formatTimestamp(expense.created_at)}</dd></div>}
          {expense.updated_at && <div><dt>Updated</dt><dd>{formatTimestamp(expense.updated_at)}</dd></div>}
        </dl>
        <footer>
          {!readOnly && (
            <>
              <button type="button" className="transaction-detail-edit" onClick={() => onEdit(expense.id)}>Edit</button>
              <button type="button" className="transaction-detail-delete" onClick={() => onDelete(expense)}>Delete</button>
            </>
          )}
          <button type="button" className="transaction-detail-close" onClick={onClose}>Close</button>
        </footer>
      </section>
    </Modal>
  );
}

export default TransactionDetailsModal;
