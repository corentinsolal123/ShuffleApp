import type { ReactNode } from "react";

export function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex min-h-11 items-center justify-between gap-4">
      <h1 className="label-caps text-sm">{title}</h1>
      {action}
    </div>
  );
}
