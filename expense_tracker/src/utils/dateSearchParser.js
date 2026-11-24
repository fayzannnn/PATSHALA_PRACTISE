import {
  createDayPeriod,
  createMonthPeriod,
  createRangePeriod,
  getDateKey,
  getMonthEnd,
  getMonthStart,
  parseDateKey,
  shiftMonth,
} from "./dateHelpers.js";

const MONTHS = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

function monthNumber(value) {
  return MONTHS[value.toLowerCase()] || null;
}

function datePeriod(year, month, day) {
  const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return parseDateKey(dateKey) ? createDayPeriod(dateKey) : null;
}

function getWeekPeriod(date, offset, label) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7) + offset * 7);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return createRangePeriod(getDateKey(start), getDateKey(end), label);
}

function parseEndpoint(text, today) {
  let match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (match) {
    const date = datePeriod(Number(match[1]), Number(match[2]), Number(match[3]));
    return date ? { kind: "day", date: date.startDate, year: date.year, explicitYear: true } : null;
  }

  match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
  if (match) {
    const date = datePeriod(Number(match[3]), Number(match[2]), Number(match[1]));
    return date ? { kind: "day", date: date.startDate, year: date.year, explicitYear: true } : null;
  }

  match = /^(\d{1,2})\s+([a-z]+)(?:\s+(\d{4}))?$/.exec(text);
  if (match && monthNumber(match[2])) {
    const year = Number(match[3] || today.getFullYear());
    const date = datePeriod(year, monthNumber(match[2]), Number(match[1]));
    return date ? { kind: "day", date: date.startDate, year, explicitYear: Boolean(match[3]) } : null;
  }

  match = /^([a-z]+)\s+(\d{1,2})(?:,?\s+(\d{4}))?$/.exec(text);
  if (match && monthNumber(match[1])) {
    const year = Number(match[3] || today.getFullYear());
    const date = datePeriod(year, monthNumber(match[1]), Number(match[2]));
    return date ? { kind: "day", date: date.startDate, year, explicitYear: Boolean(match[3]) } : null;
  }

  match = /^([a-z]+)(?:\s+(\d{4}))?$/.exec(text);
  if (match && monthNumber(match[1])) {
    const targetYear = Number(match[2] || today.getFullYear());
    if (targetYear < 1000 || targetYear > 9999) return null;
    return {
      kind: "month",
      month: monthNumber(match[1]),
      year: targetYear,
      explicitYear: Boolean(match[2]),
    };
  }

  return null;
}

function parseRange(text, today) {
  const match = /^(.+?)\s+(?:to|-|–|—)\s+(.+)$/.exec(text);
  if (!match) return null;
  const start = parseEndpoint(match[1].trim(), today);
  const end = parseEndpoint(match[2].trim(), today);
  if (!start || !end) return null;

  let startDate;
  if (start.kind === "day") {
    startDate = start.date;
  } else {
    startDate = getMonthStart(start.year, start.month);
  }

  let endDate;
  if (end.kind === "day") {
    endDate = end.date;
  } else {
    let endYear = end.year;
    if (!end.explicitYear && endYear < start.year) endYear = start.year;
    if (!end.explicitYear && end.month < (start.kind === "month" ? start.month : parseDateKey(startDate).getMonth() + 1)) {
      endYear = Math.max(endYear, start.year + 1);
    }
    endDate = getMonthEnd(endYear, end.month);
  }

  if (startDate > endDate) {
    if (end.explicitYear) return null;
    const parsedEnd = parseDateKey(endDate);
    parsedEnd.setFullYear(parsedEnd.getFullYear() + 1);
    endDate = getDateKey(parsedEnd);
  }

  return createRangePeriod(startDate, endDate);
}

export function parseDateQuery(text, today = new Date()) {
  if (typeof text !== "string") return null;
  const query = text.trim().toLowerCase().replace(/\s+/g, " ");
  if (!query) return null;

  const todayKey = getDateKey(today);
  const year = today.getFullYear();
  const month = today.getMonth() + 1;

  if (query === "today") return createDayPeriod(todayKey);
  if (query === "yesterday") {
    const yesterday = new Date(year, month - 1, today.getDate() - 1);
    return createDayPeriod(getDateKey(yesterday));
  }
  if (query === "this week") return getWeekPeriod(today, 0, "This week");
  if (query === "last week") return getWeekPeriod(today, -1, "Last week");
  if (query === "this month") return createMonthPeriod(year, month);
  if (query === "last month") {
    const previous = shiftMonth(year, month, -1);
    return createMonthPeriod(previous.year, previous.month);
  }
  if (query === "this year") {
    return createRangePeriod(`${year}-01-01`, todayKey, `Year to date (${year})`);
  }

  const range = parseRange(query, today);
  if (range) return range;

  let match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(query);
  if (match) return datePeriod(Number(match[1]), Number(match[2]), Number(match[3]));

  match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(query);
  if (match) return datePeriod(Number(match[3]), Number(match[2]), Number(match[1]));

  match = /^(\d{1,2})\/(\d{4})$/.exec(query);
  if (match) {
    const targetMonth = Number(match[1]);
    const targetYear = Number(match[2]);
    return targetMonth >= 1 && targetMonth <= 12
      ? createMonthPeriod(targetYear, targetMonth)
      : null;
  }

  match = /^(\d{4})-(\d{2})$/.exec(query);
  if (match) {
    const targetMonth = Number(match[2]);
    return targetMonth >= 1 && targetMonth <= 12
      ? createMonthPeriod(Number(match[1]), targetMonth)
      : null;
  }

  const endpoint = parseEndpoint(query, today);
  if (!endpoint) return null;
  if (endpoint.kind === "day") return createDayPeriod(endpoint.date);
  return createMonthPeriod(endpoint.year, endpoint.month);
}
