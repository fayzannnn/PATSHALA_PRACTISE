import "./history.css";

function MonthSelector({ months, selectedMonth, onChange }) {
  const selectedIndex = months.findIndex((month) => month.key === selectedMonth);
  const selected = months[selectedIndex];

  return (
    <div className="history-month-selector">
      <button
        type="button"
        className="history-arrow"
        aria-label="Select earlier month"
        disabled={selectedIndex < 0 || selectedIndex === months.length - 1}
        onClick={() => onChange(months[selectedIndex + 1]?.key)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
      </button>
      <label className="history-month-select-wrap">
        <span className="history-visually-hidden">Selected month</span>
        <select value={selectedMonth} onChange={(event) => onChange(event.target.value)}>
          {months.map((month) => (
            <option key={month.key} value={month.key}>
              {month.label}
            </option>
          ))}
        </select>
        {selected?.isCurrent && <span className="history-current-badge">Current</span>}
        <svg viewBox="0 0 12 12" aria-hidden="true"><path d="m3 4.5 3 3 3-3" /></svg>
      </label>
      <button
        type="button"
        className="history-arrow"
        aria-label="Select later month"
        disabled={selectedIndex <= 0}
        onClick={() => onChange(months[selectedIndex - 1]?.key)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
      </button>
    </div>
  );
}

export default MonthSelector;
