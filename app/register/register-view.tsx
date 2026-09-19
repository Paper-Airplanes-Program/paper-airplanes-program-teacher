"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ArrowRight, Button, Input, Select } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useDeviceTimezone } from "@/lib/client";
import { useI18n } from "@/lib/i18n";
import { portal } from "@/lib/portal";

import { timezoneOptions } from "@/lib/time";

import { AuthError, AuthShell } from "../auth-shell";

const isAdminPortal = (portal.role as string) === "admin";

export function RegisterView() {
  const { t } = useI18n();
  const { user, ready, register } = useAuth();
  const router = useRouter();
  const deviceTz = useDeviceTimezone("UTC");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [timezone, setTimezone] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && user) router.replace(portal.home);
  }, [ready, user, router]);

  const zone = timezone ?? deviceTz;
  const mismatch = confirmPassword.length > 0 && confirmPassword !== password;
  const zones = timezoneOptions.includes(zone) ? timezoneOptions : [zone, ...timezoneOptions];

  return (
    <AuthShell
      title={t("auth.createtitle")}
      subtitle={t("auth.createsubtitle")}
      footer={
        <p className="mt-6 text-[13px] text-fg-muted">
          {t("auth.haveaccount")}{" "}
          <Link
            href="/"
            className="font-bold text-accent transition-opacity hover:opacity-80"
          >
            {t("auth.signin")}
          </Link>
        </p>
      }
    >
      <form
        className="mt-8 flex flex-col gap-4"
        onSubmit={async (event) => {
          event.preventDefault();
          if (password !== confirmPassword) {
            setError(t("auth.mismatch"));
            return;
          }
          setBusy(true);
          setError(null);
          const result = await register({
            name,
            email,
            password,
            confirmPassword,
            timezone: zone,
            inviteCode: inviteCode || undefined,
          });
          setBusy(false);
          if (result.ok) {
            router.replace(portal.home);
            return;
          }
          setError(
            t(
              result.error === "taken"
                ? "auth.taken"
                : result.error === "invalid"
                  ? "auth.invalid"
                  : result.error === "mismatch"
                    ? "auth.mismatch"
                    : result.error === "bad_invite"
                      ? "auth.badinvite"
                      : "auth.failed",
            ),
          );
        }}
      >
        <Input
          label={t("auth.name")}
          autoComplete="name"
          required
          minLength={2}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <Input
          label={t("auth.email")}
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          dir="ltr"
        />
        <Input
          label={t("auth.password")}
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          hint={t("auth.passwordhint")}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          dir="ltr"
        />
        <Input
          label={t("auth.confirmpassword")}
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          error={mismatch ? t("auth.mismatch") : undefined}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          dir="ltr"
        />
        <Select
          label={t("common.timezone")}
          value={zone}
          onChange={(event) => setTimezone(event.target.value)}
          options={zones.map((option) => ({ value: option, label: option }))}
        />

        {isAdminPortal && (
          <Input
            label={t("auth.invite")}
            hint={t("auth.invitehint")}
            required
            value={inviteCode}
            onChange={(event) => setInviteCode(event.target.value)}
            dir="ltr"
          />
        )}

        <AuthError message={error} />

        <Button type="submit" size="lg" disabled={busy} className="mt-1 w-full">
          {busy ? t("common.loading") : t("auth.createcta")}
          <ArrowRight className="h-4 w-4 rtl:rotate-180" />
        </Button>
      </form>
    </AuthShell>
  );
}
