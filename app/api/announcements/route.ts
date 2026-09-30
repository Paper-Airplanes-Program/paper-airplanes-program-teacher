import { actor, unauthorized } from "@/lib/actor";
import { ok, read } from "@/lib/db";
import type { Announcement, AnnouncementSent } from "@/lib/types";

export async function GET() {
  const user = await actor();
  if (!user) return unauthorized();

  const { history } = await read<{ history: AnnouncementSent[] }>("announcements");
  return ok(
    history
      .filter((sent) => sent.recipientIds?.includes(user.id))
      .map<Announcement>(({ id, subject, body, sentUtc }) => ({
        id,
        subject,
        body: body ?? { en: "", ar: "" },
        sentUtc,
      })),
  );
}
