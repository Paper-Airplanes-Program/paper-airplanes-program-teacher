import { requireActive } from "@/lib/actor";
import { fail, ok, read, update } from "@/lib/db";
import { readLink } from "@/lib/schedule";
import type { Session } from "@/lib/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireActive();
  if (user instanceof Response) return user;

  const { id } = await params;
  const body = (await request.json()) as { status?: unknown; joinUrl?: unknown };
  const patch: Partial<Session> = {};
  if (body.status !== undefined) {
    if (body.status !== "cancelled" && body.status !== "scheduled") return fail("bad_status");
    patch.status = body.status;
  }
  if (body.joinUrl !== undefined) {
    const joinUrl = readLink(body.joinUrl);
    if (!joinUrl) return fail("bad_link");
    patch.joinUrl = joinUrl;
  }

  const target = (await read<Session[]>("sessions")).find((session) => session.id === id);
  if (!target) return fail("No such session", 404);
  if (target.tutorName !== user.name) return fail("not_your_session", 403);
  if (Date.parse(target.endUtc) < Date.now()) return fail("already_ended", 409);

  const rows = await update<Session[]>("sessions", (current) =>
    current.map((session) => (session.id === id ? { ...session, ...patch } : session)),
  );
  return ok(rows.find((session) => session.id === id));
}
