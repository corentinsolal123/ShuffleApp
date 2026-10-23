"use client";

import { Drawer as BaseDrawer } from "@base-ui/react/drawer";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const Drawer = BaseDrawer.Root;
const DrawerTrigger = BaseDrawer.Trigger;
const DrawerClose = BaseDrawer.Close;

/** Bottom sheet, swipe down to close. */
function DrawerContent({ title, className, children }: { title: string; className?: string; children: ReactNode }) {
  return (
    <BaseDrawer.Portal>
      <BaseDrawer.Backdrop className="fixed inset-0 z-50 bg-black/50 transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0" />
      <BaseDrawer.Viewport className="fixed inset-0 z-50 flex items-end justify-center">
        <BaseDrawer.Popup
          className={cn(
            "flex max-h-[85dvh] w-full max-w-lg flex-col border-t bg-background pb-[env(safe-area-inset-bottom)] transition-transform data-ending-style:translate-y-full data-starting-style:translate-y-full sm:border-x",
            className,
          )}
        >
          <div className="flex items-center justify-between gap-4 border-b px-4">
            <BaseDrawer.Title className="label-caps">{title}</BaseDrawer.Title>
            <BaseDrawer.Close aria-label="Fermer" className="flex size-11 cursor-pointer items-center justify-center text-base">
              <span aria-hidden>✕</span>
            </BaseDrawer.Close>
          </div>
          <BaseDrawer.Content className="overflow-y-auto px-4 py-4">{children}</BaseDrawer.Content>
        </BaseDrawer.Popup>
      </BaseDrawer.Viewport>
    </BaseDrawer.Portal>
  );
}

export { Drawer, DrawerClose, DrawerContent, DrawerTrigger };
