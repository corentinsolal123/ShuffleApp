"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { OTPField } from "@/components/ui/otp-field";
import type { AuthError } from "@supabase/supabase-js";
import { authErrorMessage, GENERIC_AUTH_ERROR } from "@/lib/auth/errors";
import { createClient } from "@/lib/supabase/client";

export const OTP_LENGTH = 6;

type Step = "email" | "code";

/** Runs an auth call and returns a displayable message on failure, including unexpected exceptions. */
async function runAuth(call: () => Promise<{ error: AuthError | null }>): Promise<string | null> {
  try {
    const { error } = await call();
    return error ? authErrorMessage(error) : null;
  } catch {
    return GENERIC_AUTH_ERROR;
  }
}

export function LoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function sendCode() {
    setPending(true);
    setError(null);
    setNotice(null);
    const failure = await runAuth(() =>
      createClient().auth.signInWithOtp({ email, options: { shouldCreateUser: true } }),
    );
    setPending(false);
    setError(failure);
    return failure === null;
  }

  async function verifyCode(token: string) {
    setPending(true);
    setError(null);
    const failure = await runAuth(() => createClient().auth.verifyOtp({ email, token, type: "email" }));
    if (failure) {
      setPending(false);
      setCode("");
      setError(failure);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await sendCode()) {
      setStep("code");
    }
  }

  function handleCodeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (code.length === OTP_LENGTH) {
      void verifyCode(code);
    }
  }

  async function handleResend() {
    if (await sendCode()) {
      setNotice("Nouveau code envoyé.");
    }
  }

  function handleChangeEmail() {
    setStep("email");
    setCode("");
    setError(null);
    setNotice(null);
  }

  if (step === "email") {
    return (
      <form onSubmit={handleEmailSubmit} className="flex flex-col gap-8" noValidate>
        <Field>
          <FieldLabel>Email</FieldLabel>
          <Input
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="vous@exemple.fr"
          />
          <FieldDescription>Nous vous envoyons un code à {OTP_LENGTH} chiffres.</FieldDescription>
        </Field>
        <FormMessage error={error} />
        <Button type="submit" disabled={pending || !email.includes("@")}>
          {pending ? "Envoi…" : "Recevoir un code"}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={handleCodeSubmit} className="flex flex-col gap-8">
      <Field>
        <FieldLabel>Code reçu par email</FieldLabel>
        <OTPField
          length={OTP_LENGTH}
          value={code}
          onValueChange={setCode}
          onValueComplete={(value) => void verifyCode(value)}
          disabled={pending}
          autoFocus
        />
        <FieldDescription>Envoyé à {email}</FieldDescription>
      </Field>
      <FormMessage error={error} notice={notice} />
      <Button type="submit" disabled={pending || code.length !== OTP_LENGTH}>
        {pending ? "Vérification…" : "Se connecter"}
      </Button>
      <div className="flex justify-between">
        <Button type="button" variant="link" size="sm" onClick={handleChangeEmail} disabled={pending}>
          Changer d&apos;email
        </Button>
        <Button type="button" variant="link" size="sm" onClick={() => void handleResend()} disabled={pending}>
          Renvoyer le code
        </Button>
      </div>
    </form>
  );
}

function FormMessage({ error, notice }: { error: string | null; notice?: string | null }) {
  if (error) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {error}
      </p>
    );
  }
  if (notice) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        {notice}
      </p>
    );
  }
  return null;
}
