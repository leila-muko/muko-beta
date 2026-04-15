"use client";

import { createClient } from "@/lib/supabase/client";

type EventProperties = Record<string, unknown>;

export type AnalyticsEventType =
  | "report_downloaded"
  | "report_opened"
  | "ask_muko_submitted"
  | "redirect_clicked"
  | "step_completed";

export function trackEvent(
  userId: string | null | undefined,
  eventType: AnalyticsEventType,
  properties: EventProperties
) {
  void (async () => {
    try {
      const supabase = createClient();
      let resolvedUserId = userId ?? null;

      if (!resolvedUserId) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        resolvedUserId = user?.id ?? null;
      }

      if (!resolvedUserId) return;

      await supabase.from("user_events").insert({
        user_id: resolvedUserId,
        event_type: eventType,
        properties,
      });
    } catch {
      // Analytics is best-effort and must never block product flows.
    }
  })();
}
