import { useEffect, useMemo, useRef, useState } from "react";
import { useExpenses } from "../context/ExpenseContext";
import ExpenseChart from "./Expensechart";
import Addbudget from "./Addbudget";
import AddExpense from "./AddExpense";
import Modal from "./Modal";
import SpendingHistory from "./history/SpendingHistory";
import CalendarPage from "./calendar/CalendarPage";
import PeriodChip from "./calendar/PeriodChip";
import SearchSuggestions from "./calendar/SearchSuggestions";
import {
  createMonthPeriod,
  createRangePeriod,
  filterExpensesByPeriod,
  getBudgetForPeriod,
  getDateKey,
  getMonthKey,
  getMonthStart,
  groupExpensesByMonth,
  parseDateKey,
  shiftMonth,
} from "../utils/dateHelpers";
import { parseDateQuery } from "../utils/dateSearchParser";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Area,
} from "recharts";
import "./Dashboard.css";
import "./calendar/calendar.css";

const formatINR = (n) => `₹${Number(n).toLocaleString("en-IN")}`;
const formatDate = (date) => date
  ? new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
  : "Date not set";

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function HighlightedText({ text, query }) {
  const value = String(text || "");
  if (!query) return value;
  const parts = value.split(new RegExp(`(${escapeRegExp(query)})`, "gi"));
  return parts.map((part, index) => index % 2
    ? <mark key={`${part}-${index}`}>{part}</mark>
    : part);
}

function TransactionItem({ expense, onEdit, onDelete, searchTerm = "" }) {
  const dateMonth = typeof expense.date === "string" ? expense.date.slice(0, 7) : "";
  const today = new Date();
  const isCurrentMonth = dateMonth === getMonthKey(today.getFullYear(), today.getMonth() + 1);

  return (
    <li className="dash-expense" key={expense.id}>
      <span className={`dash-expense-icon category-${expense.category?.toLowerCase()}`}>{expense.category?.[0] || "E"}</span>
      <div className="dash-expense-info">
        <span className="dash-expense-title"><HighlightedText text={expense.title} query={searchTerm} /></span>
        <span className="dash-expense-category"><HighlightedText text={expense.category} query={searchTerm} /> · {formatDate(expense.date)}</span>
      </div>
      <span className="dash-expense-amount">-{formatINR(expense.amount)}</span>
      {isCurrentMonth && (
        <div className="dash-expense-actions">
          <button className="dash-small-btn" onClick={() => onEdit(expense.id)} aria-label={`Edit ${expense.title}`}><Icon name="edit" size={15}/></button>
          <button className="dash-small-btn delete" onClick={() => onDelete(expense.id)} aria-label={`Delete ${expense.title}`}><Icon name="trash" size={15}/></button>
        </div>
      )}
    </li>
  );
}

const RECENT_SEARCHES_KEY = "expense-tracker-recent-searches";

function readRecentSearches() {
  const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
  if (!stored) return [];
  try {
    const searches = JSON.parse(stored);
    return Array.isArray(searches) ? searches.filter((item) => typeof item === "string").slice(0, 5) : [];
  } catch (error) {
    if (error instanceof SyntaxError) return [];
    throw error;
  }
}

function addRecentSearch(searches, query) {
  const normalized = query.trim();
  if (!normalized) return searches;
  return [normalized, ...searches.filter((item) => item.toLowerCase() !== normalized.toLowerCase())].slice(0, 5);
}

function getPresetPeriods(today) {
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const previousMonth = shiftMonth(year, month, -1);
  const firstMonth = shiftMonth(year, month, -2);
  return {
    week: parseDateQuery("this week", today),
    month: createMonthPeriod(year, month),
    lastMonth: createMonthPeriod(previousMonth.year, previousMonth.month),
    lastThreeMonths: createRangePeriod(getMonthStart(firstMonth.year, firstMonth.month), getDateKey(today), "Last 3 months"),
    year: parseDateQuery("this year", today),
  };
}

function isSamePeriod(left, right) {
  return left?.type === right?.type
    && left?.month === right?.month
    && left?.year === right?.year
    && left?.startDate === right?.startDate
    && left?.endDate === right?.endDate;
}

function resolveDateQueryPeriod(period, query, expenses, today) {
  if (!period || period.type !== "month" || !/^[a-z]+$/i.test(query.trim()) || period.month <= today.getMonth() + 1) {
    return period;
  }
  const latestYear = expenses.reduce((latest, expense) => {
    if (!parseDateKey(expense.date) || Number(expense.date.slice(5, 7)) !== period.month) return latest;
    const year = Number(expense.date.slice(0, 4));
    return year < today.getFullYear() ? Math.max(latest, year) : latest;
  }, 0);
  return latestYear ? createMonthPeriod(latestYear, period.month) : period;
}

function Icon({ name, size = 20 }) {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
    wallet: <><path d="M20 7V5a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h15v12H5a3 3 0 0 1-3-3V6"/><path d="M16 13h3"/></>,
    receipt: <><path d="M6 3v18l3-2 3 2 3-2 3 2V3l-3 2-3-2-3 2-3-2Z"/><path d="M9 9h6M9 13h6"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
    chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>,
    barChart: <><path d="M4 20V11M10 20V5M16 20v-8M22 20H2"/></>,
    lineChart: <><path d="m3 16 6-6 4 4 8-9M16 5h5v5"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    edit: <><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></>,
    trash: <><path d="M3 6h18M8 6V3h8v3M19 6l-1 15H6L5 6M10 11v6M14 11v6"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,
    moon: <path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z"/>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function Dashboard({ onEdit, userName = "Alex" }) {
  const {
    budget,
    budgets = {},
    expenses,
    dispatch,
    user,
    logout,
    activePeriod,
    setPeriod,
    clearPeriod,
  } = useExpenses();
  const [activePage, setActivePage] = useState("overview");
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("expense-tracker-theme") === "dark");
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [showAddBudget, setShowAddBudget] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState(readRecentSearches);
  const [showCustomRange, setShowCustomRange] = useState(false);
  const todayKey = getDateKey(new Date());
  const today = useMemo(() => {
    const [year, month, day] = todayKey.split("-").map(Number);
    return new Date(year, month - 1, day);
  }, [todayKey]);
  const currentMonthKey = getMonthKey(today.getFullYear(), today.getMonth() + 1);
  const [range, setRange] = useState("week");
  const [chartType, setChartType] = useState("line");
  const [isRangeMenuOpen, setIsRangeMenuOpen] = useState(false);
  const rangeSelectorRef = useRef(null);
  const searchInputRef = useRef(null);
  const [customStart, setCustomStart] = useState(() => getMonthStart(today.getFullYear(), today.getMonth() + 1));
  const [customEnd, setCustomEnd] = useState(todayKey);
  const displayName = user?.name || userName;
  const presetPeriods = useMemo(() => getPresetPeriods(today), [today]);
  const parsedSearchPeriod = useMemo(() => {
    const query = debouncedSearch.trim();
    return query
      ? resolveDateQueryPeriod(parseDateQuery(query, today), query, expenses, today)
      : null;
  }, [debouncedSearch, expenses, today]);
  const queryIsCurrent = searchText.trim() === debouncedSearch.trim();
  const textSearchTerm = queryIsCurrent && !parsedSearchPeriod ? debouncedSearch.trim() : "";
  const periodExpenses = useMemo(
    () => filterExpensesByPeriod(expenses, activePeriod),
    [expenses, activePeriod]
  );
  const visibleExpenses = useMemo(() => {
    const query = textSearchTerm.toLocaleLowerCase();
    return [...periodExpenses]
      .filter((expense) => !query || `${expense.title} ${expense.category}`.toLocaleLowerCase().includes(query))
      .sort((a, b) => String(b.date).localeCompare(String(a.date)) || Number(b.id) - Number(a.id));
  }, [periodExpenses, textSearchTerm]);
  const periodTotal = useMemo(
    () => periodExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
    [periodExpenses]
  );
  const periodBudget = useMemo(
    () => getBudgetForPeriod(activePeriod, budgets, budget, currentMonthKey),
    [activePeriod, budgets, budget, currentMonthKey]
  );
  const periodRemaining = periodBudget - periodTotal;
  const spentPercent = periodBudget > 0 ? Math.min((periodTotal / periodBudget) * 100, 100) : 0;
  const monthlyGroups = useMemo(() => groupExpensesByMonth(expenses), [expenses]);
  const monthComparison = useMemo(() => {
    if (activePeriod.type !== "month") return null;
    const previousKeyInfo = shiftMonth(activePeriod.year, activePeriod.month, -1);
    const previous = monthlyGroups.get(getMonthKey(previousKeyInfo.year, previousKeyInfo.month));
    if (!previous) return { text: "No earlier data", trend: "neutral" };
    const difference = periodTotal - previous.total;
    return {
      text: difference === 0
        ? "No change vs previous month"
        : `${formatINR(Math.abs(difference))} ${difference > 0 ? "more" : "less"} than previous month`,
      trend: difference > 0 ? "up" : difference < 0 ? "down" : "neutral",
    };
  }, [activePeriod, monthlyGroups, periodTotal]);
  const categoryData = useMemo(() => {
    const totals = new Map();
    periodExpenses.forEach((expense) => {
      const name = expense.category || "Others";
      totals.set(name, (totals.get(name) || 0) + Number(expense.amount || 0));
    });
    return [...totals.entries()]
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [periodExpenses]);
  const suggestionItems = useMemo(() => {
    if (!isSearchFocused) return [];
    if (!searchText.trim()) {
      return recentSearches.map((query) => ({ type: "recent", query, label: query }));
    }
    if (!queryIsCurrent || !parsedSearchPeriod) return [];
    return [{
      type: "period",
      query: debouncedSearch.trim(),
      period: parsedSearchPeriod,
      label: `Show ${parsedSearchPeriod.label}`,
    }];
  }, [isSearchFocused, searchText, recentSearches, queryIsCurrent, parsedSearchPeriod, debouncedSearch]);
  const showRecentSearchClear = isSearchFocused && !searchText.trim() && recentSearches.length > 0;
  const isDefaultPeriod = isSamePeriod(activePeriod, presetPeriods.month);
  const isPresetActive = Object.values(presetPeriods).some((period) => isSamePeriod(period, activePeriod));
  const customPeriodActive = activePeriod.type === "range" && !isPresetActive;
  const searchNoResults = Boolean(textSearchTerm) && visibleExpenses.length === 0;
  const noPeriodExpenses = periodExpenses.length === 0;

  useEffect(() => {
    const theme = darkMode ? "dark" : "light";
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("expense-tracker-theme", theme);
  }, [darkMode]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(searchText.trim()), 300);
    return () => window.clearTimeout(timeout);
  }, [searchText]);

  useEffect(() => {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recentSearches));
  }, [recentSearches]);

  useEffect(() => {
    const handleShortcut = (event) => {
      const target = event.target;
      const isTyping = target instanceof HTMLElement
        && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
      if (event.key === "/" && !isTyping && activePage === "overview") {
        event.preventDefault();
        searchInputRef.current?.focus();
      } else if (event.key === "Escape") {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener("keydown", handleShortcut);
    return () => document.removeEventListener("keydown", handleShortcut);
  }, [activePage]);

  useEffect(() => {
    if (!isRangeMenuOpen) return undefined;

    const handleOutsideClick = (event) => {
      if (!rangeSelectorRef.current?.contains(event.target)) setIsRangeMenuOpen(false);
    };
    const handleEscape = (event) => {
      if (event.key === "Escape") setIsRangeMenuOpen(false);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isRangeMenuOpen]);

  const { weeklyData, monthlyData } = useMemo(() => {
    let referenceDate = today;
    if (activePeriod.type === "month") {
      const daysInMonth = new Date(activePeriod.year, activePeriod.month, 0).getDate();
      referenceDate = new Date(activePeriod.year, activePeriod.month - 1, Math.min(today.getDate(), daysInMonth));
    } else if (activePeriod.startDate) {
      const [year, month, day] = activePeriod.startDate.split("-").map(Number);
      referenceDate = new Date(year, month - 1, day);
    }
    const monday = new Date(referenceDate);
    monday.setDate(referenceDate.getDate() - ((referenceDate.getDay() + 6) % 7));
    const weekly = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      return {
        name: date.toLocaleDateString("en-US", { weekday: "short" }),
        date: getDateKey(date),
        amount: 0,
      };
    });
    const weeklyDataByDate = new Map(weekly.map((day, index) => [day.date, index]));
    const monthly = Array.from({ length: 5 }, (_, index) => ({
      name: `Week ${index + 1}`,
      amount: 0,
    }));

    const rangeStart = activePeriod.startDate ? new Date(`${activePeriod.startDate}T00:00:00`) : null;
    const rangeEnd = activePeriod.endDate ? new Date(`${activePeriod.endDate}T00:00:00`) : null;
    const rangeLength = rangeStart && rangeEnd
      ? Math.round((rangeEnd.getTime() - rangeStart.getTime()) / 86400000) + 1
      : 0;
    const startsOnDifferentWeeks = rangeStart && rangeEnd
      && (() => {
        const startWeek = new Date(rangeStart);
        const endWeek = new Date(rangeEnd);
        startWeek.setDate(startWeek.getDate() - ((startWeek.getDay() + 6) % 7));
        endWeek.setDate(endWeek.getDate() - ((endWeek.getDay() + 6) % 7));
        return getDateKey(startWeek) !== getDateKey(endWeek);
      })();
    const aggregateWeekdays = activePeriod.type === "all"
      || (activePeriod.type === "range" && (rangeLength > 7 || startsOnDifferentWeeks));
    const weekdayIndices = new Map(weekly.map((day, index) => [day.name, index]));

    periodExpenses.forEach((expense) => {
      if (typeof expense.date !== "string") return;

      const expenseDate = new Date(`${expense.date}T00:00:00`);
      const weekday = expenseDate.toLocaleDateString("en-US", { weekday: "short" });
      const weekIndex = aggregateWeekdays ? weekdayIndices.get(weekday) : weeklyDataByDate.get(expense.date);
      if (weekIndex !== undefined) weekly[weekIndex].amount += Number(expense.amount || 0);

      const dayOfMonth = Number(expense.date.slice(8, 10));
      const monthWeekIndex = Math.floor((dayOfMonth - 1) / 7);
      if (monthly[monthWeekIndex]) monthly[monthWeekIndex].amount += Number(expense.amount || 0);
    });

    return { weeklyData: weekly, monthlyData: monthly };
  }, [activePeriod, periodExpenses, today]);

  const chartData = range === "week" ? weeklyData : monthlyData;
  const hasSpending = chartData.some((day) => day.amount > 0);
  const selectedRangeLabel = range === "week" ? "This week" : "This month";
  const chartTitle = activePeriod.type === "month"
    ? `Spending in ${activePeriod.label}`
    : activePeriod.type === "day"
      ? `Spending on ${activePeriod.label}`
      : activePeriod.type === "range"
        ? `Spending ${activePeriod.label}`
        : range === "week" ? "Weekly spending" : "Monthly spending";

  const rememberSearch = (query) => setRecentSearches((previous) => addRecentSearch(previous, query));
  const clearSearch = () => {
    setSearchText("");
    setDebouncedSearch("");
    setIsSearchFocused(false);
    setActiveSuggestionIndex(0);
  };
  const applySearchPeriod = (period, query) => {
    setPeriod(period);
    rememberSearch(query);
    clearSearch();
    setShowCustomRange(false);
    setActivePage("overview");
  };
  const selectSearchSuggestion = (item) => {
    const query = item.query.trim();
    const parsed = resolveDateQueryPeriod(parseDateQuery(query, today), query, expenses, today);
    if (parsed) {
      applySearchPeriod(parsed, query);
      return;
    }
    setSearchText(query);
    setDebouncedSearch(query);
    rememberSearch(query);
    setIsSearchFocused(false);
  };
  const handleSearchKeyDown = (event) => {
    if (event.key === "ArrowDown" && suggestionItems.length) {
      event.preventDefault();
      setActiveSuggestionIndex((index) => (index + 1) % suggestionItems.length);
    } else if (event.key === "ArrowUp" && suggestionItems.length) {
      event.preventDefault();
      setActiveSuggestionIndex((index) => (index - 1 + suggestionItems.length) % suggestionItems.length);
    } else if (event.key === "Escape") {
      setIsSearchFocused(false);
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (suggestionItems[activeSuggestionIndex]) {
        selectSearchSuggestion(suggestionItems[activeSuggestionIndex]);
        return;
      }
      const query = searchText.trim();
      const parsed = resolveDateQueryPeriod(parseDateQuery(query, today), query, expenses, today);
      if (parsed) applySearchPeriod(parsed, query);
      else {
        setDebouncedSearch(query);
        rememberSearch(query);
        setIsSearchFocused(false);
      }
    }
  };
  const goToOverview = () => {
    setActivePage("overview");
    clearSearch();
  };
  const choosePeriod = (period) => {
    setPeriod(period);
    setShowCustomRange(false);
  };
  const applyCustomRange = () => {
    const period = createRangePeriod(customStart, customEnd);
    if (!period) return;
    setPeriod(period);
    setShowCustomRange(false);
  };
  const customRangeValid = Boolean(customStart && customEnd && customStart <= customEnd);

  return (
    <div className={`dash-page${darkMode ? " dark-theme" : ""}`}>
      <aside className="dash-sidebar">
        <div className="dash-brand"><span className="dash-brand-mark">E</span><span>Expenso</span></div>
        <nav className="dash-nav" aria-label="Main navigation">
          <button type="button" className={`dash-nav-item${activePage === "overview" ? " active" : ""}`} onClick={goToOverview}><Icon name="grid" /><span>Overview</span></button>
          <button className="dash-nav-item" onClick={() => setShowAddExpense(true)}><Icon name="receipt" /><span>Transactions</span></button>
          <button className="dash-nav-item" onClick={() => setShowAddBudget(true)}><Icon name="wallet" /><span>Budget</span></button>
          <button className="dash-nav-item"><Icon name="chart" /><span>Analytics</span></button>
          <button type="button" className={`dash-nav-item${activePage === "calendar" ? " active" : ""}`} onClick={() => setActivePage("calendar")}><Icon name="calendar" /><span>Calendar</span></button>
        </nav>
        <button
          className="dash-theme-toggle"
          type="button"
          role="switch"
          aria-checked={darkMode}
          aria-label={`Switch to ${darkMode ? "light" : "dark"} mode`}
          onClick={() => setDarkMode((enabled) => !enabled)}
        >
          <Icon name={darkMode ? "sun" : "moon"} size={18} />
          <span>{darkMode ? "Light mode" : "Dark mode"}</span>
          <span className="dash-theme-switch" aria-hidden="true"><span /></span>
        </button>
        <button className="dash-profile" onClick={logout} title="Sign out">
          <span className="dash-avatar">{displayName[0]?.toUpperCase()}</span>
          <span><strong>{displayName}</strong><small>Sign out</small></span>
        </button>
      </aside>

      <main className="dash-main">
        {activePage === "overview" ? (
          <>
        <header className="dash-topbar">
          <div>
            <p className="dash-eyebrow">OVERVIEW</p>
            <h1>Good morning, {displayName}</h1>
            {!isDefaultPeriod && (
              <span className="period-active-chip">
                Showing: {activePeriod.label}
                <button type="button" aria-label="Clear period filter" onClick={clearPeriod}>×</button>
              </span>
            )}
          </div>
          <div className="dash-top-actions">
            <div className="dash-search-wrap">
              <label className="dash-search">
                <Icon name="search" size={18}/>
                <input
                  ref={searchInputRef}
                  aria-label="Search expenses or dates"
                  aria-expanded={suggestionItems.length > 0}
                  placeholder="Search expenses or dates"
                  value={searchText}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  onChange={(event) => {
                    setSearchText(event.target.value);
                    setActiveSuggestionIndex(0);
                  }}
                  onKeyDown={handleSearchKeyDown}
                />
              </label>
              {suggestionItems.length > 0 && (
                <SearchSuggestions
                  items={suggestionItems}
                  activeIndex={activeSuggestionIndex}
                  onSelect={selectSearchSuggestion}
                  onHover={setActiveSuggestionIndex}
                  onClearRecent={showRecentSearchClear ? () => setRecentSearches([]) : undefined}
                />
              )}
            </div>
            <button className="dash-icon-btn" aria-label="Notifications"><Icon name="bell" size={19}/><span /></button>
            <button className="dash-add-btn" onClick={() => setShowAddExpense(true)}><Icon name="plus" size={18}/> Add expense</button>
          </div>
        </header>

        <div className="period-chip-row" aria-label="Overview period filters">
          <PeriodChip label="This week" active={isSamePeriod(activePeriod, presetPeriods.week)} onClick={() => choosePeriod(presetPeriods.week)} />
          <PeriodChip label="This month" active={isSamePeriod(activePeriod, presetPeriods.month)} onClick={() => choosePeriod(presetPeriods.month)} />
          <PeriodChip label="Last month" active={isSamePeriod(activePeriod, presetPeriods.lastMonth)} onClick={() => choosePeriod(presetPeriods.lastMonth)} />
          <PeriodChip label="Last 3 months" active={isSamePeriod(activePeriod, presetPeriods.lastThreeMonths)} onClick={() => choosePeriod(presetPeriods.lastThreeMonths)} />
          <PeriodChip label="This year" active={isSamePeriod(activePeriod, presetPeriods.year)} onClick={() => choosePeriod(presetPeriods.year)} />
          <PeriodChip label="Custom" active={customPeriodActive} onClick={() => {
            setShowCustomRange((open) => !open);
            if (activePeriod.type === "range") {
              setCustomStart(activePeriod.startDate);
              setCustomEnd(activePeriod.endDate);
            }
          }} />
        </div>
        {showCustomRange && (
          <div className="period-custom-panel">
            <label>From <input type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} /></label>
            <label>To <input type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} /></label>
            <button type="button" className="calendar-primary-button" disabled={!customRangeValid} onClick={applyCustomRange}>Apply custom range</button>
          </div>
        )}

        <section className="dash-cards">
          <div className="dash-card balance-card">
            <div className="dash-card-head"><span>Remaining</span><span className="dash-card-icon"><Icon name="wallet"/></span></div>
            <p className="dash-card-value">{formatINR(periodRemaining)}</p>
            <div className="dash-progress"><span style={{ width: `${spentPercent}%` }}/></div>
            <p className="dash-card-meta">{periodBudget > 0 ? `${Math.round(spentPercent)}% of period budget used` : `No budget for ${activePeriod.label}`}</p>
          </div>
          <div className="dash-card">
            <div className="dash-card-head"><span>Total spent</span><span className={`dash-trend${monthComparison?.trend === "up" ? " up" : monthComparison?.trend === "down" ? " down" : ""}`}>{activePeriod.type === "month" ? monthComparison?.text : activePeriod.label}</span></div>
            <p className="dash-card-value">{formatINR(periodTotal)}</p>
            <p className="dash-card-meta">{periodExpenses.length} {periodExpenses.length === 1 ? "transaction" : "transactions"} · {activePeriod.label}</p>
          </div>
          <div className="dash-card">
            <div className="dash-card-head"><span>Budget vs spent</span><button className="dash-edit-budget" onClick={() => setShowAddBudget(true)}><Icon name="edit" size={14}/> Edit</button></div>
            <p className="dash-card-value">{formatINR(periodTotal)} <small>{periodBudget > 0 ? `of ${formatINR(periodBudget)}` : "budget not set"}</small></p>
            <div className={`dash-period-progress${periodTotal > periodBudget && periodBudget > 0 ? " over" : ""}`}><span style={{ width: `${Math.min(periodBudget > 0 ? (periodTotal / periodBudget) * 100 : 0, 100)}%` }}/></div>
            <p className="dash-card-meta">{activePeriod.label}</p>
          </div>
        </section>

        {periodRemaining < 0 && (
          <p className="dash-warning">Warning: spending is over budget for this period.</p>
        )}
        {noPeriodExpenses && !textSearchTerm && (
          <div className="overview-empty-state">
            <strong>No expenses in {activePeriod.label}</strong>
            <button type="button" onClick={clearPeriod}>Go back to the current month</button>
          </div>
        )}

        <section className="dash-chart-grid">
          <div className="dash-chart-panel">
            <div className="dash-panel-head dash-chart-panel-head">
              <div><p className="dash-panel-kicker">SPENDING ACTIVITY</p><h2>{chartTitle}</h2></div>
              <div className="dash-chart-controls">
                <button
                  type="button"
                  className="dash-chart-type-button"
                  title={`Switch to ${chartType === "line" ? "bar" : "line"} chart`}
                  aria-label={`Switch to ${chartType === "line" ? "bar" : "line"} chart`}
                  onClick={() => setChartType((current) => current === "line" ? "bar" : "line")}
                >
                  <Icon name={chartType === "line" ? "barChart" : "lineChart"} size={15} />
                </button>
                <div className="dash-range-selector" ref={rangeSelectorRef}>
                <button
                  type="button"
                  className="dash-period dash-period-button"
                  aria-haspopup="menu"
                  aria-expanded={isRangeMenuOpen}
                  onClick={() => setIsRangeMenuOpen((open) => !open)}
                >
                  {selectedRangeLabel}
                  <svg viewBox="0 0 12 12" aria-hidden="true"><path d="m3 4.5 3 3 3-3" /></svg>
                </button>
                {isRangeMenuOpen && (
                  <div className="dash-range-menu" role="menu" aria-label="Spending range">
                    {[
                      { value: "week", label: "This week" },
                      { value: "month", label: "This month" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={`dash-range-option${range === option.value ? " selected" : ""}`}
                        role="menuitemradio"
                        aria-checked={range === option.value}
                        onClick={() => {
                          setRange(option.value);
                          setIsRangeMenuOpen(false);
                        }}
                      >
                        <span>{option.label}</span>
                        {range === option.value && <span className="dash-range-check" aria-hidden="true">✓</span>}
                      </button>
                    ))}
                  </div>
                )}
                </div>
              </div>
            </div>
            <div className="dash-area-chart">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart key={`${range}-${chartType}`} data={chartData} barCategoryGap="28%" margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="spendingFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6c63ff" stopOpacity={0.24}/>
                      <stop offset="100%" stopColor="#6c63ff" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--dash-chart-grid)"/>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill:"#9295a1", fontSize:12 }} dy={8}/>
                  <YAxis domain={hasSpending ? [0, "auto"] : [0, 1]} axisLine={false} tickLine={false} tick={{ fill:"#9295a1", fontSize:12 }} tickFormatter={(value) => `₹${value/1000}k`}/>
                  <Tooltip cursor={false} formatter={(value) => formatINR(value)} contentStyle={{ borderRadius:10, border:"1px solid var(--dash-chart-tooltip-border)", background:"var(--dash-chart-tooltip-bg)", color:"var(--dash-chart-tooltip-color)", boxShadow:"0 8px 24px rgba(20,20,40,.08)" }}/>
                  {chartType === "line" ? (
                    <Area type="monotone" dataKey="amount" stroke="#6c63ff" strokeWidth={3} fill="url(#spendingFill)" activeDot={{ r:5, fill:"#6c63ff", stroke:"#fff", strokeWidth:3 }} isAnimationActive animationDuration={650} animationEasing="ease-in-out"/>
                  ) : (
                    <Bar dataKey="amount" fill="#6c63ff" radius={[6,6,0,0]} isAnimationActive animationDuration={650} animationEasing="ease-in-out"/>
                  )}
                </ComposedChart>
              </ResponsiveContainer>
              {!hasSpending && <span className="dash-chart-empty">No spending yet</span>}
            </div>
          </div>

          <ExpenseChart expenses={periodExpenses} />
        </section>

        <SpendingHistory onEdit={onEdit} />

        <section className="dash-bottom-grid">
          <div className="dash-chart-panel category-panel">
            <div className="dash-panel-head">
              <div><p className="dash-panel-kicker">BREAKDOWN</p><h2>Spending by category</h2></div>
            </div>
            <div className="dash-bar-chart">
              {categoryData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee"/>
                    <XAxis type="number" hide/>
                    <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} width={82} tick={{ fill:"#55586a", fontSize:12 }}/>
                    <Tooltip cursor={false} formatter={(value) => formatINR(value)} contentStyle={{ borderRadius:10, border:"1px solid var(--dash-chart-tooltip-border)", background:"var(--dash-chart-tooltip-bg)", color:"var(--dash-chart-tooltip-color)" }}/>
                    <Bar dataKey="amount" fill="#7267ef" radius={[0,6,6,0]} barSize={14}/>
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="dash-empty">No category data yet.</p>}
            </div>
          </div>

          <div className="dash-chart-panel transactions-panel">
            <div className="dash-panel-head">
              <div><p className="dash-panel-kicker">LATEST</p><h2>Recent transactions</h2></div>
              <button className="dash-view-all" onClick={() => setShowAllTransactions(true)}>View all</button>
            </div>
            {searchNoResults ? (
              <div className="overview-empty-state">
                <strong>No expenses found</strong>
                <button type="button" onClick={clearSearch}>Clear search</button>
              </div>
            ) : noPeriodExpenses ? (
              <p className="dash-empty">No expenses in {activePeriod.label}.</p>
            ) : visibleExpenses.length === 0 ? (
              <p className="dash-empty">No transactions to show.</p>
            ) : (
              <ul className="dash-list">
                {visibleExpenses.slice(0, 5).map((expense) => (
                  <TransactionItem
                    key={expense.id}
                    expense={expense}
                    onEdit={onEdit}
                    onDelete={(id) => dispatch({ type: "delete_expense", payload: id })}
                    searchTerm={textSearchTerm}
                  />
                ))}
              </ul>
            )}
          </div>
        </section>
          </>
        ) : (
          <CalendarPage onBack={goToOverview} onEdit={onEdit} />
        )}
      </main>
      <Modal isOpen={showAddBudget} onClose={() => setShowAddBudget(false)}>
        <Addbudget onDone={() => setShowAddBudget(false)} />
      </Modal>
      <Modal isOpen={showAddExpense} onClose={() => setShowAddExpense(false)}>
        <AddExpense onDone={() => setShowAddExpense(false)} />
      </Modal>
      <Modal isOpen={showAllTransactions} onClose={() => setShowAllTransactions(false)}>
        <section className="transactions-modal">
          <header className="modal-header">
            <h2>Transactions · {activePeriod.label}</h2>
            <button type="button" className="modal-close" onClick={() => setShowAllTransactions(false)} aria-label="Close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M5 5l14 14M19 5L5 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </header>
          {visibleExpenses.length === 0 ? (
            <p className="dash-empty">{searchNoResults ? "No expenses found." : `No expenses in ${activePeriod.label}.`}</p>
          ) : (
            <ul className="dash-list">
              {visibleExpenses.map((expense) => (
                <TransactionItem
                  key={expense.id}
                  expense={expense}
                  onEdit={onEdit}
                  onDelete={(id) => dispatch({ type: "delete_expense", payload: id })}
                  searchTerm={textSearchTerm}
                />
              ))}
            </ul>
          )}
        </section>
      </Modal>
    </div>
  );
}

export default Dashboard;