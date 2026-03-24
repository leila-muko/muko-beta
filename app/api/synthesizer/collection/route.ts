import { NextRequest, NextResponse } from 'next/server';
import { buildCollectionReport } from '@/lib/collection-report/buildCollectionReport';
import type { CollectionReportInput, CollectionReportResponse } from '@/lib/collection-report/types';

interface AssortmentInsightRequest {
  action: 'assortment_insight';
  collection_name: string;
  direction_counts: Record<string, number>;
}

interface CollectionReportRequest {
  action: 'collection_report';
  payload: CollectionReportInput;
}

function buildAssortmentInsight(collectionName: string, directionCounts: Record<string, number>) {
  const entries = Object.entries(directionCounts).sort((a, b) => b[1] - a[1]);
  const [topDirection, topCount] = entries[0] ?? ['collection direction', 0];
  const secondCount = entries[1]?.[1] ?? 0;

  if (topCount === 0) {
    return `${collectionName} needs more pieces before assortment shape can be assessed.`;
  }

  if (topCount >= secondCount * 2 && entries.length > 1) {
    return `${topDirection} is currently dominating the line; the opportunity is to build clearer support around it or widen the assortment mix.`;
  }

  if (entries.length === 1) {
    return `${collectionName} is still reading as a single-direction story; decide whether that concentration is strategic or simply early-stage.`;
  }

  return `${collectionName} has multiple directions in play, but the collection will benefit from sharper hierarchy so the lead idea reads first.`;
}

const COLLECTION_SYSTEM_PROMPT = `You are Muko's collection strategist. You write the intelligence layer of a collection report that will be read in a creative review — by a design director, a merchandising lead, or both together on a shared screen.

This is not a summary of what the scores say. The scores are already on screen. Your job is to say what the scores mean for this specific brand, this specific season, and these specific choices — and what the design director should do before the line locks.

Your reader is a senior creative professional. They have seen hundreds of brand decks and trend reports. They will dismiss anything that sounds like generated text. Write as a strategist who has studied this brand for years and is giving their honest read in a pre-season review.

Rules you must follow:
- Never mention scores, numbers, or percentages in your narrative output — those are already rendered by the UI
- Never use the words: "analysis", "data", "metric", "algorithm", "assessment", "leverage", "utilize", "optimize", "holistic", "robust"
- The overall read must be one sentence. It is the most important sentence in the report. It must contain a tension — what is working against what needs to change. Do not resolve the tension in this sentence.
- "What's working" items: state facts about the collection as they are, not as they could be. Present tense. Specific.
- "What to watch" items: name the structural problem, not the symptom. E.g. not "complexity is high" but "development weight is sitting in too few pieces, which narrows the window for revision without cascading delays"
- Recommendations must be actionable in the next two weeks. Nothing strategic, nothing long-term. Specific enough that the design director could hand it to a product developer today.
- Tone: the tone of a trusted advisor in the room, not a consultant report. Sentences can be short. Directness is respect.
- Do not reference specific piece names, garment names, or individual product details. Write only about the collection direction, aesthetic world, and creative intent.

Output valid JSON only. No preamble, no explanation, no markdown fences.`;

interface SynthesizerNarrativeOutput {
  overall_read: string;
  overall_read_sub: string;
  collection_thesis: string;
  identity_narrative: string;
  resonance_narrative: string;
  execution_narrative: string;
  whats_working: string[];
  what_to_watch: string[];
  recommendations: string[];
  key_risks: Array<{ title: string; description: string }>;
  immediate_actions: string[];
  decision_points: string[];
}

function buildSynthesizerUserMessage(
  payload: CollectionReportInput,
  fallback: CollectionReportResponse
): string {
  const report = fallback.collection_report;
  const health = report.collection_health;

  const piecesJson = payload.pieces.map((piece) => ({
    category: piece.category ?? 'Unknown',
    role: piece.role ?? 'unspecified',
    material: piece.material ?? 'Unknown',
    construction: piece.construction ?? piece.complexity ?? 'unknown',
    silhouette: piece.silhouette ?? 'unknown',
    score: piece.score ?? 0,
    identity: piece.dimensions?.identity ?? null,
    resonance: piece.dimensions?.resonance ?? null,
    execution: piece.dimensions?.execution ?? null,
    cost_gate_passed: piece.margin_passed ?? null,
    cogs: piece.cogs ?? null,
    msrp: piece.msrp ?? null,
    flagged_conflicts: piece.flagged_conflicts ?? [],
    execution_reason: piece.execution_reason ?? null,
  }));

  const conflictsSummary = payload.pieces
    .filter((p) => p.execution_reason)
    .map((p) => p.execution_reason)
    .join('; ') || 'None flagged';

  const topMaterials = report.overview.top_materials
    .map((m) => {
      const count = payload.pieces.filter(
        (p) => (p.material ?? '').toLowerCase().includes(m.toLowerCase())
      ).length;
      return `${m} (${count})`;
    })
    .join(', ') || 'None';

  const roleDist = report.overview.role_distribution
    .map((r) => `${r.label}: ${r.count}`)
    .join(', ') || 'None';

  const catDist = report.overview.category_distribution
    .map((c) => `${c.label}: ${c.count}`)
    .join(', ') || 'None';

  const silhouetteCounts: Record<string, number> = {};
  for (const piece of payload.pieces) {
    const s = piece.silhouette ?? 'Unknown';
    silhouetteCounts[s] = (silhouetteCounts[s] ?? 0) + 1;
  }
  const silDist = Object.entries(silhouetteCounts)
    .map(([s, n]) => `${s}: ${n}`)
    .join(', ') || 'None';

  return `Brand: ${payload.brand?.brand_name ?? 'Unknown'}
Customer profile: ${payload.brand?.customer_profile ?? 'Not specified'}
Brand keywords: ${payload.brand?.keywords?.length ? payload.brand.keywords.join(', ') : 'not specified'}
Price tier: ${payload.brand?.price_tier ?? 'not specified'}
Reference brands: ${payload.brand?.reference_brands?.length ? payload.brand.reference_brands.join(', ') : 'not specified'}
Tension context: ${payload.brand?.tension_context ?? 'none'}
Season: ${payload.season}
Collection name: ${payload.collection_name}
Collection aesthetic: ${payload.collection_aesthetic ?? 'Not specified'}
Aesthetic inflection: ${payload.aesthetic_inflection ?? 'Not specified'}
Collection brief / intent: ${payload.collection_brief ?? payload.intent?.primary_goals?.join(', ') ?? 'Not specified'}

Pieces in collection (${payload.pieces.length} total):
${JSON.stringify(piecesJson, null, 2)}

Collection health:
- Role balance: ${health.role_balance.label} (${health.role_balance.score})
- Complexity load: ${health.complexity_load.label} (${health.complexity_load.score})
- Silhouette diversity: ${health.silhouette_diversity.label} (${health.silhouette_diversity.score})
- Redundancy risk: ${health.redundancy_risk?.label ?? 'Unknown'} (${health.redundancy_risk?.score ?? 'n/a'})

Collection scores:
- Identity: ${report.scores.identity.score} — ${report.scores.identity.explanation}
- Resonance: ${report.scores.resonance.score} — ${report.scores.resonance.explanation}
- Execution: ${report.scores.execution.score} — ${report.scores.execution.explanation}

Flagged conflicts across pieces:
${conflictsSummary}

Top materials: ${topMaterials}
Role distribution: ${roleDist}
Category distribution: ${catDist}
Silhouette distribution: ${silDist}

Return only valid JSON matching this schema exactly:
{
  "overall_read": "one sentence containing a tension. Max 22 words.",
  "overall_read_sub": "one sentence naming what needs to change and when. Max 16 words.",
  "collection_thesis": "2–3 sentences. What this collection is trying to do, who it is for, where it is strongest right now. Present tense. Specific to this brand.",
  "identity_narrative": "1–2 sentences interpreting the identity score in plain language. No numbers.",
  "resonance_narrative": "1–2 sentences interpreting the resonance score. Name the market condition driving it.",
  "execution_narrative": "1–2 sentences interpreting the execution score. Name the structural cause, not just the outcome.",
  "whats_working": ["specific observation, present tense, max 20 words", "..."],
  "what_to_watch": ["structural problem not symptom, max 22 words", "..."],
  "recommendations": ["actionable in 2 weeks, specific, max 22 words", "...", "..."],
  "key_risks": [{ "title": "2–4 words", "description": "1 sentence on consequence if unresolved. Max 18 words." }],
  "immediate_actions": ["specific, doable today or this week, max 20 words", "...", "..."],
  "decision_points": ["choice to make before line locks, framed as real decision, max 22 words", "...", "..."]
}

Rules:
- "whats_working" and "what_to_watch": 2–3 items each.
- "recommendations", "immediate_actions", "decision_points": exactly 3 items each.
- "key_risks": 2–3 items.
- No markdown. No prose outside the JSON.`;
}

function parseSynthesizerJSON(raw: string): SynthesizerNarrativeOutput {
  const cleaned = raw
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  try {
    return JSON.parse(cleaned) as SynthesizerNarrativeOutput;
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1)) as SynthesizerNarrativeOutput;
    }
    throw new Error('Unable to parse synthesizer narrative JSON');
  }
}

function mergeSynthesizerResult(
  fallback: CollectionReportResponse,
  parsed: SynthesizerNarrativeOutput
): CollectionReportResponse {
  return {
    collection_report: {
      ...fallback.collection_report,
      overall_read: parsed.overall_read ?? fallback.collection_report.overall_read,
      overall_read_detail: parsed.overall_read_sub ?? fallback.collection_report.overall_read_detail,
      collection_thesis: parsed.collection_thesis ?? fallback.collection_report.collection_thesis,
      scores: {
        identity: {
          ...fallback.collection_report.scores.identity,
          explanation: parsed.identity_narrative ?? fallback.collection_report.scores.identity.explanation,
        },
        resonance: {
          ...fallback.collection_report.scores.resonance,
          explanation: parsed.resonance_narrative ?? fallback.collection_report.scores.resonance.explanation,
        },
        execution: {
          ...fallback.collection_report.scores.execution,
          explanation: parsed.execution_narrative ?? fallback.collection_report.scores.execution.explanation,
        },
      },
      muko_insight: {
        working: parsed.whats_working?.length ? parsed.whats_working : fallback.collection_report.muko_insight.working,
        watch: parsed.what_to_watch?.length ? parsed.what_to_watch : fallback.collection_report.muko_insight.watch,
        recommendations: parsed.recommendations?.length ? parsed.recommendations : fallback.collection_report.muko_insight.recommendations,
      },
      key_risks: parsed.key_risks?.length
        ? parsed.key_risks.map((r) => ({ title: r.title, detail: r.description }))
        : fallback.collection_report.key_risks,
      next_steps: {
        immediate_actions: parsed.immediate_actions?.length ? parsed.immediate_actions : fallback.collection_report.next_steps.immediate_actions,
        decision_points: parsed.decision_points?.length ? parsed.decision_points : fallback.collection_report.next_steps.decision_points,
      },
      meta: {
        ...fallback.collection_report.meta,
        source: 'synthesizer',
      },
    },
  };
}

function sseEvent(type: string, payload?: unknown): Uint8Array {
  return new TextEncoder().encode(
    `event: ${type}\ndata: ${JSON.stringify({ type, ...(payload !== undefined && { payload }) })}\n\n`
  );
}

async function streamCollectionReport(payload: CollectionReportInput): Promise<Response> {
  const fallback = buildCollectionReport(payload);

  // No API key or too few pieces — return deterministic result as a regular JSON response
  if (!process.env.ANTHROPIC_API_KEY || payload.pieces.length < 2) {
    return NextResponse.json(fallback);
  }

  const userMessage = buildSynthesizerUserMessage(payload, fallback);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // First event: deterministic fallback — client renders immediately
      controller.enqueue(sseEvent('fallback', fallback.collection_report));

      try {
        const { streamClaude } = await import('@/lib/claude/client');

        let fullText = '';
        for await (const chunk of streamClaude(userMessage, {
          model: 'claude-sonnet-4-6',
          maxTokens: 1200,
          systemPrompt: COLLECTION_SYSTEM_PROMPT,
          temperature: 0.35,
        })) {
          fullText += chunk;
          controller.enqueue(sseEvent('delta', { text: chunk }));
        }

        // Parse and merge, fall back to deterministic on parse failure
        try {
          const parsed = parseSynthesizerJSON(fullText);
          controller.enqueue(sseEvent('done', mergeSynthesizerResult(fallback, parsed).collection_report));
        } catch {
          controller.enqueue(sseEvent('done', fallback.collection_report));
        }
      } catch {
        controller.enqueue(sseEvent('error', { error: 'Synthesis failed' }));
        controller.enqueue(sseEvent('done', fallback.collection_report));
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

export async function POST(req: NextRequest) {
  let body: AssortmentInsightRequest | CollectionReportRequest;
  try {
    body = await req.json();
  } catch {
    return Response.json({ message: 'Request body is required' }, { status: 400 });
  }
  if (!body) {
    return Response.json({ message: 'Request body is required' }, { status: 400 });
  }
  try {

    if (body.action === 'assortment_insight') {
      return NextResponse.json({
        insight: buildAssortmentInsight(body.collection_name, body.direction_counts),
      });
    }

    if (body.action === 'collection_report') {
      return streamCollectionReport(body.payload);
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Synthesis failed' }, { status: 500 });
  }
}
