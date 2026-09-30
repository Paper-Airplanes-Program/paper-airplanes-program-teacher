import { requireActive } from "@/lib/actor";
import { fail, newId, ok, read, update } from "@/lib/db";
import {
  TIME,
  isDay,
  readLink,
  readMinutes,
  syncSessions,
  weekOf,
  weeklyFrom,
  zonedToUtc,
} from "@/lib/schedule";
import { withWeeks } from "@/lib/semester";
import type { Assignment, Pair, Schedule, Session, StoredSemester } from "@/lib/types";

const iso = (time: number) => new Date(time).toISOString();

export async function PUT(request: Request) {
  const user = await requireActive();
  if (user instanceof Response) return user;

  const body = (await request.json()) as Record<string, unknown>;
  const [pairs, stored, schedules] = await Promise.all([
    read<Pair[]>("pairs"),
    read<StoredSemester>("semester"),
    read<Schedule[]>("schedules"),
  ]);
  const pair = pairs.find((entry) => entry.tutor === user.name && entry.student === body.studentName);
  if (!pair) return fail("not_your_student", 403);

  const { startDate, time } = body;
  if (!isDay(startDate)) return fail("bad_date");
  if (typeof time !== "string" || !TIME.test(time)) return fail("bad_time");
  const minutes = readMinutes(body.minutes);
  if (!minutes) return fail("bad_minutes");
  const joinUrl = readLink(body.joinUrl);
  if (!joinUrl) return fail("bad_link");

  const semester = withWeeks(stored);
  if (weekOf(semester, startDate) === null) return fail("outside_semester");
  const existing = schedules.find(
    (entry) =>
      entry.semester === semester.id &&
      entry.studentName === pair.student &&
      entry.tutorName === user.name,
  );
  const schedule: Schedule = {
    id: existing?.id ?? newId("sch"),
    semester: semester.id,
    studentName: pair.student,
    tutorName: user.name,
    startDate,
    time,
    timezone: user.timezone,
    minutes,
    joinUrl,
    updatedUtc: new Date().toISOString(),
  };
  await update<Schedule[]>("schedules", (current) => [
    ...current.filter((entry) => entry.id !== schedule.id),
    schedule,
  ]);

  const homework = await read<Assignment[]>("homework");
  const now = Date.now();
  const slots = weeklyFrom(semester, startDate).map(({ week, date }) => {
    const start = zonedToUtc(date, time, user.timezone);
    return { week, start, end: start + minutes * 60_000 };
  });

  await update<Session[]>("sessions", (current) =>
    syncSessions(current, {
      scheduleId: schedule.id,
      slots,
      joinUrl,
      now,
      pinned: new Set(homework.map((item) => item.sessionId)),
      create: (slot) => ({
        id: newId("ses"),
        week: slot.week,
        semester: semester.id,
        startUtc: iso(slot.start),
        endUtc: iso(slot.end),
        minutes: null,
        level: pair.studentLevel,
        unitNo: 0,
        topic: { en: "", ar: "" },
        notes: null,
        status: "scheduled",
        joinUrl,
        studentName: pair.student,
        tutorName: user.name,
        scheduleId: schedule.id,
      }),
    }),
  );

  return ok(schedule);
}
