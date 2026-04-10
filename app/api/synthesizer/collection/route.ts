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
- collection_state must be a short editorial verdict — 3 to 6 words — that names the specific structural condition of this collection in a way that could only be true of this collection. It is not a generic status label like 'Emerging Direction' or 'High Potential'. It is a compressed read that a design director would feel, not file. Examples of the right register: 'Strong signal, thin structure', 'Direction locked, architecture isn't', 'Commercial foundation missing'. Examples of the wrong register: 'Emerging Direction', 'Developing Collection', 'High Potential, Low Coverage'. If the collection is genuinely healthy, the verdict should say what is working and what it means, not just confirm that it is good.
- collection_read must be 2-3 sentences maximum. No more.
- collection_thesis is the one thing that is structurally true about this collection that is not visible from the scores alone — the underlying condition that explains why the numbers look the way they do, or the tension that will determine whether this collection succeeds or fails. It is not a score summary. It is not a recommendation. It is a diagnostic frame — the lens through which everything else on this report should be read. 2 sentences maximum. If you could derive it mechanically from the scores, rewrite it.
- muko_insight must be 1-2 sentences maximum. It is the sharpest thing in the room — one observation, one implication. Not a paragraph.
- collection_state, collection_read, collection_thesis, and muko_insight are one continuous story, not four versions of the same observation. collection_state is the compressed editorial verdict. collection_read says what that means for the collection as a system. collection_thesis names the underlying structural condition that explains the read. muko_insight names the single sharpest implication or tension that matters most right now. If the collection is well-balanced and all dimensions are strong, muko_insight should say so directly and name what that means for the line going forward. A positive muko_insight is valid and expected when the collection supports it. Each must add something the others don't.
- Do not reference "the data" or explain methodology.
- REGISTER RULE: Use benchmark ranges to calibrate your diagnosis
internally. Do not quote percentages or targets in collection_read
or muko_insight output. Speak in structural and directional terms.
- FAIL: "Role balance shows Volume Driver at 20% against a 40–50% target"
- PASS: "The commercial foundation is thin — the line is skewing
directional before the volume structure is in place to support it"

COST AND EXECUTION RULE:
- If one or more pieces have cost_gate_passed: false, or if execution scores are low and cogs/msrp data is present, you may reference margin pressure or cost structure in muko_insight — but only in structural terms, not as accounting.
- FAIL: "COGS exceeds MSRP target by 18%"
- PASS: "The cost structure is under pressure at current specs — the execution risk is financial, not just logistical"
- If all cost gates pass and execution is healthy, do not mention cost.
- This rule applies to muko_insight only. collection_read and collection_state remain structural and directional.

COMPLEXITY VS EXECUTION RULE: The collection report renders two separate signals that designers will read in sequence — complexity load (total development burden) and execution score (structural risk from how that complexity is distributed). These are not contradictory. If complexity load is healthy but execution score is low, the correct read is: the total burden is within tolerance, but the concentration or uniformity of that complexity is creating risk that the score reflects. In collection_read or muko_insight, if execution is the primary concern, name the specific structural cause — construction uniformity, role concentration, category imbalance — not just that execution risk is elevated. Never use the phrase 'execution risk is elevated' without naming what is causing it.

SILHOUETTE RULE: Never critique silhouette consistency across pieces as a weakness.
Silhouette is a collection-level creative lock — uniformity is intentional. If
silhouette range is narrow, you may note it only as a category distribution or
commercial risk (e.g., "limited layering anchors" or "thin structural range") but
never as aesthetic sameness or register repetition. The phrase "same silhouette
register" and any equivalent framing are banned.

NEXT STEPS AND RISKS RULES:
- immediate_actions must be directives a design director could act on in the next two weeks. Each must reference a specific structural signal from this collection — a role gap, a material pattern, a category imbalance, or a cost flag. Generic actions like "strengthen the hero" or "refine the role mix" are banned. Each item label must be 8 words or fewer — state the action only, no sub-clauses. Each item body must be 1–2 sentences maximum, 40 words or fewer. State the single most important consequence and nothing else.
- decision_points must frame a real fork in the road for this collection — something where two legitimate paths exist and the team needs to choose. Each must be grounded in something specific about this collection's structure. Each item label must be 8 words or fewer — name the decision only, no sub-clauses. Each item body must be 1–2 sentences maximum, 40 words or fewer. Name the two paths and the consequence of each choice only.
- key_risks must name a structural condition that is currently true and would get worse if unaddressed. Not a general risk category. A specific diagnosis.
- If you cannot ground an action or risk in the specific piece data, category distribution, or material pattern provided, do not include it.

Output valid JSON only. No preamble, no explanation, no markdown fences.`;

interface SynthesizerNarrativeOutput {
  collection_state: string;
  collection_read: string;
  collection_thesis?: string;
  muko_insight: string;
  immediate_actions?: Array<{
    label?: string;
    body?: string;
  }>;
  decision_points?: Array<{
    label?: string;
    body?: string;
  }>;
  ppw_descriptions: {
    protect: string;
    push: string;
    watch: string;
  };
  key_risks?: Array<{
    label?: string;
    body?: string;
  }>;
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
    execution_notes: piece.execution_notes ?? null,
    intent_goals: piece.intent_success_goals ?? null,
    piece_expression: piece.saved_piece_expression ?? null,
    collection_language: piece.collection_language ?? null,
  }));

  const conflictsSummary = payload.pieces
    .filter((p) => p.execution_notes)
    .map((p) => p.execution_notes)
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

execution_notes per piece contains the designer's selected execution flags from the spec review — specific risks they have already identified at the piece level. Treat these as confirmed signals, not hypotheses. When they are present, they should directly inform immediate_actions and key_risks. Do not restate them verbatim — synthesize across pieces to identify patterns. If multiple pieces share a construction or material risk in their execution_notes, that is a collection-level signal, not a per-piece footnote.

intent_goals per piece contains what the designer explicitly said they were optimizing for when they built this piece. If a piece's intent_goals conflict with its execution signal or role, that is a decision point worth naming — not as a failure, but as a fork the team needs to resolve before sampling.

piece_expression where present is the designer's own brief for what a piece should be — the intended read, surface language, and positioning. If execution risk is high on a piece with a strong piece_expression, the risk is not just structural: it is that the thing the designer is trying to say may not survive the production process intact. Name that specifically when it is true.

collection_language is the shared language the designer has built across pieces. If most pieces share the same collection_language token, that is a coherence signal. If a piece has no collection_language or a divergent one, that is an assortment gap worth flagging.

Collection health:
- Role balance: ${health.role_balance.label} (${health.role_balance.score})
- Complexity load: ${health.complexity_load.label} (${health.complexity_load.score})
- Silhouette diversity: ${health.silhouette_diversity?.label ?? 'Not emphasized'} (${health.silhouette_diversity?.score ?? 'n/a'})
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
  "collection_state": "Strong signal, thin structure",
  "collection_read": "The structural logic is beginning to hold, but the material language isn't doing enough work yet to make the silhouette pattern legible at category level.",
  "collection_thesis": "The line has a point of view, but not yet the architecture to make that point of view hold across categories. The scores are reacting to a real idea that still lacks enough support structure to read as inevitable.",
  "muko_insight": "The bottoms category is carrying the build right now. Until outerwear or a layering piece lands, the collection reads more like a strong starting point than a coherent line.",
  "immediate_actions": [
    {
      "label": "Rebalance the outer layer",
      "body": "Add one outer layer in a lead material. Without it, bottoms keep carrying structure alone."
    }
  ],
  "decision_points": [
    {
      "label": "Deepen bottoms or add outerwear",
      "body": "Deepening bottoms keeps the line focused. Adding outerwear increases completeness but changes the build path."
    }
  ],
  "ppw_descriptions": {
    "protect": "Expression level and trend exposure are both pushing toward distinction — commercial clarity is the only dimension keeping the line commercially legible.",
    "push": "Currently the most conservative read in the collection — there is room to sharpen the creative voice without destabilizing the other dimensions.",
    "watch": "Balanced now, but material or construction changes in development could shift perceived value before the team notices at sampling."
  },
  "key_risks": [
    {
      "label": "Bottom-heavy structure",
      "body": "The collection is currently over-reliant on bottoms, which leaves the line without enough vertical range to read as a complete system."
    }
  ],
  "secondary_metrics": {
    "identity": 91,
    "resonance": 95,
    "execution": 52
  }
}

Positive example:
{
  "collection_state": "Structure holding, depth next",
  "collection_read": "The role distribution is holding and the material language is consistent across categories. The line reads as a coherent system rather than a set of individual pieces.",
  "collection_thesis": "What is working here is not just balance but alignment: the role structure and material repetition are reinforcing the same idea. That is why the collection reads as a system rather than a sequence of individually successful pieces.",
  "muko_insight": "The structure is working. The next move is depth, not correction — adding range within the existing silhouette language rather than filling gaps.",
  "immediate_actions": [
    {
      "label": "Extend the proven material lane",
      "body": "Add one adjacent category in the same lead material family. This builds depth without breaking the structure already holding."
    }
  ],
  "decision_points": [
    {
      "label": "Depth versus breadth",
      "body": "Deepening the strongest lane reinforces clarity. Widening into a new lane adds range but diffuses focus."
    }
  ],
  "ppw_descriptions": {
    "protect": "Expression level and trend exposure are both pushing toward distinction — commercial clarity is the only dimension keeping the line commercially legible.",
    "push": "Currently the most conservative read in the collection — there is room to sharpen the creative voice without destabilizing the other dimensions.",
    "watch": "Balanced now, but material or construction changes in development could shift perceived value before the team notices at sampling."
  },
  "key_risks": [
    {
      "label": "Expansion drift",
      "body": "If new categories are added without preserving the current material and role logic, the line could lose the clarity that makes it read as a system today."
    }
  ],
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
- immediate_actions, decision_points, and key_risks must contain 2-3 items maximum each.
- Each immediate_actions item must be an object with string fields: label, body. Label: 8 words or fewer, action only, no sub-clauses. Body: 1-2 sentences maximum, 40 words or fewer, naming the single most important consequence only.
- Each decision_points item must be an object with string fields: label, body. Label: 8 words or fewer, decision only, no sub-clauses. Body: 1-2 sentences maximum, 40 words or fewer, naming the two paths and the consequence of each choice only.
- ppw_descriptions must explain why each tension dimension received its Protect, Push, or Watch assignment for this specific collection.

Rules:
- protect: name what the other dimensions are doing that makes this one need protection. Reference the specific dimensions pushing against it.
- push: name why this dimension has room to move. Reference its current slider state and what moving it would do for the line.
- watch: name what specific development event could shift this dimension. Reference materials, construction decisions, or timeline factors from this collection.
- Each description must be 1-2 sentences, 35 words or fewer.
- Must be specific to this collection - never generic.
- Banned phrases: 'hold the sellable frame', 'most room to move', 'sensitive to material or pricing changes', 'most vulnerable to creative push', 'current read is conservative'.
- Each key_risks item must be an object with string fields: label, body.
- ppw_descriptions must always be present with all three fields: protect, push, and watch. Each must be a non-empty string.
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
  const formatStructuredItems = (
    items: Array<{ label?: string; body?: string }> | undefined,
    deterministicFallback: string[]
  ) => {
    if (!Array.isArray(items)) return deterministicFallback;

    const formatted = items
      .map((item) => {
        const label = typeof item?.label === 'string' ? item.label.trim() : '';
        const body = typeof item?.body === 'string' ? item.body.trim() : '';
        if (!label || !body) return null;
        return `${label}: ${body}`;
      })
      .filter((item): item is string => Boolean(item));

    return formatted.length > 0 ? formatted.slice(0, 3) : deterministicFallback;
  };

  const formatKeyRisks = (
    items: Array<{ label?: string; body?: string }> | undefined,
    deterministicFallback: CollectionReportResponse['collection_report']['key_risks']
  ) => {
    if (!Array.isArray(items)) return deterministicFallback;

    const formatted = items
      .map((item) => {
        const label = typeof item?.label === 'string' ? item.label.trim() : '';
        const body = typeof item?.body === 'string' ? item.body.trim() : '';
        if (!label || !body) return null;
        return { title: label, detail: body };
      })
      .filter((item): item is { title: string; detail: string } => Boolean(item));

    return formatted.length > 0 ? formatted.slice(0, 3) : deterministicFallback;
  };

  const immediateActions = formatStructuredItems(
    parsed.immediate_actions,
    fallback.collection_report.next_steps.immediate_actions
  );
  const decisionPoints = formatStructuredItems(
    parsed.decision_points,
    fallback.collection_report.next_steps.decision_points
  );
  const keyRisks = formatKeyRisks(parsed.key_risks, fallback.collection_report.key_risks);
  const ppwDescriptions = parsed.ppw_descriptions
    ? {
        protect: parsed.ppw_descriptions.protect?.trim() || fallback.collection_report.ppw_descriptions?.protect || null,
        push: parsed.ppw_descriptions.push?.trim() || fallback.collection_report.ppw_descriptions?.push || null,
        watch: parsed.ppw_descriptions.watch?.trim() || fallback.collection_report.ppw_descriptions?.watch || null,
      }
    : fallback.collection_report.ppw_descriptions ?? null;

  return {
    collection_report: {
      ...fallback.collection_report,
      overall_read: parsed.collection_state ?? fallback.collection_report.overall_read,
      overall_read_detail: parsed.collection_read ?? fallback.collection_report.overall_read_detail,
      collection_thesis: parsed.collection_thesis ?? fallback.collection_report.collection_thesis,
      ppw_descriptions: ppwDescriptions,
      key_risks: keyRisks,
      next_steps: {
        ...fallback.collection_report.next_steps,
        immediate_actions: immediateActions,
        decision_points: decisionPoints,
      },
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
