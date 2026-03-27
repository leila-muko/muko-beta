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
  key: string;
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
  const directionDefined = silhouetteLocked && paletteLocked;

  if (statuses.resonance === "green" && statuses.identity !== "green") {
    return [
      { text: "The direction has momentum", tone: "positive" },
      { text: ", but " },
      { text: "the brand coherence still needs tightening.", tone: "warning" },
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
      { text: "differentiation pressure is starting to build.", tone: "warning" },
    ];
  }

  if (statuses.identity === "red" && statuses.resonance === "red") {
    return [
      { text: "The direction has not found its footing yet" },
      { text: ", with " },
      { text: "both coherence and momentum still under pressure.", tone: "warning" },
    ];
  }

  if (!directionDefined) {
    return [
      { text: "The direction has signal" },
      { text: ", but " },
      { text: "it still needs a cleaner edit.", tone: "warning" },
    ];
  }

  if (statuses.identity === "green" && statuses.resonance === "green") {
    return [
      { text: "Strong resonance with a coherent brand read.", tone: "positive" },
      { text: ", and " },
      { text: "the direction is ready to carry forward.", tone: "neutral" },
    ];
  }

  if (statuses.identity === "yellow" && statuses.resonance === "yellow") {
    return [
      { text: "The direction is gaining traction" },
      { text: ", but " },
      { text: "the point of view still needs a firmer edit.", tone: "warning" },
    ];
  }

  if (statuses.identity === "red") {
    return [
      { text: "There is early traction here", tone: "positive" },
      { text: ", but " },
      { text: "the brand case is still too loose.", tone: "warning" },
    ];
  }

  if (statuses.resonance === "red") {
    return [
      { text: "The direction reads coherently" },
      { text: ", but " },
      { text: "the timing window looks narrow.", tone: "warning" },
    ];
  }

  return [
    { text: "The direction is taking shape" },
    { text: ", with " },
    { text: "a few signals that still need tighter definition.", tone: "warning" },
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
