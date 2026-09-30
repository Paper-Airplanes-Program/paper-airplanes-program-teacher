"use client";

import { send, useApi } from "@/lib/api";
import type { CheckIn, Semester } from "@/lib/types";

export type CheckInDraft = {
  week: number;
  studentName: string;
  held: boolean;
  minutes: number | null;
  reason: string | null;
  note: string | null;
};

export function useMyCheckins() {
  const { data, loading, refresh } = useApi<CheckIn[]>("/api/checkins");

  const submit = async (drafts: CheckInDraft[]) => {
    for (const draft of drafts) {
      await send<CheckIn[]>("/api/checkins", "POST", draft);
    }
    refresh();
  };

  return { rows: data ?? [], loading, submit };
}

export function useSemester(): { semester: Semester | undefined; loading: boolean } {
  const { data, loading } = useApi<{ semester: Semester }>("/api/me");
  return { semester: data?.semester, loading };
}

export function openWeeks(semester: Semester | undefined) {
  if (!semester) return [];
  return semester.weeks
    .filter((entry) => entry.week <= semester.currentWeek)
    .slice()
    .reverse();
}

export function reasonLabel(semester: Semester | undefined, value: string | null) {
  return semester?.absenceReasons.find((reason) => reason.value === value)?.label ?? null;
}
