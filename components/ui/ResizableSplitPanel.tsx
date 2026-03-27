"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";

interface ResizableSplitPanelProps {
  defaultLeftPercent: number;
  minLeftPercent?: number;
  maxLeftPercent?: number;
  storageKey: string;
  leftContent: React.ReactNode;
  rightContent: React.ReactNode;
  topOffset?: number;
  className?: string;
}

function getInitialLeftPercent(
  storageKey: string,
  defaultLeftPercent: number,
  minLeftPercent: number,
  maxLeftPercent: number
) {
  if (typeof window === "undefined") return defaultLeftPercent;

  try {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return defaultLeftPercent;
    const value = parseFloat(stored);
    if (!isNaN(value) && value >= minLeftPercent && value <= maxLeftPercent) {
      return value;
    }
  } catch {}

  return defaultLeftPercent;
}

export function ResizableSplitPanel({
  defaultLeftPercent,
  minLeftPercent = 35,
  maxLeftPercent = 75,
  storageKey,
  leftContent,
  rightContent,
  topOffset = 72,
  className,
}: ResizableSplitPanelProps) {
  const [leftPercent, setLeftPercent] = useState(() =>
    getInitialLeftPercent(storageKey, defaultLeftPercent, minLeftPercent, maxLeftPercent)
  );
  const [isMobile, setIsMobile] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  // Listen for mobile breakpoint
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 768px)");
    const handler = (e: MediaQueryListEvent | MediaQueryList) => setIsMobile(e.matches);
    handler(mql);
    mql.addEventListener("change", handler as (e: MediaQueryListEvent) => void);
    return () => mql.removeEventListener("change", handler as (e: MediaQueryListEvent) => void);
  }, []);

  const clamp = useCallback(
    (val: number) => Math.max(minLeftPercent, Math.min(maxLeftPercent, val)),
    [minLeftPercent, maxLeftPercent]
  );

  const handleMove = useCallback(
    (clientX: number) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((clientX - rect.left) / rect.width) * 100;
      setLeftPercent(clamp(pct));
    },
    [clamp]
  );

  const handleEnd = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    document.body.classList.remove("panel-resizing");
    // Persist
    setLeftPercent((current) => {
      try {
        window.localStorage.setItem(storageKey, String(current));
      } catch {}
      return current;
    });
  }, [storageKey]);

  // Attach global listeners for drag
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const onMouseUp = () => handleEnd();
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) handleMove(e.touches[0].clientX);
    };
    const onTouchEnd = () => handleEnd();

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", onTouchEnd);

    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [handleMove, handleEnd]);

  const startDrag = useCallback(() => {
    isDragging.current = true;
    document.body.classList.add("panel-resizing");
  }, []);

  const handleDoubleClick = useCallback(() => {
    setLeftPercent(defaultLeftPercent);
    try {
      window.localStorage.setItem(storageKey, String(defaultLeftPercent));
    } catch {}
  }, [defaultLeftPercent, storageKey]);

  // Mobile: stack vertically
  if (isMobile) {
    return (
      <div
        className={className}
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          paddingTop: topOffset,
          overflow: "auto",
          height: `calc(100vh - ${topOffset}px)`,
        }}
      >
        <div style={{ minHeight: 0 }}>{leftContent}</div>
        <div style={{ minHeight: 0 }}>{rightContent}</div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        display: "flex",
        flex: 1,
        paddingTop: topOffset,
        overflow: "hidden",
        height: `calc(100vh - ${topOffset}px)`,
        position: "relative",
      }}
    >
      {/* Left panel */}
      <div
        style={{
          width: `${leftPercent}%`,
          height: "100%",
          overflowY: "auto",
          overflowX: "hidden",
          minWidth: 0,
        }}
      >
        {leftContent}
      </div>

      {/* Divider */}
      <div
        style={{
          width: 8,
          flexShrink: 0,
          cursor: "col-resize",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          zIndex: 10,
          userSelect: "none",
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          startDrag();
        }}
        onTouchStart={(e) => {
          e.preventDefault();
          startDrag();
        }}
        onDoubleClick={handleDoubleClick}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {/* Thin line */}
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: 1,
            background: isHovering ? "rgba(67,67,43,0.25)" : "rgba(67,67,43,0.10)",
            transition: "background 150ms ease",
          }}
        />
        {/* Grip dots */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 3,
            opacity: isHovering ? 0.5 : 0,
            transition: "opacity 150ms ease",
            position: "relative",
            zIndex: 1,
          }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: 3,
                height: 3,
                borderRadius: "50%",
                background: "rgba(67,67,43,0.45)",
              }}
            />
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div
        style={{
          flex: 1,
          height: "100%",
          minHeight: 0,
          overflow: "hidden",
          minWidth: 0,
          borderLeft: "none",
          background: "rgba(250,249,246,0.60)",
        }}
      >
        {rightContent}
      </div>
    </div>
  );
}
