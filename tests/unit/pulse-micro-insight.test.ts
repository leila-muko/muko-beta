import { describe, expect, it } from "vitest";
import { buildPulseMicroInsight, pulseMicroInsightToText } from "@/lib/pulse/microInsight";

describe("buildPulseMicroInsight", () => {
  it("uses the concept headline for strong resonance with weaker brand anchoring", () => {
    const insight = buildPulseMicroInsight({
      stage: "concept",
      identity: { status: "yellow", score: 61 },
      resonance: { status: "green", score: 83 },
      execution: { pending: true },
      context: { silhouetteSelected: true, paletteSelected: true },
    });

    expect(pulseMicroInsightToText(insight)).toBe(
      "Market appetite is strong, but the product expression isn't fully anchored in your brand yet."
    );
    expect(insight.cues).toEqual([
      expect.objectContaining({ key: "identity", value: "mixed", tone: "warning" }),
      expect.objectContaining({ key: "resonance", value: "strong", tone: "positive" }),
      expect.objectContaining({ key: "execution", value: "Locked", tone: "muted" }),
    ]);
  });

  it("keeps concept pulse focused on market crowding when identity is strong but resonance is weak", () => {
    const insight = buildPulseMicroInsight({
      stage: "concept",
      identity: { status: "green", score: 88 },
      resonance: { status: "red", score: 42 },
      execution: { pending: true },
      context: { silhouetteSelected: true, paletteSelected: true },
    });

    expect(pulseMicroInsightToText(insight)).toBe(
      "The brand read is clear, but the market lane is already feeling crowded."
    );
  });

  it("keeps concept pulse pointed at product definition before the product is locked", () => {
    const insight = buildPulseMicroInsight({
      stage: "concept",
      identity: { status: "green", score: 84 },
      resonance: { status: "green", score: 78 },
      execution: { pending: true },
      context: { silhouetteSelected: false, paletteSelected: false },
    });

    expect(pulseMicroInsightToText(insight)).toBe(
      "The direction has signal, but the product expression still needs to be locked."
    );
  });

  it("turns spec pulse into a build-led warning when execution threatens a live opportunity", () => {
    const insight = buildPulseMicroInsight({
      stage: "spec",
      identity: { status: "green", score: 82 },
      resonance: { status: "green", score: 76 },
      execution: { status: "red", score: 38 },
      context: { materialSelected: true },
    });

    expect(pulseMicroInsightToText(insight)).toBe(
      "The opportunity is still alive, but the build is starting to compromise the idea."
    );
  });

  it("keeps spec pulse concise when all three signals are holding", () => {
    const insight = buildPulseMicroInsight({
      stage: "spec",
      identity: { status: "green", score: 86 },
      resonance: { status: "green", score: 80 },
      execution: { status: "green", score: 83 },
      context: { materialSelected: true },
    });

    expect(pulseMicroInsightToText(insight)).toBe(
      "The concept is holding through brand, market, and build."
    );
  });
});
