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

This is not a summary of what the scores say. The scores are already on screen. Your job is to say what the scores mean for the collection as a system — what is structurally working, what is missing at assortment level, and what should happen next before the line locks.

Your reader is a senior creative professional. They have seen hundreds of brand decks and trend reports. They will dismiss anything that sounds like generated text. Write as a strategist who has studied this brand for years and is giving their honest read in a pre-season review.

Rules you must follow:
- Never mention scores, numbers, or percentages in your narrative output — those are already rendered by the UI
- Never use the words: "analysis", "data", "metric", "algorithm", "assessment", "leverage", "utilize", "optimize", "holistic", "robust"
- Focus on role distribution, structure, balance, completeness, coverage, complexity distribution, category mix, silhouette pattern, material signal, and collection-level viability
- If collection_silhouette is provided, treat silhouette as a locked collection-level design decision, not an emergent pattern. Do not flag silhouette uniformity as a structural weakness. Instead, evaluate whether the pieces are executing that silhouette language with enough range and specificity to feel intentional rather than monotonous — and say so only if they are not.
- Do not recap the concept, trend lane, market timing, or aesthetic thesis
- Do not reference specific piece names, but you may reference categories, material families, and silhouette patterns when they are necessary to explain the collection read
- Do not use "start here", "build this", "lean in", or any named product recommendation language
- Each field must be able to stand alone as a true statement. If you could swap collection_read and muko_insight and lose nothing, you have failed.
- Recommendations must be structural only, actionable in the next two weeks, and phrased without exact product suggestions
- If there are 1-2 pieces, light scaffolding language is appropriate.
- If there are 3 or more pieces, give a real collection read based on what is present; do not default to "too thin" or similar holding-pattern language.
- If there are fewer than 8 pieces, it is acceptable to use a caveat like "based on the pieces so far."
- Tone: the tone of a trusted advisor in the room, not a consultant report. Sentences can be short. Directness is respect. The whole read — all three fields combined — should take under 20 seconds to read aloud.
- If a sentence could apply to any collection without these exact inputs, rewrite it.
- collection_read must be 2-3 sentences maximum. No more.
- muko_insight must be 1-2 sentences maximum. It is the sharpest thing in the room — one observation, one implication. Not a paragraph.
- collection_state, collection_read, and muko_insight are one continuous story, not three versions of the same observation. collection_state names what is structurally true. collection_read says what that means for the collection as a system. muko_insight names the single most important thing that is true about this collection right now — the tension that would change the read if it exists, or the confirmation that the structure is holding if it does not. If the collection is well-balanced and all dimensions are strong, muko_insight should say so directly and name what that means for the line going forward. A positive muko_insight is valid and expected when the data supports it. Each must add something the others don't.
- Do not reference "the data" or explain methodology.
- REGISTER RULE: Use benchmark ranges to calibrate your diagnosis
internally. Do not quote percentages or targets in collection_read
or muko_insight output. Speak in structural and directional terms.
- FAIL: "Role balance shows Volume Driver at 20% against a 40–50% target"
- PASS: "The commercial foundation is thin — the line is skewing
directional before the volume structure is in place to support it"

SILHOUETTE RULE: Never critique silhouette consistency across pieces as a weakness.
Silhouette is a collection-level creative lock — uniformity is intentional. If
silhouette range is narrow, you may note it only as a category distribution or
commercial risk (e.g., "limited layering anchors" or "thin structural range") but
never as aesthetic sameness or register repetition. The phrase "same silhouette
register" and any equivalent framing are banned.

Output valid JSON only. No preamble, no explanation, no markdown fences.`;

interface SynthesizerNarrativeOutput {
  collection_state: string;
  collection_read: string;
  muko_insight: string;
  secondary_metrics?: {
    identity?: number;
    resonance?: number;
    execution?: number;
  };
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
Collection silhouette: ${payload.collection_silhouette ?? 'Not specified'}
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
Evaluate material coherence as a required dimension:
- a healthy collection uses 3–5 key fabrics across multiple pieces.
- If the material count exceeds 5 unique fabrics with no repetition, flag it as fragmented.
- If fewer than 3 fabrics anchor the line, note the material story as underdeveloped.
Role distribution: ${roleDist}
Benchmark ranges: Hero 10–15%, Volume Driver 40–50%, Core Evolution 25–30%, Directional 10–20%.
Diagnose against these ranges, not absolute counts.
Category distribution: ${catDist}
Category benchmarks for contemporary collections:
- Tops 30–35%
- Bottoms 20–25%
- Dresses/Jumpsuits 15–20%
- Outerwear 10–15%
- Sets 5–10%
Flag material imbalance when a category exceeds 1.5x its benchmark.
Silhouette distribution: ${silDist}

Return only valid JSON matching this schema exactly:
{
  "collection_state": "Emerging Direction",
  "collection_read": "The structural logic is beginning to hold, but the material language isn't doing enough work yet to make the silhouette pattern legible at category level.",
  "muko_insight": "The bottoms category is carrying the build right now. Until outerwear or a layering piece lands, the collection reads more like a strong starting point than a coherent line.",
  "secondary_metrics": {
    "identity": 91,
    "resonance": 95,
    "execution": 52
  }
}

Positive example:
{
  "collection_state": "Structurally Sound",
  "collection_read": "The role distribution is holding and the material language is consistent across categories. The line reads as a coherent system rather than a set of individual pieces.",
  "muko_insight": "The structure is working. The next move is depth, not correction — adding range within the existing silhouette language rather than filling gaps.",
  "secondary_metrics": {
    "identity": 91,
    "resonance": 88,
    "execution": 84
  }
}

Rules:
- Preserve the secondary_metrics values exactly as provided.
- No concept justification, no trend validation, no market positioning.
- Speak in roles, structure, balance, coverage, completeness, viability, and use the actual category / silhouette / material patterns when they sharpen the read.
- The response must not overlap with a piece recommendation surface.
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
      overall_read: parsed.collection_state ?? fallback.collection_report.overall_read,
      overall_read_detail: parsed.collection_read ?? fallback.collection_report.overall_read_detail,
      collection_thesis: parsed.muko_insight ?? fallback.collection_report.collection_thesis,
      assortment_intelligence: {
        ...fallback.collection_report.assortment_intelligence,
        collection_state: parsed.collection_state ?? fallback.collection_report.assortment_intelligence.collection_state,
        collection_read: parsed.collection_read ?? fallback.collection_report.assortment_intelligence.collection_read,
        supporting_line: parsed.collection_read ?? fallback.collection_report.assortment_intelligence.supporting_line,
        muko_insight: parsed.muko_insight ?? fallback.collection_report.assortment_intelligence.muko_insight,
        collection_insight: parsed.muko_insight ?? fallback.collection_report.assortment_intelligence.collection_insight,
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
      } catch (error) {
        const isOverloaded = String(error).includes('overloaded_error');
        if (isOverloaded) {
          try {
            await new Promise(resolve => setTimeout(resolve, 2000));
            const { streamClaude } = await import('@/lib/claude/client');
            let fullText = '';
            for await (const chunk of streamClaude(userMessage, {
              model: 'claude-sonnet-4-20250514',
              maxTokens: 1200,
              systemPrompt: COLLECTION_SYSTEM_PROMPT,
              temperature: 0.35,
            })) {
              fullText += chunk;
              controller.enqueue(sseEvent('delta', { text: chunk }));
            }
            try {
              const parsed = parseSynthesizerJSON(fullText);
              controller.enqueue(sseEvent('done', mergeSynthesizerResult(fallback, parsed).collection_report));
            } catch {
              controller.enqueue(sseEvent('done', fallback.collection_report));
            }
            return;
          } catch (retryError) {
            console.error('[collection-read] Retry also failed:', retryError);
          }
        } else {
          console.error('[collection-read] Claude call failed:', error);
        }
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
