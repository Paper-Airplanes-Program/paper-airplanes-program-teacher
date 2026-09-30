"use client";

import { CalendarPlus, CalendarRange, Pencil, RotateCcw, Trash2, XCircle } from "lucide-react";
import { useState } from "react";

import { SectionCard } from "@/components/portal/kit";
import { JoinButton } from "@/components/portal/session";
import { Button, Checkbox, Input, Select, useToast } from "@/components/ui";
import { send, useApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useSemester } from "@/lib/checkin";
import { useI18n } from "@/lib/i18n";
import { portal } from "@/lib/portal";
import { zonedToUtc } from "@/lib/schedule";
import { sessionState } from "@/lib/sessions";
import { formatDate, formatDayInTz, formatInTz, zoneLabel } from "@/lib/time";
import type { Pair, Schedule, Semester, Session } from "@/lib/types";

const LENGTHS = [30, 45, 60, 90, 120];

function weekdayOf(date: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en-GB", {
    weekday: "long",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

function errorKey(message: string) {
  if (message === "bad_link") return "sched.badlink";
  if (message === "outside_semester") return "sched.outside";
  return null;
}

type Editing = { student: string; form: "schedule" | "session" } | null;

function StudentTime({
  date,
  time,
  from,
  to,
}: {
  date: string;
  time: string;
  from: string;
  to: string | undefined;
}) {
  const { t, locale } = useI18n();
  if (!date || !time || !to) return null;
  const iso = new Date(zonedToUtc(date, time, from)).toISOString();

  return (
    <p className="rounded-2xl border border-line bg-tint px-4 py-3 text-[12.5px] text-fg-muted">
      {t("sched.forstudent")} ({to}):{" "}
      <span className="font-bold text-fg">
        {formatDayInTz(iso, to, locale)} · {formatInTz(iso, to, locale)} {zoneLabel(iso, to)}
      </span>
    </p>
  );
}

export function ScheduleCard({
  students,
  schedules,
  onChanged,
}: {
  students: string[];
  schedules: Schedule[];
  onChanged: () => void;
}) {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const timezone = user?.timezone ?? portal.user.timezone;
  const { semester } = useSemester();
  const { data: me } = useApi<{ pairs: Pair[] }>("/api/me");
  const [editing, setEditing] = useState<Editing>(null);

  return (
    <SectionCard
      title={t("sched.title")}
      description={`${t("sched.subtitle")} · ${t("common.yourtime")} ${timezone}`}
    >
      <ul className="flex flex-col gap-3">
        {students.map((student) => {
          const schedule = schedules.find((entry) => entry.studentName === student);
          const open = editing?.student === student ? editing.form : null;
          const studentTz = me?.pairs.find((pair) => pair.student === student)?.studentTz;
          return (
            <li key={student} className="row p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <CalendarRange className="mt-0.5 h-4 w-4 shrink-0 text-fg-faint" />
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-bold text-fg">{student}</p>
                    <p className="truncate text-[12px] text-fg-subtle">
                      {schedule
                        ? `${t("sched.every")} ${weekdayOf(schedule.startDate, locale)} · ${schedule.time} · ${schedule.minutes} ${t("lesson.min")} · ${t("sched.from")} ${formatDate(schedule.startDate, locale)}`
                        : t("sched.none")}
                    </p>
                    {schedule && (
                      <p dir="ltr" className="truncate text-start text-[11.5px] text-fg-faint">
                        {schedule.joinUrl}
                      </p>
                    )}
                  </div>
                </div>
                {!open && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setEditing({ student, form: "schedule" })}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      {t(schedule ? "sched.edit" : "sched.set")}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setEditing({ student, form: "session" })}
                    >
                      <CalendarPlus className="h-3.5 w-3.5" />
                      {t("sched.add")}
                    </Button>
                  </div>
                )}
              </div>

              {open === "schedule" && semester && (
                <ScheduleForm
                  student={student}
                  schedule={schedule}
                  semester={semester}
                  timezone={timezone}
                  studentTz={studentTz}
                  onDone={(changed) => {
                    setEditing(null);
                    if (changed) onChanged();
                  }}
                />
              )}
              {open === "session" && semester && (
                <SessionForm
                  student={student}
                  semester={semester}
                  timezone={timezone}
                  studentTz={studentTz}
                  link={schedule?.joinUrl ?? ""}
                  minutes={schedule?.minutes ?? 60}
                  onDone={(changed) => {
                    setEditing(null);
                    if (changed) onChanged();
                  }}
                />
              )}
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}

function ScheduleForm({
  student,
  schedule,
  semester,
  timezone,
  studentTz,
  onDone,
}: {
  student: string;
  schedule: Schedule | undefined;
  semester: Semester;
  timezone: string;
  studentTz: string | undefined;
  onDone: (changed: boolean) => void;
}) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const [startDate, setStartDate] = useState(schedule?.startDate ?? "");
  const [time, setTime] = useState(schedule?.time ?? "16:00");
  const [minutes, setMinutes] = useState(String(schedule?.minutes ?? 60));
  const [link, setLink] = useState(schedule?.joinUrl ?? "");
  const [busy, setBusy] = useState(false);

  const fail = (cause: unknown) => {
    const message = (cause as Error).message;
    const key = errorKey(message);
    toast.info(key ? t(key) : message);
  };

  return (
    <form
      className="mt-4 flex flex-col gap-4 border-t border-line pt-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        try {
          await send("/api/schedules", "PUT", {
            studentName: student,
            startDate,
            time,
            minutes: Number(minutes),
            joinUrl: link,
          });
          toast.success(t("sched.saved"));
          onDone(true);
        } catch (cause) {
          fail(cause);
          setBusy(false);
        }
      }}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Input
          label={t("sched.firstdate")}
          type="date"
          required
          dir="ltr"
          min={semester.start}
          max={semester.end}
          value={startDate}
          onChange={(event) => setStartDate(event.target.value)}
        />
        <Input
          label={t("sched.time")}
          type="time"
          required
          dir="ltr"
          value={time}
          onChange={(event) => setTime(event.target.value)}
        />
        <Select
          label={t("lesson.duration")}
          value={minutes}
          onChange={(event) => setMinutes(event.target.value)}
          options={LENGTHS.map((length) => ({
            value: String(length),
            label: `${length} ${t("lesson.min")}`,
          }))}
        />
      </div>
      <Input
        label={t("sched.link")}
        hint={t("sched.linkhint")}
        type="url"
        required
        dir="ltr"
        placeholder="https://meet.google.com/abc-defg-hij"
        value={link}
        onChange={(event) => setLink(event.target.value)}
      />
      <StudentTime date={startDate} time={time} from={timezone} to={studentTz} />
      <p className="text-[12px] leading-relaxed text-fg-subtle">
        {startDate &&
          `${t("sched.every")} ${weekdayOf(startDate, locale)} ${t("sched.until")} ${formatDate(semester.end, locale)} · `}
        {t("sched.schedulehint")}
      </p>

      <div className="flex flex-wrap gap-3">
        <Button size="sm" type="submit" disabled={busy}>
          {t("common.save")}
        </Button>
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => onDone(false)}>
          {t("common.cancel")}
        </Button>
        {schedule && (
          <Button
            size="sm"
            variant="ghost"
            className="ms-auto"
            disabled={busy}
            onClick={async () => {
              if (!window.confirm(t("sched.removeconfirm"))) return;
              setBusy(true);
              try {
                await send(`/api/schedules/${schedule.id}`, "DELETE");
                toast.success(t("sched.removed"));
                onDone(true);
              } catch (cause) {
                fail(cause);
                setBusy(false);
              }
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t("sched.remove")}
          </Button>
        )}
      </div>
    </form>
  );
}

function SessionForm({
  student,
  semester,
  timezone,
  studentTz,
  link: defaultLink,
  minutes: defaultMinutes,
  onDone,
}: {
  student: string;
  semester: Semester;
  timezone: string;
  studentTz: string | undefined;
  link: string;
  minutes: number;
  onDone: (changed: boolean) => void;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const [date, setDate] = useState("");
  const [time, setTime] = useState("16:00");
  const [minutes, setMinutes] = useState(String(defaultMinutes));
  const [link, setLink] = useState(defaultLink);
  const [makeup, setMakeup] = useState(true);
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="mt-4 flex flex-col gap-4 border-t border-line pt-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        try {
          await send("/api/sessions", "POST", {
            studentName: student,
            date,
            time,
            minutes: Number(minutes),
            joinUrl: link,
            makeup,
          });
          toast.success(t("sched.added"));
          onDone(true);
        } catch (cause) {
          const message = (cause as Error).message;
          const key = errorKey(message);
          toast.info(key ? t(key) : message);
          setBusy(false);
        }
      }}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Input
          label={t("sched.date")}
          type="date"
          required
          dir="ltr"
          min={semester.start}
          max={semester.end}
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
        <Input
          label={t("sched.time")}
          type="time"
          required
          dir="ltr"
          value={time}
          onChange={(event) => setTime(event.target.value)}
        />
        <Select
          label={t("lesson.duration")}
          value={minutes}
          onChange={(event) => setMinutes(event.target.value)}
          options={LENGTHS.map((length) => ({
            value: String(length),
            label: `${length} ${t("lesson.min")}`,
          }))}
        />
      </div>
      <Input
        label={t("sched.link")}
        type="url"
        required
        dir="ltr"
        placeholder="https://meet.google.com/abc-defg-hij"
        value={link}
        onChange={(event) => setLink(event.target.value)}
      />
      <StudentTime date={date} time={time} from={timezone} to={studentTz} />
      <label className="flex cursor-pointer items-center gap-2.5 text-[13px] font-semibold text-fg">
        <Checkbox checked={makeup} onChange={(event) => setMakeup(event.target.checked)} />
        {t("sched.makeupcheck")}
      </label>

      <div className="flex flex-wrap gap-3">
        <Button size="sm" type="submit" disabled={busy}>
          {t("sched.add")}
        </Button>
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => onDone(false)}>
          {t("common.cancel")}
        </Button>
      </div>
    </form>
  );
}

export function SessionActions({
  session,
  now,
  onChanged,
}: {
  session: Session;
  now: number;
  onChanged: () => void;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const state = sessionState(session, now);
  if (state === "ended") return null;

  const setStatus = async (status: Session["status"], done: string) => {
    setBusy(true);
    try {
      await send(`/api/sessions/${session.id}`, "PATCH", { status });
      toast.success(t(done));
      onChanged();
    } catch (cause) {
      toast.info((cause as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4">
      <div className="flex flex-wrap items-center gap-3">
        {state !== "cancelled" && (
          <JoinButton
            session={session}
            href={session.joinUrl ? `/api/sessions/${session.id}/join` : null}
            now={now}
          />
        )}
        {state === "cancelled" ? (
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => setStatus("scheduled", "sched.restored")}
          >
            <RotateCcw className="h-4 w-4" />
            {t("sched.restore")}
          </Button>
        ) : (
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => {
              if (window.confirm(t("sched.cancelconfirm"))) {
                void setStatus("cancelled", "sched.cancelledtoast");
              }
            }}
          >
            <XCircle className="h-4 w-4" />
            {t("sched.cancel")}
          </Button>
        )}
      </div>
      {state === "upcoming" && (
        <p className="text-[12px] text-fg-subtle">
          {t(session.joinUrl ? "sched.joinsoon" : "sched.nolinkteacher")}
        </p>
      )}
    </div>
  );
}
