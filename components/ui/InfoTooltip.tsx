"use client";

import { useEffect, useId, useRef, useState } from "react";

const inter = "var(--font-inter), system-ui, sans-serif";
const STEEL = "#7D96AC";

export function InfoTooltip({ copy }: { copy: string }) {
  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const panelId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<{
    bottom: number;
    left?: number;
    right?: number;
    width: number;
  } | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const viewportWidth = window.innerWidth;
      const maxWidth = Math.min(320, viewportWidth - 32);
      const preferredLeft = rect.left;
      const overflowRight = preferredLeft + maxWidth > viewportWidth - 16;

      setPanelStyle({
        bottom: Math.max(window.innerHeight - rect.top + 10, 16),
        width: maxWidth,
        ...(overflowRight
          ? { right: Math.max(16, viewportWidth - rect.right), left: undefined }
          : { left: Math.max(16, preferredLeft), right: undefined }),
      });
    };

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen]);

  return (
    <span
      style={{
        position: "relative",
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "flex-start",
        verticalAlign: "middle",
      }}
    >
      <span
        ref={triggerRef}
        role="img"
        tabIndex={0}
        aria-label="More information"
        aria-describedby={isOpen ? panelId : undefined}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        style={{
          color: STEEL,
          cursor: "help",
          fontFamily: inter,
          fontSize: 12,
          lineHeight: 1,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          minWidth: 14,
          minHeight: 14,
          outline: "none",
        }}
      >
        <span aria-hidden>ⓘ</span>
      </span>

      {isOpen && panelStyle && (
        <span
          id={panelId}
          role="note"
          style={{
            position: "fixed",
            bottom: panelStyle.bottom,
            left: panelStyle.left,
            right: panelStyle.right,
            zIndex: 9999,
            width: panelStyle.width,
            maxWidth: "calc(100vw - 32px)",
            padding: "12px 14px",
            borderRadius: 14,
            border: "1px solid rgba(67,67,43,0.08)",
            background: "#FFFFFF",
            color: "#43432B",
            fontFamily: inter,
            fontSize: 11.5,
            lineHeight: 1.55,
            boxShadow: "0 12px 28px rgba(67,67,43,0.04)",
            whiteSpace: "normal",
            pointerEvents: "none",
          }}
        >
          {copy}
        </span>
      )}
    </span>
  );
}
