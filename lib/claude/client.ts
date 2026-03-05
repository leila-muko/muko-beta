// /lib/claude/client.ts
// Anthropic SDK wrapper for consistent usage across all agents

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import Anthropic from '@anthropic-ai/sdk';

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY environment variable is required');
}

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClaudeCallOptions {
  model?: string;
  maxTokens?: number;
  systemPrompt?: string;
  temperature?: number;
}

/**
 * Core wrapper for Claude API calls used across all Muko agents.
 * Defaults to claude-haiku-3-5 for speed and cost efficiency on agent calls.
 * Use claude-sonnet for Synthesizer (final report generation).
 */
export async function callClaude(
  userMessage: string,
  options: ClaudeCallOptions = {}
): Promise<string> {
  const {
    model = 'claude-haiku-4-5-20251001',
    maxTokens = 500,
    systemPrompt,
    temperature = 0.3, // Low temperature for consistent, deterministic agent outputs
  } = options;

  const messages: ClaudeMessage[] = [
    { role: 'user', content: userMessage }
  ];

  const response = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    temperature,
    ...(systemPrompt && { system: systemPrompt }),
    messages,
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error(`Unexpected response type from Claude: ${content.type}`);
  }

  // The SDK may deliver the response bytes interpreted as Latin-1, producing
  // mojibake strings (e.g. â€" instead of —). Re-encode through UTF-8 to fix.
  const cleanText = Buffer.from(content.text, 'latin1').toString('utf8');
  return cleanText;
}

/**
 * Safely parse JSON from LLM response.
 * Strips markdown code fences if present before parsing.
 */
export function parseJSONResponse<T>(raw: string): T {
  const cleaned = raw
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new Error(`Failed to parse LLM JSON response: ${cleaned}`);
  }
}
