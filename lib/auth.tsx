"use client";

import { useRouter } from "next/navigation";
import {
  SessionProvider,
  signIn as authSignIn,
  signOut as authSignOut,
  useSession,
} from "next-auth/react";
import { useCallback, useEffect, useMemo, type ReactNode } from "react";

import { portal } from "@/lib/portal";

export type SessionUser = {
  id: string;
  role: string;
  name: string;
  email: string;
  initials: string;
  timezone: string;
};

export const DEMO_EMAIL = portal.user.email;
export const DEMO_PASSWORD = "midad@2026";

export type SignInResult = { ok: true } | { ok: false; error: "credentials" | "server" };

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  timezone: string;
  inviteCode?: string;
};

export type RegisterResult =
  | { ok: true }
  | { ok: false; error: "taken" | "invalid" | "mismatch" | "bad_invite" | "server" };

export function AuthProvider({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}

export function useAuth() {
  const { data, status, update } = useSession();

  const user = useMemo<SessionUser | null>(() => {
    const session = data?.user;
    if (!session?.id) return null;
    return {
      id: session.id,
      role: session.role,
      name: session.name ?? "",
      email: session.email ?? "",
      initials: session.initials,
      timezone: session.timezone,
    };
  }, [data]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<SignInResult> => {
      try {
        const result = await authSignIn("credentials", {
          email,
          password,
          redirect: false,
        });
        if (result?.error) return { ok: false, error: "credentials" };
        await update();
        return { ok: true };
      } catch {
        return { ok: false, error: "server" };
      }
    },
    [update],
  );

  const signOut = useCallback(async () => {
    await authSignOut({ redirect: false });
  }, []);

  const register = useCallback(
    async (input: RegisterInput): Promise<RegisterResult> => {
      let response: Response;
      try {
        response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(input),
        });
      } catch {
        return { ok: false, error: "server" };
      }

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        const error = body?.error;
        if (
          error === "taken" ||
          error === "invalid" ||
          error === "mismatch" ||
          error === "bad_invite"
        ) {
          return { ok: false, error };
        }
        return { ok: false, error: "server" };
      }

      const signedIn = await signIn(input.email, input.password);
      return signedIn.ok ? { ok: true } : { ok: false, error: "server" };
    },
    [signIn],
  );

  return {
    user,
    ready: status !== "loading",
    signIn,
    signOut,
    register,
  };
}

export function useRequireAuth() {
  const { user, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && !user) router.replace("/");
  }, [ready, user, router]);

  return { user, ready: ready && !!user };
}
