// Shared date math for recurring transactions (kept in sync with the SQL
// `recurring_occurrence` helper in 20260703120000_recurring.sql).
import dayjs from "dayjs";

// Clamp a day-of-month to the given month's length, e.g. day 31 in Feb -> 28/29.
function clampDay(monthAnchor: dayjs.Dayjs, dayOfMonth: number): dayjs.Dayjs {
  const day = Math.min(dayOfMonth, monthAnchor.daysInMonth());
  return monthAnchor.date(day);
}

// First occurrence of `dayOfMonth` on or after `startDate` (ISO YYYY-MM-DD).
// The cursor is anchored to the series start, so how far back the engine posts
// is controlled entirely by the chosen start date.
export function firstOccurrenceOnOrAfter(startDate: string, dayOfMonth: number): string {
  const start = dayjs(startDate);
  let occ = clampDay(start.startOf("month"), dayOfMonth);
  if (occ.isBefore(start, "day")) {
    occ = clampDay(start.add(1, "month").startOf("month"), dayOfMonth);
  }
  return occ.format("YYYY-MM-DD");
}

// Last payment date of a fixed-term series (e.g. instalment): the occurrence in
// the month that is `termMonths - 1` months after the first occurrence.
export function lastOccurrenceForTerm(
  startDate: string,
  dayOfMonth: number,
  termMonths: number,
): string {
  const first = dayjs(firstOccurrenceOnOrAfter(startDate, dayOfMonth));
  const anchor = first.add(termMonths - 1, "month").startOf("month");
  return clampDay(anchor, dayOfMonth).format("YYYY-MM-DD");
}
