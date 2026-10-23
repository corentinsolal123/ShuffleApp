"use client";

import { AlertDialog as BaseAlertDialog } from "@base-ui/react/alert-dialog";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const AlertDialog = BaseAlertDialog.Root;
const AlertDialogTrigger = BaseAlertDialog.Trigger;
const AlertDialogClose = BaseAlertDialog.Close;

/** Bottom sheet on mobile, centred box on larger screens. */
function AlertDialogContent({
  title,
  description,
  className,
  children,
}: {
  title: string;
  description?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <BaseAlertDialog.Portal>
      <BaseAlertDialog.Backdrop className="fixed inset-0 z-50 bg-black/50 transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0" />
      <BaseAlertDialog.Popup
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex flex-col gap-6 border-t bg-background p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] transition-transform data-ending-style:translate-y-full data-starting-style:translate-y-full sm:inset-auto sm:top-1/2 sm:left-1/2 sm:w-full sm:max-w-sm sm:-translate-x-1/2 sm:-translate-y-1/2 sm:border",
          className,
        )}
      >
        <div className="flex flex-col gap-2">
          <BaseAlertDialog.Title className="label-caps text-sm">{title}</BaseAlertDialog.Title>
          {description && (
            <BaseAlertDialog.Description className="text-sm text-muted-foreground">
              {description}
            </BaseAlertDialog.Description>
          )}
        </div>
        {children}
      </BaseAlertDialog.Popup>
    </BaseAlertDialog.Portal>
  );
}

export { AlertDialog, AlertDialogClose, AlertDialogContent, AlertDialogTrigger };
