import { requireActive } from "@/lib/actor";
import { fail, ok, read, update } from "@/lib/db";
import type { Assignment, Schedule, Session } from "@/lib/types";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireActive();
  if (user instanceof Response) return user;

  const { id } = await params;
  const target = (await read<Schedule[]>("schedules")).find((entry) => entry.id === id);
  if (!target) return fail("No such schedule", 404);
  if (target.tutorName !== user.name) return fail("not_your_schedule", 403);

  const homework = await read<Assignment[]>("homework");
  const withHomework = new Set(homework.map((item) => item.sessionId));
  const now = Date.now();

  await update<Schedule[]>("schedules", (current) => current.filter((entry) => entry.id !== id));
  await update<Session[]>("sessions", (current) =>
    current.filter(
      (session) =>
        !(
          session.scheduleId === id &&
          Date.parse(session.startUtc) > now &&
          !withHomework.has(session.id)
        ),
    ),
  );
  return ok({ id });
}
