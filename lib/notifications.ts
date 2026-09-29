"use client";

import { useMemo } from "react";

import { send, useApi } from "@/lib/api";
import { useSemester, useUnfiledWeeks } from "@/lib/checkin";
import { useHomework, useMyStudents, usePendingLessons } from "@/lib/homework";
import { useI18n } from "@/lib/i18n";
import type { Incident } from "@/lib/types";

export type NotificationKind = "homework" | "grade" | "lesson" | "incident" | "person";

export type Notification = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  href: string;
  whenUtc: string | null;
  read: boolean;
};

export function useNotifications() {
  const { t, tv } = useI18n();
  const pending = usePendingLessons();
  const { items: homework } = useHomework();
  const students = useMyStudents();
  const unfiled = useUnfiledWeeks(students.length);
  const { semester } = useSemester();
  const { data: incidents } = useApi<Incident[]>("/api/incidents");
  const { data: read, refresh } = useApi<string[]>("/api/notifications/read");

  const items = useMemo(() => {
    const list: Omit<Notification, "read">[] = [];

    for (const session of pending) {
      list.push({
        id: `pending-${session.id}`,
        kind: "lesson",
        title: t("notif.pendinghw"),
        body: `${session.studentName} · ${tv(session.topic)}`,
        href: "/lessons",
        whenUtc: session.endUtc,
      });
    }

    for (const item of homework) {
      if (item.status !== "submitted") continue;
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

    const week = semester?.currentWeek;
    if (week !== undefined && unfiled.includes(week)) {
      list.push({
        id: `checkin-${week}`,
        kind: "lesson",
        title: t("notif.checkin"),
        body: `${t("common.week")} ${week}`,
        href: "/attendance",
        whenUtc: null,
      });
    }

    const seen = new Set(read ?? []);
    return list
      .map((item) => ({ ...item, read: seen.has(item.id) }))
      .sort((a, b) => (b.whenUtc ?? "").localeCompare(a.whenUtc ?? ""));
  }, [pending, homework, incidents, unfiled, semester, read, t, tv]);

  const markAllRead = async () => {
    const ids = items.filter((item) => !item.read).map((item) => item.id);
    if (!ids.length) return;
    await send("/api/notifications/read", "POST", { ids });
    refresh();
  };

  return { items, markAllRead };
}
