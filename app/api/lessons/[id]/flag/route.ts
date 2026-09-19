import { requireActive } from "@/lib/actor";
import { ok, update } from "@/lib/db";
import type { LessonFlags } from "@/lib/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const gate = await requireActive();
  if (gate instanceof Response) return gate;
  const { noHomework } = (await request.json()) as { noHomework: boolean };

  const flags = await update<LessonFlags>("lesson-flags", (current) => {
    const next = { ...current };
    if (noHomework) next[id] = { noHomework: true, decidedUtc: new Date().toISOString() };
    else delete next[id];
    return next;
  });
  return ok(flags);
}
