export type SharedMarketState = "open" | "building" | "crowded" | "late";
export type SharedMarketVariant = "green" | "amber" | "red";

export interface SharedMarketSignal {
  state: SharedMarketState;
  status: "green" | "yellow" | "red";
  variant: SharedMarketVariant;
  label: string;
  support: string;
  cue: string;
  message: string;
}

export function getSharedMarketSignal(options: {
  trendVelocity?: string | null;
  saturationScore?: number | null;
}): SharedMarketSignal {
  const trendVelocity = options.trendVelocity ?? null;
  const saturationScore = options.saturationScore ?? null;

  if (trendVelocity === "declining") {
    return {
      state: "late",
      status: "red",
      variant: "red",
      label: "Late cycle",
      support: "Timing is starting to fade",
      cue: "late cycle",
      message: "Declining interest",
    };
  }

  if (typeof saturationScore === "number" && saturationScore >= 70) {
    return {
      state: "crowded",
      status: "red",
      variant: "red",
      label: "Crowded lane",
      support: "Differentiation pressure is high",
      cue: "crowded lane",
      message: "Peak saturation",
    };
  }

  if (typeof saturationScore === "number" && saturationScore >= 40) {
    return {
      state: "building",
      status: "yellow",
      variant: "amber",
      label: "Building traction",
      support: "There is still room to differentiate",
      cue: "building traction",
      message: "Growing traction",
    };
  }

  return {
    state: "open",
    status: "green",
    variant: "green",
    label: "Open window",
    support: "Whitespace is still available",
    cue: "open window",
    message: "Emerging opportunity",
  };
}
