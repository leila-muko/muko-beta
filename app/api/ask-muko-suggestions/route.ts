import { NextRequest } from "next/server";
import { anthropic, parseJSONResponse } from "@/lib/claude/client";
import type { AskMukoContext } from "@/lib/synthesizer/askMukoResponse";

const SYSTEM_PROMPT = `You are Muko, a fashion decision intelligence assistant. Given an analysis context, generate 2–3 short questions a designer might want to ask right now. Make them specific to the actual scores and data present. Under 10 words each. Return only a JSON array of strings with no other text.`;

export async function POST(req: NextRequest) {
  let context: AskMukoContext;

  try {
    ({ context } = await req.json());
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!context) {
    return new Response(JSON.stringify({ error: "Missing context" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Given this analysis context, generate 2–3 short questions a designer might want to ask right now. Make them specific to the actual scores and data present. Under 10 words each. Return only a JSON array of strings.\n\nContext: ${JSON.stringify(context)}`,
        },
      ],
    });

    const raw = (response.content[0] as { type: string; text: string }).text.trim();
    const questions = parseJSONResponse<string[]>(raw);

    if (!Array.isArray(questions)) {
      throw new Error("Response is not an array");
    }

    return new Response(JSON.stringify({ questions }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error('[ask-muko-suggestions] error:', err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
