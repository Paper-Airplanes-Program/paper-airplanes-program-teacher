import { requireActive } from "@/lib/actor";
import { fail, newId, ok, read, update } from "@/lib/db";
import type { Assignment, Pair } from "@/lib/types";

async function myStudents(name: string) {
  const pairs = await read<Pair[]>("pairs");
  return new Set(pairs.filter((pair) => pair.tutor === name).map((pair) => pair.student));
}

export async function GET() {
  const user = await requireActive();
  if (user instanceof Response) return user;
  const [homework, students] = await Promise.all([
    read<Assignment[]>("homework"),
    myStudents(user.name),
  ]);
  return ok(
    homework
      .filter((item) => students.has(item.studentName))
      .sort((a, b) => b.assignedUtc.localeCompare(a.assignedUtc)),
  );
}

export async function POST(request: Request) {
  const user = await requireActive();
  if (user instanceof Response) return user;
  const body = (await request.json()) as Partial<Assignment>;
  const students = await myStudents(user.name);

  if (!body.sessionId || !body.studentName) return fail("Missing lesson or student");
  if (!students.has(body.studentName)) return fail("Not your student", 403);
  if (!body.title) return fail("Missing title");

  const now = new Date().toISOString();
  const item: Assignment = {
    id: newId("asg"),
    sessionId: body.sessionId,
    title: body.title,
    instructions: body.instructions ?? { en: "", ar: "" },
    files: body.files ?? [],
    assignedUtc: now,
    dueUtc: body.dueUtc ?? now,
    status: "not_started",
    maxScore: body.maxScore ?? 100,
    score: null,
    feedback: null,
    studentName: body.studentName,
    seen: false,
    answer: null,
    submittedUtc: null,
    rubric: body.rubric ?? [],
  };
  await update<Assignment[]>("homework", (current) => [item, ...current]);
  return ok(item, 201);
}
