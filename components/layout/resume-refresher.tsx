"use client";

import { useRouter } from "next/navigation";
import { useOnResume } from "./use-on-resume";

/** Re-fetches server data (fresh signed photo URLs, wardrobe changes) after a long absence. */
export function ResumeRefresher() {
  const router = useRouter();
  useOnResume(() => router.refresh());
  return null;
}
