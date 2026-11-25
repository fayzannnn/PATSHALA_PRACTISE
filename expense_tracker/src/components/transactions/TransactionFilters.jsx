import { useEffect, useRef, useState } from "react";

const DATE_OPTIONS = [
  ["all", "All time"], ["today", "Today"], ["week", "This week"], ["month", "This month"],
  ["lastMonth", "Last month"], ["last3", "Last 3 months"], ["year", "This year"], ["custom", "Custom range"],
];

function TransactionFilters({
  filters, setFilters, categories, paymentMethods, activeFilterCount, searchInputRef,
  onReset,
}) {
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const categoryRef = useRef(null);

  useEffect(() => {
    const close = (event) => {
      if (!categoryRef.current?.contains(event.target)) setCategoryOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const update = (key, value) => setFilters((current) => ({ ...current, [key]: value, page: 1 }));
  const toggleCategory = (category) => setFilters((current) => ({
    ...current,
    page: 1,
    categories: current.categories.includes(category)
      ? current.categories.filter((item) => item !== category)
      : [...current.categories, category],
  }));

  return (
    <div className="transactions-filter-section">
      <button type="button" className="transactions-mobile-filter-button" onClick={() => setMobileOpen(true)}>
        Filters {activeFilterCount > 0 && <span>{activeFilterCount}</span>}
      </button>
      <div className={`transactions-filter-bar${mobileOpen ? " mobile-open" : ""}`}>
        <div className="filter-mobile-head">
          <strong>Filters</strong>
          <button type="button" onClick={() => setMobileOpen(false)} aria-label="Close filters">×</button>
        </div>

        <label className="transactions-search">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>
          <input
            ref={searchInputRef}
            type="search"
            value={filters.search}
            onChange={(event) => update("search", event.target.value)}
            placeholder="Search title, category, note or amount"
            aria-label="Search transactions"
          />
        </label>

        <select className="transaction-filter-select" value={filters.date} onChange={(event) => update("date", event.target.value)} aria-label="Date filter">
          {DATE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>

        {filters.date === "custom" && (
          <div className="transaction-custom-dates">
            <input type="date" value={filters.customStart} onChange={(event) => update("customStart", event.target.value)} aria-label="Custom start date" />
            <span>to</span>
            <input type="date" value={filters.customEnd} onChange={(event) => update("customEnd", event.target.value)} aria-label="Custom end date" />
          </div>
        )}

        <div className="transaction-category-select" ref={categoryRef}>
          <button type="button" onClick={() => setCategoryOpen((open) => !open)} aria-expanded={categoryOpen}>
            Category {filters.categories.length > 0 && <span>{filters.categories.length}</span>}
          </button>
          {categoryOpen && (
            <div className="transaction-category-menu">
              {categories.map((category) => (
                <label key={category}>
                  <input type="checkbox" checked={filters.categories.includes(category)} onChange={() => toggleCategory(category)} />
                  <span>{category}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="transaction-amount-range">
          <input type="number" min="0" step="0.01" value={filters.minAmount} onChange={(event) => update("minAmount", event.target.value)} placeholder="Min" aria-label="Minimum amount" />
          <span>–</span>
          <input type="number" min="0" step="0.01" value={filters.maxAmount} onChange={(event) => update("maxAmount", event.target.value)} placeholder="Max" aria-label="Maximum amount" />
        </div>

        {paymentMethods.length > 0 && (
          <select className="transaction-filter-select" value={filters.paymentMethod} onChange={(event) => update("paymentMethod", event.target.value)} aria-label="Payment method">
            <option value="all">All payments</option>
            {paymentMethods.map((method) => <option key={method} value={method}>{method}</option>)}
          </select>
        )}

        <select className="transaction-filter-select sort-select" value={filters.sort} onChange={(event) => update("sort", event.target.value)} aria-label="Sort transactions">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="amountDesc">Amount high to low</option>
          <option value="amountAsc">Amount low to high</option>
          <option value="title">Title A-Z</option>
        </select>

        <label className="transaction-group-toggle">
          <input type="checkbox" checked={filters.groupByDate} onChange={(event) => update("groupByDate", event.target.checked)} />
          <span>Group by date</span>
        </label>

        <button type="button" className="transactions-reset-button" onClick={onReset}>Reset</button>
        {mobileOpen && <button type="button" className="transactions-mobile-apply" onClick={() => setMobileOpen(false)}>Show results</button>}
      </div>
    </div>
  );
}

export default TransactionFilters;
