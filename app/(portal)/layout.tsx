"use client";

import { CheckCircle2, Clock, ShieldAlert } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { AppShell } from "@/components/portal/app-shell";
import { SectionCard } from "@/components/portal/kit";
import { SuspendedScreen } from "@/components/portal/suspended";
import { PlaneMark } from "@/components/ui";
import { useAccess } from "@/lib/access";
import { useAuth, useRequireAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { teacherNav } from "@/lib/nav";
import { portal } from "@/lib/portal";

function Waiting() {
  const { t } = useI18n();
  const { application } = useAccess();

  const rejected = application?.status === "rejected";
  const Icon = rejected ? ShieldAlert : application?.status === "approved" ? CheckCircle2 : Clock;

  return (
    <AppShell
      nav={teacherNav}
      title={t("apply.waitingtitle")}
      description={t("apply.waitingsubtitle")}
      locked={portal.home}
    >
      <SectionCard title={rejected ? t("apply.rejectedtitle") : t("apply.pendingtitle")}>
        <div className="flex items-start gap-3">
          <Icon className="mt-0.5 h-5 w-5 shrink-0 text-fg-muted" />
          <p className="text-[13px] leading-relaxed text-fg-muted">
            {rejected
              ? (application?.reason ?? t("apply.rejectedbody"))
              : t("apply.pendingbodyteacher")}
          </p>
        </div>
      </SectionCard>
    </AppShell>
  );
}

export default function PortalLayout({ children }: { children: ReactNode }) {
  const { ready } = useRequireAuth();
  const { status, loading, signedOut } = useAccess();
  const { signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const banned = status === "suspended";
  const waiting = !!status && !banned && status !== "active";

  useEffect(() => {
    if (signedOut) void signOut().then(() => router.replace("/"));
  }, [signedOut, signOut, router]);

  useEffect(() => {
    if (waiting && pathname !== portal.home) router.replace(portal.home);
  }, [waiting, pathname, router]);

  if (!ready || loading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <PlaneMark className="h-10 w-10 animate-float" />
      </div>
    );
  }

  if (banned) return <SuspendedScreen />;

  if (waiting) return <Waiting />;

  return <>{children}</>;
}
