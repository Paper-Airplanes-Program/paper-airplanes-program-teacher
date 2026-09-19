"use client";

import { useMemo } from "react";

import { send, useApi } from "@/lib/api";
import type { L } from "@/lib/i18n";
import type {
  Assignment,
  HomeworkFile,
  LessonFlags,
  Pair,
  Semester,
  Session,
} from "@/lib/types";

export type AttachedFile = {
  id: string;
  name: string;
  kind: HomeworkFile["kind"];
  sizeKb: number;
};

export type LessonHomework = {
  id: string;
  sessionId: string;
  title: L;
  instructions: L;
  files: (HomeworkFile | AttachedFile)[];
  assignedUtc: string;
  dueUtc: string;
  status: Assignment["status"];
  studentName: string;
};

export function fileKind(name: string): HomeworkFile["kind"] {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "pdf";
  if (["png", "jpg", "jpeg", "gif", "webp", "heic"].includes(ext)) return "image";
  if (["mp3", "m4a", "wav", "ogg", "aac"].includes(ext)) return "audio";
  return "doc";
}

export function useMyStudents(): string[] {
  const { data } = useApi<{ pairs: Pair[] }>("/api/me");
  return useMemo(() => (data?.pairs ?? []).map((pair) => pair.student), [data]);
}

type Lessons = { sessions: Session[]; flags: LessonFlags };

export function useMyLessons(): { lessons: Session[]; flags: LessonFlags; loading: boolean } {
  const { data, loading } = useApi<Lessons>("/api/sessions");

  const lessons = useMemo(
    () => (data?.sessions ?? []).slice().sort((a, b) => b.startUtc.localeCompare(a.startUtc)),
    [data],
  );

  return { lessons, flags: data?.flags ?? {}, loading };
}

export function useHomework(): Assignment[] {
  const { data } = useApi<Assignment[]>("/api/homework");
  return useMemo(() => data ?? [], [data]);
}

export function useHomeworkFor(sessionId: string): LessonHomework[] {
  const homework = useHomework();
  return useMemo(
    () =>
      homework
        .filter((item) => item.sessionId === sessionId)
        .map((item) => ({
          id: item.id,
          sessionId: item.sessionId,
          title: item.title,
          instructions: item.instructions,
          files: item.files,
          assignedUtc: item.assignedUtc,
          dueUtc: item.dueUtc,
          status: item.status,
          studentName: item.studentName,
        }))
        .sort((a, b) => b.assignedUtc.localeCompare(a.assignedUtc)),
    [homework, sessionId],
  );
}

export function useHomeworkCounts(): Record<string, number> {
  const homework = useHomework();
  return useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of homework)
      counts[item.sessionId] = (counts[item.sessionId] ?? 0) + 1;
    return counts;
  }, [homework]);
}

export function usePendingLessons(): Session[] {
  const { lessons, flags } = useMyLessons();
  const counts = useHomeworkCounts();
  const { data: me } = useApi<{ semester: Semester }>("/api/me");
  const currentWeek = me?.semester.currentWeek;

  return useMemo(() => {
    if (currentWeek === undefined) return [];
    return lessons.filter(
      (session) =>
        session.status === "completed" &&
        session.week >= currentWeek - 1 &&
        !counts[session.id] &&
        !flags[session.id]?.noHomework,
    );
  }, [lessons, counts, flags, currentWeek]);
}

export type HomeworkDraft = {
  sessionId: string;
  studentName: string;
  title: L;
  instructions: L;
  files: AttachedFile[];
  dueUtc: string;
};

export async function attachHomework(draft: HomeworkDraft) {
  await send<Assignment>("/api/homework", "POST", draft);
  await send(`/api/lessons/${draft.sessionId}/flag`, "POST", { noHomework: false });
}

export async function deleteHomework(id: string) {
  await send(`/api/homework/${id}`, "DELETE");
}

export async function markNoHomework(sessionId: string) {
  await send(`/api/lessons/${sessionId}/flag`, "POST", { noHomework: true });
}

export async function clearNoHomework(sessionId: string) {
  await send(`/api/lessons/${sessionId}/flag`, "POST", { noHomework: false });
}
