import { fail, ok } from "@/lib/db";
import { portal } from "@/lib/portal";

import { createAccount, type Role } from "@/lib/users";

const isAdminPortal = (portal.role as string) === "admin";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    timezone?: string;
    inviteCode?: string;
  };

  if (body.password !== body.confirmPassword) return fail("mismatch");

  if (isAdminPortal) {
    const expected = process.env.ADMIN_INVITE_CODE;
    if (!expected || body.inviteCode !== expected) return fail("bad_invite", 403);
  }

  const result = await createAccount({
    role: portal.role as Role,
    name: body.name ?? "",
    email: body.email ?? "",
    password: body.password ?? "",
    timezone: body.timezone ?? "UTC",
  });

  if (!result.ok) {
    return fail(result.reason, result.reason === "taken" ? 409 : 400);
  }

  return ok(result.user, 201);
}
