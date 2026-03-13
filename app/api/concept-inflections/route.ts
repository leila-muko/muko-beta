import { NextRequest, NextResponse } from "next/server";
import { callClaude, parseJSONResponse } from "@/lib/claude/client";

interface InflectionSuggestionRequest {
  aesthetic_name?: string;
  brand_keywords?: string[];
}

export async function POST(req: NextRequest) {
  try {
    const { aesthetic_name, brand_keywords }: InflectionSuggestionRequest = await req.json();

    if (!aesthetic_name?.trim()) {
      return NextResponse.json({ suggestions: [] });
    }

    const raw = await callClaude(
      `You are a fashion creative director. Given the aesthetic [${aesthetic_name.trim()}] and the brand DNA [${(brand_keywords ?? []).join(", ")}], suggest 2-3 short inflection phrases that would add tension or nuance to this aesthetic direction without breaking its core identity. Each phrase should start with the word with and be under 6 words. Return only a JSON array of strings, no other text. Example: ["with heritage craft tension", "with utilitarian restraint", "with sculptural volume"]`,
      {
        model: "claude-haiku-4-5-20251001",
        maxTokens: 120,
        temperature: 0.4,
      },
    );

    const suggestions = parseJSONResponse<string[]>(raw)
      .filter((value) => typeof value === "string")
      .map((value) => value.trim())
      .filter((value) => value.toLowerCase().startsWith("with ") && value.split(/\s+/).length <= 6)
      .slice(0, 3);

    return NextResponse.json({ suggestions });
  } catch {
    return NextResponse.json({ suggestions: [] }, { status: 500 });
  }
}
