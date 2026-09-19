"use client";

import { CalendarCheck, Check } from "lucide-react";
import { useState } from "react";

import { AppShell } from "@/components/portal/app-shell";
import {
  EmptyState,
  Loading,
  Row,
  SectionCard,
  StatusPill,
} from "@/components/portal/kit";
import { Button, Input, Radio, Select, Textarea, cn, useToast } from "@/components/ui";
import {
  openWeeks,
  reasonLabel,
  submitCheckins,
  useMyCheckins,
  useSemester,
} from "@/lib/checkin";
import { useMyStudents } from "@/lib/homework";
import { useI18n } from "@/lib/i18n";
import type { CheckIn, Semester } from "@/lib/types";
import { teacherNav } from "@/lib/nav";
import { portal } from "@/lib/portal";
import { formatDate } from "@/lib/time";

export function AttendanceView() {
  const { t, tv, locale } = useI18n();
  const { semester } = useSemester();
  const { rows: filed, loading } = useMyCheckins();
  const students = useMyStudents();

  const [pickedWeek, setPickedWeek] = useState<number | null>(null);
  const [pickedStudent, setPickedStudent] = useState<string | null>(null);
  const week = pickedWeek ?? semester?.currentWeek ?? 0;
  const student = pickedStudent ?? students[0] ?? "";

  const row = filed.find((entry) => entry.week === week && entry.studentName === student);

  return (
    <AppShell
      nav={teacherNav}
      title={t("checkin.title")}
      description={
        semester ? `${tv(semester.name)} · ${portal.user.timezone}` : t("common.loading")
      }
    >
      <SectionCard
        title={t("checkin.form")}
        description={t("checkin.subtitle")}
        action={
          row ? (
            <StatusPill tone="success">{t("checkin.filed")}</StatusPill>
          ) : (
            <StatusPill tone="warning">{t("checkin.notyet")}</StatusPill>
          )
        }
      >
        <Select
          label={t("checkin.week")}
          value={String(week)}
          onChange={(event) => setPickedWeek(Number(event.target.value))}
          options={openWeeks(semester).map((entry) => ({
            value: String(entry.week),
            label: `${t("common.week")} ${entry.week} · ${formatDate(entry.start, locale)} – ${formatDate(entry.end, locale)}`,
          }))}
          wrapperClassName="sm:max-w-[26rem]"
        />

        <div className="mt-5 flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-fg">
            {t("checkin.student")}
          </span>
          <div className="flex flex-wrap gap-2">
            {students.map((name) => {
              const active = name === student;
              const done = filed.some(
                (entry) => entry.week === week && entry.studentName === name,
              );
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => setPickedStudent(name)}
                  aria-pressed={active}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-bold transition-all duration-300",
                    active
                      ? "border-transparent bg-tint-2 text-fg ring-2 ring-dawn-400"
                      : "border-line bg-tint text-fg-muted hover:border-line-strong",
                  )}
                >
                  {name}
                  {done ? (
                    <Check className="h-3.5 w-3.5 text-accent-mint" />
                  ) : (
                    <span
                      aria-hidden
                      className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-dawn-500 to-dawn-400"
                    />
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-[12px] text-fg-subtle">{t("checkin.perstudent")}</p>
        </div>

        {semester && student ? (
          <StudentForm
            key={`${week}-${student}`}
            week={week}
            student={student}
            filed={row}
            semester={semester}
          />
        ) : (
          <Loading rows={2} />
        )}
      </SectionCard>

      <SectionCard title={t("checkin.history")} delay={80}>
        {loading ? (
          <Loading />
        ) : filed.length === 0 ? (
          <EmptyState message={t("common.empty")} />
        ) : (
          <ul className="flex flex-col gap-3">
            {filed.map((entry) => {
              const reason = reasonLabel(semester, entry.reason);
              return (
                <Row key={entry.id}>
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-bold text-fg">
                      {entry.studentName}
                    </p>
                    <p className="truncate text-[11.5px] text-fg-subtle">
                      {t("common.week")} {entry.week}
                      {entry.held
                        ? ` · ${entry.minutes} ${t("lesson.min")}`
                        : reason
                          ? ` · ${tv(reason)}`
                          : ""}
                    </p>
                  </div>
                  <StatusPill tone={entry.held ? "success" : "danger"}>
                    {entry.held ? t("checkin.held") : t("checkin.nosession")}
                  </StatusPill>
                </Row>
              );
            })}
          </ul>
        )}
      </SectionCard>
    </AppShell>
  );
}

function StudentForm({
  week,
  student,
  filed,
  semester,
}: {
  week: number;
  student: string;
  filed: CheckIn | undefined;
  semester: Semester;
}) {
  const { t, tv } = useI18n();
  const toast = useToast();

  const [held, setHeld] = useState(filed ? filed.held : true);
  const [minutes, setMinutes] = useState(String(filed?.minutes ?? 60));
  const [reason, setReason] = useState(
    filed?.reason ?? semester.absenceReasons[0].value,
  );
  const [note, setNote] = useState(filed?.note ?? "");

  return (
    <form
      className="mt-5 flex flex-col gap-5 border-t border-line pt-5"
      onSubmit={async (event) => {
        event.preventDefault();
        await submitCheckins([
          {
            week,
            studentName: student,
            held,
            minutes: held ? Number(minutes) || 0 : null,
            reason: held ? null : reason,
            note: note.trim() || null,
          },
        ]);
        toast.success(t("checkin.sent"));
      }}
    >
      <p className="text-[13.5px] font-extrabold text-fg">
        {student} · {t("common.week")} {week}
      </p>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-[13px] font-semibold text-fg">
          {t("checkin.happened")}
        </legend>
        <div className="mt-1 flex gap-6">
          {[
            { value: true, label: t("common.yes") },
            { value: false, label: t("common.no") },
          ].map((option) => (
            <label
              key={String(option.value)}
              className="flex cursor-pointer items-center gap-2.5 text-[13.5px] text-fg"
            >
              <Radio
                name={`held-${week}-${student}`}
                checked={held === option.value}
                onChange={() => setHeld(option.value)}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      {held ? (
        <Input
          label={t("checkin.minutes")}
          type="number"
          min={0}
          max={300}
          dir="ltr"
          value={minutes}
          onChange={(event) => setMinutes(event.target.value)}
          wrapperClassName="sm:max-w-[14rem]"
        />
      ) : (
        <Select
          label={t("checkin.reason")}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          options={semester.absenceReasons.map((entry) => ({
            value: entry.value,
            label: tv(entry.label),
          }))}
        />
      )}

      <Textarea
        label={t("common.notes")}
        placeholder={t("common.optional")}
        className="min-h-24"
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />

      <Button type="submit" className="self-start">
        <CalendarCheck className="h-4 w-4" />
        {t("checkin.send")}
      </Button>
    </form>
  );
}
