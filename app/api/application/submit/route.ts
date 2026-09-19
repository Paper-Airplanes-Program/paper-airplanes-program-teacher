import { actor, unauthorized } from "@/lib/actor";
import { applicationFor, newReference, saveApplication } from "@/lib/applications";
import { ok, fail, update } from "@/lib/db";
import type { Account, Role } from "@/lib/users";

export async function POST() {
  const user = await actor();
  if (!user) return unauthorized();

  const application = await applicationFor(user.id, user.role as Role);
  if (application.status === "pending") return fail("already_sent", 409);
  if (application.status === "approved") return fail("already_approved", 409);

  const sent = await saveApplication({
    ...application,
    status: "pending",
    submittedUtc: new Date().toISOString(),
    reason: null,
    reference: application.reference ?? newReference(),
  });

  await update<Account[]>("users", (current) =>
    current.map((entry) => (entry.id === user.id ? { ...entry, status: "pending" } : entry)),
  );

  return ok({ ok: true, application: sent });
}
