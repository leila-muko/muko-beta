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

function formatList(items: string[]): string {
  const values = items.map((item) => item.trim()).filter(Boolean);
  if (values.length === 0) return '';
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(', ')}, and ${values[values.length - 1]}`;
}

function buildConceptLanguageFallback(payload: ConceptLanguageRequest) {
  const aestheticName = payload.aesthetic_name?.trim() || 'this direction';
  const silhouetteText = formatList(payload.selected_silhouettes ?? []);
  const paletteText = payload.selected_palette?.trim() || '';
  const signalText = formatList(payload.expression_signals ?? payload.collection_language ?? []);
  const customerText = payload.customer_profile?.trim() || '';
  const priceTierText = payload.price_tier?.trim() || '';
  const brandInterpretation = payload.brand_interpretation?.trim() || '';

  const framingClauses = [
    silhouetteText ? `hold it through ${silhouetteText.toLowerCase()} shape` : null,
    paletteText ? `keep the palette in ${paletteText.toLowerCase()}` : null,
    signalText ? `let ${signalText.toLowerCase()} carry the emphasis` : null,
  ].filter(Boolean);

  return {
    headline: `Translate ${aestheticName} into disciplined product language.`,
    core_read: [
      brandInterpretation
        ? `${brandInterpretation.replace(/[.]+$/g, '')}.`
        : `Keep the product language precise enough that ${aestheticName.toLowerCase()} reads as authored rather than generic.`,
      framingClauses.length > 0
        ? `For this collection, ${framingClauses.join(', ')}.`
        : null,
    ].filter(Boolean).join(' '),
    execution_moves: [
      silhouetteText ? `Use ${silhouetteText.toLowerCase()} proportion to make the direction legible immediately.` : null,
      paletteText ? `Keep finish and color tension anchored in ${paletteText.toLowerCase()} rather than widening the register.` : null,
      signalText ? `Apply ${signalText.toLowerCase()} selectively so the read stays controlled.` : null,
    ].filter((value): value is string => Boolean(value)).slice(0, 3),
    guardrail: customerText || priceTierText
      ? `Keep: the ${[customerText, priceTierText].filter(Boolean).join(' / ')} customer filter visible in every choice.`
      : 'Keep: the collection read controlled, specific, and easy to recognize at first glance.',
  };
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
          controller.enqueue(encoder.encode(sse('complete', buildConceptLanguageFallback(payload))));
        }
      } catch {
        controller.enqueue(encoder.encode(sse('complete', buildConceptLanguageFallback(payload))));
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
