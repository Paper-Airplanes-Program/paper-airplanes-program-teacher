"use client";

import { useMemo } from "react";

import { send, useApi } from "@/lib/api";
import { useMyCheckins, useSemester } from "@/lib/checkin";
import { useNow } from "@/lib/client";
import { useHomework, useMyLessons, useMyStudents, usePendingLessons } from "@/lib/homework";
import { useI18n, type L } from "@/lib/i18n";
import { sessionTitle, weekPlan } from "@/lib/sessions";
import type { Announcement, Incident } from "@/lib/types";

export type NotificationKind =
  | "homework"
  | "grade"
  | "lesson"
  | "incident"
  | "person"
  | "announcement";

export type Notification = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  href: string | null;
  whenUtc: string | null;
  read: boolean;
};

export function useNotifications() {
  const { t, tv } = useI18n();
  const pending = usePendingLessons();
  const { items: homework } = useHomework();
  const students = useMyStudents();
  const { rows: filed } = useMyCheckins();
  const { lessons } = useMyLessons();
  const { semester } = useSemester();
  const now = useNow(60_000);
  const { data: incidents } = useApi<Incident[]>("/api/incidents");
  const { data: announcements } = useApi<Announcement[]>("/api/announcements");
  const { data: read, refresh } = useApi<string[]>("/api/notifications/read");

  const items = useMemo(() => {
    const list: Omit<Notification, "read">[] = [];
    const text = (value: L) => tv(value) || value.ar || value.en;

    for (const item of announcements ?? []) {
      list.push({
        id: `ann-${item.id}`,
        kind: "announcement",
        title: text(item.subject),
        body: text(item.body),
        href: null,
        whenUtc: item.sentUtc,
      });
    }

    for (const session of pending) {
      list.push({
        id: `pending-${session.id}`,
        kind: "lesson",
        title: t("notif.pendinghw"),
        body: `${session.studentName} · ${sessionTitle(session, t, tv)}`,
        href: "/lessons",
        whenUtc: session.endUtc,
      });
    }

    for (const item of homework) {
      const waiting =
        item.status === "submitted" || (item.status === "late" && !!item.submittedUtc);
      if (!waiting) continue;
      list.push({
        id: `grade-${item.id}`,
        kind: "grade",
        title: t("notif.submitted"),
        body: `${item.studentName} · ${tv(item.title)}`,
        href: "/grading",
        whenUtc: item.submittedUtc ?? item.dueUtc,
      });
    }

    for (const incident of incidents ?? []) {
      if (incident.status === "resolved") continue;
      list.push({
        id: `incident-${incident.id}`,
        kind: "incident",
        title: t("notif.incident"),
        body: `${incident.reference} · ${tv(incident.summary)}`,
        href: "/incidents",
        whenUtc: incident.createdUtc,
      });
    }

    const week = semester?.weeks.find((entry) => entry.week === semester.currentWeek);
    const due = week
      ? students.filter(
          (name) =>
            !filed.some((row) => row.week === week.week && row.studentName === name) &&
            !weekPlan(
              lessons.filter((lesson) => lesson.week === week.week && lesson.studentName === name),
              now,
            ).opensAt,
        )
      : [];
    if (week && due.length > 0) {
      list.push({
        id: `checkin-${semester?.id}-${week.week}`,
        kind: "lesson",
        title: t("notif.checkin"),
        body: `${t("common.week")} ${week.week} · ${due.join(" · ")}`,
        href: "/attendance",
        whenUtc: `${week.start}T00:00:00Z`,
      });
    }

    const seen = new Set(read ?? []);
    return list
      .map((item) => ({ ...item, read: seen.has(item.id) }))
      .sort((a, b) => (b.whenUtc ?? "").localeCompare(a.whenUtc ?? ""));
  }, [pending, homework, incidents, announcements, students, filed, lessons, semester, now, read, t, tv]);

  const markAllRead = async () => {
    const ids = items.filter((item) => !item.read).map((item) => item.id);
    if (!ids.length) return;
    await send("/api/notifications/read", "POST", { ids });
    refresh();
  };

  return { items, markAllRead };
}
