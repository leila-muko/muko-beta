import aestheticsData from '@/data/aesthetics.json'
import { getSharedMarketSignal } from '@/lib/pulse/marketState'

// ─── Types ───────────────────────────────────────────────────────────────────

export type PulseStatus = 'green' | 'yellow' | 'red'

export interface Aesthetic {
  id: string
  name: string
  description: string
  keywords: string[]
  custom_keywords: string[]
  tension_keywords: string[]
  saturation_score: number
  saturation_basis: string
  trend_velocity: string
  score_source: string
  seasonal_relevance: Record<string, number>
  collections_analyzed: number
  seen_in: string[]
  consumer_insight: string
  adjacent_directions: string[]
  confidence: number
  evidence: Array<{ claim: string; source: string; type: string; url: string; verified: boolean }>
  risk_factors: string[]
  moodboard_images: string[]
  chips: Chip[]
}

export interface Chip {
  label: string
  type: string
  primary_dimension: string
  material: string | null
  silhouette: Record<string, string> | null
  complexity_mod: number
  resonance_mod: number
  resonance_mod_source: string
  identity_mod: number
  identity_mod_source: string
  palette: string | null
  keywords: string[]
}

export interface SaturationResult {
  saturation_score: number
  status: PulseStatus
  message: string
  collections_count: number
}

export interface MatchResult {
  matched: Aesthetic | null
  is_proxy: boolean
  proxy_source: string | null
}

// ─── Data ────────────────────────────────────────────────────────────────────

const aesthetics: Aesthetic[] = aestheticsData as Aesthetic[]

function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '')
}

// ─── Core Functions ──────────────────────────────────────────────────────────

/**
 * Checks market saturation for a given aesthetic.
 * Returns status (green/yellow/red), message, and collections count.
 *
 * This is the finalized scoring function — do not modify the core logic.
 */
export function checkMarketSaturation(aesthetic_data: Aesthetic): SaturationResult {
  const { saturation_score, trend_velocity } = aesthetic_data
  const signal = getSharedMarketSignal({
    trendVelocity: trend_velocity,
    saturationScore: saturation_score,
  })

  return {
    saturation_score,
    status: signal.status,
    message: signal.message,
    collections_count: aesthetic_data.collections_analyzed,
  }
}

/**
 * Looks up an aesthetic by LLM-matched id.
 * The LLM handles semantic matching — this function only validates the id
 * against the aesthetics library and determines if it's a proxy match.
 *
 * @param llm_matched_id - The aesthetic id returned by the LLM, or null if no match
 * @param userRawInput - The user's original free-text input
 */
export function findAestheticMatch(
  llm_matched_id: string | null,
  userRawInput: string
): MatchResult {
  if (!llm_matched_id) {
    return { matched: null, is_proxy: false, proxy_source: null }
  }

  const aesthetic = aesthetics.find(a => a.id === llm_matched_id) ?? null

  // LLM returned an id not in our library — treat as null
  if (!aesthetic) {
    return { matched: null, is_proxy: false, proxy_source: null }
  }

  const normalizedInput = normalize(userRawInput)
  const normalizedName = normalize(aesthetic.name)
  const is_proxy = normalizedInput !== normalizedName

  return {
    matched: aesthetic,
    is_proxy,
    proxy_source: is_proxy ? userRawInput : null,
  }
}

/**
 * Computes the Resonance dimension score from aesthetic data.
 * Used by both the Pulse Rail (Step 2) and the Standard Report.
 *
 * CRITICAL: Both must call this function — do not reimplement the logic elsewhere.
 */
export function getResonanceScore(aesthetic_data: Aesthetic): number {
  let resonanceScore = 100 - aesthetic_data.saturation_score
  if (aesthetic_data.trend_velocity === 'declining') {
    resonanceScore = Math.max(0, resonanceScore - 15)
  }
  return resonanceScore
}

// ─── UI Helper ───────────────────────────────────────────────────────────────

export function getProxyMessage(userInput: string, matchedName: string): string {
  return `We don't have deep data on '${userInput}' yet. Using '${matchedName}' as the closest match.`
}
