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
  });

  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      temperature: 0.45,
      system: CONCEPT_LANGUAGE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const text = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('');
    const parsed = parseConceptLanguageOutput(text);

    if (!parsed) {
      return new Response(JSON.stringify({ error: 'Invalid model output' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(parsed), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Concept language request failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
