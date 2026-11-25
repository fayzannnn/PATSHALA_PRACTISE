import { formatTransactionDate, parseLocalDate } from "../../utils/transactionHelpers";

function formatINR(amount) {
  return `₹${Number(amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function Highlight({ text, query }) {
  const value = String(text ?? "");
  if (!query) return value;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = value.split(new RegExp(`(${escaped})`, "gi"));
  return parts.map((part, index) => index % 2 ? <mark key={`${part}-${index}`}>{part}</mark> : part);
}

const CATEGORY_COLORS = {
  food: "#f59e0b", travel: "#3b82f6", shopping: "#ec4899",
  bills: "#8b5cf6", others: "#10b981",
};

function getCategoryColor(category) {
  return CATEGORY_COLORS[String(category || "").toLowerCase()] || "#64748b";
}

function formatTime(expense) {
  const time = expense.time || expense.transaction_time;
  if (time) return time;
  if (!expense.created_at) return "";
  const parsed = new Date(expense.created_at);
  return Number.isFinite(parsed.getTime())
    ? parsed.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
    : "";
}

function TransactionRow({ expense, selected, onSelect, onView, onEdit, onDelete, search, readOnly }) {
  const category = expense.category || "Others";
  const note = expense.note || expense.description;
  const paymentMethod = expense.payment_method || expense.paymentMethod;
  const time = formatTime(expense);

  return (
    <tr onClick={() => onView(expense)} className={selected ? "selected" : ""}>
      <td className="transaction-check-cell" onClick={(event) => event.stopPropagation()}>
        <input type="checkbox" checked={selected} onChange={() => onSelect(expense.id)} aria-label={`Select ${expense.title}`} />
      </td>
      <td className="transaction-date-cell">
        <strong><Highlight text={formatTransactionDate(expense.date)} query={search} /></strong>
        {time && <span>{time}</span>}
      </td>
      <td className="transaction-title-cell">
        <strong title={expense.title}><Highlight text={expense.title} query={search} /></strong>
        {note && <span title={note}><Highlight text={note} query={search} /></span>}
      </td>
      <td>
        <span className="transaction-category-badge" style={{ "--category-color": getCategoryColor(category) }}>
          <i>{String(category).charAt(0).toUpperCase()}</i>
          <Highlight text={category} query={search} />
        </span>
      </td>
      <td className="transaction-payment-cell">{paymentMethod ? <Highlight text={paymentMethod} query={search} /> : "—"}</td>
      <td className="transaction-amount-cell"><Highlight text={`-${formatINR(expense.amount)}`} query={search} /></td>
      <td className="transaction-actions-cell" onClick={(event) => event.stopPropagation()}>
        <button type="button" onClick={() => onView(expense)}>View</button>
        {!readOnly && (
          <>
            <button type="button" onClick={() => onEdit(expense.id)}>Edit</button>
            <button type="button" className="danger" onClick={() => onDelete(expense)}>Delete</button>
          </>
        )}
      </td>
    </tr>
  );
}

export default TransactionRow;
