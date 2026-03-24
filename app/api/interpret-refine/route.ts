import { callClaude } from "@/lib/claude/client";
import { NextRequest, NextResponse } from "next/server";

// All valid modifier names — union of display modifiers and score-delta modifiers
const VALID_MODIFIERS = [
  // Texture & materiality
  "Refined", "Textured", "Sculptural", "Soft", "Structured", "Fluid", "Raw",
  "Polished", "Organic", "Tactile",
  // Mood
  "Romantic", "Moody", "Playful", "Serious", "Ethereal", "Grounded", "Dark",
  // Positioning / constraint
  "Minimal", "Maximal", "Utility", "Decorative", "Nostalgic", "Contemporary",
  "Timeless", "Trend-forward",
  // Gender & expression
  "Feminine", "Masculine", "Androgynous",
  // Lifestyle / cultural
  "Urban", "Coastal", "Western", "Bohemian", "Sporty", "Loungewear",
  // Volume & silhouette
  "Oversized", "Fitted", "Colorful", "Neutral",
];

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
  try {
    const { base, text } = body;

    if (!base || !text || text.trim().length < 2) {
      return NextResponse.json({ modifiers: [], confidence: "high" });
    }

    // If text is just the seeded default, return empty modifiers
    const seededVariants = [
      `${base}, but…`,
      `${base}, but...`,
      `${base}, but`,
    ];
    if (seededVariants.some((s) => text.trim().toLowerCase() === s.toLowerCase())) {
      return NextResponse.json({ modifiers: [], confidence: "high" });
    }

    const raw = (await callClaude(
      `You are a fashion concept interpreter for a design tool. A designer has selected the aesthetic "${base}" and is refining it with their own words.

Their refinement: "${text.trim()}"

From the list below, pick the modifiers that best capture the designer's intent. Choose only what's genuinely present — typically 1–4 modifiers. Return ONLY a JSON object with no extra text.

Valid modifiers:
${VALID_MODIFIERS.join(", ")}

Confidence guide:
- "high": the refinement is clear and well-supported by the modifiers
- "med": partially clear, some interpretation needed
- "low": very ambiguous or contradictory

Return format (JSON only, nothing else):
{"modifiers": ["Modifier1", "Modifier2"], "confidence": "high"}`,
      {
        model: "claude-haiku-4-5-20251001",
        maxTokens: 120,
      }
    )).trim();

    // Parse the JSON response
    const parsed = JSON.parse(raw);
    const modifiers = (parsed.modifiers ?? []).filter((m: string) =>
      VALID_MODIFIERS.includes(m),
    );
    const confidence = ["high", "med", "low"].includes(parsed.confidence)
      ? parsed.confidence
      : "med";

    return NextResponse.json({ modifiers, confidence });
  } catch {
    return NextResponse.json({ modifiers: [], confidence: "med" }, { status: 500 });
  }
}
