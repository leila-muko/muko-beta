"use client";

import { createClient } from "@/lib/supabase/client";
import {
  mergeCollectionContextRows,
  type PersistedCollectionContextRow,
} from "@/lib/collections/hydrateCollectionContext";

export async function getLatestCollectionContextRow(userId: string, collectionName: string) {
  const supabase = createClient();
  const normalizedCollectionName = collectionName.trim();

  if (!userId || !normalizedCollectionName) {
    return null;
  }

  const { data, error } = await supabase
    .from("analyses")
    .select("collection_aesthetic, aesthetic_inflection, aesthetic_matched_id, silhouette, season, agent_versions, mood_board_images, created_at")
    .eq("user_id", userId)
    .eq("collection_name", normalizedCollectionName)
    .order("created_at", { ascending: false })
    .limit(12);

  if (error) {
    return null;
  }

  const rows = (data as PersistedCollectionContextRow[] | null) ?? [];
  if (rows.length === 0) return null;

  return mergeCollectionContextRows(...rows);
}
