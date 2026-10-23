"use client";

import { useState } from "react";
import type { RuleActionResult } from "@/app/(app)/rules/actions";
import { Button } from "@/components/ui/button";

/** Removes a rule; `action` is a server action already bound to the rule id. */
export function DeleteRuleButton({ label, action }: { label: string; action: () => Promise<RuleActionResult> }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setPending(true);
    setError(null);
    try {
      const result = await action();
      if (!result.ok) setError(result.error);
    } catch {
      setError("Suppression impossible. Réessayez.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end">
      <Button
        variant="ghost"
        size="icon"
        aria-label={label}
        title={label}
        disabled={pending}
        onClick={() => void handleClick()}
        className="text-base"
      >
        <span aria-hidden>{pending ? "…" : "✕"}</span>
      </Button>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
