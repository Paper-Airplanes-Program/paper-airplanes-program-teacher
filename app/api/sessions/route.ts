import { requireActive } from "@/lib/actor";
import { ok, read } from "@/lib/db";
import type { LessonFlags, Pair, Session } from "@/lib/types";

export async function GET() {
  const user = await requireActive();
  if (user instanceof Response) return user;
  const [sessions, pairs, flags] = await Promise.all([
    read<Session[]>("sessions"),
    read<Pair[]>("pairs"),
    read<LessonFlags>("lesson-flags"),
  ]);
  const mine = new Set(
    pairs.filter((pair) => pair.tutor === user.name).map((pair) => pair.student),
  );
  return ok({
    sessions: sessions.filter((s) => s.studentName && mine.has(s.studentName)),
    flags,
  });
}
