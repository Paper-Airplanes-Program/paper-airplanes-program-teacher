import { actor, unauthorized } from "@/lib/actor";
import { ok, read } from "@/lib/db";
import { withWeeks } from "@/lib/semester";
import type { Pair, StoredSemester } from "@/lib/types";

export async function GET() {
  const user = await actor();
  if (!user) return unauthorized();

  const [pairs, semester] = await Promise.all([
    read<Pair[]>("pairs"),
    read<StoredSemester>("semester"),
  ]);
  return ok({
    user,
    pairs: pairs.filter((pair) => pair.tutor === user.name),
    semester: withWeeks(semester),
  });
}
