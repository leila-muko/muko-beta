import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic();

const AESTHETICS = [
  "Terrain Luxe",
  "Quiet Structure",
  "Romantic Analog",
  "Heritage Hand",
  "Undone Glam",
  "Haptic Play",
  "High Voltage",
  "Sweet Subversion",
];

const AESTHETIC_CONTEXT = `
- Terrain Luxe: elevated outdoorsman, durability meets high-end design, utility hardware, earthy tones, gorpcore, survivalist chic, technical outerwear, workwear-meets-luxury, transseasonal protection
- Quiet Structure: minimalism 2.0, structural precision, quiet luxury, old money, clean girl, monochrome, column silhouettes, tonal layering, matte fabrics, architectural draping, editorial restraint
- Romantic Analog: dark academia, literary romance, vintage blazers, oversized knits, cinematic nostalgia, analog intention, heritage textures, bookish, moody romanticism, future-vintage knitwear
- Heritage Hand: artisanal, handmade, sustainable, woven textures, natural fibers, slow fashion, craft heritage, organic materials, textile art, circularity, modern heirloom
- Undone Glam: 90s indie, punk edge, distressed, raw, worn-in, indie sleaze, garage band, layered textures, nostalgic items, playful prints, anti-polish, edgy but chic
- Haptic Play: haptic minimalism, jelly-like, squishy, bouncy, inflated accessories, rubberized, ASMR-adjacent, playful sensory, Y2K plastic, tactile comfort
- High Voltage: maximalist glamour, power dressing, sequin saturation, bold shoulders, metallic knits, statement jewelry, power colors, high-shine, diva energy, confidence as design language
- Sweet Subversion: kawaii, adorable, chunky forms, bold color blocking, miniature indulgences, cute tech, soft toys, imaginative play, emotional support design, saccharine subversion
`;

export async function POST(req: NextRequest) {
  try {
    const { input } = await req.json();

    if (!input || input.trim().length < 2) {
      return NextResponse.json({ match: null });
    }

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 20,
      messages: [
        {
          role: "user",
          content: `You are a fashion aesthetic classifier. Given a user's description, return ONLY the name of the closest matching aesthetic from this list — nothing else, no explanation:

${AESTHETICS.join("\n")}

Context for each:
${AESTHETIC_CONTEXT}

User input: "${input.trim()}"

Reply with ONLY the exact aesthetic name from the list, or the word "null" if nothing matches reasonably.`,
        },
      ],
    });

    const raw =
      message.content[0].type === "text" ? message.content[0].text.trim() : "";
    const match = AESTHETICS.find(
      (a) => a.toLowerCase() === raw.toLowerCase(),
    );

    return NextResponse.json({ match: match ?? null });
  } catch {
    return NextResponse.json({ match: null }, { status: 500 });
  }
}
