import { actor, unauthorized } from "@/lib/actor";
import { applicationFor } from "@/lib/applications";
import { ok } from "@/lib/db";
import type { Role } from "@/lib/users";

export async function GET() {
  const user = await actor();
  if (!user) return unauthorized();
  return ok(await applicationFor(user.id, user.role as Role));
}
