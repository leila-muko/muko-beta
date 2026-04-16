"use client";

import React from "react";
import type {
  PulseCueTone,
  PulseMicroInsight,
} from "@/lib/pulse/microInsight";

const sohne = "var(--font-sohne-breit), system-ui, sans-serif";

const TONE_STYLES: Record<PulseCueTone, { color: string; weight: number }> = {
  positive: { color: "#7D8D4E", weight: 500 },
  warning: { color: "#9D6E58", weight: 500 },
  neutral: { color: "rgba(67,67,43,0.62)", weight: 500 },
  muted: { color: "rgba(67,67,43,0.4)", weight: 400 },
};

const CUE_COLORS: Record<PulseCueTone, string> = {
  positive: "#7D8D4E",
  warning: "#A16F5A",
  neutral: "rgba(67,67,43,0.62)",
  muted: "rgba(67,67,43,0.46)",
};

interface PulseMicroInsightProps {
  insight: PulseMicroInsight;
}

export function PulseMicroInsight({ insight }: PulseMicroInsightProps) {
  return (
    <div
      style={{
        display: "grid",
        gap: 12,
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontFamily: sohne,
          fontSize: "clamp(14px, 1.8vw, 18px)",
          lineHeight: 1.34,
          letterSpacing: "-0.018em",
          color: "rgba(67,67,43,0.68)",
          maxWidth: 640,
        }}
      >
        {insight.headline.map((part, index) => {
          const tone = part.tone ? TONE_STYLES[part.tone] : TONE_STYLES.neutral;
          return (
            <span
              key={`${part.text}-${index}`}
              style={{
                color: tone.color,
                fontWeight: tone.weight,
              }}
            >
              {part.text}
            </span>
          );
        })}
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 8,
          fontFamily: "var(--font-inter), system-ui, sans-serif",
          fontSize: 10,
          lineHeight: 1.4,
          color: "rgba(67,67,43,0.34)",
        }}
      >
        {insight.cues.map((cue, index) => (
          <React.Fragment key={cue.key}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                whiteSpace: "nowrap",
                padding: "0 0 0 0",
              }}
            >
              {index > 0 ? (
                <span
                  aria-hidden
                  style={{
                    color: "rgba(67,67,43,0.16)",
                    marginRight: 4,
                  }}
                >
                  ·
                </span>
              ) : null}
              <span style={{ color: "rgba(67,67,43,0.3)", letterSpacing: "0.08em", textTransform: "uppercase", fontSize: 9 }}>
                {cue.label}
              </span>
              <span
                style={{
                  color: CUE_COLORS[cue.tone],
                  fontWeight: 500,
                  letterSpacing: "0.01em",
                }}
              >
                {cue.value}
              </span>
            </span>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
