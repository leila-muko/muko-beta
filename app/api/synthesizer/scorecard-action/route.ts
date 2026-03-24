// app/api/synthesizer/scorecard-action/route.ts
// Non-streaming POST. Returns an action suggestion for the scorecard modal.
//
// Only fired when at least one of:
//   execution_score < 70 | cost_gate_passed === false | identity_score < 65
//
// For conflict_type === 'none', the client uses STATIC_ACTION_FALLBACK directly
// and never calls this route. If called anyway, returns the same static object.
//
// Input:  ActionSuggestionPayload
// Output: ActionSuggestion

import { NextRequest, NextResponse } from 'next/server';
import { callClaude } from '@/lib/claude/client';

export type ConflictType =
  | 'cost_gate'
  | 'execution_timeline'
  | 'execution_complexity'
  | 'identity_misalignment'
  | 'none';

export interface AlternativeMaterial {
  material_name: string;
  cost_per_yard: number;
  lead_time_weeks: number;
  saving_vs_selected: number;
  lead_reduction_weeks: number;
  aesthetic_note: string;
  tradeoff_note?: string; // e.g. "Resolves lead time · margin improves"
}

export interface ActionSuggestionPayload {
  conflict_type: ConflictType;
  brand_name: string;
  piece_name: string;
  category: string;
  piece_role: string;
  collection_name: string;
  season: string;
  identity_score: number;
  resonance_score: number;
  execution_score: number;
  cost_gate_passed: boolean;
  cogs: number;
  margin_buffer: number;
  msrp: number;
  material_name: string;
  material_cost_per_yard: number;
  material_lead_time_weeks: number;
  construction_tier: 'low' | 'moderate' | 'high';
  execution_reason: string;
  complexity_load_label: 'healthy' | 'moderate' | 'strained';
  complexity_load_score: number;
  role_distribution_summary: string;
  alternatives: AlternativeMaterial[];
}

export interface ActionSuggestionAlt {
  label: string;
  material_id: string;
}

export interface ActionSuggestion {
  conflict_label: string;
  directive: string;
  explanation: string;
  show_alternatives: boolean;
  alternatives: ActionSuggestionAlt[];
  cta_variant: 'add' | 'revise_recommended';
  hint_text: string;
}

const STATIC_ACTION_FALLBACK: ActionSuggestion = {
  conflict_label: 'No conflicts',
  directive: 'This piece is ready. Add it and keep building.',
  explanation:
    'Identity, Resonance, and Execution are working together. The build clears margin and the timeline is comfortable.',
  show_alternatives: false,
  alternatives: [],
  cta_variant: 'add',
  hint_text: 'Revise to keep refining',
};

const SYSTEM_PROMPT = `You are Muko's decision advisor. You write the action suggestion that appears on a piece scorecard after a designer runs an analysis.

Your job is to flag the most important risk and recommend a path forward — not to tell the designer what they must do. They are always in control. You are advising, not blocking.

Rules you must follow:
- Write as a strategist advising a design director, not as software explaining a result
- Never restate the score number in your output
- Never use the words "score", "metric", "analysis", "data", "assessment", "must", "only path", "required", "have to", or "no choice"
- Never imply the designer cannot proceed without taking your suggestion
- The directive is a recommendation, not a requirement. Frame it as the clearest path, not the only path.
- The directive must be a single sentence. Maximum 18 words.
- The explanation must be 2 sentences maximum. Be specific — name the material, the lead time, the dollar figure. Vague explanations are useless.
- Alternatives are ranked by how much they reduce the primary constraint. Each has a tradeoff_note field summarising what it resolves and what it trades off. Use it to construct the chip label: e.g. "Tencel · Resolves lead time" or "Linen · Reduces by 5 wks · aesthetic trade-off". If tradeoff_note is absent, fall back to "MaterialName · Xwk · $Y/yd".
- Tone: direct, considered, unhurried. A trusted advisor flagging a risk before a decision locks — not a consultant deck, not a warning system.

Conflict type handling:
COST_GATE: The build doesn't clear margin. Suggest a material switch or construction reduction that resolves the gap. Name the specific saving.
EXECUTION_TIMELINE: Lead time threatens the delivery window. Present alternatives ranked by lead time reduction. Prefer materials that fully fit within the window; if none do, include those that reduce the problem and label them accordingly using tradeoff_note.
EXECUTION_COMPLEXITY: Construction complexity creates development risk. Suggest reducing construction tier or simplifying the build approach. Frame this as protecting the collection's development capacity, not as a critique of the piece.
IDENTITY_MISALIGNMENT: The concept is pulling away from the brand's established voice. Suggest returning to Concept Studio to narrow the interpretation. Be specific about what the tension is so the designer knows what to adjust.

Conflict type priority when multiple conflicts exist: cost_gate > execution_timeline > execution_complexity > identity_misalignment. Address only the highest-priority conflict.

Output valid JSON only. No preamble, no explanation, no markdown fences.`;

function buildUserMessage(p: ActionSuggestionPayload): string {
  return `Conflict type: ${p.conflict_type}
Brand: ${p.brand_name}
Piece: ${p.piece_name} (${p.category}, ${p.piece_role} role)
Collection: ${p.collection_name}, ${p.season}

Scores: Identity ${p.identity_score}, Resonance ${p.resonance_score}, Execution ${p.execution_score}
Cost gate: ${p.cost_gate_passed} — COGS $${p.cogs}, buffer $${p.margin_buffer}, MSRP $${p.msrp}
Material selected: ${p.material_name}, $${p.material_cost_per_yard}/yd, ${p.material_lead_time_weeks}wk lead
Construction: ${p.construction_tier}

Execution reason: ${p.execution_reason}
Collection complexity load: ${p.complexity_load_label} (${p.complexity_load_score}/100)
Collection role distribution: ${p.role_distribution_summary}

Alternative materials (ranked by primary constraint reduction — tradeoff_note describes what each resolves and trades off; do not invent others):
${JSON.stringify(p.alternatives, null, 2)}

Return raw JSON only:
{
  "conflict_label": "3–5 words. Names the risk, not a verdict. e.g. 'Timeline risk', 'Margin gap', 'Brand tension', 'Development load'",
  "directive": "single sentence, max 18 words. The recommended path. Not a requirement.",
  "explanation": "2 sentences max. Specific: name materials, dollars, weeks. No 'must' language.",
  "show_alternatives": true or false,
  "alternatives": [{ "label": "e.g. 'Tencel · Resolves lead time' or 'Linen · Reduces by 5 wks · aesthetic trade-off'", "material_id": "from materials list" }],
  "cta_variant": "revise_recommended",
  "hint_text": "max 18 words. Contextual note below the buttons. Not a repeat of the directive."
}`;
}

export async function POST(req: NextRequest) {
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ message: 'Request body is required' }, { status: 400 });
  }
  if (!body) {
    return Response.json({ message: 'Request body is required' }, { status: 400 });
  }
  const payload: ActionSuggestionPayload = body;

  // Static fallback for clean pieces — no LLM call needed
  if (payload.conflict_type === 'none') {
    return NextResponse.json(STATIC_ACTION_FALLBACK);
  }

  try {
    const raw = await callClaude(buildUserMessage(payload), {
      model: 'claude-haiku-4-5-20251001',
      maxTokens: 300,
      systemPrompt: SYSTEM_PROMPT,
      temperature: 0.35,
    });

    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim();

    const parsed = JSON.parse(cleaned) as ActionSuggestion;
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: 'Action suggestion failed' }, { status: 500 });
  }
}
