import BudgetHistoryRow from "./BudgetHistoryRow";

function BudgetHistoryList({ history, onOpen, onEdit, onDelete }) {
  return (
    <section className="budget-history-section">
      <div className="budget-history-heading"><h2>Monthly history</h2></div>
      <div className="budget-history-list">
        {history.map((entry, index) => (
          <BudgetHistoryRow
            key={entry.month}
            entry={entry}
            isFirst={index === 0}
            onOpen={onOpen}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </section>
  );
}

export default BudgetHistoryList;
