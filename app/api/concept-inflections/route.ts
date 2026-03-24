import { NextRequest, NextResponse } from "next/server";
import { callClaude, parseJSONResponse } from "@/lib/claude/client";

interface InflectionSuggestionRequest {
  aesthetic_name?: string;
  brand_keywords?: string[];
}

const STATIC_FALLBACK = {
  suggestions: [
    "with restrained tension",
    "with maal contrast",
    "with structural precision",
  ],
};

export async function POST(req: NextRequest) {
  let body: InflectionSuggestionRequest;
  try {
    body = await req.json();
  } catch {
    return Response.json({ message: 'Request body is required' }, { status: 400 });
  }
  if (!body) {
    return Response.json({ message: 'Request body is required' }, { status: 400 });
  }
  const { aesthetic_name, brand_keywords } = body;

  if (!aesthetic_name?.trim()) {
    return NextResponse.json({ suggestions: [] });
  }

  const brandContext =
    brand_keywords && brand_keywords.length > 0
      ? brand_keywords.join(", ")
      : "contemporary, refined";

  try {
    const raw = await callClaude(
      `Given the aesthetic [${aesthetic_name.trim()}] and the brand DNA [${brandContext}], suggest 2-3 short inflection phrases that would add tension or nuance to this aesthetic direction without breaking its core identity. Each phrase should start with the word "with" and be under 6 words. Return only a JSON array of strings. Example: ["with heritage craft tension", "with utilitarian restraint", "with sculptural volume"]`,
      {
        model: "claude-haiku-4-5-20251001",
        maxTokens: 120,
        temperature: 0.4,
        systemPrompt:
          "You are a senior fashion creative director with expertise in brand identity and aesthetic direction. You understand how to add tension and nuance to an aesthetic without losing its core DNA. You always return valid JSON arrays only. No preamble. No markdown. No explanation.",
      },
    );

    const suggestions = parseJSONResponse<string[]>(raw)
      .filter((value) => typeof value === "string")
      .map((value) => value.trim())
      .filter((value) => value.toLowerCase().startsWith("with ") && value.split(/\s+/).length <= 6)
      .slice(0, 3);

    return NextResponse.json({ suggestions });
  } catch {
    return NextResponse.json(STATIC_FALLBACK);
  }
}
