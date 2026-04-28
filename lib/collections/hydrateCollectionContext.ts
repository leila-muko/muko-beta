"use client";

import aestheticsData from "@/data/aesthetics.json";
import {
  useSessionStore,
  type ChipSelection,
  type PersistedCollectionContextSnapshot,
} from "@/lib/store/sessionStore";

const GENERIC_STRATEGY_SUMMARY = "Define your collection stance";

type PersistedAgentVersions = Record<string, unknown> | null | undefined;

export interface PersistedCollectionContextRow {
  collection_aesthetic?: string | null;
  aesthetic_inflection?: string | null;
  aesthetic_matched_id?: string | null;
  silhouette?: string | null;
  season?: string | null;
  mood_board_images?: string[] | null;
  agent_versions?: PersistedAgentVersions;
}

const CONTEXT_AGENT_VERSION_KEYS = [
  "strategy_summary",
  "selected_palette",
  "concept_setup_complete",
  "direction_interpretation_chips",
  "collection_language",
  "expression_signals",
  "chip_selection",
] as const;

const AESTHETIC_NAME_BY_ID = new Map(
  (aestheticsData as Array<{ id: string; name: string }>).map((entry) => [entry.id, entry.name])
);

function toTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function pickPreferredString(...values: Array<unknown>) {
  for (const value of values) {
    const trimmed = toTrimmedString(value);
    if (trimmed) return trimmed;
  }
  return null;
}

function normalizeAestheticName(value: unknown) {
  const trimmed = toTrimmedString(value);
  if (!trimmed) return null;
  return AESTHETIC_NAME_BY_ID.get(trimmed) ?? trimmed;
}

function toAestheticSlug(value: string | null) {
  return value
    ?.toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || null;
}

function normalizeMoodboardImages(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter(Boolean);
}

function pickPreferredMoodboardImages(...values: Array<unknown>) {
  for (const value of values) {
    const images = normalizeMoodboardImages(value);
    if (images.length > 0) return images;
  }
  return [];
}

function mergeContextAgentVersions(
  ...agentVersionSets: Array<PersistedAgentVersions>
): Record<string, unknown> | null {
  const merged: Record<string, unknown> = {};

  CONTEXT_AGENT_VERSION_KEYS.forEach((key) => {
    for (const agentVersions of agentVersionSets) {
      const candidate = agentVersions?.[key];
      const trimmed = toTrimmedString(candidate);
      if (!trimmed) continue;
      merged[key] = trimmed;
      break;
    }
  });

  return Object.keys(merged).length > 0 ? merged : null;
}

export function mergeCollectionContextRows(
  ...rows: Array<PersistedCollectionContextRow | PersistedCollectionContextSnapshot | null | undefined>
): PersistedCollectionContextSnapshot | null {
  const validRows = rows.filter(Boolean);
  if (validRows.length === 0) return null;

  const merged: PersistedCollectionContextSnapshot = {
    collection_aesthetic: pickPreferredString(...validRows.map((row) => row?.collection_aesthetic)) ?? null,
    aesthetic_inflection: pickPreferredString(...validRows.map((row) => row?.aesthetic_inflection)) ?? null,
    aesthetic_matched_id: pickPreferredString(...validRows.map((row) => row?.aesthetic_matched_id)) ?? null,
    silhouette: pickPreferredString(...validRows.map((row) => row?.silhouette)) ?? null,
    season: pickPreferredString(...validRows.map((row) => row?.season)) ?? null,
    mood_board_images: pickPreferredMoodboardImages(...validRows.map((row) => row?.mood_board_images)),
    agent_versions: mergeContextAgentVersions(...validRows.map((row) => row?.agent_versions)),
  };

  const hasContent = Boolean(
    merged.collection_aesthetic ||
      merged.aesthetic_inflection ||
      merged.aesthetic_matched_id ||
      merged.silhouette ||
      merged.season ||
      (merged.mood_board_images?.length ?? 0) > 0 ||
      merged.agent_versions
  );

  return hasContent ? merged : null;
}

function getCollectionContextCacheKey(collectionName: string) {
  return collectionName.trim().toLowerCase();
}

function parseJsonValue(value: unknown): unknown {
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function toStringArray(value: unknown): string[] {
  const parsed = parseJsonValue(value);
  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter(Boolean);
}

function toChipSelection(value: unknown): ChipSelection | null {
  const parsed = parseJsonValue(value);
  if (!parsed || typeof parsed !== "object") return null;

  const candidate = parsed as Partial<ChipSelection>;
  if (typeof candidate.directionId !== "string" || !Array.isArray(candidate.activatedChips)) {
    return null;
  }

  return {
    directionId: candidate.directionId,
    activatedChips: candidate.activatedChips,
  };
}

function applyCollectionContextSnapshot(
  collectionName: string,
  row: PersistedCollectionContextRow | PersistedCollectionContextSnapshot | null
) {
  const state = useSessionStore.getState();
  const normalizedAestheticName =
    normalizeAestheticName(row?.collection_aesthetic) ?? normalizeAestheticName(row?.aesthetic_matched_id) ?? null;
  const resolvedAestheticMatchedId =
    pickPreferredString(row?.aesthetic_matched_id, toAestheticSlug(normalizedAestheticName)) ?? null;

  state.setCollectionName(collectionName);
  state.setCollectionAesthetic(normalizedAestheticName);

  // Fill Spec-facing concept keys from collection context without overriding
  // a more specific concept/spec session that is already in memory.
  if (normalizedAestheticName && !toTrimmedString(state.aestheticInput)) {
    useSessionStore.setState({ aestheticInput: normalizedAestheticName });
  }
  if (resolvedAestheticMatchedId && !toTrimmedString(state.aestheticMatchedId)) {
    useSessionStore.setState({ aestheticMatchedId: resolvedAestheticMatchedId });
  }

  const inflection = row?.aesthetic_inflection?.trim() || "";
  state.setAestheticInflection(inflection || null);
  state.setDirectionInterpretationText(inflection);
  state.setConceptSilhouette(row?.silhouette?.trim() || "");

  if (row?.season?.trim()) {
    state.setSeason(row.season.trim());
  }

  const agentVersions = row?.agent_versions;
  const directionChips = toStringArray(agentVersions?.["direction_interpretation_chips"]);
  const chipSelection = toChipSelection(agentVersions?.["chip_selection"]);
  const strategySummary =
    typeof agentVersions?.["strategy_summary"] === "string"
      ? (() => {
          const trimmed = agentVersions["strategy_summary"].trim();
          return trimmed && trimmed !== GENERIC_STRATEGY_SUMMARY ? trimmed : null;
        })()
      : null;
  const selectedPalette =
    typeof agentVersions?.["selected_palette"] === "string"
      ? agentVersions["selected_palette"].trim() || null
      : null;
  const moodboardImages = Array.isArray(row?.mood_board_images)
    ? row.mood_board_images
        .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
        .filter(Boolean)
    : [];

  state.setDirectionInterpretationChips(directionChips);
  state.setChipSelection(chipSelection);
  state.setStrategySummary(strategySummary);
  state.setConceptPalette(selectedPalette);
  useSessionStore.setState({ moodboardImages });

  if (row?.collection_aesthetic || row?.aesthetic_matched_id || inflection) {
    state.lockConcept();
  }
}

export function hydrateCollectionContextFromAnalysis(
  collectionName: string,
  row: PersistedCollectionContextRow | null
) {
  const normalizedCollectionName = collectionName.trim().toLowerCase();
  const cachedSnapshot = normalizedCollectionName
    ? useSessionStore.getState().collectionContextSnapshots[normalizedCollectionName]
    : null;
  const mergedSnapshot = mergeCollectionContextRows(row, cachedSnapshot);

  if (!row) {
    if (mergedSnapshot) {
      applyCollectionContextSnapshot(collectionName, mergedSnapshot);
      useSessionStore.getState().setCollectionContextSnapshot(collectionName, mergedSnapshot);
      return;
    }

    useSessionStore.getState().setCollectionName(collectionName);
    return;
  }

  const snapshotToPersist = mergedSnapshot ?? mergeCollectionContextRows(row);

  applyCollectionContextSnapshot(collectionName, snapshotToPersist ?? row);

  if (snapshotToPersist) {
    useSessionStore.getState().setCollectionContextSnapshot(collectionName, snapshotToPersist);
  }
}

export function restoreCollectionContextFromCache(collectionName: string) {
  const cacheKey = getCollectionContextCacheKey(collectionName);
  if (!cacheKey) return false;

  const cachedSnapshot = useSessionStore.getState().collectionContextSnapshots[cacheKey];
  if (!cachedSnapshot) return false;

  applyCollectionContextSnapshot(collectionName, cachedSnapshot);
  return true;
}
