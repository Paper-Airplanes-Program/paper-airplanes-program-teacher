import { requireActive } from "@/lib/actor";
import { fail, newId, ok, read, update } from "@/lib/db";
import { readReport, withWeeks } from "@/lib/semester";
import { plannedMinutes } from "@/lib/sessions";
import type { CheckIn, Pair, Session, StoredSemester } from "@/lib/types";

function mine(rows: CheckIn[], semester: string, tutorName: string) {
  return rows
    .filter(
      (row) => row.semester === semester && row.by === "tutor" && row.tutorName === tutorName,
    )
    .sort((a, b) => b.week - a.week || a.studentName.localeCompare(b.studentName));
}

export async function GET() {
  const user = await requireActive();
  if (user instanceof Response) return user;
  const [rows, semester] = await Promise.all([
    read<CheckIn[]>("checkins"),
    read<StoredSemester>("semester"),
  ]);
  return ok(mine(rows, semester.id, user.name));
}

export async function POST(request: Request) {
  const user = await requireActive();
  if (user instanceof Response) return user;

  const [pairs, stored] = await Promise.all([
    read<Pair[]>("pairs"),
    read<StoredSemester>("semester"),
  ]);
  const semester = withWeeks(stored);

  const body = (await request.json()) as { week?: unknown; studentName?: unknown };
  const { week, studentName } = body;
  if (typeof week !== "number" || !Number.isInteger(week)) return fail("bad_week");
  if (week < 1 || week > semester.currentWeek) return fail("week_closed");
  const pair = pairs.find((entry) => entry.tutor === user.name && entry.student === studentName);
  if (!pair) return fail("not_your_student", 403);

  const report = readReport(body, semester.absenceReasons);
  if (!report) return fail("bad_report");

  let locked = false;
  const rows = await update<CheckIn[]>("checkins", (current) => {
    locked = current.some(
      (row) =>
        row.semester === semester.id &&
        row.week === week &&
        row.by === "tutor" &&
        row.studentName === pair.student,
    );
    if (locked) return current;
    return [
      {
        id: newId("chk"),
        semester: semester.id,
        week,
        by: "tutor",
        studentName: pair.student,
        tutorName: user.name,
        ...report,
        submittedUtc: new Date().toISOString(),
      },
      ...current,
    ];
  });

  if (locked) return fail("locked", 409);

  const now = Date.now();
  await update<Session[]>("sessions", (current) =>
    current.map((session) =>
      session.semester === semester.id &&
      session.week === week &&
      session.studentName === pair.student &&
      session.status === "scheduled" &&
      Date.parse(session.endUtc) <= now
        ? {
            ...session,
            status: report.held ? "completed" : "missed",
            minutes: report.held ? (session.minutes ?? plannedMinutes(session)) : null,
          }
        : session,
    ),
  );

  return ok(mine(rows, semester.id, user.name));
}
