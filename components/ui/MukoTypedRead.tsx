"use client";

import React, { useEffect, useMemo, useState } from "react";

interface MukoTypedReadProps {
  headline: string;
  body?: string;
  containerStyle?: React.CSSProperties;
  headlineStyle?: React.CSSProperties;
  bodyContainerStyle?: React.CSSProperties;
  bodyStyle?: React.CSSProperties;
  cursorColor?: string;
  headlineCharDelayMs?: number;
  bodyCharDelayMs?: number;
  pauseBetweenSectionsMs?: number;
}

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);

    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);

    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  return prefersReducedMotion;
}

export function MukoTypedRead({
  headline,
  body,
  containerStyle,
  headlineStyle,
  bodyContainerStyle,
  bodyStyle,
  cursorColor = "#A8B475",
  headlineCharDelayMs = 18,
  bodyCharDelayMs = 12,
  pauseBetweenSectionsMs = 140,
}: MukoTypedReadProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const safeHeadline = useMemo(() => headline ?? "", [headline]);
  const safeBody = useMemo(() => body ?? "", [body]);
  const [headlineCount, setHeadlineCount] = useState(0);
  const [bodyCount, setBodyCount] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion || headlineCount >= safeHeadline.length) return;

    const currentChar = safeHeadline[headlineCount];
    const timeout = window.setTimeout(() => {
      setHeadlineCount((current) => Math.min(current + 1, safeHeadline.length));
    }, currentChar === " " ? 10 : headlineCharDelayMs);

    return () => window.clearTimeout(timeout);
  }, [headlineCharDelayMs, headlineCount, prefersReducedMotion, safeHeadline]);

  useEffect(() => {
    if (
      prefersReducedMotion ||
      !safeBody ||
      headlineCount < safeHeadline.length ||
      bodyCount >= safeBody.length
    ) {
      return;
    }

    const timeout = window.setTimeout(() => {
      const currentChar = safeBody[bodyCount];
      const nextDelay = currentChar === " " ? 8 : bodyCharDelayMs;
      setBodyCount((current) => Math.min(current + 1, safeBody.length));

      if (nextDelay !== bodyCharDelayMs) {
        // noop: keeps the rhythm close to the concept direction read for spaces
      }
    }, bodyCount === 0 ? pauseBetweenSectionsMs : safeBody[bodyCount] === " " ? 8 : bodyCharDelayMs);

    return () => window.clearTimeout(timeout);
  }, [
    bodyCharDelayMs,
    bodyCount,
    headlineCount,
    pauseBetweenSectionsMs,
    prefersReducedMotion,
    safeBody,
    safeHeadline.length,
  ]);

  const visibleHeadline = prefersReducedMotion ? safeHeadline : safeHeadline.slice(0, headlineCount);
  const visibleBody = prefersReducedMotion ? safeBody : safeBody.slice(0, bodyCount);
  const showHeadlineCursor = !prefersReducedMotion && headlineCount < safeHeadline.length;
  const showBodyCursor = !prefersReducedMotion && !showHeadlineCursor && safeBody.length > 0 && bodyCount < safeBody.length;

  return (
    <div style={containerStyle}>
      <div style={headlineStyle}>
        {visibleHeadline}
        {showHeadlineCursor ? (
          <span
            style={{
              display: "inline-block",
              width: 2,
              height: "1em",
              background: cursorColor,
              marginLeft: 2,
              verticalAlign: "text-bottom",
              animation: "mukoTypedReadCursorBlink 0.9s step-start infinite",
            }}
          />
        ) : null}
      </div>

      {safeBody ? (
        <div style={bodyContainerStyle}>
          <div style={bodyStyle}>
            {visibleBody}
            {showBodyCursor ? (
              <span
                style={{
                  display: "inline-block",
                  width: 2,
                  height: "1em",
                  background: cursorColor,
                  marginLeft: 2,
                  verticalAlign: "text-bottom",
                  animation: "mukoTypedReadCursorBlink 0.9s step-start infinite",
                }}
              />
            ) : null}
          </div>
        </div>
      ) : null}

      <style>{`@keyframes mukoTypedReadCursorBlink{0%,100%{opacity:1}50%{opacity:0}}`}</style>
    </div>
  );
}
