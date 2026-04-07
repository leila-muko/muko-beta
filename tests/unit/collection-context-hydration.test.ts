import { describe, expect, test } from "vitest";

import { mergeCollectionContextRows } from "@/lib/collections/hydrateCollectionContext";

describe("mergeCollectionContextRows", () => {
  test("merges a complete context from multiple partial rows", () => {
    const merged = mergeCollectionContextRows(
      {
        collection_aesthetic: "Quiet Structure",
        aesthetic_inflection: "Powdered tailoring with softened rigor",
        mood_board_images: null,
        silhouette: null,
        season: "FW26",
        agent_versions: {
          strategy_summary: "Sharper restraint for a modern workwear customer.",
          direction_interpretation_chips: JSON.stringify(["Architectural restraint", "Soft structure"]),
        },
      },
      {
        collection_aesthetic: null,
        aesthetic_inflection: null,
        mood_board_images: ["https://example.com/look-1.jpg", "https://example.com/look-2.jpg"],
        silhouette: "Column",
        season: null,
        agent_versions: {
          collection_language: JSON.stringify(["Architectural restraint", "Column discipline"]),
          expression_signals: JSON.stringify(["Powder-matte", "Knife-pleated"]),
          chip_selection: JSON.stringify({
            directionId: "quiet-structure",
            activatedChips: [{ label: "Powder-matte" }],
          }),
        },
      }
    );

    expect(merged).toEqual({
      collection_aesthetic: "Quiet Structure",
      aesthetic_inflection: "Powdered tailoring with softened rigor",
      aesthetic_matched_id: null,
      silhouette: "Column",
      season: "FW26",
      mood_board_images: ["https://example.com/look-1.jpg", "https://example.com/look-2.jpg"],
      agent_versions: {
        strategy_summary: "Sharper restraint for a modern workwear customer.",
        direction_interpretation_chips: JSON.stringify(["Architectural restraint", "Soft structure"]),
        collection_language: JSON.stringify(["Architectural restraint", "Column discipline"]),
        expression_signals: JSON.stringify(["Powder-matte", "Knife-pleated"]),
        chip_selection: JSON.stringify({
          directionId: "quiet-structure",
          activatedChips: [{ label: "Powder-matte" }],
        }),
      },
    });
  });

  test("preserves richer cached fields when a newer row is partial", () => {
    const merged = mergeCollectionContextRows(
      {
        collection_aesthetic: "Quiet Structure",
        aesthetic_inflection: "Powdered tailoring with softened rigor",
        silhouette: "Column",
        season: "FW26",
        mood_board_images: ["https://example.com/look-1.jpg"],
        agent_versions: {
          strategy_summary: "Sharper restraint for a modern workwear customer.",
          expression_signals: JSON.stringify(["Powder-matte"]),
        },
      },
      {
        collection_aesthetic: "Quiet Structure",
        aesthetic_inflection: "",
        silhouette: "",
        season: "",
        mood_board_images: [],
        agent_versions: {
          strategy_summary: "",
          expression_signals: "",
        },
      }
    );

    expect(merged?.aesthetic_inflection).toBe("Powdered tailoring with softened rigor");
    expect(merged?.silhouette).toBe("Column");
    expect(merged?.mood_board_images).toEqual(["https://example.com/look-1.jpg"]);
    expect(merged?.agent_versions).toEqual({
      strategy_summary: "Sharper restraint for a modern workwear customer.",
      expression_signals: JSON.stringify(["Powder-matte"]),
    });
  });
});
