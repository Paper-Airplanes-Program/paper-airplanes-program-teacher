"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CalendarCheck,
  ClipboardCheck,
  Paperclip,
  Users,
} from "lucide-react";

import { AppShell } from "@/components/portal/app-shell";
import {
  Row,
  SectionCard,
  StatCard,
  StatusPill,
  humanise,
  statusTone,
} from "@/components/portal/kit";
import { Button } from "@/components/ui";
import { useApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useHomework, useMyLessons, usePendingLessons } from "@/lib/homework";
import { useI18n } from "@/lib/i18n";
import type { Pair } from "@/lib/types";
import { teacherNav } from "@/lib/nav";
import { portal } from "@/lib/portal";
import { formatDayInTz, formatInTz, zoneLabel } from "@/lib/time";

export function OverviewView() {
  const { t, tv, locale } = useI18n();
  const { user } = useAuth();
  const tz = portal.user.timezone;

  const { lessons } = useMyLessons();
  const { data: me } = useApi<{ pairs: Pair[] }>("/api/me");
  const { items: homework } = useHomework();

  const upcoming = lessons
    .filter((s) => s.status === "scheduled")
    .slice()
    .sort((a, b) => a.startUtc.localeCompare(b.startUtc));
  const pending = usePendingLessons();
  const myPairs = me?.pairs ?? [];
  const ungraded = homework.filter((a) => a.status === "submitted");
  const atRisk = myPairs.filter((p) => p.health === "at_risk").length;

  return (
    <AppShell
      nav={teacherNav}
      title={`${t("student.welcome")}, ${user?.name.split(" ")[0] ?? ""}`}
      description={tz}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label={t("tutor.thisweek")}
          value={upcoming.length}
          icon={CalendarCheck}
          accent="var(--accent-cool)"
        />
        <StatCard
          label={t("tutor.pendinggrading")}
          value={ungraded.length}
          icon={ClipboardCheck}
          accent="var(--accent)"
          delay={90}
        />
        <StatCard
          label={t("tutor.atrisk")}
          value={atRisk}
          icon={AlertTriangle}
          accent="var(--accent-iris)"
          delay={180}
        />
      </div>

      {pending.length > 0 && (
        <SectionCard
          title={t("hw.prompt")}
          description={t("hw.promptdesc")}
          action={
            <Link href="/lessons">
              <Button size="sm">
                <Paperclip className="h-4 w-4" />
                {t("hw.promptyes")}
              </Button>
            </Link>
          }
        >
          <ul className="flex flex-col gap-3">
            {pending.slice(0, 3).map((session) => (
              <Row key={session.id}>
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-bold text-fg">
                    {session.studentName}
                  </p>
                  <p className="truncate text-[11.5px] text-fg-subtle">
                    {tv(session.topic)} · {t("common.week")} {session.week} ·{" "}
                    {formatDayInTz(session.startUtc, tz, locale)}
                  </p>
                </div>
                <StatusPill tone="warning">{t("hw.pending")}</StatusPill>
              </Row>
            ))}
          </ul>
        </SectionCard>
      )}

      <SectionCard title={t("tutor.thisweek")} description={tz}>
        <ul className="flex flex-col gap-3">
          {upcoming.map((session) => (
            <Row key={session.id}>
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-bold text-fg">
                  {session.studentName}
                </p>
                <p className="truncate text-[11.5px] text-fg-subtle">
                  {tv(session.topic)} · {formatDayInTz(session.startUtc, tz, locale)}{" "}
                  {formatInTz(session.startUtc, tz, locale)}{" "}
                  {zoneLabel(session.startUtc, tz)}
                </p>
              </div>
              <StatusPill tone={statusTone(session.status)}>{session.status}</StatusPill>
            </Row>
          ))}
        </ul>
      </SectionCard>

      <SectionCard
        title={t("nav.students")}
        action={<Users className="h-4 w-4 text-fg-faint" />}
        delay={80}
      >
        <ul className="flex flex-col gap-3">
          {myPairs.map((pair) => (
            <Row key={pair.pairId}>
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-bold text-fg">{pair.student}</p>
                <p className="truncate text-[11.5px] text-fg-subtle">
                  {t("common.level")} {pair.studentLevel} · {pair.attendanceRate}% ·{" "}
                  {pair.studentTz}
                </p>
              </div>
              <StatusPill tone={statusTone(pair.health)}>
                {humanise(pair.health)}
              </StatusPill>
            </Row>
          ))}
        </ul>
      </SectionCard>
    </AppShell>
  );
}
