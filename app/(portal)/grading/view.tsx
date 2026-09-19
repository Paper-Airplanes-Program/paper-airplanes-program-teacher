"use client";

import { useState } from "react";

import { AppShell } from "@/components/portal/app-shell";
import {
  EmptyState,
  Loading,
  SectionCard,
  StatusPill,
  humanise,
  statusTone,
} from "@/components/portal/kit";
import { Button, Input, Textarea, cn, useToast } from "@/components/ui";
import { send } from "@/lib/api";
import { useHomework } from "@/lib/homework";
import { useI18n } from "@/lib/i18n";
import { teacherNav } from "@/lib/nav";

export function GradingView() {
  const { t, tv } = useI18n();
  const toast = useToast();

  const homework = useHomework();
  const queue = homework.filter(
    (a) => a.status === "submitted" || a.status === "late" || a.status === "graded",
  );
  const [picked, setPicked] = useState<string | null>(null);
  const current = queue.find((a) => a.id === picked) ?? queue[0];
  const setSelected = setPicked;

  return (
    <AppShell
      nav={teacherNav}
      title={t("nav.grading")}
      description={t("tutor.pendinggrading")}
    >
      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
        <SectionCard title={t("tutor.queue")}>
          {queue.length === 0 && <EmptyState message={t("common.empty")} />}
          <ul className="flex flex-col gap-2">
            {queue.map((assignment) => {
              const active = assignment.id === current?.id;
              return (
                <li key={assignment.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(assignment.id)}
                    aria-pressed={active}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-2xl border p-3 text-start transition-all duration-300",
                      active
                        ? "border-transparent bg-tint-2 ring-2 ring-dawn-400"
                        : "border-line bg-tint hover:border-line-strong",
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-extrabold text-fg">
                        {assignment.studentName}
                      </span>
                      <span className="block truncate text-[11.5px] text-fg-subtle">
                        {tv(assignment.title)}
                      </span>
                    </span>
                    <StatusPill tone={statusTone(assignment.status)}>
                      {humanise(assignment.status)}
                    </StatusPill>
                  </button>
                </li>
              );
            })}
          </ul>
        </SectionCard>

        {!current && homework.length === 0 && <Loading rows={4} />}

        {current && (
          <SectionCard
            title={tv(current.title)}
            description={current.studentName}
            delay={80}
          >
            <p className="text-[13px] leading-relaxed text-fg-muted">
              {tv(current.instructions)}
            </p>

            <div className="mt-4 rounded-2xl border border-line bg-tint p-4 text-[13.5px] leading-relaxed whitespace-pre-wrap text-fg">
              {current.answer?.trim() ? current.answer : t("tutor.noanswer")}
            </div>

            <form
              key={current.id}
              className="mt-6 flex flex-col gap-4"
              onSubmit={async (event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                const rubric = current.rubric.map((criterion) => ({
                  ...criterion,
                  points: Number(form.get(criterion.id) ?? 0),
                }));
                await send(`/api/homework/${current.id}`, "PATCH", {
                  rubric,
                  score: rubric.reduce((sum, entry) => sum + (entry.points ?? 0), 0),
                  feedback: String(form.get("feedback") ?? "").trim() || null,
                  status: "graded",
                });
                toast.success(t("tutor.gradesent"));
              }}
            >
              {current.rubric.map((criterion) => (
                <div
                  key={criterion.id}
                  className="grid grid-cols-[minmax(0,1fr)_100px] items-center gap-3"
                >
                  <label
                    htmlFor={`r-${current.id}-${criterion.id}`}
                    className="min-w-0 truncate text-[13px] font-semibold text-fg"
                  >
                    {tv(criterion.criterion)} · /{criterion.max}
                  </label>
                  <Input
                    id={`r-${current.id}-${criterion.id}`}
                    name={criterion.id}
                    type="number"
                    min={0}
                    max={criterion.max}
                    defaultValue={criterion.points ?? undefined}
                    dir="ltr"
                  />
                </div>
              ))}

              <Textarea
                label={t("tutor.feedback")}
                name="feedback"
                defaultValue={current.feedback ?? ""}
                className="min-h-28"
              />

              <div className="flex flex-wrap gap-2">
                <Button type="submit">{t("common.submit")}</Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={async () => {
                    await send(`/api/homework/${current.id}`, "PATCH", {
                      status: "not_started",
                      submittedUtc: null,
                    });
                    toast.info(t("tutor.resubmitted"));
                  }}
                >
                  {t("tutor.resubmit")}
                </Button>
              </div>
            </form>
          </SectionCard>
        )}
      </div>
    </AppShell>
  );
}
