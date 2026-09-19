import { requireActive } from "@/lib/actor";
import { fail, ok, read, update } from "@/lib/db";
import type { Assignment, Pair } from "@/lib/types";

async function isMine(tutor: string, studentName: string) {
  const pairs = await read<Pair[]>("pairs");
  return pairs.some((pair) => pair.tutor === tutor && pair.student === studentName);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await requireActive();
  if (user instanceof Response) return user;
  const patch = (await request.json()) as Partial<Assignment>;

  const rows = await read<Assignment[]>("homework");
  const target = rows.find((item) => item.id === id);
  if (!target) return fail("No such homework", 404);
  if (!(await isMine(user.name, target.studentName))) return fail("Not your student", 403);

  const updated = await update<Assignment[]>("homework", (current) =>
    current.map((item) =>
      item.id === id
        ? {
            ...item,
            ...patch,
            id: item.id,
            studentName: item.studentName,
            sessionId: item.sessionId,
          }
        : item,
    ),
  );
  return ok(updated.find((item) => item.id === id));
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await requireActive();
  if (user instanceof Response) return user;
  const rows = await read<Assignment[]>("homework");
  const target = rows.find((item) => item.id === id);
  if (!target) return fail("No such homework", 404);
  if (!(await isMine(user.name, target.studentName))) return fail("Not your student", 403);

  await update<Assignment[]>("homework", (current) =>
    current.filter((item) => item.id !== id),
  );
  return ok({ id });
}
