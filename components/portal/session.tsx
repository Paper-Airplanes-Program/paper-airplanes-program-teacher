"use client";

import { Video } from "lucide-react";

import { StatusPill, type Tone } from "@/components/portal/kit";
import { Button, cn } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import { sessionState } from "@/lib/sessions";
import type { Session } from "@/lib/types";

export function JoinButton({
  session,
  href,
  now,
  className,
}: {
  session: Session;
  href: string | null;
  now: number;
  className?: string;
}) {
  const { t } = useI18n();

  if (href && sessionState(session, now) === "open") {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className={cn(
          "inline-flex h-10 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-dawn-500 to-dawn-400 px-4 text-sm font-semibold text-on-accent transition-all duration-200 hover:brightness-105",
          className,
        )}
      >
        <Video className="h-4 w-4" />
        {t("student.join")}
      </a>
    );
  }

  return (
    <Button disabled className={className}>
      <Video className="h-4 w-4" />
      {t("student.join")}
    </Button>
  );
}

export function SessionPill({ session, now }: { session: Session; now: number }) {
  const { t } = useI18n();
  const state = sessionState(session, now);

  const [tone, label]: [Tone, string] =
    state === "cancelled"
      ? ["danger", "sched.cancelled"]
      : session.status === "completed"
        ? ["success", "tutor.attendedlabel"]
        : session.status === "missed"
          ? ["danger", "student.missedcount"]
          : state === "open"
            ? ["success", "sched.open"]
            : state === "ended"
              ? ["neutral", "sched.ended"]
              : session.makeup
                ? ["accent", "sched.makeup"]
                : ["info", "sched.upcoming"];

  return <StatusPill tone={tone}>{t(label)}</StatusPill>;
}
