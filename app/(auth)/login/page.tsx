import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Connexion" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-12 px-6 pt-safe-top pb-safe-bottom">
      <header className="flex flex-col gap-3">
        <h1 className="font-display text-5xl">Dressing</h1>
        <p className="label-caps text-muted-foreground">Connexion</p>
      </header>
      <LoginForm />
    </main>
  );
}
