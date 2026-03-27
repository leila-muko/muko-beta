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

function summaryLabel(label: string, value: string): string {
  return `${label} ${value}`;
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
    headline: [
      {
        text: [
          summaryLabel("Identity", telemetry.identity.label),
          summaryLabel("Commercial", telemetry.commercial_potential.label),
          summaryLabel("Execution", telemetry.execution.label),
          summaryLabel("Saturation", telemetry.saturation.label),
        ].join(" • "),
        tone: "neutral",
      },
    ],
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
        key: "market-saturation",
        label: "Market Saturation",
        value: telemetry.saturation.label,
        tone: telemetry.saturation.tone,
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
