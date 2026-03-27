import { describe, expect, it } from "vitest";
import { buildPiecesReadFallback } from "@/lib/pieces/buildPiecesReadFallback";
import { selectRecommendedStartPiece } from "@/lib/pieces/selectRecommendedStartPiece";
import { validatePiecesReadOutput } from "@/lib/pieces/validatePiecesReadOutput";
import type { PiecesReadInput } from "@/lib/pieces/types";

const baseInput: PiecesReadInput = {
  season: "FW26",
  collectionName: "Soft Tension",
  movement: {
    name: "Refined Utility",
    trendVelocity: 76,
    saturationScore: 38,
    marketWhitespace: "open",
    seenIn: ["The Row"],
  },
  collectionFrame: {
    silhouette: ["column"],
    palette: ["chalk", "olive"],
    expression: ["surface contrast"],
    interpretationText: "Quiet structure with craft tension.",
  },
  currentCollectionState: {
    confirmedPieceCount: 1,
    confirmedCategories: ["outerwear"],
    coverageGaps: ["needs_visible_surface_expression", "needs_anchor_piece"],
  },
  suggestedPieces: [
    {
      name: "Open-knit Crochet Midi",
      category: "dresses",
      role: "express_signal",
      rank: 1,
      reasonTags: ["makes_direction_legible", "anchors_hierarchy"],
    },
    {
      name: "Soft Utility Trouser",
      category: "bottoms",
      role: "stabilize_core",
      rank: 2,
      reasonTags: ["opens_commercial_entry"],
    },
  ],
  recommendedStartPiece: {
    name: "Open-knit Crochet Midi",
    role: "express_signal",
    why: ["makes the collection direction legible early"],
  },
};

describe("pieces read helpers", () => {
  it("selects a deterministic start piece from ranked suggestions", () => {
    const recommended = selectRecommendedStartPiece({
      suggestedPieces: [
        {
          name: "Open-knit Crochet Midi",
          category: "dresses",
          role: "express_signal",
          rank: 1,
          reasonTags: ["makes_direction_legible", "anchors_hierarchy"],
          shortRationale: "Makes the craft idea visible fast.",
        },
        {
          name: "Soft Utility Trouser",
          category: "bottoms",
          role: "stabilize_core",
          rank: 2,
          reasonTags: ["opens_commercial_entry"],
          shortRationale: "Adds a steadier commercial base.",
        },
      ],
      confirmedCategories: ["outerwear"],
      coverageGaps: ["needs_anchor_piece", "needs_visible_surface_expression"],
    });

    expect(recommended?.name).toBe("Open-knit Crochet Midi");
    expect(recommended?.role).toBe("express_signal");
    expect(recommended?.why.length).toBeGreaterThan(0);
  });

  it("rejects output that references invented pieces", () => {
    const result = validatePiecesReadOutput(baseInput, {
      read_headline: "Refined Utility needs a harder opening claim.",
      read_body: "The frame is clear, but the product signal still needs a sharper lead.",
      how_to_lean_in: "Let the first piece make surface and proportion visible at once.",
      start_here_title: "Begin with the signal",
      start_here_body: "Start with Soft Utility Trouser to anchor the line.",
      piece_microcopy: [
        {
          piece_name: "Invented Piece",
          microcopy: "Does not exist.",
        },
      ],
    });

    expect(result.valid).toBe(false);
  });

  it("builds a deterministic fallback when synthesis is unavailable", () => {
    const fallback = buildPiecesReadFallback(baseInput);

    expect(fallback.read_headline.length).toBeGreaterThan(0);
    expect(fallback.start_here_title.length).toBeGreaterThan(0);
    expect(fallback.start_here_body).toContain("Open-knit Crochet Midi");
  });
});
