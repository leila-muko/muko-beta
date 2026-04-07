import type { PulseCueTone, PulseMicroInsight } from "@/lib/pulse/microInsight";
import { getSharedMarketSignal, type SharedMarketState, type SharedMarketSignal } from "@/lib/pulse/marketState";

export type SpecSignalStatus = "green" | "yellow" | "red" | null | undefined;

type CommercialPotentialBand = "high" | "medium" | "low";
export interface SpecMarketSaturationSignal {
  state: SharedMarketState;
  label: string;
  support: string;
  cue: string;
  tone: PulseCueTone;
  variant: "green" | "amber" | "red";
}

interface SpecPulseInsightInput {
  commercialPotentialScore: number;
  marketSaturation: SpecMarketSaturationSignal;
  identityStatus?: SpecSignalStatus;
  executionStatus?: SpecSignalStatus;
  executionScore?: number;
  executionPending?: boolean;
}

export interface SpecPulseTelemetrySignal {
  label: string;
  tone: PulseCueTone;
}

export interface SpecPulseTelemetry {
  identity: SpecPulseTelemetrySignal;
  commercial_potential: SpecPulseTelemetrySignal;
  execution: SpecPulseTelemetrySignal;
  saturation: SpecPulseTelemetrySignal;
}

function getCommercialPotentialBand(score: number): CommercialPotentialBand {
  if (score >= 80) return "high";
  if (score >= 60) return "medium";
  return "low";
}

function identityCue(status: SpecSignalStatus): { value: string; tone: PulseCueTone } {
  if (status === "green") return { value: "strong", tone: "positive" };
  if (status === "yellow") return { value: "mixed", tone: "warning" };
  if (status === "red") return { value: "loose", tone: "warning" };
  return { value: "pending", tone: "muted" };
}

function executionCue(status: SpecSignalStatus, pending: boolean): { value: string; tone: PulseCueTone } {
  if (pending) return { value: "locked", tone: "muted" };
  if (status === "green") return { value: "steady", tone: "positive" };
  if (status === "yellow") return { value: "tight", tone: "warning" };
  if (status === "red") return { value: "strained", tone: "warning" };
  return { value: "pending", tone: "muted" };
}

function saturationCue(signal: SpecMarketSaturationSignal): SpecPulseTelemetrySignal {
  if (signal.state === "open") return { label: "open lane", tone: "positive" };
  if (signal.state === "building") return { label: "building traction", tone: "neutral" };
  if (signal.state === "crowded") return { label: "crowding", tone: "warning" };
  return { label: "late cycle", tone: "warning" };
}

function commercialPotentialCue(score: number): SpecPulseTelemetrySignal {
  const band = getCommercialPotentialBand(score);
  if (band === "high") return { label: "high upside", tone: "positive" };
  if (band === "medium") return { label: "viable", tone: "neutral" };
  return { label: "limited pull", tone: "warning" };
}

function buildExecutionHeadlineClause(executionScore?: number): PulseMicroInsight["headline"] {
  if (typeof executionScore !== "number") {
    return [
      { text: "execution needs " },
      { text: "attention", tone: "warning" },
    ];
  }

  if (executionScore >= 72) {
    return [
      { text: "execution is " },
      { text: "on track", tone: "positive" },
    ];
  }

  if (executionScore >= 55) {
    return [
      { text: "execution needs " },
      { text: "watching", tone: "warning" },
    ];
  }

  if (executionScore > 35) {
    return [
      { text: "execution needs " },
      { text: "attention", tone: "warning" },
    ];
  }

  return [
    { text: "execution is " },
    { text: "at risk", tone: "warning" },
  ];
}

function buildSpecHeadline(telemetry: SpecPulseTelemetry, input: SpecPulseInsightInput): PulseMicroInsight["headline"] {
  const identityTone = telemetry.identity.tone;
  const commercialTone = telemetry.commercial_potential.tone;
  const executionTone = telemetry.execution.tone;
  const executionLocked = telemetry.execution.label === "locked" || telemetry.execution.label === "pending";
  const executionClause = buildExecutionHeadlineClause(input.executionScore);

  if (executionLocked) {
    return [
      { text: "Identity is " },
      { text: identityTone === "positive" ? "locked in" : identityTone === "warning" ? "still uneven" : "forming", tone: identityTone },
      { text: ", commercial pull is " },
      { text: commercialTone === "positive" ? "strong" : commercialTone === "warning" ? "limited" : "viable", tone: commercialTone },
      { text: ", but execution is still " },
      { text: "locked", tone: "muted" },
      { text: "." },
    ];
  }

  if (identityTone === "positive" && commercialTone === "positive" && executionTone === "positive") {
    return [
      { text: "Identity is " },
      { text: "locked in", tone: "positive" },
      { text: ", commercial pull is " },
      { text: "strong", tone: "positive" },
      { text: ", and " },
      ...executionClause,
      { text: "." },
    ];
  }

  if (executionTone === "warning" && commercialTone === "positive") {
    return [
      { text: "Identity is " },
      { text: identityTone === "positive" ? "locked in" : "still uneven", tone: identityTone === "positive" ? "positive" : "warning" },
      { text: ", commercial pull is " },
      { text: "strong", tone: "positive" },
      { text: ", but " },
      ...executionClause,
      { text: "." },
    ];
  }

  if (executionTone === "warning") {
    return [
      { text: "Identity feels " },
      { text: identityTone === "positive" ? "clear" : "uneven", tone: identityTone === "positive" ? "positive" : "warning" },
      { text: ", commercial pull looks " },
      { text: commercialTone === "warning" ? "limited" : "viable", tone: commercialTone },
      { text: ", but execution is now " },
      { text: "strained", tone: "warning" },
      { text: "." },
    ];
  }

  if (identityTone === "warning" && commercialTone === "positive" && executionTone === "positive") {
    return [
      { text: "Commercial pull is " },
      { text: "strong", tone: "positive" },
      { text: " and execution is " },
      { text: "steady", tone: "positive" },
      { text: ", but identity still feels " },
      { text: "loose", tone: "warning" },
      { text: "." },
    ];
  }

  if (commercialTone === "warning" && identityTone === "positive") {
    return [
      { text: "Identity is " },
      { text: "locked in", tone: "positive" },
      { text: ", execution is " },
      { text: executionTone === "positive" ? "steady" : "workable", tone: executionTone === "positive" ? "positive" : "neutral" },
      { text: ", but commercial pull remains " },
      { text: "limited", tone: "warning" },
      { text: "." },
    ];
  }

  if (identityTone === "warning" && commercialTone === "warning") {
    return [
      { text: "Identity still feels " },
      { text: "loose", tone: "warning" },
      { text: ", commercial pull is " },
      { text: "limited", tone: "warning" },
      { text: ", and execution is only " },
      { text: executionTone === "positive" ? "holding" : "partly workable", tone: executionTone === "positive" ? "positive" : "neutral" },
      { text: "." },
    ];
  }

  return [
    { text: "Identity feels " },
    { text: identityTone === "positive" ? "clear" : "mixed", tone: identityTone === "positive" ? "positive" : identityTone },
    { text: ", commercial pull looks " },
    { text: commercialTone === "positive" ? "strong" : commercialTone === "warning" ? "limited" : "viable", tone: commercialTone },
    { text: ", and execution is " },
    { text: executionTone === "positive" ? "steady" : "workable", tone: executionTone === "positive" ? "positive" : executionTone },
    { text: "." },
  ];
}

export function buildSpecPulseTelemetry(input: SpecPulseInsightInput): SpecPulseTelemetry {
  const identity = identityCue(input.identityStatus);
  const commercialPotential = commercialPotentialCue(input.commercialPotentialScore);
  const execution = executionCue(input.executionStatus, Boolean(input.executionPending));
  const saturation = saturationCue(input.marketSaturation);

  return {
    identity: { label: identity.value, tone: identity.tone },
    commercial_potential: commercialPotential,
    execution: { label: execution.value, tone: execution.tone },
    saturation,
  };
}

export function getSpecMarketSaturationSignal(options: {
  trendVelocity?: string | null;
  saturationScore?: number | null;
}): SpecMarketSaturationSignal {
  const signal: SharedMarketSignal = getSharedMarketSignal(options);

  return {
    state: signal.state,
    label: signal.label,
    support: signal.support,
    cue: signal.cue,
    tone: signal.variant === "green" ? "positive" : signal.variant === "amber" ? "neutral" : "warning",
    variant: signal.variant,
  };
}

export function buildSpecPulseInsight(input: SpecPulseInsightInput): PulseMicroInsight {
  const telemetry = buildSpecPulseTelemetry(input);

  return {
    headline: buildSpecHeadline(telemetry, input),
    cues: [
      {
        key: "identity",
        label: "Identity",
        value: telemetry.identity.label,
        tone: telemetry.identity.tone,
      },
      {
        key: "commercial-potential",
        label: "Commercial Potential",
        value: telemetry.commercial_potential.label,
        tone: telemetry.commercial_potential.tone,
      },
      {
        key: "execution",
        label: "Execution",
        value: telemetry.execution.label,
        tone: telemetry.execution.tone,
      },
    ],
  };
}
