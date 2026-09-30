/** "12 hours", "2 days", "1 week": notice and preparation times as Hosts think of them. */
export function formatHours(hours: number): string {
  if (hours === 0) return 'None';
  if (hours % 168 === 0) return `${hours / 168} ${hours === 168 ? 'week' : 'weeks'}`;
  if (hours >= 24 && hours % 24 === 0) return `${hours / 24} ${hours === 24 ? 'day' : 'days'}`;
  return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
}

const NOTICE_HOURS = [0, 1, 2, 3, 6, 12, 24, 48, 72, 168];
const BUFFER_HOURS = [0, 1, 2, 3, 4, 6, 12, 24, 48];

/** The choices, plus the saved value when it's one the list doesn't have. */
function options(hours: number[], current: number, noneLabel: string) {
  const values = hours.includes(current) ? hours : [...hours, current].sort((a, b) => a - b);
  return values.map((value) => ({
    value: String(value),
    label: value === 0 ? noneLabel : formatHours(value),
  }));
}

/** How long before a trip starts guests must book (plan §3, `rules.minNoticeHours`, up to 14 days). */
export const noticeOptions = (current: number) => options(NOTICE_HOURS, current, 'No notice needed');

/** Time kept free after each trip to clean and refuel (`rules.bufferHours`, up to 72 hours). */
export const bufferOptions = (current: number) => options(BUFFER_HOURS, current, 'No gap');
