import { NextRequest, NextResponse } from 'next/server';
import { buildCollectionReport } from '@/lib/collection-report/buildCollectionReport';
import type { CollectionReportInput, CollectionReportResponse } from '@/lib/collection-report/types';

interface AssortmentInsightRequest {
  action: 'assortment_insight';
  collection_name: string;
  direction_counts: Record<string, number>;
}

interface CollectionReportRequest {
  action: 'collection_report';
  payload: CollectionReportInput;
}

function buildAssortmentInsight(collectionName: string, directionCounts: Record<string, number>) {
  const entries = Object.entries(directionCounts).sort((a, b) => b[1] - a[1]);
  const [topDirection, topCount] = entries[0] ?? ['collection direction', 0];
  const secondCount = entries[1]?.[1] ?? 0;

  if (topCount === 0) {
    return `${collectionName} needs more pieces before assortment shape can be assessed.`;
  }

  if (topCount >= secondCount * 2 && entries.length > 1) {
    return `${topDirection} is currently dominating the line; the opportunity is to build clearer support around it or widen the assortment mix.`;
  }

  if (entries.length === 1) {
    return `${collectionName} is still reading as a single-direction story; decide whether that concentration is strategic or simply early-stage.`;
  }

  return `${collectionName} has multiple directions in play, but the collection will benefit from sharper hierarchy so the lead idea reads first.`;
}

function parseCollectionReportJSON(raw: string) {
  const cleaned = raw
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  try {
    return JSON.parse(cleaned) as {
      collection_report: {
        collection_thesis: string;
        scores: {
          identity: { explanation: string };
          resonance: { explanation: string };
          execution: { explanation: string };
        };
        muko_insight: {
          working: string[];
          watch: string[];
          recommendations: string[];
        };
        key_risks: Array<{ title: string; detail: string }>;
        next_steps: {
          immediate_actions: string[];
          decision_points: string[];
        };
        overall_read: string;
      };
    };
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');

    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1)) as {
        collection_report: {
          collection_thesis: string;
          scores: {
            identity: { explanation: string };
            resonance: { explanation: string };
            execution: { explanation: string };
          };
          muko_insight: {
            working: string[];
            watch: string[];
            recommendations: string[];
          };
          key_risks: Array<{ title: string; detail: string }>;
          next_steps: {
            immediate_actions: string[];
            decision_points: string[];
          };
          overall_read: string;
        };
      };
    }

    throw new Error('Unable to parse collection report JSON');
  }
}

async function attemptSynthesizerUpgrade(payload: CollectionReportInput): Promise<CollectionReportResponse | null> {
  if (!process.env.ANTHROPIC_API_KEY || payload.pieces.length === 0) {
    return null;
  }

  try {
    const { callClaude } = await import('@/lib/claude/client');
    const fallback = buildCollectionReport(payload);
    const piecesText = payload.pieces
      .map((piece) => {
        return [
          piece.piece_name ?? 'Untitled Piece',
          piece.category ?? 'Unknown category',
          piece.role ?? 'unspecified role',
          piece.complexity ?? 'unspecified complexity',
          piece.direction_tag ?? 'collection direction',
          piece.material ?? 'unknown material',
          piece.silhouette ?? 'unknown silhouette',
          `score ${piece.score ?? 0}`,
          `identity ${piece.dimensions?.identity ?? 'n/a'}`,
          `resonance ${piece.dimensions?.resonance ?? 'n/a'}`,
          `execution ${piece.dimensions?.execution ?? 'n/a'}`,
          `margin ${piece.margin_passed === false ? 'failed' : piece.margin_passed === true ? 'passed' : 'unknown'}`,
        ].join(' | ');
      })
      .join('\n');

    const systemPrompt =
      "You are Muko's collection synthesizer. Write like a premium creative-merchandising intelligence partner. Be specific, concise, strategic, fashion-literate, and meeting-ready. Return raw JSON only.";

    const prompt = `Return only valid JSON matching this schema exactly:
{
  "collection_report": {
    "collection_thesis": "string",
    "scores": {
      "identity": { "explanation": "string" },
      "resonance": { "explanation": "string" },
      "execution": { "explanation": "string" }
    },
    "muko_insight": {
      "working": ["string", "string", "string"],
      "watch": ["string", "string", "string"],
      "recommendations": ["string", "string", "string"]
    },
    "key_risks": [{ "title": "string", "detail": "string" }],
    "next_steps": {
      "immediate_actions": ["string", "string", "string"],
      "decision_points": ["string", "string", "string"]
    },
    "overall_read": "string"
  }
}

Rules:
- Use the deterministic report only as structured grounding, not as final wording.
- Keep copy specific to the collection and avoid generic phrasing.
- "working", "watch", "recommendations", "immediate_actions", and "decision_points" must each contain exactly 3 items.
- "key_risks" must contain 2 to 4 items.
- Do not mention fallback logic, JSON, AI, or models inside the content.
- No markdown. No prose before or after the JSON.

Collection: ${payload.collection_name}
Season: ${payload.season}
Pieces:
${piecesText}

Existing deterministic report for grounding:
${JSON.stringify(fallback.collection_report)}`;

    const raw = await callClaude(prompt, {
      model: 'claude-haiku-4-5-20251001',
      maxTokens: 900,
      systemPrompt,
      temperature: 0.35,
    });

    const parsed = parseCollectionReportJSON(raw);

    return {
      collection_report: {
        ...fallback.collection_report,
        collection_thesis: parsed.collection_report.collection_thesis,
        scores: {
          identity: {
            ...fallback.collection_report.scores.identity,
            explanation: parsed.collection_report.scores.identity.explanation,
          },
          resonance: {
            ...fallback.collection_report.scores.resonance,
            explanation: parsed.collection_report.scores.resonance.explanation,
          },
          execution: {
            ...fallback.collection_report.scores.execution,
            explanation: parsed.collection_report.scores.execution.explanation,
          },
        },
        muko_insight: parsed.collection_report.muko_insight,
        key_risks: parsed.collection_report.key_risks,
        next_steps: parsed.collection_report.next_steps,
        overall_read: parsed.collection_report.overall_read,
        meta: {
          ...fallback.collection_report.meta,
          source: 'synthesizer',
        },
      },
    };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AssortmentInsightRequest | CollectionReportRequest;

    if (body.action === 'assortment_insight') {
      return NextResponse.json({
        insight: buildAssortmentInsight(body.collection_name, body.direction_counts),
      });
    }

    if (body.action === 'collection_report') {
      const upgraded = await attemptSynthesizerUpgrade(body.payload);
      return NextResponse.json(upgraded ?? buildCollectionReport(body.payload));
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Synthesis failed' }, { status: 500 });
  }
}
