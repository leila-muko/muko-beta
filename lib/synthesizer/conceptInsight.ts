// lib/synthesizer/conceptInsight.ts
// Generates a Pulse Rail insight for the Concept Studio surface.
//
// Fires when: Identity Pulse + Resonance Pulse are both active (Step 2)
// Persona: Lead Creative Strategist — market position + saturation verdict
//
// Output: JSON → mapped to InsightData
// Fallback: generateTemplateNarrative (template engine, never throws)

import Anthropic from '@anthropic-ai/sdk';
import type { InsightData, InsightMode } from '@/lib/types/insight';
import type { CommitmentSignal, DecisionGuidance } from '@/lib/types/insight';
import type { AestheticContext, ResolvedRedirects, IntentCalibration } from '@/lib/synthesizer/blackboard';
import { buildTemplateDecisionGuidance, generateTemplateNarrative } from '@/lib/agents/synthesizer';
import type { NarrativeAestheticContext } from '@/lib/agents/synthesizer';
import { getAestheticChipLabels, normalizeExecutionLevers } from '@/lib/concept-studio/decision-guidance';
import { getSharedMarketSignal } from '@/lib/pulse/marketState';

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface ConceptBlackboard {
  /** Raw designer aesthetic input text */
  aesthetic_input: string;
  /** Resolved aesthetic ID (e.g. "terrain-luxe") */
  aesthetic_matched_id: string;
  /** True when the aesthetic is a proxy/fallback, not a direct match */
  is_proxy_match: boolean;
  /** Brand DNA keywords from the designer's brief */
  brand_keywords: string[];
  /** Brand price tier (e.g. "Contemporary", "Bridge", "Luxury") */
  price_tier?: string;
  /** Identity score 0–100 */
  identity_score: number;
  /** Resonance score 0–100 */
  resonance_score: number;
  /** Number of collections analyzed for this aesthetic (from aesthetics.json) */
  collections_analyzed?: number;
  /** Season key, e.g. "fw26" */
  season?: string;
  /** Brand name for narrative personalization */
  brand_name?: string;
  /** Setup-derived strategic framing summary */
  strategy_summary?: string | null;
  /** Tension context string from brand_profiles (e.g. "trend-aware-classics") */
  tension_context?: string;
  /** Customer profile description from brand onboarding */
  customer_profile?: string | null;
  /** Reference brands from brand onboarding — used as competitive positioning anchors */
  reference_brands?: string[];
  /** Excluded brands from brand onboarding — used as tone constraint */
  excluded_brands?: string[];
  /** Expression signals explicitly selected in Concept Studio */
  expression_signals?: string[];
  /** Brand-specific translation / interpretation if captured upstream */
  brand_interpretation?: string | null;
  /** Resolved aesthetic context from aesthetics.json */
  aesthetic_context: AestheticContext;
  /** Resolved redirects — brand_mismatch only at concept stage */
  resolved_redirects: Pick<ResolvedRedirects, 'brand_mismatch'>;
  /** Optional intent calibration from the designer's Intent page selections */
  intent?: IntentCalibration;
  /** Key pieces identified for this aesthetic direction */
  key_pieces?: Array<{ item: string; type?: string; signal?: string }>;
  /** Chip labels actively selected by the designer in Concept Studio */
  chip_selection?: string[];
  /** Collection context for collection-aware Decision Guidance */
  collection_context?: {
    aesthetic_inflection?: string | null;
    brand: {
      name?: string | null;
      keywords?: string[];
      customer_profile?: string | null;
      price_tier?: string | null;
      target_margin?: number | null;
      tension_context?: string | null;
    };
    existing_pieces: Array<{
      piece_name: string;
      score: number;
      dimensions?: Record<string, number> | null;
      collection_role?: string | null;
      category?: string | null;
      silhouette?: string | null;
      aesthetic_matched_id?: string | null;
      aesthetic_inflection?: string | null;
    }>;
    piece_count: number;
  };
}

export interface SynthesizerResult {
  data: InsightData;
  meta: { method: 'llm' | 'template'; latency_ms: number };
}

export interface CollectionGuidanceSummary {
  stage: 'directional' | 'comparative' | 'diagnostic';
  piece_count: number;
  weakest_dimension: 'identity' | 'resonance' | 'execution' | null;
  overrepresented_role: string | null;
  missing_role: string | null;
  urgent_gap: string;
  anchor_recommendation: string;
  repeated_role_issue: boolean;
  requires_aesthetic_pivot: boolean;
  suggested_aesthetic: string | null;
  pivot_reason: string | null;
  inflection_present: boolean;
  inflection_text: string | null;
}

// ─────────────────────────────────────────────
// MODE LOGIC
// ─────────────────────────────────────────────

export function determineConceptMode(
  identity_score: number,
  resonance_score: number
): { mode: InsightMode; editLabel: string } {
  if (identity_score >= 70 && resonance_score >= 65) {
    return { mode: 'amplify', editLabel: 'WHY THIS WORKS NOW' };
  }
  return { mode: 'differentiate', editLabel: 'WHY THIS WORKS NOW' };
}

// ─────────────────────────────────────────────
// INTERNAL FIELDS TO STRIP FROM PAYLOAD
// ─────────────────────────────────────────────

const INTERNAL_FIELDS_TO_STRIP = [
  'experiment',
  'test_name',
  'variant',
  'run_name',
  'debug',
  'analysis_notes',
  'temporary_label',
] as const;

function sanitizePayload<T extends Record<string, unknown>>(obj: T): Omit<T, typeof INTERNAL_FIELDS_TO_STRIP[number]> {
  const result = { ...obj };
  for (const field of INTERNAL_FIELDS_TO_STRIP) {
    delete result[field];
  }
  return result as Omit<T, typeof INTERNAL_FIELDS_TO_STRIP[number]>;
}

function titleCaseToken(value: string | null | undefined): string {
  return (value ?? '')
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .trim();
}

function normalizeRole(value: string | null | undefined): 'hero' | 'core' | 'support' {
  const token = (value ?? '').toLowerCase().trim();
  if (token === 'hero' || token === 'core' || token === 'support') return token;
  return 'core';
}

function inferWeakestDimension(
  pieces: NonNullable<ConceptBlackboard['collection_context']>['existing_pieces'],
): 'identity' | 'resonance' | 'execution' | null {
  if (pieces.length === 0) return null;

  const totals = { identity: 0, resonance: 0, execution: 0 };
  const counts = { identity: 0, resonance: 0, execution: 0 };

  for (const piece of pieces) {
    const dimensions = piece.dimensions ?? {};
    for (const key of ['identity', 'resonance', 'execution'] as const) {
      const value = dimensions[key];
      if (typeof value === 'number') {
        totals[key] += value;
        counts[key] += 1;
      }
    }
  }

  const averages = (['identity', 'resonance', 'execution'] as const)
    .map((key) => ({
      key,
      average: counts[key] > 0 ? totals[key] / counts[key] : Infinity,
    }))
    .filter((entry) => Number.isFinite(entry.average))
    .sort((a, b) => a.average - b.average);

  return averages[0]?.key ?? null;
}

export function summarizeCollectionGuidanceContext(bb: ConceptBlackboard): CollectionGuidanceSummary {
  const pieces = bb.collection_context?.existing_pieces ?? [];
  const pieceCount = bb.collection_context?.piece_count ?? pieces.length;
  const inflectionText =
    bb.collection_context?.aesthetic_inflection?.trim() ||
    pieces.find((piece) => piece.aesthetic_inflection?.trim())?.aesthetic_inflection?.trim() ||
    null;
  const inflectionPresent = Boolean(inflectionText);
  const roles = pieces.map((piece) => normalizeRole(piece.collection_role));
  const roleCounts = roles.reduce<Record<string, number>>((acc, role) => {
    acc[role] = (acc[role] ?? 0) + 1;
    return acc;
  }, {});
  const weakestDimension = inferWeakestDimension(pieces);
  const overrepresentedRole = Object.entries(roleCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const missingRole = (['hero', 'core', 'support'] as const).find((role) => !roleCounts[role]) ?? null;
  const anchor = bb.key_pieces?.[0]?.item ?? `${titleCaseToken(bb.aesthetic_matched_id)} anchor piece`;
  const anchorType = bb.key_pieces?.[0]?.type ? titleCaseToken(bb.key_pieces[0].type) : 'hero piece';
  const repeatedRoleIssue = pieceCount >= 2 && new Set(roles).size === 1;
  const currentAestheticCount = pieces.filter(
    (piece) => piece.aesthetic_matched_id && piece.aesthetic_matched_id === bb.aesthetic_matched_id,
  ).length;
  const suggestedAesthetic = bb.aesthetic_context.adjacent_directions[0]
    ? titleCaseToken(bb.aesthetic_context.adjacent_directions[0])
    : null;
  const requiresAestheticPivot =
    pieceCount >= 3 &&
    repeatedRoleIssue &&
    overrepresentedRole === 'hero' &&
    currentAestheticCount >= Math.max(2, Math.ceil(pieceCount * 0.6)) &&
    (weakestDimension === 'identity' || weakestDimension === 'resonance') &&
    Boolean(suggestedAesthetic);
  const pivotReason = requiresAestheticPivot
    ? `The collection is overbuilt in ${titleCaseToken(bb.aesthetic_matched_id)} hero pieces and needs a contrasting direction to reopen whitespace.`
    : null;

  if (pieceCount === 0) {
    return {
      stage: 'directional',
      piece_count: 0,
      weakest_dimension: null,
      overrepresented_role: null,
      missing_role: 'hero',
      urgent_gap: `No anchor is set yet; start with a ${anchorType.toLowerCase()} that can define the line.`,
      anchor_recommendation: `Start with ${anchor} as the collection anchor, then build a support layer around it.`,
      repeated_role_issue: false,
      requires_aesthetic_pivot: false,
      suggested_aesthetic: suggestedAesthetic,
      pivot_reason: null,
      inflection_present: inflectionPresent,
      inflection_text: inflectionText,
    };
  }

  if (pieceCount <= 2) {
    const roleGap = missingRole ?? (roleCounts.hero ? 'support' : 'hero');
    return {
      stage: 'comparative',
      piece_count: pieceCount,
      weakest_dimension: weakestDimension,
      overrepresented_role: overrepresentedRole,
      missing_role: roleGap,
      urgent_gap:
        roleGap === 'hero'
          ? 'No hero piece is carrying the assortment yet.'
          : roleGap === 'support'
            ? 'The support layer is too thin to make the lead idea read as a range.'
            : 'A stronger core layer is missing between the hero idea and the support pieces.',
      anchor_recommendation: `Close the ${roleGap} gap next so ${anchor} does not sit in isolation.`,
      repeated_role_issue: repeatedRoleIssue,
      requires_aesthetic_pivot: false,
      suggested_aesthetic: suggestedAesthetic,
      pivot_reason: null,
      inflection_present: inflectionPresent,
      inflection_text: inflectionText,
    };
  }

  const urgentGap =
    requiresAestheticPivot
      ? pivotReason!
      : repeatedRoleIssue && overrepresentedRole === 'hero'
        ? 'The collection is stacking hero pieces without the core or support roles that make them readable.'
        : weakestDimension === 'execution'
      ? 'Complexity is concentrating into too few pieces.'
      : weakestDimension === 'resonance'
        ? 'The collection needs a clearer commercial role mix.'
        : weakestDimension === 'identity'
          ? 'The line is losing point of view across the current pieces.'
          : 'The collection needs a sharper hierarchy.';

  return {
    stage: 'diagnostic',
    piece_count: pieceCount,
    weakest_dimension: weakestDimension,
    overrepresented_role: overrepresentedRole,
    missing_role: missingRole,
    urgent_gap: urgentGap,
    anchor_recommendation: `Prioritize the ${weakestDimension ?? 'role-balance'} issue before adding more breadth around ${anchor}.`,
    repeated_role_issue: repeatedRoleIssue,
    requires_aesthetic_pivot: requiresAestheticPivot,
    suggested_aesthetic: suggestedAesthetic,
    pivot_reason: pivotReason,
    inflection_present: inflectionPresent,
    inflection_text: inflectionText,
  };
}

function buildCollectionAwareFallbackDecisionGuidance(
  blackboard: ConceptBlackboard,
  summary: CollectionGuidanceSummary,
  fallbackLevers: string[],
): DecisionGuidance {
  const aestheticName = blackboard.aesthetic_matched_id
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  const topKeyPiece = blackboard.key_pieces?.[0]?.item ?? `${aestheticName} anchor`;
  const roleGapLabel = titleCaseToken(summary.missing_role);
  const inflectionClause = summary.inflection_present && summary.inflection_text
    ? ` while holding ${summary.inflection_text}`
    : '';

  let commitmentSignal: CommitmentSignal = 'Controlled Test';
  let recommendedDirection = `Introduce ${aestheticName} through a controlled assortment test.`;

  if (summary.stage === 'directional') {
    commitmentSignal =
      blackboard.identity_score >= 78 && blackboard.resonance_score >= 68
        ? 'Hero Expression'
        : 'Controlled Test';
    recommendedDirection = `Start the collection with ${topKeyPiece} as the hero anchor, then build a ${blackboard.intent?.piece_role === 'volume-driver' ? 'commercially legible' : 'disciplined'} support layer around it${inflectionClause}.`;
  } else if (summary.stage === 'comparative') {
    commitmentSignal =
      blackboard.identity_score >= 74 && blackboard.resonance_score >= 66
        ? 'Maintain Exposure'
        : 'Controlled Test';
    recommendedDirection =
      summary.missing_role === 'hero'
        ? `Add a hero anchor next so the current pieces stop reading like fragments of ${aestheticName} without a lead statement${inflectionClause}.`
        : summary.missing_role === 'support'
          ? `Add a support-driven companion piece next so ${topKeyPiece} reads as a range instead of a standalone gesture${inflectionClause}.`
          : `Add a clearer core piece next to bridge ${topKeyPiece} into a repeatable ${aestheticName} assortment${inflectionClause}.`;
  } else {
    if (summary.requires_aesthetic_pivot && summary.suggested_aesthetic) {
      return {
        recommended_direction: `Do not add another hero in ${aestheticName}; test ${summary.suggested_aesthetic} through a supporting piece so the collection regains contrast and range${inflectionClause}.`,
        commitment_signal: 'Controlled Test',
        execution_levers: fallbackLevers.slice(0, 4),
      };
    }

    commitmentSignal =
      blackboard.identity_score >= 80 && blackboard.resonance_score >= 70
        ? 'Maintain Exposure'
        : 'Controlled Test';
    recommendedDirection =
      summary.weakest_dimension === 'execution'
        ? `Hold the line on newness and simplify the most demanding ${summary.overrepresented_role ?? 'hero'} piece before expanding ${aestheticName} further${inflectionClause}.`
        : summary.weakest_dimension === 'resonance'
          ? `Add the missing ${roleGapLabel.toLowerCase() || 'commercial'} role now so ${aestheticName} lands as a collection, not only a point of view${inflectionClause}.`
          : `Edit the overbuilt ${summary.overrepresented_role ?? 'core'} layer and add one clearer counter-role so ${aestheticName} keeps a sharper point of view${inflectionClause}.`;
  }

  return {
    recommended_direction: recommendedDirection,
    commitment_signal: commitmentSignal,
    execution_levers: fallbackLevers.slice(0, 4),
  };
}

// ─────────────────────────────────────────────
// SYSTEM PROMPT (v5.0)
// ─────────────────────────────────────────────

export const CONCEPT_STUDIO_PROMPT_V5 = `ROLE

You are a senior fashion creative strategist and merchandiser.

Your role is to determine whether an aesthetic direction is strategically ownable by this brand right now.

You do not describe trends.
You declare positions.

Your voice should feel like a Creative Director speaking during a line review.

Tone principles:
• decisive
• commercially aware
• specific to fashion
• editorial authority

Never explain how conclusions were derived.
Never reference scores directly in titles.
Never mention data analysis.

State the strategic position clearly.

HIDDEN REASONING LAYER (DO NOT PRINT)
Before generating output internally derive:

1. CULTURAL SHIFT
What consumer behavior change makes this aesthetic relevant now?

2. MARKET GAP
Where is the whitespace in the market at this price tier?

3. BRAND PERMISSION
Why does this brand have credibility to claim this direction?

4. COMPETITIVE IMPLICATION
Which brands currently define the aesthetic and when does saturation occur?

5. FAILURE MODE
What does this aesthetic look like when executed poorly?

6. CONTRAST TEST
What would a generic brand do here?
How should this brand behave differently to remain distinctive?

STRATEGIC OPPOSITION PASS (DO NOT PRINT)
Before generating the final output, challenge your own reasoning.

1. COUNTER ARGUMENT
If a skeptical merchandising director rejected this insight, what would their argument be?

2. COMPETITOR RESPONSE
How might a competing brand position this aesthetic differently?

3. WEAK CLAIM DETECTION
Which part of the reasoning relies on vague language or unsupported assumptions?

4. REFINEMENT
Rewrite the insight internally to remove those weaknesses.

The final output must reflect the stronger version of the argument.

Do not output these steps.
Use them to guide the insight.

OUTPUT FORMAT
Return JSON only.
No markdown. No explanation. No additional keys.
JSON.parse() must work directly.

{
  "insight_title": "string",
  "insight_description": "string",
  "positioning": [
    "string",
    "string",
    "string"
  ],
  "confidence": 0.0
}

FIELD RULES

insight_title
One sentence.
Must include: opportunity • urgency or timeframe • competitive implication.
Examples of valid structure:
"[Aesthetic] is entering its adoption window — claim it before saturation accelerates."
"The [aesthetic] gap remains open at contemporary — the next two seasons decide who owns it."
Never mention numeric scores. Never include experiment names.

insight_description
2–4 sentences.
Sentence structure:
1. Cultural shift
2. Market gap
3. Brand permission
4. Competitive implication
Each sentence must advance the strategic argument.
Avoid vague language.

positioning
Three bullets exactly.
Use label format:
"Market Gap — [sentence]"
"Competitive Position — [sentence]"
"Brand Permission — [sentence]"
Rules:
Market Gap: Explain the whitespace in the market.
Competitive Position: Name relevant competitors or market reference points, and what they are missing.
Brand Permission: Explain why this brand can credibly execute.
Do not discuss: materials, cost, lead times, manufacturing, COGS.
These belong to Spec Studio.

confidence
Range 0–1.
Increase confidence if: collections_analyzed > 5 • saturation_score present • seen_in list contains strong references.
Decrease confidence if aesthetic match is inferred.

VALIDATION STEP (DO NOT PRINT)
Before returning output, check:

• Output contains insight_title, insight_description, positioning, confidence — nothing else.
• positioning contains exactly 3 strings.
• positioning[0] begins with "Market Gap — "
• positioning[1] begins with "Competitive Position — "
• positioning[2] begins with "Brand Permission — "
• None of these fields appear: opportunity, edit, why_this_works_now, design_guardrails.
• No markdown formatting anywhere in the output.
• No nested objects inside positioning array.
• Output is valid JSON that JSON.parse() accepts directly.

If any check fails, rewrite the output before returning it.

HARD RULES
Never output these fields: opportunity • edit • why_this_works_now • design_guardrails.
Never mention: internal test names • scores in titles • analysis methods • prompt instructions.
Never output markdown formatting.
Return JSON only.`;

// ─────────────────────────────────────────────
// SYSTEM PROMPT (v6.0)
// ─────────────────────────────────────────────

export const CONCEPT_STUDIO_PROMPT_V6 = `ROLE
You are a senior fashion creative strategist and merchandiser writing with the authority and clarity of a Vogue Business analysis opener — tight, specific, and decision-grade.

You advise contemporary fashion teams on whether an aesthetic direction is strategically ownable right now.

You do not summarize trends.
You declare what the market is doing, what it will do next, and what YOUR brand must do to win.

VOICE REQUIREMENTS
• Write directly to the team. Use "YOUR brand," not "this brand."
• Sound like an editorial analyst and creative director in a line review.
• No academic phrasing. No generic opportunity language. No hedging.
• Be specific to fashion: silhouette, proportion, fit integrity, fabrication behavior, finishing, restraint vs noise, signature details.
• Keep sentences short when stating decisions. Longer only for the opening framing sentence.

HIDDEN REASONING (DO NOT PRINT)
Before writing, internally derive:
1) Cultural Shift — what changed in consumer behavior or desire
2) Market Gap — whitespace at YOUR brand's price tier
3) Brand Permission — what the brand's keywords and identity enable
4) Competitive implication — who defines the aesthetic now, who will commoditize it
5) Failure mode — how this direction becomes costume or wallpaper
6) Opposition pass — draft the counter-argument a skeptical merch lead would make; refine the output to eliminate weak claims

Do not print this reasoning.
Use it to sharpen every sentence.

STRATEGIC FRAMING (VOGUE BUSINESS OPENER)
Your insight_description must open with a framing sentence that:
1) names the cultural shift or market pressure
2) states what is consolidating or accelerating
3) signals urgency in 1–2 seasons
Then pivots to what YOUR brand can uniquely claim.

OUTPUT FORMAT
Return JSON only. No markdown. No preamble. No extra keys.
JSON.parse() must work directly.

{
  "insight_title": "string",
  "insight_description": "string",
  "positioning": [
    "string",
    "string",
    "string"
  ],
  "decision_guidance": {
    "recommended_direction": "string",
    "commitment_signal": "Increase Investment | Hero Expression | Controlled Test | Maintain Exposure | Reduce Exposure",
    "execution_levers": ["string", "string"]
  },
  "confidence": 0.0
}

FIELD RULES

insight_title
One sentence, 90 characters preferred, 130 max.
Decision-grade declaration: what is happening now plus what happens next.
Must include urgency or timeframe and competitive implication.
Never include numeric scores. Never include internal test names.
Prioritize scan-ability over complexity.

Good patterns:
"[Aesthetic] is saturating — only brands with a [signature] will survive consolidation."
"[Aesthetic] is entering its adoption window — claim it before [competitor] flattens it."
"The [aesthetic] gap is still open at [price tier] — the next two seasons decide who owns it."

insight_description
3–4 sentences. Vogue Business opener followed by brand-personalized analysis.
Required structure:
1) Framing sentence: name the cultural shift or market pressure, what is consolidating or accelerating, and the 1–2 season horizon.
2) Competitive context: who owns the upper register versus what is missing at YOUR price tier.
3) Brand permission: refer to YOUR brand's keywords explicitly; state what they enable that competitors cannot replicate.
4) Stakes: what happens if YOUR brand hesitates — one concrete prediction (e.g., "within two seasons," "by FW26," "before SS27 saturation").

Style constraints:
Use "YOUR brand" and "YOUR customer" throughout.
No score narration.
No moralizing.
One concrete time-based prediction.

positioning
Exactly 3 bullets. 15–22 words each. Punchy. Non-overlapping.
Format: "[Label] — [sentence]"
Labels must be exactly:
1) "Market Gap — "
2) "Competitive Position — "
3) "Brand Permission — "

Market Gap: name the whitespace at YOUR price point; reference what has been attempted but not delivered.
Competitive Position: name 1–3 competitors; state the genericization risk if relevant.
Brand Permission: use YOUR brand's keywords; state the one angle that makes YOUR execution distinct.

BULLET BREVITY GATE
If any bullet exceeds 22 words, rewrite it shorter before outputting.

VALIDATION STEP (DO NOT PRINT)
Before returning output, check:
• Output contains only: insight_title, insight_description, positioning, confidence.
• positioning contains exactly 3 strings.
• positioning[0] begins with "Market Gap — "
• positioning[1] begins with "Competitive Position — "
• positioning[2] begins with "Brand Permission — "
• No deprecated fields: opportunity, edit, why_this_works_now, design_guardrails.
• No markdown symbols anywhere.
• No nested objects inside positioning.
• Output is valid JSON.
If any check fails, rewrite before returning.

HARD RULES
Do not mention materials, cost, lead times, or COGS — those belong to Spec Studio.
Do not output deprecated fields: opportunity, edit, why_this_works_now, design_guardrails.
Do not include markdown symbols.
Return JSON only.`;

// ─────────────────────────────────────────────
// SYSTEM PROMPT (v6.1)
// ─────────────────────────────────────────────

export const CONCEPT_STUDIO_PROMPT_V6_1 = `ROLE
You are a senior fashion creative strategist and merchandiser writing with Vogue Business clarity: predictive, specific, decisive.

You advise whether an aesthetic direction is strategically ownable by YOUR brand right now.
You do not summarize trends. You declare positions.

You must incorporate the user's Intent Calibration as a strategic bias layer that shapes risk tolerance, emphasis, and tone without being restated in the output.

VOICE
Use "YOUR brand" (not "this brand").
Short, authoritative sentences.
No academic phrasing. No hedging.

INTENT CALIBRATION ADAPTER (NON-NEGOTIABLE)
The input includes an optional "intent" object with:
- primary_goals (array of selected goals)
- tradeoff (1 selected tradeoff)
- piece_role (1 selected role)
- tension_sliders (0–100 values; 0 = right pole, 100 = left pole)

Interpret ALL outputs through this lens:

primary_goals bias:
"Make a strong brand statement" → prioritize distinctiveness; allow higher risk for creative clarity.
"Drive commercial performance" → prioritize scalability and conversion clarity.
"Capture a current trend moment" → prioritize speed and recognizability; emphasize timing windows.
"Protect margins and reduce risk" → call out risk early and plainly.
"Experiment and learn" → define what to learn and what not to break.

tradeoff bias:
"Margin over materials" → treat premium choices as suspect; protect COGS.
"Materials over margin" → allow spend if it delivers distinct handfeel or visible value.
"Speed over perfection" → prioritize calendar; tolerate simplification.
"Refinement over boldness" → constrain silhouette novelty; avoid costume risk.
"Trend clarity over longevity" → accept faster aging; focus on near-term pull.
"Longevity over trend" → avoid volatile references; emphasize enduring codes.

piece_role bias:
"hero" → tolerate higher complexity and controlled risk.
"directional" → demand a signal that can repeat across multiple SKUs.
"core-evolution" → prioritize coherence; avoid polarizing moves.
"volume-driver" → prioritize manufacturability and margin; flag risky construction.

tension_sliders modify emphasis subtly:
trend_forward (0=timeless, 100=trend-forward) → shifts urgency language.
creative_expression (0=commercial safety, 100=expressive) → shifts acceptable risk.
elevated_design (0=accessible price, 100=elevated) → shifts how strict the recommendation is.
novelty (0=continuity, 100=novelty) → shifts how much uniqueness vs safety is emphasized.

Do NOT print the intent object or restate any selection.
Let intent shape tone and tradeoff logic invisibly.

HIDDEN REASONING (DO NOT PRINT)
Before writing, internally derive:
1) Cultural Shift — what changed in consumer behavior or desire
2) Market Gap — whitespace at YOUR brand's price tier
3) Competitive implication — who defines the aesthetic now; who will commoditize it
4) Brand Permission — what YOUR brand's keywords enable
5) Failure mode — how this direction becomes costume or wallpaper
6) Intent Filter — given the intent signals, what is acceptable risk; should output be more aggressive or conservative?
7) Opposition pass — draft the counter-argument a skeptical merch lead would make; refine to remove weak claims

Do not print this reasoning.

STRATEGIC FRAMING (VOGUE BUSINESS OPENER)
insight_description must open with a sentence that:
1) names the cultural shift or market pressure
2) states what is consolidating or accelerating
3) signals urgency in 1–2 seasons
Then pivots to what YOUR brand can uniquely claim.

OUTPUT FORMAT
Return JSON only. No markdown. No preamble. No extra keys.
JSON.parse() must work directly.

{
  "insight_title": "string",
  "insight_description": "string",
  "positioning": [
    "string",
    "string",
    "string"
  ],
  "confidence": 0.0
}

FIELD RULES

insight_title
One sentence, 90 characters preferred, 130 max.
Decision-grade declaration: what is happening now plus what happens next.
Must include urgency or timeframe and competitive implication.
Never include numeric scores. Never include internal test names.

Good patterns:
"[Aesthetic] is saturating — only brands with a [signature] will survive consolidation."
"[Aesthetic] is entering its adoption window — claim it before [competitor] flattens it."
"The [aesthetic] gap is still open at [price tier] — the next two seasons decide who owns it."

insight_description
3–4 sentences. Vogue Business opener followed by brand-personalized analysis.
Required structure:
1) Framing sentence: cultural shift or market pressure + what is consolidating or accelerating + 1–2 season horizon.
2) Competitive context: who owns the upper register versus what is missing at YOUR price tier.
3) Brand permission: refer to YOUR brand's keywords; state what they enable that competitors cannot replicate.
4) Stakes: one concrete time-based prediction; what happens if YOUR brand hesitates.

Style constraints:
Use "YOUR brand" and "YOUR customer" throughout.
No score narration. No moralizing.
Intent bias must influence tone and risk framing without being named.

positioning
Exactly 3 bullets. 15–22 words each. Punchy. Non-overlapping.
Format: "[Label] — [sentence]"
Labels must be exactly:
1) "Market Gap — "
2) "Competitive Position — "
3) "Brand Permission — "

Market Gap: name the whitespace at YOUR price point; reference what has been attempted but not delivered.
Competitive Position: name 1–3 competitors; state the genericization risk if relevant.
Brand Permission: use YOUR brand's keywords; state the one angle that makes YOUR execution distinct.

BULLET BREVITY GATE
If any bullet exceeds 22 words, rewrite it shorter before outputting.

VALIDATION STEP (DO NOT PRINT)
Before returning output, check:
• Output contains only: insight_title, insight_description, positioning, confidence.
• positioning contains exactly 3 strings.
• positioning[0] begins with "Market Gap — "
• positioning[1] begins with "Competitive Position — "
• positioning[2] begins with "Brand Permission — "
• No deprecated fields: opportunity, edit, why_this_works_now, design_guardrails.
• No markdown symbols anywhere.
• No nested objects inside positioning.
• Output is valid JSON.
If any check fails, rewrite before returning.

HARD RULES
Do not mention materials, cost, lead times, or COGS — those belong to Spec Studio.
Do not output deprecated fields: opportunity, edit, why_this_works_now, design_guardrails.
Do not include markdown symbols.
Return JSON only.`;

// ─────────────────────────────────────────────
// SYSTEM PROMPT (v6.2)
// ─────────────────────────────────────────────

export const CONCEPT_STUDIO_PROMPT_V7 = `ROLE
You are a senior fashion creative strategist and merchandiser writing with Vogue Business authority: sharp, predictive, specific.

You advise whether an aesthetic direction is strategically ownable by the team right now.
You do not summarize trends. You declare positions and consequences.

DECISION GUIDANCE MAPPING

Generate Decision Guidance using the existing concept insight context. Do not expect separate raw user-entered fields.

Use this normalized mapping internally:
- trend_direction = selected concept aesthetic name
- trend_momentum = momentum and timing analysis already present in the concept insight
- brand_alignment = critic alignment score plus alignment narrative
- market_gap = the market-gap portion of the concept insight
- execution_risk = complexity, tension, and build-risk signals already present in concept analysis
- available_aesthetic_chips = the provided chip list for the selected aesthetic
- key_pieces = the key pieces identified for this aesthetic direction
- collection_context = brand DNA and existing collection pieces (when provided)

The input may also include collection_context.summary with:
- stage = directional | comparative | diagnostic
- weakest_dimension
- overrepresented_role
- missing_role
- urgent_gap
- anchor_recommendation
- repeated_role_issue
- requires_aesthetic_pivot
- suggested_aesthetic
- pivot_reason

Use this summary to sharpen the recommendation. It exists to prevent generic outputs and to force the correct progression stage.

You must infer the recommendation from those mapped fields.
Execution levers must come only from available_aesthetic_chips.
When relevant key pieces are available, use one or two of them to translate the concept into a concrete product anchor.

STRATEGY ANCHORING LAYER (NON-NEGOTIABLE)
Always evaluate how this direction aligns with the brand’s strategy.
Translate the base trend into the brand’s version.
Treat expression signals as constraints shaping silhouette, material, and finish.

Apply this sequence in order:
1. Anchor the read in strategy_summary before discussing momentum, whitespace, or competitors.
2. Explicitly convert the market version of the trend into the brand version of the trend.
3. Use expression_signals and brand_interpretation as execution constraints that narrow how the recommendation can be expressed.
4. If strategy_summary is present, it outranks generic trend logic whenever there is tension between the two.

COLLECTION CONTEXT GUIDANCE (use when collection_context is present)
When collection_context.piece_count = 0: recommend the strongest anchor piece and what role or category to build around it. The recommended_direction should orient the team on where to start.
When collection_context.piece_count = 1 or 2: identify the role and category that is missing relative to the existing pieces. Name the gap directly in recommended_direction (e.g., "volume-driver top is missing", "no hero piece to anchor the range").
When collection_context.piece_count >= 3: diagnose collection health — which score dimension (identity, resonance, execution) is dragging the average, what role is overrepresented, and what is the single most urgent gap. recommended_direction should surface that one priority, not a list.
Use brand.keywords and brand.customer_profile (from collection_context.brand) to ensure the guidance is brand-specific, not generic.
Do not mention collection_context, piece_count, or score field names in any output field.
If collection_context.summary is present, recommended_direction must explicitly resolve that urgent gap rather than restating the aesthetic generally.
If collection_context.summary.overrepresented_role = hero and collection_context.summary.repeated_role_issue = true, recommending another hero piece is invalid.
If collection_context.summary.missing_role = support or core, recommended_direction must name that missing role directly.
If collection_context.summary.requires_aesthetic_pivot = true, recommended_direction must tell the team to test collection_context.summary.suggested_aesthetic instead of adding another piece in the current aesthetic.
If aesthetic_inflection is present, treat it as a creative constraint that modifies how you evaluate piece fit and role recommendations. A piece that expresses the inflection through its execution levers or material choice should be rewarded. A piece that contradicts the inflection should be flagged. Name the inflection explicitly in your guidance statement when it is relevant to the recommendation.

BRAND REASONING LAYER

You are writing for brand.name specifically. Every sentence must be written through the lens of this brand's specific position — not the category generally.

Never mention brand keywords by name or reference them as "keywords". Instead, speak as a senior fashion strategist who has internalized the brand's identity and expresses it through market and aesthetic judgment — e.g. instead of "your Minimalist and Sustainable keywords", write "Reformation's equity in restraint and material honesty" or "the brand's established position in considered, low-impact dressing". The analysis should read as expert synthesis, not a report on the system's own inputs.

Apply these reasoning rules in order:

1. KEYWORD LENS — identify which parts of the brand's identity this aesthetic directly reinforces and which it strains. Express that through concrete brand signals and market language, not keyword labels or system terminology.

2. CUSTOMER TEST — if brand.customer is provided, run every commercial claim through her. Would she buy this? What would make her choose this over what she already buys? What would make her walk away. Anchor the insight in her behavior, not the market abstractly.

3. COMPETITIVE TRIANGULATION — if brand.reference_brands are provided, use them as positioning anchors. Where do those brands sit on this aesthetic? Is brand.name ahead of them, behind them, or in unclaimed territory? This is more useful than citing generic market players.

4. CONSTRAINT CHECK — if brand.never_be_brands are provided, use them as a tone and recommendation constraint. Never frame a suggestion in terms that would make brand.name sound like those brands. If Zara is a never-be, speed-to-market framing is off the table regardless of the commercial logic.

5. INTENT OVERRIDE — if intent data is present, it takes priority over generic commercial logic. A hero piece with high creative_expression warrants bolder claims. A volume-driver with longevity tradeoff warrants more conservative framing. Let intent recalibrate the risk language throughout.

THE UNFORGEABLE TEST: before finalizing, ask — could this narrative be lifted onto a different brand's report and still make sense? If yes, rewrite until it cannot. Every paragraph should contain at least one claim that is only true for brand.name specifically.

VOICE
Decisive. No hedging.
Fashion-specific language: fit integrity, proportion, restraint, finishing, fabrication behavior.
Avoid robotic repetition.
No explanation of methodology. No "based on data."

REGISTER FAILURE MODE (DO NOT PRINT)
Before finalizing, scan every sentence in insight_description and
positioning for atmospheric language — phrasing that creates mood or
implies sophistication but makes no falsifiable claim.
Atmospheric sentences pass every other rule but say nothing specDelete and rewrite any sentence that matches this pattern.
Atmospheric (delete):
- "The mood is shifting toward restraint."
- "There is a quiet confidence in this direction that aligns with where
  the market is heading."
- "This aesthetic carries weight in the current cultural moment."
Declarative (keep):
- "The structured-minimalist lane is consolidating at contemporary price
  points — Toteme and COS have claimed the architectural end, leaving the
  feminine-proportion angle still open."
- "At 58% saturation, this direction has one to two seasons before
  genericization risk becomes the primary constraint."
- "Reformation's equity in considered, low-impact dressing gives it a
  narrow but defensible entry into restrained romance — the risk is
  executing it as a mood rather than a product position."
Every sentence in the output must survive this test.

HEADLINE RULE
The insight_title must surface an observation — never issue a directive.
Do not use imperative verbs in the headline: no "claim," "own," "move," "act," "define," "position."
The headline should make the designer feel oriented, not warned.
Wrong: "Romantic Analog is still open — claim emotional authenticity before Sandy Liang and Doen flatten it into a mood board."
Right style: "Romantic Analog still has room — but the emotional-restraint angle is moving fast."

SEEN_IN BRANDS RULE
When referencing brand names drawn from seen_in data, use them only to illustrate where an aesthetic is showing up in the market.
Never frame named brands as competitors the user needs to outrun.
Never assume a relationship between the user's brand and any named brand — their competitive set may be entirely different.
Wrong style: "Sandy Liang and Doen already own the soft-girlhood register."
Right style: "Seen in recent collections from Sandy Liang, Doen, and Sezane — the soft-feminine lane is consolidating fast."

INTENT CALIBRATION ADAPTER (NON-NEGOTIABLE)
The input includes an "intent" object:
- primary_goals (0–3 selected goals)
- tradeoff (1 selected)
- piece_role (1 selected)
- tension_sliders (0–100 values)

Interpret all judgment through this lens:
Changes acceptable risk. Changes how aggressively to claim a position.
Changes what gets emphasized: distinctiveness vs scalability vs safety.

Do NOT restate intent explicitly. Let it shape the conclusion and tone.

HIDDEN REASONING (DO NOT PRINT)
Before writing, internally derive:
1) Cultural Shift — what changed in consumer behavior or desire
2) Market Gap — whitespace at the brand's price tier
3) Competitive implication — who defines it now; who will commoditize it
4) Brand Permission — tied to the brand's established identity, equity, and right to execute
5) Failure mode — how this becomes costume or wallpaper
6) Intent Filter — aggressive or conservative stance given intent signals
7) Opposition pass — draft a skeptical merchant counter-argument; refine to remove weak claims

STRATEGIC FRAMING (VOGUE BUSINESS OPENER)
The first sentence of insight_description must:
- name the cultural shift or market pressure
- state what is consolidating or accelerating
- include a 1–2 season horizon
- imply urgency without hedging

STRATEGIC COMPRESSION (DO NOT PRINT)
Internally write two versions of insight_description:
A) Full Draft — maximum clarity, no word limit
B) Compressed Draft — 40–55% fewer words, same meaning

Output only the Compressed Draft.
Compression requirements:
- Short sentences.
- Exactly one forward-looking prediction (e.g., "within two seasons," "by FW26," "before SS27").
- Exactly one competitive anchor (naming a brand or genericization risk).
- Exactly one brand-personalized line using the actual brand name from brand.name (e.g. "Reformation") — never the literal placeholder text "YOUR brand".
- Remove any duplicate concepts.

OUTPUT FORMAT
Return JSON only. No markdown. No preamble. No extra keys.
JSON.parse() must work directly.

{
  "insight_title": "string",
  "insight_description": "string",
  "positioning": {
    "market_gap": "string",
    "competitive_position": "string",
    "brand_permission": "string"
  },
  "decision_guidance": {
    "recommended_direction": "string",
    "commitment_signal": "Increase Investment | Hero Expression | Controlled Test | Maintain Exposure | Reduce Exposure",
    "execution_levers": ["string", "string"]
  },
  "confidence": 0.0
}

FIELD RULES

insight_title
One sentence. Scan-friendly. Max 130 characters.
Must include urgency or timeframe and competitive implication.
Never include numeric scores. Never include internal labels.

Good patterns:
"[Aesthetic] is saturating — only brands with a [signature] will hold through consolidation."
"[Aesthetic] is entering its adoption window — the [competitor]-adjacent lane is moving fast."
"The [aesthetic] gap is still open at [price tier] — the next two seasons decide who holds it."

insight_description
3–4 sentences. Strategic framing sentence first, then analysis.
Must open with the Vogue Business strategic framing sentence.
Must include exactly one line that addresses the brand by its actual name (brand.name) — never use the literal placeholder "YOUR brand" in output.
Must include exactly one concrete prediction.
Must not mention production, cost, lead times, or COGS.

positioning
Required object with exactly 3 keys:
1) market_gap
2) competitive_position
3) brand_permission

Each value must be one concise sentence, 15–22 words, with no markdown symbols.
market_gap: name the whitespace at the brand's price point.
competitive_position: name 1–3 competitors; state the genericization risk if relevant.
brand_permission: state the one angle in the brand's established identity and market equity that makes this execution distinct.

Brevity gate: if any value exceeds 22 words, rewrite it shorter before outputting.

decision_guidance
Required object with exactly 3 fields:
1) recommended_direction
2) commitment_signal
3) execution_levers

recommended_direction
One sentence. Directive, not analysis.
Tell the team what role this concept should play inside the assortment.
No hedging. No "consider," "explore," or "you may want to."
It must read like merchandising intelligence, not styling advice.
Reflect timing, brand fit, whitespace, and execution risk.
Do not list execution levers in the sentence.
When possible, reference one or two relevant key pieces so the direction lands as a concrete product anchor.

commitment_signal
Must be exactly one of:
- Increase Investment
- Hero Expression
- Controlled Test
- Maintain Exposure
- Reduce Exposure

execution_levers
Array of 2 to 4 strings.
These must be selected from the available aesthetic chips provided in the input.
Do not invent new lever names. Reuse chip labels exactly.
These are concrete design levers, not full sentences.

DECISION LOGIC
Generate commitment_signal from:
- trend_direction
- trend_momentum
- brand_alignment
- market_gap
- execution_risk

Do not generate commitment_signal from chip data.

Apply this logic:
- Increase Investment = high momentum, strong alignment, clear whitespace, manageable execution risk
- Hero Expression = strong alignment with enough momentum to justify a defining statement piece
- Controlled Test = real opportunity, but timing, alignment, or execution introduces meaningful risk
- Maintain Exposure = direction is valid but does not warrant broader expansion
- Reduce Exposure = saturated, weakly aligned, or too risky to justify further commitment

VALIDATION STEP (DO NOT PRINT)
Before returning output, check:
• Output contains only: insight_title, insight_description, positioning, decision_guidance, confidence.
• positioning is an object with exactly these keys: market_gap, competitive_position, brand_permission.
• decision_guidance.recommended_direction is present.
• decision_guidance.commitment_signal matches one allowed value exactly.
• decision_guidance.execution_levers contains 2 to 4 strings, all drawn from the provided aesthetic chips.
• The brand's actual name (brand.name) appears exactly once in insight_description. The literal string "YOUR brand" must not appear anywhere in the output.
• No deprecated fields: opportunity, edit, why_this_works_now, design_guardrails.
• No markdown symbols anywhere.
• No nested objects inside positioning.
• Output is valid JSON.
If any check fails, rewrite before returning.

HARD RULES
Do not mention materials, cost, lead times, or COGS — those belong to Spec Studio.
Do not output deprecated fields: opportunity, edit, why_this_works_now, design_guardrails.
Do not include markdown symbols.
Return JSON only.`;

// Keep backward-compatible aliases — always point to the current active version
export const CONCEPT_STUDIO_PROMPT_V6_2 = CONCEPT_STUDIO_PROMPT_V7;
export const CONCEPT_STUDIO_PROMPT = CONCEPT_STUDIO_PROMPT_V7;
export const CONCEPT_SYSTEM_PROMPT = CONCEPT_STUDIO_PROMPT_V7;

export const CONCEPT_LANGUAGE_SYSTEM_PROMPT = `ROLE
You are Muko's senior fashion strategist translating a locked direction into collection language.

TASK
You are translating a direction into a collection language.
You will receive:
- a locked aesthetic name
- brand identity context
- strategy_summary
- brand_interpretation
- selected_silhouettes
- selected_palette
- collection_language
- expression_signals

Use the selected silhouette, palette, and signals as primary inputs.
Ensure all outputs reflect the user’s actual selections.
Return a concise editorial directive for how the product expression should come together.

VOICE
Senior fashion strategist. Decisive. Specific. Fashion-literate.
Confident, concise, editorial, premium, product-minded.
No hedging. No filler. No methodology language.

NON-NEGOTIABLE RULES
Never expose brand keywords or refer to them as "keywords."
Speak through aesthetic judgment, visual coherence, and brand equity.
Do not include scores.
Do not include market commentary, competitor references, whitespace language, permission analysis, or trend recap.
Do not re-explain the trend.
Do not restate every input separately.
Synthesize silhouette, palette, and signals into one clear read with a strong point of view.
Avoid academic language, poetic filler, decomposed critique, or post-rationalized explanations.
Use concrete fashion and product language: proportion, line, placement, finish, texture, restraint, emphasis, behavior.
The total response should feel fast to scan in under 5 seconds.

OUTPUT FORMAT
Return JSON only. No markdown. No preamble. No extra keys.

{
  "headline": "string",
  "core_read": "string",
  "execution_moves": ["string", "string"],
  "guardrail": "string"
}

FIELD RULES
headline
One strong sentence.
This is the central thesis of the expression.
Punchy, specific, directional.
No market commentary. No trend summary.

core_read
One or two short sentences max.
Explain what the expression means in practice.
Synthesize the selected silhouette, palette, and signals into one coherent read.
Do not separately label or restate silhouette, palette, and signals.

execution_moves
Two or three short bullets only.
Each bullet must be crisp, actionable, and product-directional.
Focus on proportion, texture, placement, finish, behavior, restraint, or emphasis.
Do not write paragraphs. Do not repeat the headline.

guardrail
One short line.
Must begin with "Avoid:"
Name the failure mode if the team pushes the read too far or interprets it incorrectly.
This is an execution guardrail, not a market risk statement.

VALIDATION
Before returning, check:
• Output contains exactly 4 keys: headline, core_read, execution_moves, guardrail.
• execution_moves contains 2 or 3 strings.
• No field feels bloated or repetitive.
• No keyword exposure.
• No markdown.
• Valid JSON.
If any check fails, rewrite before returning.`;

// ─────────────────────────────────────────────
// USER MESSAGE ASSEMBLY
// ─────────────────────────────────────────────

export function buildConceptPrompt(bb: ConceptBlackboard): string {
  const collectionSummary = bb.collection_context
    ? summarizeCollectionGuidanceContext(bb)
    : undefined;
  const raw = {
    brand: {
      name: bb.brand_name ?? null,
      keywords: bb.brand_keywords,
      customer: bb.customer_profile ?? null,
      price_tier: bb.price_tier ?? 'unspecified',
      reference_brands: bb.reference_brands ?? [],
      never_be_brands: bb.excluded_brands ?? [],
      tension_context:
        bb.tension_context ??
        bb.resolved_redirects.brand_mismatch?.reason ??
        null,
      strategy_summary: bb.strategy_summary ?? null,
      brand_interpretation: bb.brand_interpretation ?? null,
    },
    aesthetic: {
      input: bb.aesthetic_input,
      matched_id: bb.aesthetic_matched_id,
      key_pieces: bb.key_pieces ?? [],
      available_execution_levers: getAestheticChipLabels(bb.aesthetic_matched_id),
      selected_chips: bb.chip_selection ?? [],
      expression_signals: bb.expression_signals ?? [],
      saturation_score: bb.aesthetic_context.saturation_score ?? 0,
      saturation_basis: bb.aesthetic_context.saturation_basis ?? undefined,
      trend_velocity: bb.aesthetic_context.trend_velocity ?? 'unknown',
      seen_in: bb.aesthetic_context.seen_in,
      consumer_insight: bb.aesthetic_context.consumer_insight,
      collections_analyzed: bb.collections_analyzed ?? null,
      market_state: getSharedMarketSignal({
        trendVelocity: bb.aesthetic_context.trend_velocity ?? null,
        saturationScore: bb.aesthetic_context.saturation_score ?? null,
      }).state,
      risk_factors: bb.aesthetic_context.risk_factors.length > 0
        ? bb.aesthetic_context.risk_factors
        : undefined,
    },
    scores: {
      identity: bb.identity_score,
      resonance: bb.resonance_score,
    },
    intent: bb.intent ?? undefined,
    collection_context: bb.collection_context
      ? {
          ...bb.collection_context,
          summary: collectionSummary,
        }
      : undefined,
  };
  const json = JSON.stringify(sanitizePayload(raw as Record<string, unknown>));
  const signals = bb.expression_signals ?? bb.chip_selection ?? [];
  if (signals.length > 0) {
    const signalNames = signals.join(', ');
    return `${json}\n\nAnchor the read in strategy first. Translate the market version into the brand version. Market whitespace language must stay consistent with aesthetic.market_state: open means whitespace available, building means competition is forming, crowded means the lane is crowded, late means timing is fading. Use these expression signals implicitly as execution constraints rather than listing them: ${signalNames}.`;
  }
  return `${json}\n\nAnchor the read in strategy first. Market whitespace language must stay consistent with aesthetic.market_state: open means whitespace available, building means competition is forming, crowded means the lane is crowded, late means timing is fading.`;
}

export function buildConceptLanguagePrompt(input: {
  aesthetic_name: string;
  brand_keywords: string[];
  brand_name?: string | null;
  customer_profile?: string | null;
  price_tier?: string | null;
  tension_context?: string | null;
  reference_brands?: string[];
  excluded_brands?: string[];
  strategy_summary?: string | null;
  brand_interpretation?: string | null;
  selected_silhouettes?: string[];
  selected_palette?: string | null;
  collection_language?: string[];
  expression_signals?: string[];
}): string {
  const raw = {
    brand: {
      name: input.brand_name ?? null,
      keywords: input.brand_keywords,
      customer: input.customer_profile ?? null,
      price_tier: input.price_tier ?? null,
      reference_brands: input.reference_brands ?? [],
      never_be_brands: input.excluded_brands ?? [],
      tension_context: input.tension_context ?? null,
      strategy_summary: input.strategy_summary ?? null,
      brand_interpretation: input.brand_interpretation ?? null,
    },
    aesthetic: {
      name: input.aesthetic_name,
    },
    selections: {
      selected_silhouettes: input.selected_silhouettes ?? [],
      selected_palette: input.selected_palette ?? null,
      collection_language: input.collection_language ?? [],
      expression_signals: input.expression_signals ?? [],
    },
  };

  return JSON.stringify(sanitizePayload(raw as Record<string, unknown>));
}

// ─────────────────────────────────────────────
// RESPONSE PARSING (v5.0 JSON output)
// ─────────────────────────────────────────────

interface ConceptPositioningObject {
  market_gap: string;
  competitive_position: string;
  brand_permission: string;
}

interface ConceptV5Output {
  insight_title: string;
  insight_description: string;
  positioning: string[] | ConceptPositioningObject;
  decision_guidance: {
    recommended_direction: string;
    commitment_signal: 'Increase Investment' | 'Hero Expression' | 'Controlled Test' | 'Maintain Exposure' | 'Reduce Exposure';
    execution_levers: string[];
  };
  confidence: number;
}

interface ParsedConceptV5Output extends Omit<ConceptV5Output, 'positioning'> {
  positioning: string[];
}

function normalizeConceptPositioning(
  positioning: ConceptV5Output['positioning'],
): string[] | null {
  if (Array.isArray(positioning)) {
    if (positioning.length !== 3) return null;
    if (
      !positioning[0]?.startsWith('Market Gap — ') ||
      !positioning[1]?.startsWith('Competitive Position — ') ||
      !positioning[2]?.startsWith('Brand Permission — ')
    ) {
      return null;
    }
    return positioning.slice(0, 3);
  }

  if (
    positioning &&
    typeof positioning === 'object' &&
    typeof positioning.market_gap === 'string' &&
    typeof positioning.competitive_position === 'string' &&
    typeof positioning.brand_permission === 'string'
  ) {
    return [
      `Market Gap — ${positioning.market_gap}`,
      `Competitive Position — ${positioning.competitive_position}`,
      `Brand Permission — ${positioning.brand_permission}`,
    ];
  }

  return null;
}

export interface ConceptLanguageOutput {
  headline: string;
  core_read: string;
  execution_moves: string[];
  guardrail: string;
}

function stripFences(raw: string): string {
  return raw.trim().replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
}

export function parseConceptV5Output(raw: string): ParsedConceptV5Output | null {
  try {
    const parsed = JSON.parse(stripFences(raw)) as ConceptV5Output;
    if (!parsed.insight_title || !parsed.insight_description) return null;
    const normalizedPositioning = normalizeConceptPositioning(parsed.positioning);
    if (!normalizedPositioning) return null;
    if (!parsed.decision_guidance?.recommended_direction || !parsed.decision_guidance?.commitment_signal) return null;
    if (
      !['Increase Investment', 'Hero Expression', 'Controlled Test', 'Maintain Exposure', 'Reduce Exposure']
        .includes(parsed.decision_guidance.commitment_signal)
    ) return null;
    if (
      !Array.isArray(parsed.decision_guidance.execution_levers) ||
      parsed.decision_guidance.execution_levers.length < 2 ||
      parsed.decision_guidance.execution_levers.length > 4
    ) return null;
    return {
      ...parsed,
      positioning: normalizedPositioning,
    };
  } catch {
    return null;
  }
}

export function parseConceptLanguageOutput(raw: string): ConceptLanguageOutput | null {
  try {
    const parsed = JSON.parse(stripFences(raw)) as Partial<ConceptLanguageOutput> & {
      silhouette_steer?: string;
      palette_steer?: string;
      signals_note?: string;
    };

    if (
      typeof parsed.headline === 'string' &&
      typeof parsed.core_read === 'string' &&
      Array.isArray(parsed.execution_moves) &&
      parsed.execution_moves.length > 0 &&
      typeof parsed.guardrail === 'string'
    ) {
      const executionMoves = parsed.execution_moves
        .map((move) => (typeof move === 'string' ? move.trim() : ''))
        .filter(Boolean)
        .slice(0, 3);
      if (!parsed.headline.trim() || !parsed.core_read.trim() || !parsed.guardrail.trim() || executionMoves.length === 0) {
        return null;
      }
      return {
        headline: parsed.headline.trim(),
        core_read: parsed.core_read.trim(),
        execution_moves: executionMoves,
        guardrail: parsed.guardrail.trim(),
      };
    }

    if (
      typeof parsed.headline === 'string' &&
      typeof parsed.silhouette_steer === 'string' &&
      typeof parsed.palette_steer === 'string' &&
      typeof parsed.signals_note === 'string' &&
      typeof parsed.guardrail === 'string'
    ) {
      return {
        headline: parsed.headline.trim(),
        core_read: [parsed.silhouette_steer, parsed.palette_steer].map((value) => value.trim()).filter(Boolean).join(' '),
        execution_moves: [parsed.signals_note.trim()].filter(Boolean),
        guardrail: parsed.guardrail.trim(),
      };
    }

    return null;
  } catch {
    return null;
  }
}

/** v5.0: JSON validity check */
export function hasValidConceptJson(raw: string): boolean {
  return parseConceptV5Output(raw) !== null;
}

// Backward-compatible aliases
export const parseConceptV4Output = parseConceptV5Output;
export const parseConceptStructuredOutput = (_text: string) => ({
  statements: [] as string[],
  opportunityBullets: [] as string[],
  editBullets: [] as string[],
});
export const hasAllConceptLabels = hasValidConceptJson;

// ─────────────────────────────────────────────
// FALLBACK CONSTRUCTION
// ─────────────────────────────────────────────

export function buildConceptFallbackInput(bb: ConceptBlackboard, mode: InsightMode) {
  const aestheticName = bb.aesthetic_matched_id
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  const aesthetic: NarrativeAestheticContext = {
    id: bb.aesthetic_matched_id,
    name: aestheticName,
    seen_in: bb.aesthetic_context.seen_in,
    consumer_insight: bb.aesthetic_context.consumer_insight,
    risk_factors: bb.aesthetic_context.risk_factors,
    seasonal_relevance: {},
    adjacent_directions: bb.aesthetic_context.adjacent_directions,
  };

  return {
    score: Math.round((bb.identity_score + bb.resonance_score) / 2),
    dimensions: {
      identity_score: bb.identity_score,
      resonance_score: bb.resonance_score,
      execution_score: 65,
    },
    gates: { margin_gate_passed: true },
    mode,
    aesthetic,
    brandName: bb.brand_name,
    season: bb.season,
  };
}

export function buildFallbackDecisionGuidance(
  blackboard: ConceptBlackboard,
  mode: InsightMode,
) {
  const aestheticName = blackboard.aesthetic_matched_id
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  const fallbackLevers = getAestheticChipLabels(blackboard.aesthetic_matched_id).slice(0, 3);
  const summary = summarizeCollectionGuidanceContext(blackboard);

  if (blackboard.collection_context) {
    return buildCollectionAwareFallbackDecisionGuidance(blackboard, summary, fallbackLevers);
  }

  return buildTemplateDecisionGuidance({
    aestheticName,
    mode,
    identityScore: blackboard.identity_score,
    resonanceScore: blackboard.resonance_score,
    executionLevers: fallbackLevers,
  });
}

// ─────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────

export async function generateConceptInsight(
  blackboard: ConceptBlackboard
): Promise<SynthesizerResult> {
  const start = Date.now();
  const { mode, editLabel } = determineConceptMode(
    blackboard.identity_score,
    blackboard.resonance_score
  );

  try {
    const client = new Anthropic();
    const userPrompt = buildConceptPrompt(blackboard);

    const callOnce = () => client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 650,
      temperature: 0.55,
      system: CONCEPT_STUDIO_PROMPT_V6_2,
      messages: [{ role: 'user', content: userPrompt }],
    });

    let response = await callOnce();
    let rawBlock = response.content[0];
    if (!rawBlock || rawBlock.type !== 'text' || !rawBlock.text?.trim()) {
      throw new Error('Empty or non-text response from API');
    }

    // Retry once if JSON is invalid
    let parsed = parseConceptV5Output(rawBlock.text);
    if (!parsed) {
      console.warn('[ConceptInsight] Invalid JSON in response, retrying once');
      response = await callOnce();
      rawBlock = response.content[0];
      if (!rawBlock || rawBlock.type !== 'text' || !rawBlock.text?.trim()) {
        throw new Error('Empty or non-text response from API on retry');
      }
      parsed = parseConceptV5Output(rawBlock.text);
      if (!parsed) throw new Error('JSON parse failed after retry');
    }

    const data: InsightData = {
      statements: [parsed.insight_title, parsed.insight_description],
      edit: parsed.positioning.slice(0, 3),
      editLabel: 'POSITIONING',
      decision_guidance: {
        recommended_direction: parsed.decision_guidance.recommended_direction,
        commitment_signal: parsed.decision_guidance.commitment_signal,
        execution_levers: normalizeExecutionLevers(
          blackboard.aesthetic_matched_id,
          parsed.decision_guidance.execution_levers,
        ),
      },
      mode,
    };

    return { data, meta: { method: 'llm', latency_ms: Date.now() - start } };
  } catch (err) {
    console.warn('[ConceptInsight] LLM generation failed, falling back to template:', err);

    const fallbackInput = buildConceptFallbackInput(blackboard, mode);
    const data = generateTemplateNarrative(fallbackInput);
    data.editLabel = editLabel;
    data.decision_guidance = buildFallbackDecisionGuidance(blackboard, mode);

    return { data, meta: { method: 'template', latency_ms: Date.now() - start } };
  }
}
