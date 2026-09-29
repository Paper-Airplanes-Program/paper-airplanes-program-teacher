"use client";

import { usePendingLessons } from "@/lib/homework";

export function PendingLessonsBadge() {
  const count = usePendingLessons().length;
  if (!count) return null;
  return (
    <span
      className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-gradient-to-r from-dawn-500 to-dawn-400 px-1.5 text-[11px] font-extrabold tabular-nums text-on-accent"
      aria-hidden
    >
      {count}
    </span>
  );
}
