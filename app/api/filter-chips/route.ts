import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  let body: { chipLabels: string[]; synthEdit: string[]; keyPiece?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { chipLabels, synthEdit, keyPiece } = body;
  if (!Array.isArray(chipLabels) || !Array.isArray(synthEdit)) {
    return NextResponse.json(
      { error: "Missing chipLabels or synthEdit" },
      { status: 400 }
    );
  }

  if (chipLabels.length === 0 || synthEdit.length === 0) {
    return NextResponse.json({ contradicted: [] });
  }

  const userPrompt = `A fashion brand's Synthesizer has produced these strategic constraints:
${synthEdit.join("\n")}

${keyPiece ? `SELECTED KEY PIECE: "${keyPiece}"\nREQUIREMENT: Remove any candidate chip that is physically incompatible with or directly contradicts a "${keyPiece}". For example, if the key piece is a leather trench, remove suggestions like "sheer layers" or "lightweight fabrics" that cannot coexist with it.\n` : ""}These are candidate design suggestions:
${chipLabels.map((l, i) => `${i}: ${l}`).join("\n")}

Return a JSON array of the indices that CONTRADICT or undermine the constraints. Be strict — only flag direct contradictions, not tangential overlap.
Example: { "contradicted": [1, 3] }`;

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      temperature: 0,
      system: "You are a filter. Return only valid JSON.",
      messages: [{ role: "user", content: userPrompt }],
    });

    const text =
      message.content[0]?.type === "text" ? message.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ contradicted: [] });

    const parsed = JSON.parse(jsonMatch[0]) as { contradicted?: unknown };
    const contradicted = Array.isArray(parsed.contradicted)
      ? parsed.contradicted.filter((x): x is number => typeof x === "number")
      : [];

    return NextResponse.json({ contradicted });
  } catch {
    return NextResponse.json({ contradicted: [] });
  }
}
