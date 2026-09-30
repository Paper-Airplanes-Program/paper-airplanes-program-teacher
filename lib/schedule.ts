import type { Semester, Session } from "@/lib/types";

const DAY = 86_400_000;

export type Slot = { week: number; start: number; end: number };

const iso = (time: number) => new Date(time).toISOString();

export function syncSessions(
  current: Session[],
  {
    scheduleId,
    slots,
    joinUrl,
    now,
    pinned,
    create,
  }: {
    scheduleId: string;
    slots: Slot[];
    joinUrl: string;
    now: number;
    pinned: Set<string>;
    create: (slot: Slot) => Session;
  },
): Session[] {
  const slotOf = new Map(slots.map((slot) => [slot.week, slot]));
  const kept: Session[] = [];
  for (const session of current) {
    if (session.scheduleId !== scheduleId || Date.parse(session.startUtc) <= now) {
      kept.push(session);
      continue;
    }
    const slot = slotOf.get(session.week);
    if (!slot) {
      if (pinned.has(session.id)) kept.push({ ...session, joinUrl });
      continue;
    }
    kept.push(
      slot.start <= now
        ? { ...session, joinUrl }
        : { ...session, startUtc: iso(slot.start), endUtc: iso(slot.end), joinUrl },
    );
  }

  const weeks = new Set(
    kept.filter((session) => session.scheduleId === scheduleId).map((session) => session.week),
  );
  const added = slots.filter((slot) => slot.start > now && !weeks.has(slot.week)).map(create);
  return [...kept, ...added];
}

function offsetMinutes(time: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(time));
  const part = (type: string) => Number(parts.find((entry) => entry.type === type)?.value);
  const local = Date.UTC(
    part("year"),
    part("month") - 1,
    part("day"),
    part("hour"),
    part("minute"),
    part("second"),
  );
  return (local - time) / 60_000;
}

export function zonedToUtc(date: string, time: string, timeZone: string): number {
  const naive = Date.parse(`${date}T${time}:00Z`);
  const guess = naive - offsetMinutes(naive, timeZone) * 60_000;
  return naive - offsetMinutes(guess, timeZone) * 60_000;
}

export function weekOf(semester: Semester, date: string): number | null {
  return semester.weeks.find((entry) => entry.start <= date && date <= entry.end)?.week ?? null;
}

export function weeklyFrom(semester: Semester, startDate: string) {
  const dates: { week: number; date: string }[] = [];
  for (let time = Date.parse(startDate); ; time += 7 * DAY) {
    const date = new Date(time).toISOString().slice(0, 10);
    if (date > semester.end) break;
    const week = weekOf(semester, date);
    if (week !== null) dates.push({ week, date });
  }
  return dates;
}

export function isDay(value: unknown): value is string {
  if (typeof value !== "string" || !DATE.test(value)) return false;
  const time = Date.parse(value);
  return !Number.isNaN(time) && new Date(time).toISOString().slice(0, 10) === value;
}

export const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
export const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function readLink(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const link = value.trim();
  if (link.length > 300 || !/^https:\/\/[^\s]+$/.test(link)) return null;
  try {
    new URL(link);
    return link;
  } catch {
    return null;
  }
}

export function readMinutes(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 15 && value <= 240
    ? value
    : null;
}
