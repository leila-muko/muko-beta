// app/api/synthesizer/spec/route.ts
// Streams the spec insight as SSE.
// Events emitted:
//   chunk    — { text: string } raw LLM text delta
//   complete — SynthesizerResult (rail contract + mapped InsightData)
//   fallback — SynthesizerResult (deterministic fallback on parse failure)

import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { SpecBlackboard } from '@/lib/synthesizer/specInsight';
import {
  buildSpecPrompt,
  buildSpecSystemPrompt,
  determineSpecMode,
  buildSpecFallbackRail,
  parseSpecRailOutput,
  repairSpecRailOutput,
  validateSpecRailOutput,
} from '@/lib/synthesizer/specInsight';
import { mapSpecRailToInsightData } from '@/lib/synthesizer/specDecision';

function makeFallback(bb: SpecBlackboard) {
  const { mode } = determineSpecMode(
    bb.margin_pass,
    bb.execution_score,
    bb.identity_score,
    bb.resonance_score,
  );
  const rail = buildSpecFallbackRail(bb);
  const data = mapSpecRailToInsightData(rail, mode);
  return { rail, data, meta: { method: 'template' as const, latency_ms: 0 } };
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
  const blackboard: SpecBlackboard = body;

  if (!blackboard?.aesthetic_matched_id || !blackboard?.material_id) {
    return new Response(JSON.stringify({ error: 'Missing required blackboard fields' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { mode } = determineSpecMode(
    blackboard.margin_pass,
    blackboard.execution_score,
    blackboard.identity_score,
    blackboard.resonance_score,
  );
  const userPrompt = buildSpecPrompt(blackboard);
  const systemPrompt = buildSpecSystemPrompt(blackboard);
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
          max_tokens: 1000,
          temperature: 0.35,
          system: systemPrompt,
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

        // Parse v7.0 JSON output and emit complete event
        try {
          const parsed = parseSpecRailOutput(accumulated);
          const repaired = parsed ? repairSpecRailOutput(parsed, blackboard) : null;

          let fallbackReason: string | null = null;
          if (!parsed) {
            fallbackReason = 'parse_failure';
          } else if (!repaired) {
            fallbackReason = 'repair_failure_field_name_leak';
          } else if (!validateSpecRailOutput(repaired, blackboard)) {
            fallbackReason = 'validation_failure';
          }

          if (fallbackReason) {
            console.warn('[SpecSynth] fallback triggered:', fallbackReason);
            emit('fallback', JSON.stringify(makeFallback(blackboard)));
            return;
          }

          const data = mapSpecRailToInsightData(repaired!, mode);
          emit('complete', JSON.stringify({ rail: repaired, data, meta: { method: 'llm', latency_ms: 0 } }));
        } catch (err) {
          console.warn('[SpecSynth] fallback triggered: parse_exception', err);
          emit('fallback', JSON.stringify(makeFallback(blackboard)));
        }
      } catch (err) {
        try {
          console.warn('[SpecSynth] fallback triggered: stream_exception', err);
          emit('fallback', JSON.stringify(makeFallback(blackboard)));
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
