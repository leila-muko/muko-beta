"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

const sohne = "var(--font-sohne-breit), system-ui, sans-serif";
const inter = "var(--font-inter), system-ui, sans-serif";

// Default pill colors (default variant — spec page etc.)
const PILL_COLORS = {
  green: { bg: "rgba(168,180,117,0.14)", color: "#A8B475", border: "rgba(168,180,117,0.30)" },
  amber: { bg: "rgba(184,135,107,0.14)", color: "#B8876B", border: "rgba(184,135,107,0.30)" },
  red: { bg: "rgba(169,123,143,0.14)", color: "#A97B8F", border: "rgba(169,123,143,0.30)" },
  gray: { bg: "rgba(67,67,43,0.06)", color: "rgba(67,67,43,0.45)", border: "rgba(67,67,43,0.12)" },
} as const;

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
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  color: stripPillStyle.color,
                  background: stripPillStyle.bg,
                  border: `1px solid ${stripPillStyle.border}`,
                  borderRadius: 999,
                  padding: "2px 9px",
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

        {/* Progress bar — no fill when pending (locked Execution) */}
        <div
          style={{
            height: 3,
            borderRadius: 2,
            background: "rgba(67,67,43,0.08)",
            marginBottom: subLabel ? 5 : 0,
          }}
        >
          {!isPending && (
            <div
              style={{
                height: 3,
                borderRadius: 2,
                background: scoreColor,
                width: `${animatedPercent}%`,
                transition: "width 500ms ease, background 300ms ease",
              }}
            />
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
        borderBottom: "1px solid #E2DDD6",
        paddingBottom: 16,
        marginBottom: 16,
        opacity: rowOpacity,
        position: "relative",
        background: highlightActive ? "linear-gradient(90deg, rgba(168,180,117,0.05) 0%, rgba(168,180,117,0.12) 38%, rgba(168,180,117,0.04) 100%)" : "transparent",
        transition: "background 420ms ease",
      }}
    >
      {/* Top row: icon + label ... score + chevron */}
      <button
        onClick={onToggleExpand}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          background: "none",
          border: "none",
          padding: 0,
          cursor: canExpand ? "pointer" : "default",
          marginBottom: 3,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: scoreColor, opacity: 0.9, display: "flex", alignItems: "center" }}>{icon}</span>
          <span
            style={{
              fontFamily: inter,
              fontWeight: 600,
              fontSize: 11,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#191919",
            }}
          >
            {label}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontFamily: inter,
              fontSize: 28,
              fontWeight: 700,
              color: isPending ? "rgba(67,67,43,0.30)" : scoreColor,
              lineHeight: 1,
              display: "flex",
              alignItems: "center",
              transition: "color 240ms ease",
            }}
          >
            {isPending ? <LockIcon size={20} color="rgba(67,67,43,0.30)" /> : animatedDisplayScore}
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
        <div style={{ fontSize: 11, color: "#888078", fontFamily: inter, marginTop: 3, marginBottom: 6 }}>
          {subLabel}
        </div>
      )}

      {/* Progress bar */}
      <div style={{ height: 3, borderRadius: 2, background: "#E2DDD6", marginTop: subLabel ? 0 : 6 }}>
        <div
          style={{
            height: 3,
            borderRadius: 2,
            background: isPending ? "transparent" : scoreColor,
            width: `${animatedPercent}%`,
            transition: "width 500ms ease, background 300ms ease",
          }}
        />
      </div>

      {/* Expanded detail panel */}
      {isExpanded && (
        <div
          style={{
            marginTop: 10,
            padding: "12px 14px",
            borderRadius: 8,
            background: "rgba(67,67,43,0.03)",
            border: "1px solid rgba(67,67,43,0.07)",
            animation: "fadeIn 200ms ease-out",
          }}
        >
          <div style={{ marginBottom: 10 }}>
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.10em",
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
                letterSpacing: "0.10em",
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
