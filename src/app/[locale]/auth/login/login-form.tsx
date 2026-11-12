"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { createClient } from "@/lib/supabase/client";

type Status = "idle" | "sending" | "sent" | "error";

export function LoginForm({ locale, labels: t }: { locale: Locale; labels: Dictionary["auth"] }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  const callbackUrl = () => `${window.location.origin}/${locale}/auth/callback`;

  async function sendMagicLink(e: FormEvent) {
    e.preventDefault();
    setStatus("sending");
    const { error } = await createClient().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callbackUrl(), data: { locale } },
    });
    setStatus(error ? "error" : "sent");
  }

  async function signInWithGoogle() {
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl() },
    });
    if (error) setStatus("error");
  }

  if (status === "sent") {
    return <p className="rounded-lg bg-primary/10 p-3 text-sm font-medium text-primary" role="status">{t.linkSent}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={sendMagicLink} className="flex flex-col gap-3">
        <Label htmlFor="email">{t.email}</Label>
        <Input
          id="email"
          type="email"
          dir="ltr"
          required
          autoComplete="email"
          placeholder={t.emailPlaceholder}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-10"
        />
        <Button type="submit" size="lg" className="h-10" disabled={status === "sending"}>
          {status === "sending" ? t.sending : t.sendLink}
        </Button>
      </form>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        {t.or}
        <span className="h-px flex-1 bg-border" />
      </div>

      <Button type="button" variant="outline" size="lg" className="h-10" onClick={signInWithGoogle}>
        {t.google}
      </Button>

      {status === "error" && (
        <p className="text-sm text-destructive" role="alert">
          {t.error}
        </p>
      )}
    </div>
  );
}
