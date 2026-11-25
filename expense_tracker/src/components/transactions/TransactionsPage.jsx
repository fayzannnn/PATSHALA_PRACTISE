import { useEffect, useMemo, useRef, useState } from "react";
import { useExpenses } from "../../context/ExpenseContext";
import {
  createDayPeriod,
  createMonthPeriod,
  createRangePeriod,
  getDateKey,
  shiftMonth,
} from "../../utils/dateHelpers";
import {
  DEFAULT_TRANSACTION_FILTERS,
  filterAndSortTransactions,
  getDateRange,
  getTransactionSummary,
  groupTransactionsByDate,
} from "../../utils/transactionHelpers";
import Modal from "../Modal";
import Editexpense from "../Editexpense";
import AddExpense from "../AddExpense";
import TransactionsSummary from "./TransactionsSummary";
import TransactionFilters from "./TransactionFilters";
import ActiveFilterChips from "./ActiveFilterChips";
import TransactionTable from "./TransactionTable";
import Pagination from "./Pagination";
import TransactionDetailsModal from "./TransactionDetailsModal";
import ConfirmDeleteModal from "./ConfirmDeleteModal";
import "./transactions.css";

const STORAGE_KEY = "expense-tracker-transactions-filter";

const CATEGORY_COLORS = {
  food: "#f59e0b", travel: "#3b82f6", shopping: "#ec4899",
  bills: "#8b5cf6", others: "#10b981",
};

function loadFilters() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved && typeof saved === "object"
      ? { ...DEFAULT_TRANSACTION_FILTERS, ...saved }
      : { ...DEFAULT_TRANSACTION_FILTERS };
  } catch {
    return { ...DEFAULT_TRANSACTION_FILTERS };
  }
}

function formatINR(amount) {
  return `₹${Number(amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function TransactionsPage({ onBack }) {
  const { expenses, dispatch, activePeriod, setPeriod, clearPeriod } = useExpenses();
  const [filters, setFilters] = useState(loadFilters);
  const [search, setSearch] = useState(filters.search || "");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [detailsExpense, setDetailsExpense] = useState(null);
  const [editId, setEditId] = useState(null);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [deleteRequest, setDeleteRequest] = useState(null);
  const [toast, setToast] = useState(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setFilters((current) => ({ ...current, search, page: 1 }));
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...filters, search }));
  }, [filters, search]);

  useEffect(() => {
    const handleShortcut = (event) => {
      const target = event.target;
      const isTyping = target instanceof HTMLElement
        && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
      if (event.key === "/" && !isTyping) {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleShortcut);
    return () => document.removeEventListener("keydown", handleShortcut);
  }, []);

  const categories = useMemo(
    () => [...new Set(expenses.map((expense) => expense.category).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [expenses]
  );
  const paymentMethods = useMemo(
    () => [...new Set(expenses.map((expense) => expense.payment_method || expense.paymentMethod).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b)),
    [expenses]
  );

  useEffect(() => {
    if (filters.date === "all") {
      if (activePeriod.type !== "all") setPeriod({ type: "all" });
      return;
    }
    if (activePeriod.type === "all") return;
    const today = new Date();
    const mappedRange = getDateRange(filters.date, filters.customStart, filters.customEnd, today);
    if (!mappedRange) return;
    if (filters.date === "month") {
      const period = createMonthPeriod(today.getFullYear(), today.getMonth() + 1);
      if (activePeriod.type !== "month" || activePeriod.year !== period.year || activePeriod.month !== period.month) setPeriod(period);
    } else if (filters.date === "lastMonth") {
      const previous = shiftMonth(today.getFullYear(), today.getMonth() + 1, -1);
      const period = createMonthPeriod(previous.year, previous.month);
      if (activePeriod.type !== "month" || activePeriod.year !== period.year || activePeriod.month !== period.month) setPeriod(period);
    } else if (filters.date === "today") {
      const period = createDayPeriod(getDateKey(today));
      if (activePeriod.type !== "day" || activePeriod.startDate !== period.startDate) setPeriod(period);
    } else if (filters.date === "week") {
      const monday = new Date(today);
      monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      const period = createRangePeriod(getDateKey(monday), getDateKey(sunday), "This week");
      if (activePeriod.type !== "range" || activePeriod.startDate !== period.startDate || activePeriod.endDate !== period.endDate) setPeriod(period);
    } else if (filters.date === "last3") {
      const period = createRangePeriod(getDateKey(new Date(today.getFullYear(), today.getMonth() - 2, 1)), getDateKey(today), "Last 3 months");
      if (activePeriod.type !== "range" || activePeriod.startDate !== period.startDate || activePeriod.endDate !== period.endDate) setPeriod(period);
    } else if (filters.date === "year") {
      const period = createRangePeriod(`${today.getFullYear()}-01-01`, `${today.getFullYear()}-12-31`, "This year");
      if (activePeriod.type !== "range" || activePeriod.startDate !== period.startDate || activePeriod.endDate !== period.endDate) setPeriod(period);
    } else if (filters.date === "custom" && filters.customStart && filters.customEnd) {
      const period = createRangePeriod(filters.customStart, filters.customEnd);
      if (activePeriod.type !== "range" || activePeriod.startDate !== period.startDate || activePeriod.endDate !== period.endDate) setPeriod(period);
    }
  }, [filters.date, filters.customStart, filters.customEnd, setPeriod]);

  useEffect(() => {
    if (activePeriod.type === "all") {
      setFilters((current) => ({ ...current, date: "all", customStart: "", customEnd: "" }));
    } else if (activePeriod.type === "day") {
      setFilters((current) => ({ ...current, date: "today", customStart: "", customEnd: "" }));
    } else if (activePeriod.type === "month") {
      const today = new Date();
      const isCurrent = activePeriod.year === today.getFullYear() && activePeriod.month === today.getMonth() + 1;
      const previous = shiftMonth(today.getFullYear(), today.getMonth() + 1, -1);
      const isPrevious = activePeriod.year === previous.year && activePeriod.month === previous.month;
      setFilters((current) => ({ ...current, date: isCurrent ? "month" : isPrevious ? "lastMonth" : "custom",
        customStart: isCurrent || isPrevious ? "" : activePeriod.startDate,
        customEnd: isCurrent || isPrevious ? "" : activePeriod.endDate,
      }));
    } else if (activePeriod.type === "range") {
      setFilters((current) => ({ ...current, date: "custom", customStart: activePeriod.startDate, customEnd: activePeriod.endDate }));
    }
  }, [activePeriod]);

  const effectiveFilters = useMemo(() => ({ ...filters, search }), [filters, search]);
  const filtered = useMemo(
    () => filterAndSortTransactions(expenses, effectiveFilters),
    [expenses, effectiveFilters]
  );
  const summary = useMemo(() => getTransactionSummary(filtered), [filtered]);
  const categoryTotals = useMemo(() => {
    const totals = new Map();
    filtered.forEach((expense) => {
      const name = expense.category || "Others";
      totals.set(name, (totals.get(name) || 0) + Number(expense.amount || 0));
    });
    return [...totals.entries()]
      .map(([name, amount]) => ({
        name,
        amount,
        color: CATEGORY_COLORS[String(name).toLowerCase()] || "#64748b",
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [filtered]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / filters.pageSize));
  const page = Math.min(filters.page, pageCount);
  const paged = filtered.slice((page - 1) * filters.pageSize, page * filters.pageSize);
  const tableGroups = useMemo(() => {
    if (!filters.groupByDate) {
      return [{ key: "all", label: "", transactions: paged, totalFormatted: formatINR(paged.reduce((sum, item) => sum + Number(item.amount || 0), 0)) }];
    }
    const grouped = groupTransactionsByDate(paged);
    return grouped.map((group) => ({ ...group, totalFormatted: formatINR(group.total) }));
  }, [filters.groupByDate, paged]);

  const sort = useMemo(() => {
    const field = filters.sort === "amountDesc" || filters.sort === "amountAsc"
      ? "amount"
      : filters.sort === "title"
        ? "title"
        : "date";
    return { field, direction: filters.sort === "oldest" || filters.sort === "amountAsc" || filters.sort === "title" ? "asc" : "desc" };
  }, [filters.sort]);

  const handleColumnSort = (field) => {
    setFilters((current) => {
      if (field === "amount") return { ...current, sort: sort.direction === "desc" ? "amountAsc" : "amountDesc", page: 1 };
      if (field === "title") return { ...current, sort: "title", page: 1 };
      if (field === "category") return { ...current, sort: "category", page: 1 };
      return { ...current, sort: sort.direction === "desc" ? "oldest" : "newest", page: 1 };
    });
  };

  const resetFilters = () => {
    setSearch("");
    setFilters({ ...DEFAULT_TRANSACTION_FILTERS });
    setSelectedIds(new Set());
    clearPeriod();
  };

  const activeFilterCount = [
    search.trim(),
    filters.date !== "all",
    filters.categories.length,
    filters.minAmount !== "",
    filters.maxAmount !== "",
    filters.paymentMethod !== "all",
  ].filter(Boolean).length;

  const chips = [
    search.trim() ? { key: "search", label: `Search: ${search.trim()}` } : null,
    filters.date !== "all" ? { key: "date", label: activePeriod.label } : null,
    ...filters.categories.map((category) => ({ key: `category:${category}`, label: `Category: ${category}` })),
    filters.minAmount !== "" ? { key: "minAmount", label: `Min: ${formatINR(filters.minAmount)}` } : null,
    filters.maxAmount !== "" ? { key: "maxAmount", label: `Max: ${formatINR(filters.maxAmount)}` } : null,
    filters.paymentMethod !== "all" ? { key: "paymentMethod", label: `Payment: ${filters.paymentMethod}` } : null,
  ].filter(Boolean);

  const removeChip = (key) => {
    if (key === "search") setSearch("");
    else if (key === "date") setFilters((current) => ({ ...current, date: "all", customStart: "", customEnd: "", page: 1 }));
    else if (key.startsWith("category:")) {
      const category = key.slice("category:".length);
      setFilters((current) => ({ ...current, categories: current.categories.filter((item) => item !== category), page: 1 }));
    } else if (key === "minAmount") setFilters((current) => ({ ...current, minAmount: "", page: 1 }));
    else if (key === "maxAmount") setFilters((current) => ({ ...current, maxAmount: "", page: 1 }));
    else if (key === "paymentMethod") setFilters((current) => ({ ...current, paymentMethod: "all", page: 1 }));
  };

  const toggleSelected = (id) => setSelectedIds((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const toggleSelectAll = () => setSelectedIds((current) => {
    const next = new Set(current);
    const allSelected = paged.every((expense) => next.has(expense.id));
    paged.forEach((expense) => allSelected ? next.delete(expense.id) : next.add(expense.id));
    return next;
  });

  const exportCSV = (items) => {
    const headers = ["Title", "Category", "Date", "Amount", "Note", "Payment method"];
    const rows = items.map((expense) => [
      expense.title || "", expense.category || "", expense.date || "", expense.amount || "",
      expense.note || expense.description || "", expense.payment_method || expense.paymentMethod || "",
    ]);
    const csv = [headers, ...rows].map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "transactions.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const performDelete = async () => {
    const ids = deleteRequest?.ids || [];
    const deleted = expenses.filter((expense) => ids.includes(expense.id));
    setDeleteRequest(null);
    setDetailsExpense(null);
    for (const id of ids) await dispatch({ type: "delete_expense", payload: id });
    setSelectedIds(new Set());
    setToast({ deleted });
    window.setTimeout(() => setToast((current) => current?.deleted === deleted ? null : current), 5000);
  };

  const undoDelete = async () => {
    if (!toast?.deleted?.length) return;
    for (const expense of toast.deleted) {
      await dispatch({ type: "add_expense", payload: { ...expense } });
    }
    setToast(null);
  };

  const readOnlyForExpense = (expense) => {
    const currentMonth = getDateKey(new Date()).slice(0, 7);
    return typeof expense.date === "string" && expense.date.slice(0, 7) !== currentMonth;
  };

  return (
    <div className="transactions-page">
      <header className="transactions-page-header">
        <div>
          <button type="button" className="transactions-back" onClick={onBack} aria-label="Back to overview">←</button>
          <div><p className="dash-eyebrow">FINANCE</p><h1>Transactions</h1></div>
        </div>
        <button type="button" className="transactions-export-button" onClick={() => exportCSV(filtered)}>
          Export CSV
        </button>
      </header>

      <p className="transactions-result-count">Showing {filtered.length} of {expenses.length} transactions</p>
      <TransactionsSummary summary={summary} categoryTotals={categoryTotals} />
      <TransactionFilters
        filters={{ ...filters, search }}
        setFilters={(updater) => {
          setFilters((current) => {
            const next = typeof updater === "function" ? updater(current) : updater;
            if (next.search !== undefined) setSearch(next.search);
            return next;
          });
        }}
        categories={categories}
        paymentMethods={paymentMethods}
        activeFilterCount={activeFilterCount}
        searchInputRef={searchInputRef}
        onReset={resetFilters}
      />
      <ActiveFilterChips chips={chips} onRemove={removeChip} onClear={resetFilters} />

      {selectedIds.size > 0 && (
        <div className="transactions-bulk-bar">
          <strong>{selectedIds.size} selected</strong>
          <button type="button" className="bulk-delete" onClick={() => setDeleteRequest({ ids: [...selectedIds] })}>Delete selected</button>
          <button type="button" onClick={() => exportCSV(expenses.filter((expense) => selectedIds.has(expense.id)))}>Export selected</button>
          <button type="button" className="bulk-clear" onClick={() => setSelectedIds(new Set())}>Clear selection</button>
        </div>
      )}

      {expenses.length === 0 ? (
        <div className="transactions-empty-state">
          <strong>No transactions yet</strong>
          <button type="button" onClick={() => setShowAddExpense(true)}>Add Expense</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="transactions-empty-state">
          <strong>No transactions match your filters</strong>
          <button type="button" onClick={resetFilters}>Clear filters</button>
        </div>
      ) : (
        <>
          <TransactionTable
            groups={tableGroups}
            allVisibleIds={paged.map((expense) => expense.id)}
            selectedIds={selectedIds}
            sort={sort}
            onSort={handleColumnSort}
            onSelect={toggleSelected}
            onSelectAll={toggleSelectAll}
            onView={setDetailsExpense}
            onEdit={setEditId}
            onDelete={(expense) => setDeleteRequest({ ids: [expense.id] })}
            search={search.trim()}
            readOnlyForExpense={readOnlyForExpense}
          />
          <Pagination
            page={page}
            pageSize={filters.pageSize}
            total={filtered.length}
            onPageChange={(nextPage) => setFilters((current) => ({ ...current, page: nextPage }))}
            onPageSizeChange={(pageSize) => setFilters((current) => ({ ...current, pageSize, page: 1 }))}
          />
        </>
      )}

      <TransactionDetailsModal
        expense={detailsExpense}
        onClose={() => setDetailsExpense(null)}
        onEdit={(id) => { setDetailsExpense(null); setEditId(id); }}
        onDelete={(expense) => setDeleteRequest({ ids: [expense.id] })}
        readOnly={detailsExpense ? readOnlyForExpense(detailsExpense) : false}
      />
      <Modal isOpen={editId !== null} onClose={() => setEditId(null)}>
        <Editexpense id={editId} onDone={() => setEditId(null)} />
      </Modal>
      <Modal isOpen={showAddExpense} onClose={() => setShowAddExpense(false)}>
        <AddExpense onDone={() => setShowAddExpense(false)} />
      </Modal>
      <ConfirmDeleteModal
        count={deleteRequest?.ids?.length || 1}
        isOpen={Boolean(deleteRequest)}
        onCancel={() => setDeleteRequest(null)}
        onConfirm={performDelete}
      />
      {toast && (
        <div className="transactions-toast" role="status">
          <span>Transaction deleted</span>
          <button type="button" onClick={undoDelete}>Undo</button>
          <button type="button" className="toast-close" onClick={() => setToast(null)} aria-label="Dismiss">×</button>
        </div>
      )}
    </div>
  );
}

export default TransactionsPage;
