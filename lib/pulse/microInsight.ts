export type PulseStatus = "green" | "yellow" | "red" | null | undefined;
export type PulseSignalKey = "identity" | "resonance" | "execution";
export type PulseCueDirection = "up" | "down" | "steady" | "locked" | "forming";
export type PulseCueTone = "positive" | "warning" | "neutral" | "muted";

export interface PulseSignalInput {
  score?: number | null;
  status?: PulseStatus;
  pending?: boolean;
  label?: string | null;
}

export interface PulseMicroInsightPart {
  text: string;
  tone?: PulseCueTone;
}

export interface PulseMicroInsightCue {
  key: PulseSignalKey;
  label: string;
  value: string;
  tone: PulseCueTone;
}

export interface PulseMicroInsight {
  headline: PulseMicroInsightPart[];
  cues: PulseMicroInsightCue[];
}

interface PulseMicroInsightInput {
  stage: "concept" | "spec";
  identity: PulseSignalInput;
  resonance: PulseSignalInput;
  execution: PulseSignalInput;
  context?: {
    silhouetteSelected?: boolean;
    paletteSelected?: boolean;
    materialSelected?: boolean;
  };
}

type NormalizedStatus = "green" | "yellow" | "red" | "pending";

function normalizeStatus(signal: PulseSignalInput): NormalizedStatus {
  if (signal.pending) return "pending";
  if (signal.status === "green" || signal.status === "yellow" || signal.status === "red") {
    return signal.status;
  }
  return "pending";
}

function isHighYellow(signal: PulseSignalInput): boolean {
  return signal.status === "yellow" && typeof signal.score === "number" && signal.score >= 68;
}

function cueValue(signal: PulseSignalInput, fallback: string): string {
  if (signal.pending) return fallback;
  if (signal.status === "green") return "strong";
  if (signal.status === "yellow") {
    return isHighYellow(signal) ? "emerging" : "mixed";
  }
  if (signal.status === "red") return "mixed";
  return fallback;
}

function cueTone(status: NormalizedStatus): PulseCueTone {
  if (status === "green") return "positive";
  if (status === "yellow") return "warning";
  if (status === "red") return "warning";
  return "muted";
}

function joinHeadline(parts: PulseMicroInsightPart[]): string {
  return parts.map((part) => part.text).join("");
}

function conceptHeadline(input: PulseMicroInsightInput, statuses: Record<PulseSignalKey, NormalizedStatus>): PulseMicroInsightPart[] {
  const silhouetteLocked = Boolean(input.context?.silhouetteSelected);
  const paletteLocked = Boolean(input.context?.paletteSelected);
  const productDefined = silhouetteLocked && paletteLocked;

  if (statuses.resonance === "green" && statuses.identity !== "green") {
    return [
      { text: "Market appetite is strong", tone: "positive" },
      { text: ", but " },
      { text: "the product expression isn't fully anchored in your brand yet.", tone: "warning" },
    ];
  }

  if (statuses.identity === "green" && statuses.resonance === "red") {
    return [
      { text: "The brand read is clear", tone: "positive" },
      { text: ", but " },
      { text: "the market lane is already feeling crowded.", tone: "warning" },
    ];
  }

  if (statuses.identity === "green" && statuses.resonance === "yellow") {
    return [
      { text: "The direction feels true to brand", tone: "positive" },
      { text: ", but " },
      { text: "it needs a sharper market angle to stay distinct.", tone: "warning" },
    ];
  }

  if (statuses.identity === "red" && statuses.resonance === "red") {
    return [
      { text: "The concept has not found its footing yet" },
      { text: ", with " },
      { text: "both brand alignment and market urgency still under pressure.", tone: "warning" },
    ];
  }

  if (!productDefined) {
    return [
      { text: "The direction has signal" },
      { text: ", but " },
      { text: "the product expression still needs to be locked.", tone: "warning" },
    ];
  }

  if (statuses.identity === "green" && statuses.resonance === "green") {
    return [
      { text: "The concept is landing cleanly across brand and market", tone: "positive" },
      { text: ", and " },
      { text: "the product expression is ready to carry that clarity forward.", tone: "neutral" },
    ];
  }

  if (statuses.identity === "yellow" && statuses.resonance === "yellow") {
    return [
      { text: "The opportunity is credible" },
      { text: ", but " },
      { text: "the point of view still needs a firmer edit.", tone: "warning" },
    ];
  }

  if (statuses.identity === "red") {
    return [
      { text: "There is some market interest", tone: "positive" },
      { text: ", but " },
      { text: "the brand case is still too loose.", tone: "warning" },
    ];
  }

  if (statuses.resonance === "red") {
    return [
      { text: "The concept reads coherently" },
      { text: ", but " },
      { text: "the commercial window looks narrow.", tone: "warning" },
    ];
  }

  return [
    { text: "The concept is taking shape" },
    { text: ", with " },
    { text: "a few signals that still need tighter alignment.", tone: "warning" },
  ];
}

function specHeadline(input: PulseMicroInsightInput, statuses: Record<PulseSignalKey, NormalizedStatus>): PulseMicroInsightPart[] {
  const buildLocked = Boolean(input.context?.materialSelected);

  if (!buildLocked || statuses.execution === "pending") {
    return [
      { text: "The concept is directionally sound" },
      { text: ", but " },
      { text: "the build reality is still unopened.", tone: "warning" },
    ];
  }

  if (statuses.execution === "red" && statuses.resonance === "green") {
    return [
      { text: "The opportunity is still alive", tone: "positive" },
      { text: ", but " },
      { text: "the build is starting to compromise the idea.", tone: "warning" },
    ];
  }

  if (statuses.execution === "red") {
    return [
      { text: "The concept still has strategic value" },
      { text: ", but " },
      { text: "execution risk is now doing most of the damage.", tone: "warning" },
    ];
  }

  if (statuses.identity !== "green" && statuses.resonance === "green" && statuses.execution === "green") {
    return [
      { text: "The product can compete in market", tone: "positive" },
      { text: ", but " },
      { text: "it still reads more opportunistic than brand-defining.", tone: "warning" },
    ];
  }

  if (statuses.identity === "green" && statuses.resonance === "green" && statuses.execution === "yellow") {
    return [
      { text: "The concept is holding strategically", tone: "positive" },
      { text: ", but " },
      { text: "execution needs tighter discipline to keep it intact.", tone: "warning" },
    ];
  }

  if (statuses.identity === "green" && statuses.resonance === "red") {
    return [
      { text: "The product still reads like your brand", tone: "positive" },
      { text: ", but " },
      { text: "the market case is starting to thin out.", tone: "warning" },
    ];
  }

  if (statuses.identity === "green" && statuses.resonance === "green" && statuses.execution === "green") {
    return [
      { text: "The concept is holding through brand, market, and build.", tone: "positive" },
    ];
  }

  if (statuses.identity === "red" && statuses.execution === "yellow") {
    return [
      { text: "The build is still serviceable" },
      { text: ", but " },
      { text: "the product identity needs a stronger point of view.", tone: "warning" },
    ];
  }

  return [
    { text: "The piece is viable" },
    { text: ", with " },
    { text: "one or two pressure points that still need discipline.", tone: "warning" },
  ];
}

function buildCues(input: PulseMicroInsightInput, statuses: Record<PulseSignalKey, NormalizedStatus>): PulseMicroInsightCue[] {
  return [
    {
      key: "identity",
      label: "Identity",
      value: cueValue(input.identity, "Pending"),
      tone: cueTone(statuses.identity),
    },
    {
      key: "resonance",
      label: "Resonance",
      value: cueValue(input.resonance, "Pending"),
      tone: cueTone(statuses.resonance),
    },
    {
      key: "execution",
      label: "Execution",
      value:
        input.stage === "concept" || statuses.execution === "pending"
          ? "Locked"
          : cueValue(input.execution, "Pending"),
      tone:
        input.stage === "concept" || statuses.execution === "pending"
          ? "muted"
          : cueTone(statuses.execution),
    },
  ];
}

export function buildPulseMicroInsight(input: PulseMicroInsightInput): PulseMicroInsight {
  const statuses = {
    identity: normalizeStatus(input.identity),
    resonance: normalizeStatus(input.resonance),
    execution: normalizeStatus(input.execution),
  } satisfies Record<PulseSignalKey, NormalizedStatus>;

  return {
    headline: input.stage === "concept" ? conceptHeadline(input, statuses) : specHeadline(input, statuses),
    cues: buildCues(input, statuses),
  };
}

export function pulseMicroInsightToText(insight: PulseMicroInsight): string {
  return joinHeadline(insight.headline);
}
