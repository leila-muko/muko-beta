import aestheticsData from '@/data/aesthetics.json'

// ─── Types ───────────────────────────────────────────────────────────────────

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

export interface MatchResult {
  match: Aesthetic | null
  match_type: 'exact' | 'partial_name' | 'alias' | 'keyword' | 'chip_keyword' | 'adjacent' | 'none'
  confidence_score: number
  input_received: string
  proxy_used: boolean
  proxy_reason: string | null
  suggested_proxy: Aesthetic | null
  ui_message: string | null
}

// ─── Alias Map ───────────────────────────────────────────────────────────────

const ALIAS_MAP: Record<string, string> = {
  // terrain-luxe
  'gorpcore': 'terrain-luxe', 'guardian utility': 'terrain-luxe',
  'utility luxe': 'terrain-luxe', 'technical outdoor': 'terrain-luxe',
  'elevated utility': 'terrain-luxe', 'utility chic': 'terrain-luxe',

  // quiet-structure
  'quiet luxury': 'quiet-structure', 'the row aesthetic': 'quiet-structure',
  'stealth wealth': 'quiet-structure', 'old money': 'quiet-structure',
  'minimalist luxury': 'quiet-structure', 'clean girl': 'quiet-structure',
  'architectural minimalism': 'quiet-structure', 'toteme aesthetic': 'quiet-structure',

  // romantic-analog
  'dark academia': 'romantic-analog', 'academia': 'romantic-analog',
  'cottagecore': 'romantic-analog', 'cottage core': 'romantic-analog',
  'ametora': 'romantic-analog', 'vintage inspired': 'romantic-analog',
  'cinematic vintage': 'romantic-analog',

  // heritage-hand
  'artisan craft': 'heritage-hand', 'slow fashion': 'heritage-hand',
  'modern heirloom': 'heritage-hand', 'hand woven': 'heritage-hand',
  'handwoven': 'heritage-hand', 'raw denim': 'heritage-hand',
  'brut denim': 'heritage-hand', 'craft provenance': 'heritage-hand',

  // undone-glam
  'glitchy glam': 'undone-glam', 'anti clean girl': 'undone-glam',
  'messy chic': 'undone-glam', 'anti polish': 'undone-glam',
  'undone elegance': 'undone-glam', 'liberation dressing': 'undone-glam',
  'deconstructed glamour': 'undone-glam',

  // haptic-play
  'sensory dressing': 'haptic-play', 'tactile fashion': 'haptic-play',
  'inflated aesthetic': 'haptic-play', 'mochi fashion': 'haptic-play',
  'jelly aesthetic': 'haptic-play', 'asmr fashion': 'haptic-play',
  'rubberized fashion': 'haptic-play', 'loewe aesthetic': 'haptic-play',

  // high-voltage
  'maximalist glam': 'high-voltage', 'power dressing': 'high-voltage',
  'liquid metal': 'high-voltage', 'bold glamour': 'high-voltage',
  'new maximalism': 'high-voltage', 'daytime shine': 'high-voltage',
  'main character energy': 'high-voltage', 'sequin everyday': 'high-voltage',

  // sweet-subversion
  'kawaii': 'sweet-subversion', 'doll aesthetic': 'sweet-subversion',
  'toycore': 'sweet-subversion', 'coquette': 'sweet-subversion',
  'nostalgic dressing': 'sweet-subversion', 'throwback kid': 'sweet-subversion',
  'bow aesthetic': 'sweet-subversion', 'girlhood': 'sweet-subversion',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const aesthetics: Aesthetic[] = aestheticsData as Aesthetic[]

function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '')
}

function tokenize(s: string): string[] {
  return normalize(s).split(/[\s-]+/).filter(Boolean)
}

function findById(id: string): Aesthetic | null {
  return aesthetics.find(a => a.id === id) ?? null
}

function scoreKeywords(aesthetic: Aesthetic, inputTokens: string[]): number {
  let score = 0
  const normalizedInput = inputTokens.join(' ')
  const customSet = new Set(aesthetic.custom_keywords.map(k => k.toLowerCase()))

  // Count each keyword once — use 1.5x weight if it's also a custom keyword
  for (const kw of aesthetic.keywords) {
    const kwLower = kw.toLowerCase()
    if (normalizedInput.includes(kwLower)) {
      score += customSet.has(kwLower) ? 1.5 : 1
    }
  }

  // Count custom keywords that aren't already in the keywords array
  for (const ckw of aesthetic.custom_keywords) {
    const ckwLower = ckw.toLowerCase()
    if (!aesthetic.keywords.some(k => k.toLowerCase() === ckwLower) && normalizedInput.includes(ckwLower)) {
      score += 1.5
    }
  }

  return score
}

function getBestKeywordMatch(inputTokens: string[]): { aesthetic: Aesthetic; score: number } | null {
  let best: Aesthetic | null = null
  let bestScore = 0
  let secondScore = 0

  for (const aesthetic of aesthetics) {
    const score = scoreKeywords(aesthetic, inputTokens)
    if (score > bestScore) {
      secondScore = bestScore
      bestScore = score
      best = aesthetic
    } else if (score > secondScore) {
      secondScore = score
    } else if (score === bestScore && best) {
      // Tie — prefer lower saturation_score (more opportunity)
      if (aesthetic.saturation_score < best.saturation_score) {
        secondScore = bestScore
        best = aesthetic
      }
    }
  }

  if (!best || bestScore < 2) return null
  return { aesthetic: best, score: bestScore }
}

// ─── Main Matching Pipeline ──────────────────────────────────────────────────

export function findAestheticMatch(userInput: string): MatchResult {
  const normalized = normalize(userInput)
  const inputTokens = tokenize(userInput)

  // Stage 1 — Exact name match
  for (const aesthetic of aesthetics) {
    if (normalized === normalize(aesthetic.name)) {
      return {
        match: aesthetic,
        match_type: 'exact',
        confidence_score: 100,
        input_received: userInput,
        proxy_used: false,
        proxy_reason: null,
        suggested_proxy: null,
        ui_message: null,
      }
    }
  }

  // Stage 2 — Partial name match
  if (normalized.length >= 4) {
    for (const aesthetic of aesthetics) {
      const normalizedName = normalize(aesthetic.name)
      if (normalizedName.length >= 4 && (normalized.includes(normalizedName) || normalizedName.includes(normalized))) {
        return {
          match: aesthetic,
          match_type: 'partial_name',
          confidence_score: 85,
          input_received: userInput,
          proxy_used: false,
          proxy_reason: null,
          suggested_proxy: null,
          ui_message: null,
        }
      }
    }
  }

  // Stage 3 — Alias map match
  const aliasTarget = ALIAS_MAP[normalized]
  if (aliasTarget) {
    const match = findById(aliasTarget)
    if (match) {
      return {
        match,
        match_type: 'alias',
        confidence_score: 90,
        input_received: userInput,
        proxy_used: false,
        proxy_reason: null,
        suggested_proxy: null,
        ui_message: null,
      }
    }
  }

  // Stage 4 — Scored keyword match
  const keywordResult = getBestKeywordMatch(inputTokens)
  if (keywordResult) {
    return {
      match: keywordResult.aesthetic,
      match_type: 'keyword',
      confidence_score: Math.min(95, 60 + (keywordResult.score * 10)),
      input_received: userInput,
      proxy_used: false,
      proxy_reason: null,
      suggested_proxy: null,
      ui_message: null,
    }
  }

  // Stage 5 — Chip keyword match
  for (const aesthetic of aesthetics) {
    for (const chip of aesthetic.chips) {
      const chipLabel = normalize(chip.label)
      if (normalized.includes(chipLabel) || chipLabel.includes(normalized)) {
        return {
          match: aesthetic,
          match_type: 'chip_keyword',
          confidence_score: 70,
          input_received: userInput,
          proxy_used: false,
          proxy_reason: null,
          suggested_proxy: null,
          ui_message: null,
        }
      }
      for (const kw of chip.keywords) {
        if (normalized.includes(kw.toLowerCase())) {
          return {
            match: aesthetic,
            match_type: 'chip_keyword',
            confidence_score: 70,
            input_received: userInput,
            proxy_used: false,
            proxy_reason: null,
            suggested_proxy: null,
            ui_message: null,
          }
        }
      }
    }
  }

  // Stage 6 — Adjacent direction fallback
  // Re-run stages 1-5 against adjacent_directions
  for (const aesthetic of aesthetics) {
    for (const adjId of aesthetic.adjacent_directions) {
      const adjAesthetic = findById(adjId)
      if (!adjAesthetic) continue
      const adjNormalized = normalize(adjAesthetic.name)

      // Check exact name of adjacent
      if (normalized === adjNormalized) {
        // This should have been caught in stage 1, but just in case
        return {
          match: aesthetic,
          match_type: 'adjacent',
          confidence_score: 50,
          input_received: userInput,
          proxy_used: true,
          proxy_reason: `Matched via adjacent direction: ${adjAesthetic.name}`,
          suggested_proxy: null,
          ui_message: getProxyMessage(userInput, aesthetic.name),
        }
      }

      // Check alias map targets that point to adjacent
      if (aliasTarget === adjId) {
        return {
          match: aesthetic,
          match_type: 'adjacent',
          confidence_score: 50,
          input_received: userInput,
          proxy_used: true,
          proxy_reason: `Matched via adjacent direction: ${adjAesthetic.name}`,
          suggested_proxy: null,
          ui_message: getProxyMessage(userInput, aesthetic.name),
        }
      }

      // Check keywords of adjacent aesthetic against input
      const adjKeywordScore = scoreKeywords(adjAesthetic, inputTokens)
      if (adjKeywordScore >= 1) {
        return {
          match: aesthetic,
          match_type: 'adjacent',
          confidence_score: 50,
          input_received: userInput,
          proxy_used: true,
          proxy_reason: `Matched via adjacent direction: ${adjAesthetic.name}`,
          suggested_proxy: null,
          ui_message: getProxyMessage(userInput, aesthetic.name),
        }
      }

      // Check chips of adjacent
      for (const chip of adjAesthetic.chips) {
        const chipLabel = normalize(chip.label)
        if (normalized.includes(chipLabel) || chipLabel.includes(normalized)) {
          return {
            match: aesthetic,
            match_type: 'adjacent',
            confidence_score: 50,
            input_received: userInput,
            proxy_used: true,
            proxy_reason: `Matched via adjacent direction: ${adjAesthetic.name}`,
            suggested_proxy: null,
            ui_message: getProxyMessage(userInput, aesthetic.name),
          }
        }
        for (const kw of chip.keywords) {
          if (normalized.includes(kw.toLowerCase())) {
            return {
              match: aesthetic,
              match_type: 'adjacent',
              confidence_score: 50,
              input_received: userInput,
              proxy_used: true,
              proxy_reason: `Matched via adjacent direction: ${adjAesthetic.name}`,
              suggested_proxy: null,
              ui_message: getProxyMessage(userInput, aesthetic.name),
            }
          }
        }
      }
    }
  }

  // Stage 7 — No match
  // Run keyword scoring anyway to find best proxy suggestion
  let proxyBest: Aesthetic | null = null
  let proxyBestScore = 0
  for (const aesthetic of aesthetics) {
    const score = scoreKeywords(aesthetic, inputTokens)
    if (score > proxyBestScore) {
      proxyBestScore = score
      proxyBest = aesthetic
    }
  }

  // If keyword scoring found nothing, pick lowest saturation as suggestion
  if (!proxyBest) {
    proxyBest = aesthetics.reduce((lowest, a) =>
      a.saturation_score < lowest.saturation_score ? a : lowest
    , aesthetics[0])
  }

  return {
    match: null,
    match_type: 'none',
    confidence_score: 0,
    input_received: userInput,
    proxy_used: false,
    proxy_reason: null,
    suggested_proxy: proxyBest,
    ui_message: `We don't have deep data on '${userInput}' yet. We'd suggest exploring ${proxyBest.name} as a starting point — it shares similar signals.`,
  }
}

// ─── Exported Helper ─────────────────────────────────────────────────────────

export function getProxyMessage(input: string, proxyName: string): string {
  return `We mapped '${input}' to ${proxyName} — a closely related direction. Adjust if needed.`
}
