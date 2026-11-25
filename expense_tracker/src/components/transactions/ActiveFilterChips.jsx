function ActiveFilterChips({ chips, onRemove, onClear }) {
  if (!chips.length) return null;

  return (
    <div className="transactions-active-filters">
      {chips.map((chip) => (
        <button type="button" key={chip.key} onClick={() => onRemove(chip.key)} aria-label={`Remove ${chip.label} filter`}>
          {chip.label}<span aria-hidden="true">×</span>
        </button>
      ))}
      <button type="button" className="transactions-clear-inline" onClick={onClear}>Clear all</button>
    </div>
  );
}

export default ActiveFilterChips;
