"use client";

import { useSessionStore, type ChipSelection } from "@/lib/store/sessionStore";

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

export function hydrateCollectionContextFromAnalysis(
  collectionName: string,
  row: PersistedCollectionContextRow | null
) {
  const state = useSessionStore.getState();

  state.setCollectionName(collectionName);
  state.setCollectionAesthetic(row?.collection_aesthetic?.trim() || row?.aesthetic_matched_id?.trim() || null);

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
