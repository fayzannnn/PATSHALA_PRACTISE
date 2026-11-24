function PeriodChip({ label, active, onClick }) {
  return (
    <button
      type="button"
      className={`period-chip${active ? " active" : ""}`}
      aria-pressed={active}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export default PeriodChip;
