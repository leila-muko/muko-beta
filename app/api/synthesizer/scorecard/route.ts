// app/api/synthesizer/scorecard/route.ts
// Non-streaming POST. Returns structured JSON for the scorecard modal.
//
// Input:  ScorecardPayload
// Output: { insight: string; considerations: Consideration[] }

import { NextRequest, NextResponse } from 'next/server';
import { callClaude } from '@/lib/claude/client';

export interface ScorecardPayload {
  scores: {
    identity: number;
    resonance: number;
    execution: number;
    overall: number;
  };
  margin: {
    passed: boolean;
    cogs: number;
    ceiling: number;
    msrp: number;
  };
  context: {
    aesthetic: string;
    material: string;
    category: string;
    collection: string;
    season: string;
  };
  brand_keywords?: string[];
  customer_profile?: string;
  intent_primary_goals?: string[];
}

export interface Consideration {
  type: 'risk' | 'opportunity';
  label: string;
  text: string;
}

export interface ScorecardInsight {
  insight: string;
  considerations: Consideration[];
}

function buildPrompt(p: ScorecardPayload): string {
  const marginLine = p.margin.passed
    ? `Margin gate: PASSED at $${p.margin.msrp} MSRP (COGS $${Math.round(p.margin.cogs)}, ceiling $${Math.round(p.margin.ceiling)})`
    : `Margin gate: FAILED — COGS $${Math.round(p.margin.cogs)} exceeds ceiling $${Math.round(p.margin.ceiling)} at $${p.margin.msrp} MSRP`;

  const brandLines: string[] = [];
  if (p.brand_keywords && p.brand_keywords.length > 0) {
    brandLines.push(`Brand: ${p.brand_keywords.slice(0, 5).join(', ')}`);
  }
  if (p.customer_profile && p.customer_profile.trim().length > 0) {
    brandLines.push(`Customer: ${p.customer_profile.substring(0, 80)}`);
  }
  if (p.intent_primary_goals && p.intent_primary_goals.length > 0) {
    brandLines.push(`Collection intent: ${p.intent_primary_goals.join(', ')}`);
  }
  const brandContext = brandLines.length > 0 ? brandLines.join('\n') + '\n' : '';

  return `You are a fashion strategy advisor reviewing a piece analysis scorecard.

${brandContext}Scores — Identity: ${p.scores.identity}, Resonance: ${p.scores.resonance}, Execution: ${p.scores.execution}, Overall: ${p.scores.overall}
${marginLine}
Aesthetic: ${p.context.aesthetic || 'Unknown'}, Material: ${p.context.material || 'Unknown'}, Category: ${p.context.category || 'Unknown'}, Collection: ${p.context.collection || 'Unknown'}, Season: ${p.context.season || 'Unknown'}

Return raw JSON only (no markdown, no backticks, no preamble):
{
  "insight": "Three sentences max 80 words. Sentence 1: is this worth pursuing and the key condition. Sentence 2: what is working in its favor. Sentence 3: the single most important risk or next action.",
  "considerations": [
    { "type": "risk" | "opportunity", "label": "Title Case 2-3 Words", "text": "One sentence referencing actual numbers, materials, or aesthetic." },
    { "type": "risk" | "opportunity", "label": "Title Case 2-3 Words", "text": "One sentence referencing actual numbers, materials, or aesthetic." },
    { "type": "risk" | "opportunity", "label": "Title Case 2-3 Words", "text": "One sentence referencing actual numbers, materials, or aesthetic." }
  ]
}

Rules:
- insight: exactly 3 sentences, ≤80 words total
- considerations: exactly 3 items, at least one risk and one opportunity based on actual scores
- type "risk" when something needs to change, "opportunity" when working in brand's favor
- label: title-case, 2-3 words only (e.g. "Timeline Risk", "Saturation Window", "Construction Complexity")
- text: one sentence, specific — reference actual scores, materials, or the aesthetic by name
- Return raw JSON only`;
}

export async function POST(req: NextRequest) {
  let payload: ScorecardPayload;
  try {
    payload = await req.json();
  } catch (err) {
    console.error('[scorecard synthesizer error]', err);
    return NextResponse.json({ error: 'Synthesis failed', detail: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }

  try {
    const raw = await callClaude(buildPrompt(payload), {
      model: 'claude-haiku-4-5-20251001',
      maxTokens: 400,
      temperature: 0.35,
    });

    // Strip any accidental markdown fences
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim();

    const parsed = JSON.parse(cleaned) as ScorecardInsight;
    return NextResponse.json(parsed);
  } catch (err) {
    console.error('[scorecard synthesizer error]', err);
    return NextResponse.json({ error: 'Synthesis failed', detail: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
