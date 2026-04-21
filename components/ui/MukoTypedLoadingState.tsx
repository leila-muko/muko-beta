"use client";

import React, { useEffect, useMemo, useState } from "react";
import { MukoStreamingParagraph } from "@/components/ui/MukoStreamingParagraph";

interface MukoTypedLoadingStateProps {
  headline: string;
  body?: string;
  headlineStyle?: React.CSSProperties;
  bodyStyle?: React.CSSProperties;
  containerStyle?: React.CSSProperties;
  bodyContainerStyle?: React.CSSProperties;
  wordDelayMs?: number;
  showFooter?: boolean;
}

function revealWords(text: string, count: number) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.slice(0, count).join(" ");
}

export function MukoTypedLoadingState({
  headline,
  body,
  headlineStyle,
  bodyStyle,
  containerStyle,
  bodyContainerStyle,
  wordDelayMs = 90,
  showFooter = true,
}: MukoTypedLoadingStateProps) {
  const headlineWords = useMemo(() => headline.trim().split(/\s+/).filter(Boolean), [headline]);
  const bodyWords = useMemo(() => (body ? body.trim().split(/\s+/).filter(Boolean) : []), [body]);
  const [headlineCount, setHeadlineCount] = useState(0);
  const [bodyCount, setBodyCount] = useState(0);

  useEffect(() => {
    if (headlineWords.length === 0 || headlineCount >= headlineWords.length) return;

    const timeout = window.setTimeout(() => {
      setHeadlineCount((current) => Math.min(current + 1, headlineWords.length));
    }, wordDelayMs);

    return () => window.clearTimeout(timeout);
  }, [headlineCount, headlineWords.length, wordDelayMs]);

  useEffect(() => {
    if (!bodyWords.length || headlineCount < headlineWords.length || bodyCount >= bodyWords.length) return;

    const timeout = window.setTimeout(() => {
      setBodyCount((current) => Math.min(current + 1, bodyWords.length));
    }, wordDelayMs);

    return () => window.clearTimeout(timeout);
  }, [bodyCount, bodyWords.length, headlineCount, headlineWords.length, wordDelayMs]);

  const visibleHeadline = revealWords(headline, headlineCount);
  const visibleBody = revealWords(body ?? "", bodyCount);
  const headlineStreaming = headlineCount < headlineWords.length;
  const bodyStreaming = bodyWords.length > 0 && bodyCount < bodyWords.length;

  return (
    <div style={containerStyle}>
      <div style={headlineStyle}>
        {visibleHeadline}
        {headlineStreaming ? (
          <span
            style={{
              display: "inline-block",
              width: 2,
              height: "1em",
              background: "#A8B475",
              marginLeft: 2,
              verticalAlign: "text-bottom",
              animation: "mukoCursorBlink 0.9s step-start infinite",
            }}
          />
        ) : null}
      </div>
      {body ? (
        <div style={bodyContainerStyle}>
          <MukoStreamingParagraph
            text={body}
            streamingText={visibleBody}
            isStreaming={bodyStreaming}
            showFooter={showFooter}
            paragraphStyle={bodyStyle}
            paragraphSpacing={12}
          />
        </div>
      ) : null}
      <style>{`@keyframes mukoCursorBlink{0%,100%{opacity:1}50%{opacity:0}}`}</style>
    </div>
  );
}
