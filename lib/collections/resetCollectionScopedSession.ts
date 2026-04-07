"use client";

import { useSessionStore } from "@/lib/store/sessionStore";

export function resetCollectionScopedSession(nextCollectionName?: string | null, nextSeason?: string | null) {
  const state = useSessionStore.getState();
  const preservedAssortmentInsightCache = state.assortmentInsightCache;
  const preservedBrandProfileId = state.brandProfileId;
  const preservedPreloadedCriticScores = state.preloadedCriticScores;

  state.resetSession();

  useSessionStore.setState({
    assortmentInsightCache: preservedAssortmentInsightCache,
    brandProfileId: preservedBrandProfileId,
    preloadedCriticScores: preservedPreloadedCriticScores,
    activeCollection: nextCollectionName?.trim() || null,
    collectionName: nextCollectionName?.trim() || "",
    season: nextSeason?.trim() || "",
  });
}
