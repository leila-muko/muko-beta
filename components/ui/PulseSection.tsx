"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { PulseMicroInsight as PulseMicroInsightView } from "@/components/ui/PulseMicroInsight";
import { PulseScoreRow, type PulseScoreRowProps } from "@/components/ui/PulseScoreRow";
import type { PulseMicroInsight } from "@/lib/pulse/microInsight";

const inter = "var(--font-inter), system-ui, sans-serif";
const RADAR_GREEN = "#A8B475";
const RADAR_ROSE = "#A97B8F";
const RADAR_NEUTRAL = "rgba(67,67,43,0.28)";

export type PulseSectionItem = Omit<PulseScoreRowProps, "isExpanded" | "onToggleExpand" | "variant" | "rowOpacity" | "isChanged">;

interface PulseSectionProps {
  items: PulseSectionItem[];
  collapsedInsight: PulseMicroInsight;
  initiallyExpanded?: boolean;
  summaryPrefix?: string;
  helperText?: string | null;
}

export function PulseSection({
  items,
  collapsedInsight,
  initiallyExpanded = false,
  summaryPrefix = "Pulse",
  helperText,
}: PulseSectionProps) {
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);
  const [trend, setTrend] = useState<"up" | "down" | "steady">("steady");
  const previousAggregateRef = useRef<number | null>(null);

  const liveScores = useMemo(
    () => items.filter((item) => !item.isPending && Number.isFinite(item.numericPercent)).map((item) => item.numericPercent),
    [items]
  );
  const aggregateScore = liveScores.length > 0
    ? liveScores.reduce((sum, score) => sum + score, 0) / liveScores.length
    : null;
  const itemsSignature = useMemo(
    () =>
      items
        .map((item) => `${item.dimensionKey}:${item.numericPercent}:${item.pill?.label ?? ""}:${item.subLabel ?? ""}:${item.isPending ? "pending" : "live"}`)
        .join("|"),
    [items]
  );

  useEffect(() => {
    const previousAggregate = previousAggregateRef.current;
    const nextTrend: "up" | "down" | "steady" =
      previousAggregate != null && aggregateScore != null
        ? aggregateScore - previousAggregate > 0.75
          ? "up"
          : aggregateScore - previousAggregate < -0.75
            ? "down"
            : "steady"
        : "steady";

    previousAggregateRef.current = aggregateScore;

    const frameId = window.requestAnimationFrame(() => {
      setTrend(nextTrend);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [aggregateScore, itemsSignature]);

  const radarTone =
    trend === "up" ? RADAR_GREEN : trend === "down" ? RADAR_ROSE : RADAR_NEUTRAL;
  const radarGlow =
    trend === "up"
      ? "rgba(168,180,117,0.22)"
      : trend === "down"
        ? "rgba(169,123,143,0.2)"
        : "rgba(67,67,43,0.1)";

  return (
    <section
      style={{
        paddingTop: 16,
        borderTop: "1px solid rgba(226,221,214,0.72)",
      }}
    >
      <button
        type="button"
        onClick={() => setIsExpanded((current) => !current)}
        aria-expanded={isExpanded}
        style={{
          width: "100%",
          border: "none",
          background: "transparent",
          padding: 0,
          cursor: "pointer",
          textAlign: "left",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontFamily: inter,
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "rgba(67,67,43,0.34)",
            marginBottom: 5,
            position: "relative",
            zIndex: 1,
          }}
        >
          <span>{summaryPrefix}</span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            style={{
              opacity: 0.45,
              transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 200ms ease",
            }}
          >
            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            position: "relative",
            zIndex: 1,
          }}
        >
          <span
            aria-hidden
            style={{
              position: "relative",
              width: 6,
              height: 6,
              borderRadius: "50%",
              flexShrink: 0,
              background: radarTone,
              boxShadow: `0 0 0 1px ${radarGlow}`,
              marginTop: 7,
              animation: "pulseRadarDot 2.2s ease-out infinite",
            }}
          >
            <span
              style={{
                position: "absolute",
                inset: -4,
                borderRadius: "50%",
                border: `1px solid ${radarGlow}`,
                animation: "pulseRadarRing 2.2s ease-out infinite",
              }}
            />
            <span
              style={{
                position: "absolute",
                inset: -8,
                borderRadius: "50%",
                border: `1px solid ${radarGlow}`,
                opacity: trend === "steady" ? 0.22 : 0.42,
                animation: "pulseRadarRingOuter 2.2s ease-out infinite",
              }}
              />
            </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <PulseMicroInsightView insight={collapsedInsight} />
          </div>
        </div>
      </button>

      {helperText && (
        <div
          style={{
            marginTop: 6,
            fontFamily: inter,
            fontSize: 10.5,
            lineHeight: 1.55,
            color: "rgba(67,67,43,0.38)",
          }}
        >
          {helperText}
        </div>
      )}

      {isExpanded && (
        <div
          style={{
            marginTop: 18,
            animation: "pulseExpandedFade 220ms ease-out",
          }}
        >
          {items.map((item) => (
            <PulseScoreRow
              key={`${item.dimensionKey}:${item.displayScore}:${item.pill?.label ?? ""}:${item.subLabel ?? ""}:${item.isPending ? "pending" : "live"}`}
              {...item}
            />
          ))}
        </div>
      )}

      <style>{`
        @keyframes pulseRadarDot {
          0%, 100% { transform: scale(1); opacity: 0.72; }
          50% { transform: scale(1.04); opacity: 0.88; }
        }
        @keyframes pulseRadarRing {
          0% { transform: scale(0.82); opacity: 0.38; }
          100% { transform: scale(1.55); opacity: 0; }
        }
        @keyframes pulseRadarRingOuter {
          0% { transform: scale(0.94); opacity: 0.2; }
          100% { transform: scale(1.7); opacity: 0; }
        }
        @keyframes pulseExpandedFade {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
}
