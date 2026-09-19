import { requireActive } from "@/lib/actor";
import { ok, read, update } from "@/lib/db";
import type { CheckIn } from "@/lib/types";

export async function GET() {
  const user = await requireActive();
  if (user instanceof Response) return user;
  const rows = await read<CheckIn[]>("checkins");
  return ok(
    rows
      .filter((row) => row.tutorName === user.name)
      .sort((a, b) => b.week - a.week || a.studentName.localeCompare(b.studentName)),
  );
}

export async function POST(request: Request) {
  const user = await requireActive();
  if (user instanceof Response) return user;
  const body = (await request.json()) as Omit<CheckIn, "id" | "tutorName">;

  const rows = await update<CheckIn[]>("checkins", (current) => [
    {
      ...body,
      id: "chk_" + user.id + "_w" + body.week + "_" + body.studentName.replace(/\s+/g, "_"),
      tutorName: user.name,
    },
    ...current.filter(
      (row) => !(row.week === body.week && row.studentName === body.studentName),
    ),
  ]);
  return ok(rows.filter((row) => row.tutorName === user.name));
}
