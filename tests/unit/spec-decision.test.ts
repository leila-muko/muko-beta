import { describe, expect, it } from "vitest";

import { shouldShowBetterPath, type SpecRailInsight } from "@/lib/synthesizer/specDecision";

function buildRail(overrides: Partial<SpecRailInsight> = {}): SpecRailInsight {
  return {
    feasibility_stance: "viable_with_constraints",
    headline: "Base headline",
    core_tension: "Base tension",
    feasibility_breakdown: {
      cost: "workable",
      timeline: "tight",
      complexity: "moderate",
    },
    decision: {
      direction: "hold",
      reason: "Base reason",
    },
    execution_levers: [
      { text: "One" },
      { text: "Two" },
      { text: "Three" },
    ],
    alternative_path: {
      title: "Drop one tier",
      description: "Shift to moderate construction to ease the schedule.",
      dimension: "construction",
      target_tier: "moderate",
      method: "moderate complexity",
    },
    ...overrides,
  };
}

describe("shouldShowBetterPath", () => {
  it("shows the rail section for actionable construction alternatives even when the decision holds", () => {
    const rail = buildRail();

    expect(shouldShowBetterPath(rail)).toBe(true);
  });

  it("hides the rail section for the explicit no-swap placeholder", () => {
    const rail = buildRail({
      feasibility_stance: "viable",
      core_tension: null,
      alternative_path: {
        title: "Material selection is working. No swap suggested.",
        description: "The current selection is carrying the direction without adding avoidable execution pressure. Hold the route and use execution notes to preserve what is already working.",
        dimension: "execution",
      },
    });

    expect(shouldShowBetterPath(rail)).toBe(false);
  });
});
