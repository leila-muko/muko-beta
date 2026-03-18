"use client";

import React from "react";

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
}: PulseScoreRowProps) {
  const pillStyle = pill ? PILL_COLORS[pill.variant] : null;

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
              {isPending ? "—" : displayScore}
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
                width: `${numericPercent}%`,
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
  const scoreBg = isPending
    ? "rgba(67,67,43,0.04)"
    : `${scoreColor}14`; // hex alpha ~8%
  const canExpand = Boolean(onToggleExpand);

  return (
    <div style={{ borderBottom: "1px solid rgba(67,67,43,0.07)", paddingBottom: 14, marginBottom: 14, opacity: rowOpacity }}>
      {/* Top row: icon + label + pill ... score + chevron */}
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
          marginBottom: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: scoreColor, opacity: 0.9, display: "flex", alignItems: "center" }}>{icon}</span>
          <span
            style={{
              fontFamily: sohne,
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              color: "rgba(67,67,43,0.68)",
            }}
          >
            {label}
          </span>
          {pill && pillStyle && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                fontFamily: inter,
                color: pillStyle.color,
                background: pillStyle.bg,
                border: `1px solid ${pillStyle.border}`,
                borderRadius: 999,
                padding: "4px 12px",
              }}
            >
              {pill.label}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: sohne,
              fontSize: 21,
              fontWeight: 700,
              color: "rgba(67,67,43,0.72)",
              padding: "3px 10px",
              borderRadius: 8,
              background: scoreBg,
              lineHeight: 1.1,
              minHeight: 29,
              minWidth: 41,
              boxSizing: "border-box",
            }}
          >
            {isPending ? <LockIcon size={21} color="rgba(67,67,43,0.72)" /> : displayScore}
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

      {/* Progress bar */}
      <div style={{ height: 2, borderRadius: 1, background: "rgba(67,67,43,0.08)", marginBottom: subLabel ? 6 : 0 }}>
        <div
          style={{
            height: 2,
            borderRadius: 1,
            background: scoreColor,
            width: `${numericPercent}%`,
            transition: "width 500ms ease, background 300ms ease",
          }}
        />
      </div>

      {/* Sub label */}
      {subLabel && (
        <div style={{ fontSize: 10, color: "rgba(67,67,43,0.45)", fontFamily: inter, marginTop: 4 }}>
          {subLabel}
        </div>
      )}

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
