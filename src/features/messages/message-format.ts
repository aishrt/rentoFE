import type { Message, ThreadSummary } from '@/api/types';

/* How the inbox and conversations write times and previews, all in NZ time (plan §3). */

const zone = 'Pacific/Auckland';
const nzTime = new Intl.DateTimeFormat('en-NZ', { timeZone: zone, hour: 'numeric', minute: '2-digit' });
const nzDayKey = new Intl.DateTimeFormat('en-CA', { timeZone: zone });
const nzDay = new Intl.DateTimeFormat('en-NZ', {
  timeZone: zone,
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});
const nzDayWithYear = new Intl.DateTimeFormat('en-NZ', {
  timeZone: zone,
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

/** "10:42 am". */
export const formatMessageTime = (iso: string) =>
  nzTime.format(new Date(iso)).replace(/\s?([ap])\.?m\.?/i, ' $1m');

/** The NZ calendar day of an instant, "2026-10-12", for grouping messages by day. */
export const messageDay = (iso: string) => nzDayKey.format(new Date(iso));

/** "Today", "Yesterday", "Mon, 12 Oct", or with the year once it isn't this year: a divider between days. */
export function formatMessageDay(iso: string, now = new Date()): string {
  const day = messageDay(iso);
  if (day === nzDayKey.format(now)) return 'Today';
  if (day === nzDayKey.format(new Date(now.getTime() - 24 * 60 * 60 * 1000))) return 'Yesterday';
  return day.slice(0, 4) === nzDayKey.format(now).slice(0, 4)
    ? nzDay.format(new Date(iso))
    : nzDayWithYear.format(new Date(iso));
}

/** When the inbox shows a conversation last changed: the time today, otherwise the day. */
export function formatInboxTime(iso: string, now = new Date()): string {
  return messageDay(iso) === nzDayKey.format(now) ? formatMessageTime(iso) : formatMessageDay(iso, now);
}

/** The inbox's preview of the last message: "You: See you then", "Sent a photo", or Rento Vroom's. */
export function lastMessagePreview(last: NonNullable<ThreadSummary['lastMessage']>): string {
  const text = last.body.trim() || (last.hasPhotos ? 'Sent a photo' : '');
  return last.from === 'ME' ? `You: ${text}` : text;
}

/** Messages split into NZ days, oldest first, for the dividers. */
export function groupByDay(messages: Message[]): { day: string; messages: Message[] }[] {
  const groups: { day: string; messages: Message[] }[] = [];
  for (const message of messages) {
    const day = messageDay(message.createdAt);
    const last = groups.at(-1);
    if (last && last.day === day) last.messages.push(message);
    else groups.push({ day, messages: [message] });
  }
  return groups;
}

/** The first letter of each word in a first name, for an avatar without a photo. */
export const nameInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('') || '?';
