// app/api/synthesizer/spec/route.ts
// Streams the spec insight as SSE.
// Events emitted:
//   chunk    — { text: string } raw LLM text delta
//   complete — SynthesizerResult (full parsed InsightData)
//   fallback — SynthesizerResult (template fallback on parse failure)

import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { SpecBlackboard } from '@/lib/synthesizer/specInsight';
import {
  buildSpecPrompt,
  SPEC_STUDIO_PROMPT_V6_2,
  determineSpecMode,
  buildSpecFallbackInput,
  parseSpecV5Output,
} from '@/lib/synthesizer/specInsight';
import { generateTemplateNarrative } from '@/lib/agents/synthesizer';
import type { InsightData, InsightMode } from '@/lib/types/insight';

function makeFallback(bb: SpecBlackboard, editLabel: string, mode: InsightMode) {
  const fallbackInput = buildSpecFallbackInput(bb, mode);
  const data = generateTemplateNarrative(fallbackInput);
  data.editLabel = editLabel;
  return { data, meta: { method: 'template' as const, latency_ms: 0 } };
}

export async function POST(req: NextRequest) {
  let blackboard: SpecBlackboard;
  try {
    blackboard = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!blackboard?.aesthetic_matched_id || !blackboard?.material_id) {
    return new Response(JSON.stringify({ error: 'Missing required blackboard fields' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { mode, editLabel } = determineSpecMode(
    blackboard.margin_pass,
    blackboard.execution_score
  );
  const userPrompt = buildSpecPrompt(blackboard);
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
          max_tokens: 650,
          temperature: 0.35,
          system: SPEC_STUDIO_PROMPT_V6_2,
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
          const parsed = parseSpecV5Output(accumulated);
          if (!parsed) {
            console.warn('[SpecRoute] Invalid JSON in response, emitting fallback');
            emit('fallback', JSON.stringify(makeFallback(blackboard, editLabel, mode)));
            return;
          }

          // Replace "YOUR brand" placeholder with the actual brand/collection name
          const brandName = blackboard.brand_name;
          if (brandName) {
            const r = (s: string) => s.replace(/YOUR brand/g, brandName);
            parsed.insight_title = r(parsed.insight_title);
            parsed.insight_description = r(parsed.insight_description);
            parsed.build_reality = parsed.build_reality.map(r);
          }

          const data: InsightData = {
            statements: [parsed.insight_title, parsed.insight_description],
            edit: parsed.build_reality.slice(0, 3),
            editLabel: 'BUILD REALITY',
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
