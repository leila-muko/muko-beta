// app/api/synthesizer/subscores/route.ts
// Lightweight Haiku call — generates one-sentence descriptions for each
// dimension card (Identity, Resonance, Execution) on the Standard Report.
// Runs in parallel with /api/synthesizer/report; never blocks the main narrative.

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

interface SubscoresRequest {
  aesthetic: string;
  material: string;
  category: string;
  season: string;
  brandKeywords: string[];
  scores: {
    identity: number;
    resonance: number;
    execution: number;
  };
  gates: {
    cost: boolean;
  };
}

interface SubscoresResult {
  identity: string;
  resonance: string;
  execution: string;
}

function getFallbacks(scores: SubscoresRequest['scores']): SubscoresResult {
  return {
    identity: `Brand alignment scored ${scores.identity} based on keyword overlap with your DNA.`,
    resonance: `Market resonance scored ${scores.resonance} based on current trend saturation data.`,
    execution: `Execution scored ${scores.execution} based on construction complexity and timeline.`,
  };
}

const SYSTEM_PROMPT = `You are a fashion strategy analyst writing one-sentence dimension summaries for a design intelligence report. Each sentence should be sharp, specific, and explain WHY the score is what it is — not just what the dimension means. Reference the actual inputs (aesthetic name, material, brand keywords) rather than generic descriptions. Write like a creative director leaving a margin note. Never be generic. Never restate the score number. Return only raw JSON with no markdown fences, no backticks, no preamble.`;

export async function POST(req: NextRequest) {
  try {
    const body: SubscoresRequest = await req.json();
    console.log('[subscores] route hit', JSON.stringify(body));
    const { aesthetic, material, category, season, brandKeywords, scores, gates } = body;

    const userPrompt = `Write exactly 3 one-sentence descriptions — one per dimension — for this analysis:
- Aesthetic: ${aesthetic}
- Material: ${material}
- Category: ${category}
- Season: ${season}
- Brand keywords: ${brandKeywords.length > 0 ? brandKeywords.join(', ') : 'none'}
- Identity score: ${scores.identity} (brand alignment)
- Resonance score: ${scores.resonance} (market opportunity)
- Execution score: ${scores.execution} (feasibility)
- Cost gate: ${gates.cost ? 'passed' : 'failed'}

Return ONLY valid JSON, no markdown, no backticks:
{
  "identity": "one sentence here",
  "resonance": "one sentence here",
  "execution": "one sentence here"
}`;

    const client = new Anthropic();
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      temperature: 0.5,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const raw = response.content[0];
    if (!raw || raw.type !== 'text') {
      return NextResponse.json(getFallbacks(scores));
    }

    const text = raw.text.trim();
    console.log('[subscores] raw Claude response:', text);
    try {
      const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      const parsed = JSON.parse(cleaned) as SubscoresResult;
      if (parsed.identity && parsed.resonance && parsed.execution) {
        return NextResponse.json(parsed);
      }
      return NextResponse.json(getFallbacks(scores));
    } catch {
      return NextResponse.json(getFallbacks(scores));
    }
  } catch {
    return NextResponse.json(
      { error: 'Subscores generation failed' },
      { status: 500 }
    );
  }
}
