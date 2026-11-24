import { useMemo, useState } from "react";
import { useExpenses } from "../../context/ExpenseContext";
import {
  createDayPeriod,
  createMonthPeriod,
  createRangePeriod,
  formatDateKey,
  formatMonth,
  getDateKey,
  getMonthKey,
  groupExpensesByDay,
  groupExpensesByMonth,
  shiftMonth,
} from "../../utils/dateHelpers";
import { formatINR } from "../../utils/historyHelpers";
import CalendarGrid from "./CalendarGrid";
import DayDetailsModal from "./DayDetailsModal";
import YearView from "./YearView";
import "./calendar.css";

function CalendarPage({ onBack, onEdit }) {
  const { expenses, budget, budgets = {}, activePeriod, setPeriod, dispatch } = useExpenses();
  const initialPeriodDate = activePeriod.type === "month"
    ? new Date(activePeriod.year, activePeriod.month - 1, 1)
    : activePeriod.startDate
      ? new Date(`${activePeriod.startDate}T00:00:00`)
      : new Date();
  const [displayMonth, setDisplayMonth] = useState(() => initialPeriodDate);
  const [selectedDay, setSelectedDay] = useState(null);
  const [isYearView, setIsYearView] = useState(false);
  const [rangeMode, setRangeMode] = useState(false);
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const year = displayMonth.getFullYear();
  const month = displayMonth.getMonth() + 1;
  const monthKey = getMonthKey(year, month);
  const currentDate = new Date();
  const todayKey = getDateKey(currentDate);
  const todayDay = currentDate.getDate();
  const currentMonthKey = getMonthKey(currentDate.getFullYear(), currentDate.getMonth() + 1);
  const isCurrentMonth = monthKey === currentMonthKey;
  const monthLabel = formatMonth(year, month);

  const allDays = useMemo(() => groupExpensesByDay(expenses), [expenses]);
  const monthDays = useMemo(() => new Map(
    [...allDays.entries()].filter(([date]) => date.slice(0, 7) === monthKey)
  ), [allDays, monthKey]);
  const months = useMemo(() => groupExpensesByMonth(expenses), [expenses]);
  const monthSummary = useMemo(() => {
    const daysInMonth = new Date(year, month, 0).getDate();
    const dayEntries = [...monthDays.values()];
    const highestDay = dayEntries.reduce((highest, day) => day.total > (highest?.total || 0) ? day : highest, null);
    const spentDays = dayEntries.filter((day) => day.total > 0).length;
    const daysElapsed = monthKey > currentMonthKey ? 0 : isCurrentMonth ? todayDay : daysInMonth;
    return {
      total: months.get(monthKey)?.total || 0,
      highestDay,
      noSpendDays: Math.max(0, daysElapsed - spentDays),
    };
  }, [year, month, monthDays, months, monthKey, currentMonthKey, isCurrentMonth, todayDay]);
  const monthBudget = Number(budgets[monthKey] ?? (isCurrentMonth ? budget : 0)) || 0;
  const budgetPercent = monthBudget > 0 ? (monthSummary.total / monthBudget) * 100 : 0;

  const navigateMonth = (amount) => {
    const next = shiftMonth(year, month, amount);
    setDisplayMonth(new Date(next.year, next.month - 1, 1));
    setIsYearView(false);
  };

  const applyMonthToOverview = (targetYear = year, targetMonth = month) => {
    setPeriod(createMonthPeriod(targetYear, targetMonth));
    onBack();
  };

  const handleDaySelect = (date) => {
    if (rangeMode) {
      if (!rangeStart || rangeEnd) {
        setRangeStart(date);
        setRangeEnd("");
      } else if (date < rangeStart) {
        setRangeEnd(rangeStart);
        setRangeStart(date);
      } else {
        setRangeEnd(date);
      }
      const selectedDate = new Date(`${date}T00:00:00`);
      setDisplayMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
      return;
    }

    setSelectedDay(date);
    const selectedDate = new Date(`${date}T00:00:00`);
    if (selectedDate.getFullYear() !== year || selectedDate.getMonth() + 1 !== month) {
      setDisplayMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
    }
  };

  const applySelectedRange = () => {
    const period = createRangePeriod(rangeStart, rangeEnd);
    if (!period) return;
    setPeriod(period);
    setRangeMode(false);
    setRangeStart("");
    setRangeEnd("");
    onBack();
  };

  const applySelectedDay = (date) => {
    const period = createDayPeriod(date);
    if (!period) return;
    setPeriod(period);
    setSelectedDay(null);
    onBack();
  };

  return (
    <div className="calendar-page">
      <header className="calendar-page-header">
        <div>
          <p className="calendar-kicker">PLAN YOUR SPENDING</p>
          <h1>Calendar</h1>
          <p className="calendar-subtitle">Explore expenses by day, month, or year.</p>
        </div>
        <button type="button" className="calendar-overview-button" onClick={() => applyMonthToOverview()}>
          View this month on Overview
        </button>
      </header>

      <section className="calendar-layout">
        <div className="calendar-main-panel">
          <div className="calendar-toolbar">
            <div className="calendar-month-navigation">
              <button type="button" className="calendar-nav-arrow" aria-label="Previous month" onClick={() => navigateMonth(-1)}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
              </button>
              <button type="button" className="calendar-month-title" onClick={() => applyMonthToOverview()}>
                {monthLabel}
              </button>
              <button type="button" className="calendar-nav-arrow" aria-label="Next month" onClick={() => navigateMonth(1)}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
              </button>
            </div>
            <div className="calendar-toolbar-actions">
              <input
                type="month"
                aria-label="Choose calendar month"
                value={`${year}-${String(month).padStart(2, "0")}`}
                onChange={(event) => {
                  if (!event.target.value) return;
                  const [nextYear, nextMonth] = event.target.value.split("-").map(Number);
                  setDisplayMonth(new Date(nextYear, nextMonth - 1, 1));
                  setIsYearView(false);
                }}
              />
              <button type="button" className="calendar-quiet-button" onClick={() => {
                const now = new Date();
                setDisplayMonth(new Date(now.getFullYear(), now.getMonth(), 1));
              }}>
                Today
              </button>
              <button type="button" className={`calendar-quiet-button${isYearView ? " selected" : ""}`} onClick={() => setIsYearView((shown) => !shown)}>
                {isYearView ? "Month view" : "Year view"}
              </button>
            </div>
          </div>

          {rangeMode && (
            <div className="calendar-range-banner">
              <span>
                {!rangeStart ? "Select a start day" : rangeEnd ? `${rangeStart} – ${rangeEnd}` : "Select an end day"}
              </span>
              <div>
                {rangeStart && rangeEnd && <button type="button" className="calendar-primary-button" onClick={applySelectedRange}>Apply range</button>}
                <button type="button" className="calendar-cancel-range" onClick={() => {
                  setRangeMode(false);
                  setRangeStart("");
                  setRangeEnd("");
                }}>Cancel</button>
              </div>
            </div>
          )}

          {!isYearView && !rangeMode && (
            <div className="calendar-grid-actions">
              <button type="button" className="calendar-quiet-button" onClick={() => {
                setRangeMode(true);
                setRangeStart("");
                setRangeEnd("");
              }}>Select date range</button>
            </div>
          )}

          {isYearView ? (
            <YearView
              year={year}
              months={months}
              selectedMonth={activePeriod.type === "month" ? getMonthKey(activePeriod.year, activePeriod.month) : monthKey}
              onSelectMonth={(targetMonth) => {
                setDisplayMonth(new Date(year, targetMonth - 1, 1));
                setIsYearView(false);
                setPeriod(createMonthPeriod(year, targetMonth));
              }}
            />
          ) : (
            <CalendarGrid
              year={year}
              month={month}
              days={monthDays}
              today={todayKey}
              selectedDate={selectedDay}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              rangeMode={rangeMode}
              onSelectDay={handleDaySelect}
            />
          )}
        </div>

        <aside className="calendar-summary-panel">
          <p className="calendar-kicker">MONTH AT A GLANCE</p>
          <h2>{monthLabel}</h2>
          <div className="calendar-summary-stat">
            <span>Total spent</span>
            <strong>{formatINR(monthSummary.total)}</strong>
          </div>
          <div className="calendar-summary-stat">
            <span>Budget used</span>
            <strong>{monthBudget > 0 ? `${Math.round(budgetPercent)}%` : "No budget set"}</strong>
            {monthBudget > 0 && (
              <div className={`calendar-budget-track${budgetPercent > 100 ? " over" : ""}`}>
                <span style={{ width: `${Math.min(budgetPercent, 100)}%` }} />
              </div>
            )}
          </div>
          <div className="calendar-summary-stat">
            <span>Highest spending day</span>
            <strong>{monthSummary.highestDay ? formatINR(monthSummary.highestDay.total) : "—"}</strong>
            {monthSummary.highestDay && <small>{formatDateKey(monthSummary.highestDay.date)}</small>}
          </div>
          <div className="calendar-summary-stat">
            <span>No-spend days</span>
            <strong>{monthSummary.noSpendDays}</strong>
          </div>
          <button type="button" className="calendar-summary-link" onClick={() => applyMonthToOverview()}>
            View month on Overview
          </button>
        </aside>
      </section>

      <DayDetailsModal
        date={selectedDay}
        day={selectedDay ? allDays.get(selectedDay) : null}
        isCurrentMonth={selectedDay?.slice(0, 7) === currentMonthKey}
        onClose={() => setSelectedDay(null)}
        onApply={applySelectedDay}
        onEdit={onEdit}
        onDelete={(id) => dispatch({ type: "delete_expense", payload: id })}
      />
    </div>
  );
}

export default CalendarPage;
