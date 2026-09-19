"use client";

import { send, useApi } from "@/lib/api";
import type { Application } from "@/lib/applications";
import type { User } from "@/lib/types";

export type Access = {
  status: User["status"] | undefined;
  application: Application | undefined;
  approved: boolean;
  loading: boolean;
  signedOut: boolean;
};

export function useAccess(): Access {
  const { data: me, error, loading: meLoading } = useApi<{ user: User }>("/api/me");
  const { data: application, loading: appLoading } =
    useApi<Application>("/api/application");

  return {
    status: me?.user.status,
    application,
    approved: me?.user.status === "active",
    loading: meLoading || appLoading,
    signedOut: error === "Not signed in",
  };
}

export type SubmitResult =
  | { ok: true }
  | { ok: false; unfinished?: string[]; error?: string };

export async function submitApplication(): Promise<SubmitResult> {
  try {
    const result = await send<{ ok: boolean; unfinished?: string[] }>(
      "/api/application/submit",
      "POST",
    );
    return result.ok ? { ok: true } : { ok: false, unfinished: result.unfinished };
  } catch (cause) {
    return { ok: false, error: (cause as Error).message };
  }
}
