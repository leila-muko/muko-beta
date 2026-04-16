"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

const sohne = "var(--font-sohne-breit), system-ui, sans-serif";
const inter = "var(--font-inter), system-ui, sans-serif";

// Strip variant pill colors — aligned to brand palette
const STRIP_PILL_COLORS = {
  green: { bg: "rgba(168,180,117,0.14)", color: "#A8B475", border: "rgba(168,180,117,0.30)" },
  amber: { bg: "rgba(184,135,107,0.14)", color: "#B8876B", border: "rgba(184,135,107,0.30)" },
  red: { bg: "rgba(169,123,143,0.14)", color: "#A97B8F", border: "rgba(169,123,143,0.30)" },
  gray: { bg: "rgba(67,67,43,0.06)", color: "rgba(67,67,43,0.45)", border: "rgba(67,67,43,0.12)" },
} as const;

function LockIcon({ size = 21, color = "rgba(67,67,43,0.72)" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden style={{ display: "block" }}>
      <rect x="5" y="11" width="14" height="10" rx="2" stroke={color} strokeWidth="1.6" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export interface PulseScoreRowProps {
  dimensionKey: string;
  label: string;
  icon: React.ReactNode;
  displayScore: string;
  numericPercent: number;
  scoreColor: string;
  pill: { variant: "green" | "amber" | "red" | "gray"; label: string } | null;
  subLabel?: string | null;
  whatItMeans: string;
  howCalculated: string;
  isPending: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  /** 'default' = full card with expand; 'strip' = slim bar-chart row */
  variant?: "default" | "strip";
  rowOpacity?: number;
  isChanged?: boolean;
}

export function PulseScoreRow({
  label,
  icon,
  displayScore,
  numericPercent,
  scoreColor,
  pill,
  subLabel,
  whatItMeans,
  howCalculated,
  isPending,
  isExpanded,
  onToggleExpand,
  variant = "default",
  rowOpacity = 1,
  isChanged = false,
}: PulseScoreRowProps) {
  const previousPercentRef = useRef(numericPercent);
  const [animatedPercent, setAnimatedPercent] = useState(numericPercent);
  const [highlightActive, setHighlightActive] = useState(false);

  useEffect(() => {
    const from = previousPercentRef.current;
    const to = numericPercent;
    previousPercentRef.current = to;
    let frameId = 0;

    if (from === to) {
      frameId = window.requestAnimationFrame(() => setAnimatedPercent(to));
      return () => window.cancelAnimationFrame(frameId);
    }

    const startedAt = performance.now();
    const duration = 360;
    const easeOut = (value: number) => 1 - Math.pow(1 - value, 3);

    const tick = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      setAnimatedPercent(from + (to - from) * easeOut(progress));
      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    frameId = window.requestAnimationFrame(tick);

    return () => window.cancelAnimationFrame(frameId);
  }, [numericPercent]);

  useEffect(() => {
    if (!isChanged) return;
    const frameId = window.requestAnimationFrame(() => setHighlightActive(true));
    const timeoutId = window.setTimeout(() => setHighlightActive(false), 900);
    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
    };
  }, [isChanged]);

  const animatedDisplayScore = useMemo(() => {
    if (isPending) return "—";
    const parsed = Number(displayScore);
    if (!Number.isFinite(parsed)) return displayScore;
    return String(Math.round(animatedPercent));
  }, [animatedPercent, displayScore, isPending]);
  const railPercent = Math.max(0, Math.min(100, animatedPercent));
  const rowTone = isPending ? "rgba(67,67,43,0.3)" : scoreColor;
  const railTrack = "rgba(67,67,43,0.12)";
  const railMarkerShadow = isPending ? "0 0 0 1px rgba(67,67,43,0.08)" : `0 0 0 3px ${scoreColor}20`;

  /* ── Strip variant ─────────────────────────────────────────────────────── */
  if (variant === "strip") {
    const stripPillStyle = pill ? STRIP_PILL_COLORS[pill.variant] : null;
    return (
      <div
        style={{
          paddingBottom: 14,
          marginBottom: 14,
          opacity: isPending ? 0.4 : 1,
          transition: "opacity 200ms ease",
        }}
      >
        {/* Header row: icon + label left · pill + score right */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 7,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                color: isPending ? "rgba(67,67,43,0.35)" : scoreColor,
                display: "flex",
                alignItems: "center",
                opacity: 0.85,
              }}
            >
              {icon}
            </span>
            <span
              style={{
                fontFamily: inter,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#A8A09A",
              }}
            >
              {label}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {pill && stripPillStyle && (
              <span
                style={{
                  fontFamily: inter,
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.05em",
                  color: stripPillStyle.color,
                  background: stripPillStyle.bg,
                  border: `1px solid ${stripPillStyle.border}`,
                  borderRadius: 999,
                  padding: "3px 9px",
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                }}
              >
                {pill.label}
              </span>
            )}
            <span
              style={{
                fontFamily: sohne,
                fontSize: 14,
                fontWeight: 700,
                color: isPending ? "rgba(67,67,43,0.30)" : scoreColor,
                minWidth: 24,
                textAlign: "right",
              }}
            >
              {animatedDisplayScore}
            </span>
          </div>
        </div>

        {/* Signal rail — keep behavior, soften the chart language */}
        <div
          style={{
            position: "relative",
            height: 14,
            marginBottom: subLabel ? 5 : 0,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: "50%",
              height: 1,
              background: railTrack,
              transform: "translateY(-50%)",
            }}
          />
          {!isPending ? (
            <div
              style={{
                position: "absolute",
                left: `calc(${railPercent}% - 4px)`,
                top: "50%",
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: scoreColor,
                boxShadow: railMarkerShadow,
                transform: "translateY(-50%)",
                transition: "left 500ms ease, background 300ms ease",
              }}
            />
          ) : (
            <div
              style={{
                position: "absolute",
                left: "calc(50% - 7px)",
                top: "50%",
                transform: "translateY(-50%)",
                color: "rgba(67,67,43,0.28)",
              }}
            >
              <LockIcon size={14} color="rgba(67,67,43,0.28)" />
            </div>
          )}
        </div>

        {/* Subtext */}
        {subLabel && (
          <div
            style={{
              fontFamily: inter,
              fontSize: 11,
              color: "rgba(67,67,43,0.42)",
              lineHeight: 1.45,
              marginTop: 3,
            }}
          >
            {subLabel}
          </div>
        )}
      </div>
    );
  }

  /* ── Default variant ───────────────────────────────────────────────────── */
  const canExpand = Boolean(onToggleExpand);

  return (
    <div
      style={{
        borderBottom: "1px solid rgba(226,221,214,0.7)",
        paddingBottom: 18,
        marginBottom: 18,
        opacity: rowOpacity,
        position: "relative",
        background: highlightActive ? "linear-gradient(90deg, rgba(168,180,117,0.035) 0%, rgba(168,180,117,0.08) 38%, rgba(168,180,117,0.02) 100%)" : "transparent",
        transition: "background 420ms ease",
      }}
    >
      {/* Top row: icon + label, rail, value + chevron */}
      <button
        onClick={onToggleExpand}
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          columnGap: 16,
          rowGap: 8,
          width: "100%",
          background: "none",
          border: "none",
          padding: 0,
          cursor: canExpand ? "pointer" : "default",
          marginBottom: 6,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: "0 1 auto" }}>
          <span style={{ color: rowTone, opacity: 0.92, display: "flex", alignItems: "center" }}>{icon}</span>
          <span
            style={{
              fontFamily: inter,
              fontWeight: 600,
              fontSize: 10,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "rgba(67,67,43,0.52)",
            }}
          >
            {label}
          </span>
        </div>
        <div
          aria-hidden
          style={{
            position: "relative",
            height: 16,
            minWidth: 84,
            flex: "1 1 140px",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: "50%",
              height: 1,
              background: railTrack,
              transform: "translateY(-50%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 0,
              top: "50%",
              width: isPending ? "100%" : `${railPercent}%`,
              height: 1,
              background: isPending ? "rgba(67,67,43,0.05)" : `${scoreColor}55`,
              transform: "translateY(-50%)",
              transition: "width 500ms ease, background 300ms ease",
            }}
          />
          {!isPending ? (
            <div
              style={{
                position: "absolute",
                left: `calc(${railPercent}% - 4px)`,
                top: "50%",
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: scoreColor,
                boxShadow: railMarkerShadow,
                transform: "translateY(-50%)",
                transition: "left 500ms ease, background 300ms ease",
              }}
            />
          ) : (
            <div
              style={{
                position: "absolute",
                left: "calc(50% - 7px)",
                top: "50%",
                color: "rgba(67,67,43,0.24)",
                transform: "translateY(-50%)",
              }}
            >
              <LockIcon size={14} color="rgba(67,67,43,0.24)" />
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto", flex: "0 0 auto" }}>
          <span
            style={{
              fontFamily: sohne,
              fontSize: 18,
              fontWeight: 500,
              letterSpacing: "-0.03em",
              color: isPending ? "rgba(67,67,43,0.38)" : scoreColor,
              lineHeight: 1,
              display: "flex",
              alignItems: "center",
              transition: "color 240ms ease",
              whiteSpace: "nowrap",
            }}
          >
            {isPending ? <LockIcon size={17} color="rgba(67,67,43,0.34)" /> : animatedDisplayScore}
          </span>
          {canExpand && (
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              style={{
                opacity: 0.35,
                transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 200ms ease",
              }}
            >
              <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      </button>

      {/* Sub label */}
      {subLabel && (
        <div
          style={{
            fontSize: 11.5,
            color: "rgba(67,67,43,0.48)",
            fontFamily: inter,
            lineHeight: 1.55,
            marginTop: 2,
            marginBottom: 0,
            maxWidth: 720,
          }}
        >
          {subLabel}
        </div>
      )}

      {/* Expanded detail panel */}
      {isExpanded && (
        <div
          style={{
            marginTop: 12,
            padding: "14px 16px",
            borderRadius: 12,
            background: "linear-gradient(180deg, rgba(255,255,255,0.65) 0%, rgba(248,245,239,0.6) 100%)",
            border: "1px solid rgba(67,67,43,0.06)",
            animation: "fadeIn 200ms ease-out",
          }}
        >
          <div style={{ marginBottom: 10 }}>
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "rgba(67,67,43,0.38)",
                fontFamily: sohne,
                marginBottom: 4,
              }}
            >
              What this means
            </div>
            <div style={{ fontSize: 11, lineHeight: 1.55, color: "rgba(67,67,43,0.65)", fontFamily: inter }}>
              {whatItMeans}
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "rgba(67,67,43,0.38)",
                fontFamily: sohne,
                marginBottom: 4,
              }}
            >
              How it&apos;s calculated
            </div>
            <div style={{ fontSize: 11, lineHeight: 1.55, color: "rgba(67,67,43,0.65)", fontFamily: inter }}>
              {howCalculated}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
