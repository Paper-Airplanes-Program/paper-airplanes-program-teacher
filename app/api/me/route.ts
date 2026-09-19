import { actor, unauthorized } from "@/lib/actor";
import { ok, read } from "@/lib/db";
import type { Pair, Semester } from "@/lib/types";

export async function GET() {
  const user = await actor();
  if (!user) return unauthorized();

  const [pairs, semester] = await Promise.all([
    read<Pair[]>("pairs"),
    read<Semester>("semester"),
  ]);
  return ok({ user, pairs: pairs.filter((pair) => pair.tutor === user.name), semester });
}
