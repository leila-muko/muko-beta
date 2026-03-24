// app/api/synthesizer/concept/route.ts
// Streams the concept insight as SSE.
// Events emitted:
//   chunk    — { text: string } raw LLM text delta
//   complete — SynthesizerResult (full parsed InsightData)
//   fallback — SynthesizerResult (template fallback on parse failure)

import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { ConceptBlackboard } from '@/lib/synthesizer/conceptInsight';
import {
  buildConceptPrompt,
  CONCEPT_STUDIO_PROMPT_V6_2,
  determineConceptMode,
  buildConceptFallbackInput,
  buildFallbackDecisionGuidance,
  parseConceptV5Output,
} from '@/lib/synthesizer/conceptInsight';
import { generateTemplateNarrative } from '@/lib/agents/synthesizer';
import type { InsightData, InsightMode } from '@/lib/types/insight';
import { normalizeExecutionLevers } from '@/lib/concept-studio/decision-guidance';

function makeFallback(bb: ConceptBlackboard, editLabel: string, mode: InsightMode) {
  const fallbackInput = buildConceptFallbackInput(bb, mode);
  const data = generateTemplateNarrative(fallbackInput);
  data.editLabel = editLabel;
  data.decision_guidance = buildFallbackDecisionGuidance(bb, mode);
  return { data, meta: { method: 'template' as const, latency_ms: 0 } };
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
  const blackboard: ConceptBlackboard = body;

  if (!blackboard?.aesthetic_matched_id) {
    return new Response(JSON.stringify({ error: 'Missing aesthetic_matched_id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { mode, editLabel } = determineConceptMode(
    blackboard.identity_score,
    blackboard.resonance_score
  );
  const userPrompt = buildConceptPrompt(blackboard);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: string, data: string) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data}\n\n`));
      };

      try {
        const client = new Anthropic();
        let accumulated = '';

        const anthropicStream = client.messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 900,
          temperature: 0.55,
          system: CONCEPT_STUDIO_PROMPT_V6_2,
          messages: [{ role: 'user', content: userPrompt }],
        });

        for await (const event of anthropicStream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            const text = event.delta.text;
            accumulated += text;
            emit('chunk', JSON.stringify({ text }));
          }
        }

        // Parse v5.0 JSON output and emit complete event
        try {
          const parsed = parseConceptV5Output(accumulated);
          if (!parsed) {
            console.warn('[ConceptRoute] Invalid JSON in response, emitting fallback');
            emit('fallback', JSON.stringify(makeFallback(blackboard, editLabel, mode)));
            return;
          }

          // Replace "YOUR brand" placeholder with the actual brand/collection name
          const brandName = blackboard.brand_name;
          if (brandName) {
            const r = (s: string) => s.replace(/YOUR brand/g, brandName);
            parsed.insight_title = r(parsed.insight_title);
            parsed.insight_description = r(parsed.insight_description);
            parsed.positioning = parsed.positioning.map(r);
          }

          const normalizedExecutionLevers = normalizeExecutionLevers(
            blackboard.aesthetic_matched_id,
            parsed.decision_guidance.execution_levers,
          );

          const data: InsightData = {
            statements: [parsed.insight_title, parsed.insight_description],
            edit: parsed.positioning.slice(0, 3),
            editLabel: 'POSITIONING',
            decision_guidance: {
              recommended_direction: parsed.decision_guidance.recommended_direction,
              commitment_signal: parsed.decision_guidance.commitment_signal,
              execution_levers: normalizedExecutionLevers.length > 0
                ? normalizedExecutionLevers
                : buildFallbackDecisionGuidance(blackboard, mode).execution_levers,
            },
            mode,
          };
          emit('complete', JSON.stringify({ data, meta: { method: 'llm', latency_ms: 0 } }));
        } catch {
          emit('fallback', JSON.stringify(makeFallback(blackboard, editLabel, mode)));
        }
      } catch {
        try {
          emit('fallback', JSON.stringify(makeFallback(blackboard, editLabel, mode)));
        } catch { /* silent */ }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
