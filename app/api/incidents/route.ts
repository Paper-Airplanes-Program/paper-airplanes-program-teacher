import { requireActive } from "@/lib/actor";
import { newId, ok, read, update } from "@/lib/db";
import type { Incident } from "@/lib/types";

export async function GET() {
  const user = await requireActive();
  if (user instanceof Response) return user;
  const rows = await read<Incident[]>("incidents");
  return ok(rows.filter((incident) => incident.pair.includes(user.name)));
}

export async function POST(request: Request) {
  const user = await requireActive();
  if (user instanceof Response) return user;
  const body = (await request.json()) as Partial<Incident>;
  const rows = await read<Incident[]>("incidents");

  const incident: Incident = {
    id: newId("inc"),
    reference: "PA-INC-2026-" + String(rows.length + 5).padStart(3, "0"),
    type: body.type ?? "conduct",
    severity: body.severity ?? "low",
    pair: body.pair ?? user.name,
    status: "open",
    createdUtc: new Date().toISOString(),
    summary: body.summary ?? { en: "", ar: "" },
  };
  await update<Incident[]>("incidents", (current) => [incident, ...current]);
  return ok(incident, 201);
}
