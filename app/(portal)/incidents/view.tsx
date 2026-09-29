"use client";

import { ShieldAlert } from "lucide-react";
import { useState } from "react";

import { AppShell } from "@/components/portal/app-shell";
import {
  EmptyState,
  Loading,
  Row,
  SectionCard,
  StatusPill,
  statusTone,
} from "@/components/portal/kit";
import { Button, Reveal, Select, Textarea, useToast } from "@/components/ui";
import { send, useApi } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { Incident } from "@/lib/types";
import { teacherNav } from "@/lib/nav";

const TYPES = ["safeguarding", "plagiarism", "conduct", "technical"];
const SEVERITIES = ["low", "medium", "high", "critical"];

export function IncidentsView() {
  const { t, tv } = useI18n();
  const toast = useToast();
  const [type, setType] = useState("safeguarding");
  const [severity, setSeverity] = useState("medium");
  const { data: incidents, loading } = useApi<Incident[]>("/api/incidents");

  return (
    <AppShell
      nav={teacherNav}
      title={t("nav.incidents")}
      description={t("tutor.reportincident")}
    >
      <Reveal>
        <div className="flex items-start gap-3 rounded-2xl border border-red-500/25 bg-red-500/8 p-4">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          <p className="text-[13px] leading-relaxed text-fg">{t("tutor.confidential")}</p>
        </div>
      </Reveal>

      <SectionCard title={t("tutor.reportincident")}>
        <form
          className="flex flex-col gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const summary = String(new FormData(form).get("summary") ?? "").trim();
            const created = await send<Incident>("/api/incidents", "POST", {
              type,
              severity,
              summary: { en: summary, ar: summary },
            });
            form.reset();
            toast.success(`${t("tutor.reportsent")} · ${created.reference}`);
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label={t("tutor.type")}
              value={type}
              onChange={(event) => setType(event.target.value)}
              options={TYPES.map((option) => ({
                value: option,
                label: t(`tutor.type${option}`),
              }))}
            />
            <Select
              label={t("tutor.severity")}
              value={severity}
              onChange={(event) => setSeverity(event.target.value)}
              options={SEVERITIES.map((option) => ({
                value: option,
                label: t(`tutor.severity${option}`),
              }))}
            />
          </div>

          <Textarea
            label={t("tutor.whathappened")}
            name="summary"
            className="min-h-32"
            required
          />

          <Button type="submit" variant="danger" className="self-start">
            {t("common.submit")}
          </Button>
        </form>
      </SectionCard>

      <SectionCard title={t("tutor.myreports")} delay={80}>
        {loading && <Loading rows={2} />}
        {incidents?.length === 0 && <EmptyState message={t("common.empty")} />}
        <ul className="flex flex-col gap-3">
          {(incidents ?? []).map((incident) => (
            <Row key={incident.id}>
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-bold text-fg">
                  {incident.reference}
                </p>
                <p className="truncate text-[11.5px] text-fg-subtle">
                  {tv(incident.summary)}
                </p>
              </div>
              <StatusPill tone={statusTone(incident.status)}>{incident.status}</StatusPill>
            </Row>
          ))}
        </ul>
      </SectionCard>
    </AppShell>
  );
}
