import { describe, expect, it } from "vitest";
import { getSpecMarketSaturationSignal } from "@/lib/pulse/specPulseInsight";

describe("getSpecMarketSaturationSignal", () => {
  it("uses the shared building state for mid-saturation lanes", () => {
    const signal = getSpecMarketSaturationSignal({
      trendVelocity: "ascending",
      saturationScore: 52,
    });

    expect(signal.state).toBe("building");
    expect(signal.label).toBe("Building traction");
    expect(signal.variant).toBe("amber");
  });

  it("uses the shared crowded state only for high saturation lanes", () => {
    const signal = getSpecMarketSaturationSignal({
      trendVelocity: "ascending",
      saturationScore: 72,
    });

    expect(signal.state).toBe("crowded");
    expect(signal.label).toBe("Crowded lane");
    expect(signal.variant).toBe("red");
  });
});
