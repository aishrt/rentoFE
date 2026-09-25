const pad = (value: number) => String(value).padStart(2, '0');

/** "2026-10-12" in the device's local time, the format of <input type="date">. */
export function toDateInputValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Combines <input type="date"> and <input type="time"> values into a local Date, or null if either is invalid. */
export function combineDateTime(date: string, time: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
  const result = new Date(`${date}T${time}`);
  return Number.isNaN(result.getTime()) ? null : result;
}
