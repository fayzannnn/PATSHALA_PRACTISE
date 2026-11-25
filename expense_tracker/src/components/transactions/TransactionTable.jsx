import TransactionRow from "./TransactionRow";
import { formatTransactionDate } from "../../utils/transactionHelpers";

function SortHeader({ label, field, sort, onSort, className = "" }) {
  const active = sort.field === field;
  return (
    <button type="button" className={active ? "active" : ""} onClick={() => onSort(field)}>
      {label}<span aria-hidden="true">{active ? (sort.direction === "asc" ? "↑" : "↓") : ""}</span>
    </button>
  );
}

function TransactionTable({
  groups, allVisibleIds, selectedIds, sort, onSort, onSelect, onSelectAll,
  onView, onEdit, onDelete, search, readOnlyForExpense,
}) {
  const allSelected = allVisibleIds.length > 0 && allVisibleIds.every((id) => selectedIds.has(id));
  const someSelected = allVisibleIds.some((id) => selectedIds.has(id));

  return (
    <div className="transactions-table-wrap">
      {groups.map((group) => (
        <div className="transactions-table-group" key={group.key}>
          {group.label && (
            <div className="transactions-date-heading">
              <strong>{group.label}</strong>
              <span>{group.transactions.length} transaction{group.transactions.length === 1 ? "" : "s"} · {group.totalFormatted}</span>
            </div>
          )}
          <table className="transactions-table">
            <thead>
              <tr>
                <th className="transaction-check-cell">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(node) => { if (node) node.indeterminate = someSelected && !allSelected; }}
                    onChange={onSelectAll}
                    aria-label="Select all transactions"
                  />
                </th>
                <th><SortHeader label="Date" field="date" sort={sort} onSort={onSort} /></th>
                <th><SortHeader label="Transaction" field="title" sort={sort} onSort={onSort} /></th>
                <th><SortHeader label="Category" field="category" sort={sort} onSort={onSort} /></th>
                <th>Payment</th>
                <th><SortHeader label="Amount" field="amount" sort={sort} onSort={onSort} /></th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {group.transactions.map((expense) => (
                <TransactionRow
                  key={expense.id}
                  expense={expense}
                  selected={selectedIds.has(expense.id)}
                  onSelect={onSelect}
                  onView={onView}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  search={search}
                  readOnly={readOnlyForExpense(expense)}
                />
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

export default TransactionTable;
