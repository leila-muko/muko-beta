import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import {
  buildConceptLanguagePrompt,
  CONCEPT_LANGUAGE_SYSTEM_PROMPT,
  parseConceptLanguageOutput,
} from '@/lib/synthesizer/conceptInsight';

interface ConceptLanguageRequest {
  aesthetic_name?: string;
  brand_keywords?: string[];
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
}

function sse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
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
  const payload: ConceptLanguageRequest = body;

  if (!payload?.aesthetic_name) {
    return new Response(JSON.stringify({ error: 'Missing aesthetic_name' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const userPrompt = buildConceptLanguagePrompt({
    aesthetic_name: payload.aesthetic_name,
    brand_keywords: payload.brand_keywords ?? [],
    brand_name: payload.brand_name ?? null,
    customer_profile: payload.customer_profile ?? null,
    price_tier: payload.price_tier ?? null,
    tension_context: payload.tension_context ?? null,
    reference_brands: payload.reference_brands ?? [],
    excluded_brands: payload.excluded_brands ?? [],
    strategy_summary: payload.strategy_summary ?? null,
    brand_interpretation: payload.brand_interpretation ?? null,
    selected_silhouettes: payload.selected_silhouettes ?? [],
    selected_palette: payload.selected_palette ?? null,
    collection_language: payload.collection_language ?? [],
    expression_signals: payload.expression_signals ?? [],
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const client = new Anthropic();
        const anthropicStream = client.messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 300,
          temperature: 0.45,
          system: CONCEPT_LANGUAGE_SYSTEM_PROMPT,
          messages: [{ role: 'user', content: userPrompt }],
        });

        let accumulated = '';

        for await (const event of anthropicStream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            accumulated += event.delta.text;
            controller.enqueue(encoder.encode(sse('chunk', { text: event.delta.text })));
          }
        }

        const parsed = parseConceptLanguageOutput(accumulated);
        if (parsed) {
          controller.enqueue(encoder.encode(sse('complete', parsed)));
        } else {
          controller.enqueue(encoder.encode(sse('error', { error: 'Invalid model output' })));
        }
      } catch {
        controller.enqueue(encoder.encode(sse('error', { error: 'Concept language request failed' })));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
