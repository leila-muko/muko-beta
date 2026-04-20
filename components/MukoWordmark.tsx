"use client";

import React from "react";

const defaultSohne = "var(--font-sohne-breit), -ui-sans-serif, sans-serif";
const defaultInter = "var(--font-inter), -ui-sans-serif, sans-serif";

interface MukoWordmarkProps {
  onClick?: () => void;
  ariaLabel?: string;
  color?: string;
  fontSize?: number;
  gap?: number;
  marginBottom?: number;
  includeBetaChip?: boolean;
  style?: React.CSSProperties;
}

export function MukoWordmark({
  onClick,
  ariaLabel = "Go to entry page",
  color = "#43432B",
  fontSize = 18,
  gap = 6,
  marginBottom,
  includeBetaChip = true,
  style,
}: MukoWordmarkProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      style={{
        display: "inline-flex",
        alignItems: "flex-start",
        gap,
        fontFamily: defaultSohne,
        fontWeight: 700,
        fontSize,
        letterSpacing: "-0.02em",
        color,
        padding: 0,
        border: "none",
        background: "transparent",
        cursor: "pointer",
        width: "fit-content",
        marginBottom,
        ...style,
      }}
    >
      <span>muko</span>
      {includeBetaChip ? (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 16,
            padding: "1px 6px",
            borderRadius: 999,
            background: "rgba(60, 60, 60, 0.08)",
            border: "1px solid rgba(60, 60, 60, 0.14)",
            color: "rgba(67,67,43,0.62)",
            fontFamily: defaultInter,
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.12em",
            lineHeight: 1,
            textTransform: "uppercase",
            flexShrink: 0,
          }}
        >
          beta
        </span>
      ) : null}
    </button>
  );
}
