// lib/alternatives.ts

/**
 * Find alternative aesthetics similar to current choice but with better scores.
 * Used for "Try These..." suggestions in Concept Studio.
 *
 * Similarity is determined by shared keywords[] entries in aesthetics.json
 * (2+ shared keywords = similar). Saturation and identity deltas come from
 * real aesthetics.json data — no hardcoded mocks.
 */

import aestheticsRaw from '@/data/aesthetics.json';

interface AestheticEntry {
  id: string;
  name?: string;
  keywords?: string[];
  saturation_score?: number;
}

const aesthetics = aestheticsRaw as unknown as AestheticEntry[];

interface Alternative {
  name: string;
  identityDelta: number;
  resonanceDelta: number;
  reason: string;
}

interface AlternativesInput {
  currentAesthetic: string;
  currentScores: {
    identity: number;
    resonance: number;
  };
  limit?: number;
}

/** Resolve an aesthetic entry by slug or display name. */
function findEntry(nameOrSlug: string): AestheticEntry | undefined {
  const slug = nameOrSlug.toLowerCase().replace(/\s+/g, '-');
  return (
    aesthetics.find(a => a.id === slug) ??
    aesthetics.find(a => a.name?.toLowerCase() === nameOrSlug.toLowerCase())
  );
}

/**
 * Find alternative aesthetics with better market opportunity.
 */
export function findAlternatives({
  currentAesthetic,
  currentScores,
  limit = 2,
}: AlternativesInput): Alternative[] {
  const currentEntry = findEntry(currentAesthetic);
  if (!currentEntry) return [];

  const currentKeywords: string[] = currentEntry.keywords ?? [];
  const currentSaturation = currentEntry.saturation_score ?? 50;

  const candidates = aesthetics
    .filter(a => a.id !== currentEntry.id)
    .map(candidate => {
      const candidateKeywords: string[] = candidate.keywords ?? [];
      const shared = candidateKeywords.filter(k => currentKeywords.includes(k));
      if (shared.length < 2) return null;

      const candidateSaturation = candidate.saturation_score ?? 50;

      // Resonance is the inverse of saturation — lower saturation = more whitespace
      const candidateResonance = 100 - candidateSaturation;
      const resonanceDelta = candidateResonance - currentScores.resonance;

      // Identity delta: how much the saturation positions differ, mapped to -5..+5
      const saturationDiff = currentSaturation - candidateSaturation; // positive = candidate less saturated
      const identityDelta = Math.max(-5, Math.min(5, Math.round(saturationDiff / 10)));

      const sharedLabel = shared.slice(0, 2).join(' + ');
      const reason = `Shares ${sharedLabel} codes with lower market saturation`;

      return {
        name: candidate.name ?? candidate.id,
        identityDelta,
        resonanceDelta,
        reason,
      };
    })
    .filter((a): a is Alternative => a !== null);

  // Show alternatives where resonance improves by ≥5 points or identity stays strong
  const improvements = candidates.filter(alt => {
    if (alt.resonanceDelta >= 10) return true;
    if (alt.identityDelta >= -5 && alt.resonanceDelta >= 5) return true;
    return false;
  });

  return improvements
    .sort((a, b) => {
      if (b.resonanceDelta !== a.resonanceDelta) return b.resonanceDelta - a.resonanceDelta;
      return b.identityDelta - a.identityDelta;
    })
    .slice(0, limit);
}

/**
 * Check if we should show alternatives based on current scores.
 */
export function shouldShowAlternatives(scores: { identity: number; resonance: number }): boolean {
  return scores.resonance < 70 || scores.identity < 70;
}
