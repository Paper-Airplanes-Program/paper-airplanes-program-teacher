"use client";

import {
  CalendarClock,
  Clock,
  FileAudio,
  FileImage,
  FileText,
  GraduationCap,
  Paperclip,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useMemo, useRef, useState, type ComponentType } from "react";

import { AppShell } from "@/components/portal/app-shell";
import {
  EmptyState,
  Loading,
  SectionCard,
  StatusPill,
  statusTone,
} from "@/components/portal/kit";
import { Button, Input, Reveal, Textarea, cn, useToast } from "@/components/ui";
import {
  attachHomework,
  clearNoHomework,
  deleteHomework,
  fileKind,
  markNoHomework,
  useHomeworkCounts,
  useHomeworkFor,
  useMyLessons,
  usePendingLessons,
  type AttachedFile,
} from "@/lib/homework";
import { useI18n } from "@/lib/i18n";
import type { HomeworkFile, Session } from "@/lib/types";
import { teacherNav } from "@/lib/nav";
import { portal } from "@/lib/portal";
import { formatDayInTz, formatInTz, zoneLabel } from "@/lib/time";

const STATUS_LABEL: Record<Session["status"], string> = {
  completed: "tutor.attendedlabel",
  scheduled: "training.soon",
  missed: "student.missedcount",
  cancelled: "lesson.notheld",
};

const FILE_ICON: Record<HomeworkFile["kind"], ComponentType<{ className?: string }>> = {
  pdf: FileText,
  doc: FileText,
  image: FileImage,
  audio: FileAudio,
};

function defaultDue(session: Session): string {
  const due = new Date(new Date(session.startUtc).getTime() + 7 * 86_400_000);
  return due.toISOString().slice(0, 10);
}

export function LessonsView() {
  const { t, tv, locale } = useI18n();
  const toast = useToast();
  const tz = portal.user.timezone;

  const { lessons, flags, loading } = useMyLessons();
  const counts = useHomeworkCounts();
  const pending = usePendingLessons();

  const [pickedId, setPickedId] = useState<string | null>(null);
  const fallback =
    lessons.find((lesson) => lesson.status === "completed")?.id ?? lessons[0]?.id ?? "";
  const selectedId = pickedId ?? fallback;
  const setSelectedId = setPickedId;
  const selected = lessons.find((lesson) => lesson.id === selectedId) ?? lessons[0];
  const homework = useHomeworkFor(selected?.id ?? "");
  const markedNone = selected ? !!flags[selected.id]?.noHomework : false;

  const weeks = useMemo(() => {
    const grouped = new Map<number, Session[]>();
    for (const lesson of lessons) {
      const list = grouped.get(lesson.week);
      if (list) list.push(lesson);
      else grouped.set(lesson.week, [lesson]);
    }
    return [...grouped.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([week, items]) => ({ week, items }));
  }, [lessons]);

  const pendingIds = useMemo(() => new Set(pending.map((s) => s.id)), [pending]);
  const nudge = pending[0];

  return (
    <AppShell
      nav={teacherNav}
      title={t("lesson.title")}
      description={t("lesson.subtitle")}
    >
      {nudge && (
        <Reveal>
          <section className="panel overflow-hidden">
            <div className="flex flex-wrap items-start justify-between gap-4 p-5">
              <div className="flex min-w-0 gap-3">
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border"
                  style={{
                    background: "color-mix(in oklab, var(--accent) 12%, transparent)",
                    borderColor: "color-mix(in oklab, var(--accent) 26%, transparent)",
                    color: "var(--accent)",
                  }}
                >
                  <Paperclip className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-[14px] font-extrabold text-fg">{t("hw.prompt")}</p>
                  <p className="mt-0.5 text-[12.5px] text-fg-muted">
                    {nudge.studentName} · {tv(nudge.topic)} ·{" "}
                    {formatDayInTz(nudge.startUtc, tz, locale)}
                  </p>
                  <p className="mt-1 text-[12px] text-fg-subtle">{t("hw.promptdesc")}</p>
                  {pending.length > 1 && (
                    <p className="mt-2 text-[12px] font-semibold text-fg-muted">
                      {t("hw.pending")}: {pending.length}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setSelectedId(nudge.id)}>
                  {t("hw.promptyes")}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    void markNoHomework(nudge.id);
                    toast.info(t("hw.markednone"));
                  }}
                >
                  {t("hw.promptno")}
                </Button>
              </div>
            </div>
          </section>
        </Reveal>
      )}

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
        <SectionCard
          title={t("lesson.weeks")}
          description={`${lessons.length} ${t("nav.lessons")}`}
        >
          {loading && <Loading rows={4} />}

          <div className="flex flex-col gap-5">
            {weeks.map(({ week, items }) => (
              <div key={week}>
                <p className="mb-2 text-[11px] font-bold tracking-[0.12em] text-fg-faint uppercase">
                  {t("common.week")} {week}
                </p>
                <ul className="flex flex-col gap-2">
                  {items.map((lesson) => {
                    const active = lesson.id === selected?.id;
                    const count = counts[lesson.id] ?? 0;
                    const none = !!flags[lesson.id]?.noHomework;
                    return (
                      <li key={lesson.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(lesson.id)}
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
                              {tv(lesson.topic)}
                            </span>
                            <span className="block truncate text-[11.5px] text-fg-subtle">
                              {lesson.studentName} ·{" "}
                              {formatDayInTz(lesson.startUtc, tz, locale)}
                            </span>
                          </span>
                          {count > 0 ? (
                            <StatusPill tone="accent">
                              {count} {t(count === 1 ? "hw.items" : "hw.itemsmany")}
                            </StatusPill>
                          ) : none ? (
                            <StatusPill tone="neutral">{t("hw.promptno")}</StatusPill>
                          ) : pendingIds.has(lesson.id) ? (
                            <StatusPill tone="warning">{t("hw.pending")}</StatusPill>
                          ) : (
                            <StatusPill tone={statusTone(lesson.status)}>
                              {t(STATUS_LABEL[lesson.status])}
                            </StatusPill>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </SectionCard>

        {selected ? (
          <div className="flex flex-col gap-4">
            <SectionCard
              title={tv(selected.topic)}
              description={`${selected.studentName} · ${t("common.week")} ${selected.week}`}
              action={
                <StatusPill tone={statusTone(selected.status)}>
                  {t(STATUS_LABEL[selected.status])}
                </StatusPill>
              }
              delay={80}
            >
              <dl className="grid gap-3 sm:grid-cols-2">
                {[
                  {
                    icon: CalendarClock,
                    label: t("lesson.when"),
                    value: `${formatDayInTz(selected.startUtc, tz, locale)} · ${formatInTz(selected.startUtc, tz, locale)} ${zoneLabel(selected.startUtc, tz)}`,
                  },
                  {
                    icon: Clock,
                    label: t("lesson.duration"),
                    value: selected.minutes
                      ? `${selected.minutes} ${t("lesson.min")}`
                      : t("lesson.notheld"),
                  },
                  {
                    icon: GraduationCap,
                    label: t("lesson.unit"),
                    value: `${selected.level} · ${t("training.unit")} ${selected.unitNo}`,
                  },
                  {
                    icon: User,
                    label: t("lesson.student"),
                    value: selected.studentName ?? "—",
                  },
                ].map((row) => (
                  <div key={row.label} className="row flex items-center gap-3 p-3.5">
                    <row.icon className="h-4 w-4 shrink-0 text-fg-faint" />
                    <div className="min-w-0">
                      <dt className="text-[11px] font-bold tracking-[0.1em] text-fg-faint uppercase">
                        {row.label}
                      </dt>
                      <dd className="truncate text-[13px] font-semibold text-fg">
                        {row.value}
                      </dd>
                    </div>
                  </div>
                ))}
              </dl>

              <p className="mt-4 rounded-2xl border border-line bg-tint p-4 text-[13px] leading-relaxed text-fg-muted">
                <span className="block text-[11px] font-bold tracking-[0.1em] text-fg-faint uppercase">
                  {t("lesson.covered")}
                </span>
                <span className="mt-1 block">
                  {selected.notes ? tv(selected.notes) : t("lesson.nonotes")}
                </span>
              </p>
            </SectionCard>

            <SectionCard
              title={t("lesson.homework")}
              description={`${homework.length} ${t(
                homework.length === 1 ? "hw.items" : "hw.itemsmany",
              )}`}
              delay={140}
            >
              {homework.length === 0 ? (
                <div className="flex flex-col gap-3">
                  <EmptyState message={markedNone ? t("hw.markednone") : t("hw.none")} />
                  {markedNone && (
                    <Button
                      variant="ghost"
                      className="self-start"
                      onClick={() => void clearNoHomework(selected.id)}
                    >
                      {t("hw.undonone")}
                    </Button>
                  )}
                </div>
              ) : (
                <ul className="flex flex-col gap-3">
                  {homework.map((item) => (
                    <li key={item.id} className="row flex flex-col gap-3 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[13.5px] font-extrabold text-fg">
                            {tv(item.title)}
                          </p>
                          <p className="mt-0.5 text-[11.5px] text-fg-subtle">
                            {t("hw.due")} {formatDayInTz(item.dueUtc, tz, locale)} ·{" "}
                            {t("hw.assigned")}{" "}
                            {formatDayInTz(item.assignedUtc, tz, locale)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <StatusPill tone={statusTone(item.status)}>
                            {item.status === "graded"
                              ? t("hw.gradedcount")
                              : item.status === "submitted"
                                ? t("hw.awaiting")
                                : t("training.available")}
                          </StatusPill>
                          {item.status === "not_started" && (
                            <button
                              type="button"
                              aria-label={t("hw.delete")}
                              title={t("hw.delete")}
                              onClick={async () => {
                                await deleteHomework(item.id);
                                toast.info(t("hw.deleted"));
                              }}
                              className="grid h-8 w-8 place-items-center rounded-full border border-line bg-tint text-fg-muted transition-colors hover:text-fg"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {tv(item.instructions) && (
                        <p className="text-[13px] leading-relaxed text-fg-muted">
                          {tv(item.instructions)}
                        </p>
                      )}

                      {item.files.length > 0 && (
                        <ul className="flex flex-wrap gap-2">
                          {item.files.map((file) => {
                            const Icon = FILE_ICON[file.kind];
                            return (
                              <li
                                key={file.id}
                                className="inline-flex items-center gap-2 rounded-full border border-line bg-tint px-3 py-1.5 text-[12px] text-fg-muted"
                              >
                                <Icon className="h-3.5 w-3.5 shrink-0 text-fg-faint" />
                                <span className="max-w-[11rem] truncate">
                                  {file.name}
                                </span>
                                <span className="text-fg-faint">{file.sizeKb} KB</span>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            <AttachForm
              key={selected.id}
              session={selected}
              canMarkNone={!markedNone && homework.length === 0}
            />
          </div>
        ) : (
          <EmptyState message={t("lesson.pick")} />
        )}
      </div>
    </AppShell>
  );
}

function AttachForm({
  session,
  canMarkNone,
}: {
  session: Session;
  canMarkNone: boolean;
}) {
  const { t } = useI18n();
  const toast = useToast();

  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [files, setFiles] = useState<AttachedFile[]>([]);
  const [due, setDue] = useState(() => defaultDue(session));
  const fileInput = useRef<HTMLInputElement>(null);

  return (
    <SectionCard title={t("hw.add")} delay={200}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!title.trim()) {
            toast.info(t("hw.needtitle"));
            return;
          }
          const text = title.trim();
          const brief = instructions.trim();
          void attachHomework({
            sessionId: session.id,
            title: { en: text, ar: text },
            instructions: { en: brief, ar: brief },
            files,
            dueUtc: `${due}T20:00:00Z`,
            studentName: session.studentName ?? "",
          }).then(() => toast.success(t("hw.sent")));
          setTitle("");
          setInstructions("");
          setFiles([]);
        }}
      >
        <Input
          label={t("hw.title")}
          placeholder={t("hw.titleph")}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />

        <Textarea
          label={t("hw.instructions")}
          placeholder={t("hw.instructionsph")}
          className="min-h-24"
          value={instructions}
          onChange={(event) => setInstructions(event.target.value)}
        />

        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-fg">{t("hw.attachfile")}</span>
          <input
            ref={fileInput}
            type="file"
            multiple
            className="sr-only"
            onChange={(event) => {
              const picked = Array.from(event.target.files ?? []).map((file) => ({
                id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`,
                name: file.name,
                kind: fileKind(file.name),
                sizeKb: Math.max(1, Math.round(file.size / 1024)),
              }));
              setFiles((current) => [...current, ...picked]);
              if (fileInput.current) fileInput.current.value = "";
            }}
          />
          <Button
            variant="secondary"
            className="self-start"
            onClick={() => fileInput.current?.click()}
          >
            <Paperclip className="h-4 w-4" />
            {t("hw.attachfile")}
          </Button>
          <p className="text-[12px] text-fg-subtle">{t("hw.filehint")}</p>

          {files.length > 0 && (
            <ul className="mt-1 flex flex-wrap gap-2">
              {files.map((file) => {
                const Icon = FILE_ICON[file.kind];
                return (
                  <li
                    key={file.id}
                    className="inline-flex items-center gap-2 rounded-full border border-line bg-tint px-3 py-1.5 text-[12px] text-fg-muted"
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0 text-fg-faint" />
                    <span className="max-w-[11rem] truncate">{file.name}</span>
                    <button
                      type="button"
                      aria-label={t("hw.removefile")}
                      onClick={() =>
                        setFiles((current) =>
                          current.filter((entry) => entry.id !== file.id),
                        )
                      }
                      className="text-fg-faint transition-colors hover:text-fg"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <Input
          label={t("hw.due")}
          type="date"
          value={due}
          onChange={(event) => setDue(event.target.value)}
          dir="ltr"
          className="sm:max-w-[14rem]"
        />

        <div className="flex flex-wrap gap-2">
          <Button type="submit">{t("hw.send")}</Button>
          {canMarkNone && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                void markNoHomework(session.id);
                toast.info(t("hw.markednone"));
              }}
            >
              {t("hw.promptno")}
            </Button>
          )}
        </div>
      </form>
    </SectionCard>
  );
}
