import { requireActive } from "@/lib/actor";
import { fail, newId, ok, read, update } from "@/lib/db";
import { DATE, TIME, readLink, readMinutes, weekOf, zonedToUtc } from "@/lib/schedule";
import { withWeeks } from "@/lib/semester";
import type { LessonFlags, Pair, Schedule, Session, StoredSemester } from "@/lib/types";

export async function GET() {
  const user = await requireActive();
  if (user instanceof Response) return user;
  const [sessions, pairs, flags, schedules, semester] = await Promise.all([
    read<Session[]>("sessions"),
    read<Pair[]>("pairs"),
    read<LessonFlags>("lesson-flags"),
    read<Schedule[]>("schedules"),
    read<StoredSemester>("semester"),
  ]);
  const mine = new Set(
    pairs.filter((pair) => pair.tutor === user.name).map((pair) => pair.student),
  );
  return ok({
    sessions: sessions.filter(
      (s) => s.semester === semester.id && s.studentName && mine.has(s.studentName),
    ),
    flags,
    schedules: schedules.filter(
      (schedule) => schedule.semester === semester.id && schedule.tutorName === user.name,
    ),
  });
}

export async function POST(request: Request) {
  const user = await requireActive();
  if (user instanceof Response) return user;

  const body = (await request.json()) as Record<string, unknown>;
  const [pairs, stored] = await Promise.all([
    read<Pair[]>("pairs"),
    read<StoredSemester>("semester"),
  ]);
  const pair = pairs.find((entry) => entry.tutor === user.name && entry.student === body.studentName);
  if (!pair) return fail("not_your_student", 403);

  const { date, time } = body;
  if (typeof date !== "string" || !DATE.test(date)) return fail("bad_date");
  if (typeof time !== "string" || !TIME.test(time)) return fail("bad_time");
  const minutes = readMinutes(body.minutes);
  if (!minutes) return fail("bad_minutes");
  const joinUrl = readLink(body.joinUrl);
  if (!joinUrl) return fail("bad_link");

  const semester = withWeeks(stored);
  const week = weekOf(semester, date);
  if (week === null) return fail("outside_semester");

  const start = zonedToUtc(date, time, user.timezone);
  const session: Session = {
    id: newId("ses"),
    week,
    semester: semester.id,
    startUtc: new Date(start).toISOString(),
    endUtc: new Date(start + minutes * 60_000).toISOString(),
    minutes: null,
    level: pair.studentLevel,
    unitNo: 0,
    topic: { en: "", ar: "" },
    notes: null,
    status: "scheduled",
    joinUrl,
    studentName: pair.student,
    tutorName: user.name,
    makeup: body.makeup === true,
  };
  await update<Session[]>("sessions", (current) => [...current, session]);
  return ok(session, 201);
}
