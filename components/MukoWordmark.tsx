"use client";

import React from "react";

const defaultSohne = "var(--font-sohne-breit), -ui-sans-serif, sans-serif";
const defaultInter = "var(--font-inter), -ui-sans-serif, sans-serif";

function withAlpha(hexColor: string, alpha: number) {
  if (!hexColor.startsWith("#")) return hexColor;

  let hex = hexColor.slice(1);
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((char) => char + char)
      .join("");
  }

  if (hex.length !== 6) return hexColor;

  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

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
            background: "transparent",
            border: `1px solid ${withAlpha(color, 0.5)}`,
            color: withAlpha(color, 0.5),
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
