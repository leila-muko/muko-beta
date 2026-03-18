"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

interface MukoStreamingParagraphProps {
  paragraphs?: string[];
  text?: string;
  streamingText?: string;
  isStreaming?: boolean;
  containerStyle?: React.CSSProperties;
  contentStyle?: React.CSSProperties;
  paragraphStyle?: React.CSSProperties;
  paragraphSpacing?: number;
}

function splitWords(value: string): string[] {
  return value.trim().length > 0 ? value.trim().split(/\s+/) : [];
}

function MukoMark({ isStreaming = false }: { isStreaming?: boolean }) {
  return (
    <svg
      className={isStreaming ? "muko-logo--pulsing" : "muko-logo--done"}
      width="20"
      height="20"
      viewBox="0 0 91 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path
        d="M17.3786 49.2726C19.3659 49.2726 21.2355 48.4588 22.6408 46.9791L43.5889 24.9448C45.2695 23.1771 47.1974 21.7944 49.2385 20.8328C49.484 20.5342 49.7283 20.2356 49.9965 19.9535L53.2599 16.5209C49.0029 17.1539 44.8723 19.3712 41.5806 22.8336L20.634 44.8679C19.7637 45.783 18.6082 46.2863 17.3789 46.2863C14.841 46.2863 12.7755 44.1139 12.7755 41.4443V37.3277H9.93653V41.4443C9.93653 45.7606 13.2754 49.2725 17.3789 49.2725L17.3786 49.2726Z"
        fill="#4D302F"
      />
      <path
        d="M77.6601 79.5719C73.975 75.6958 67.9818 75.6958 64.2971 79.5719L58.1323 86.0564C56.8828 87.3707 55.2235 88.0932 53.4577 88.0932C49.8123 88.0932 46.847 84.9742 46.847 81.1397C46.847 79.2824 47.534 77.5354 48.7831 76.2231L70.5625 53.3144C75.4982 48.1228 77.3761 40.9204 76.2121 34.1907L82.9932 27.058C85.3155 24.6152 86.5931 21.3692 86.5931 17.917C86.5931 14.4648 85.3155 11.2189 82.9932 8.77601L82.5064 8.26399C80.1855 5.82278 77.0995 4.47899 73.8175 4.47899C70.5355 4.47899 67.4496 5.82278 65.1271 8.26559L52.0071 22.0659C49.5939 24.6042 48.2652 27.9786 48.2652 31.5676V37.9059L4.69212 88.1746C4.41532 88.4941 4.26213 88.9094 4.26213 89.3437C4.26213 90.3008 5.00174 91.0788 5.9117 91.0788C6.32484 91.0788 6.71934 90.9176 7.02308 90.6265L54.8146 44.7924H60.8404C64.2528 44.7924 67.4609 43.3948 69.8737 40.8565L73.6623 36.8715C73.9776 42.0184 72.2869 47.2771 68.5551 51.2021L46.7757 74.1108C44.9901 75.989 44.0077 78.484 44.0077 81.1387C44.0077 86.6199 48.2464 91.0784 53.4574 91.0784C55.9812 91.0784 58.3548 90.045 60.1392 88.1669L66.304 81.6824C68.8804 78.9724 73.0765 78.9724 75.653 81.6824L87.0091 93.6273L89.0162 91.5161L77.6601 79.5719ZM67.0551 14.2622C68.3143 12.9377 69.8983 12.1255 71.5153 11.9746C73.5934 11.7821 75.6248 12.5554 77.0898 14.0979L77.2927 14.3113C78.5519 15.6358 79.3241 17.3019 79.4675 19.0028C79.6506 21.1871 78.9154 23.3253 77.4489 24.8664L74.2793 28.2003C73.3338 26.2683 72.0988 24.4527 70.5617 22.8357C68.5561 20.7261 66.8639 18.976 63.9426 17.5367L67.0551 14.2622ZM67.7521 35.0654C66.3652 36.5242 64.5213 37.3274 62.5597 37.3274C58.5922 37.3274 55.3643 33.9321 55.3643 29.7589C55.3643 27.6953 56.1279 25.7558 57.5148 24.2972L61.7917 19.7986C64.882 21.0945 66.398 22.676 68.5556 24.9455C70.1085 26.5805 71.2923 28.4528 72.1455 30.4445L67.7521 35.0654Z"
        fill="#4D302F"
      />
    </svg>
  );
}

function MukoFooter({ isStreaming = false }: { isStreaming?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", marginTop: "1.25rem" }}>
      <MukoMark isStreaming={isStreaming} />
    </div>
  );
}

export function MukoStreamingParagraph({
  paragraphs,
  text,
  streamingText = "",
  isStreaming = false,
  containerStyle,
  contentStyle,
  paragraphStyle,
  paragraphSpacing = 12,
}: MukoStreamingParagraphProps) {
  const settledParagraphs = useMemo(() => {
    if (paragraphs && paragraphs.length > 0) {
      return paragraphs.filter(Boolean);
    }
    return text ? [text] : [];
  }, [paragraphs, text]);

  const prevWordCountRef = useRef(0);
  const [animateFromIndex, setAnimateFromIndex] = useState(0);
  const [showCursor, setShowCursor] = useState(false);

  useEffect(() => {
    const nextWordCount = splitWords(streamingText).length;

    if (!streamingText) {
      prevWordCountRef.current = 0;
      setAnimateFromIndex(0);
      return;
    }

    if (nextWordCount < prevWordCountRef.current) {
      prevWordCountRef.current = 0;
    }

    if (isStreaming && nextWordCount > prevWordCountRef.current) {
      setAnimateFromIndex(prevWordCountRef.current);
    }

    prevWordCountRef.current = nextWordCount;
  }, [isStreaming, streamingText]);

  useEffect(() => {
    if (isStreaming) {
      setShowCursor(true);
      return;
    }

    if (!showCursor) return;

    const timeoutId = window.setTimeout(() => {
      setShowCursor(false);
    }, 400);

    return () => window.clearTimeout(timeoutId);
  }, [isStreaming, showCursor]);

  const activeStreamingText = isStreaming
    ? streamingText
    : showCursor
      ? (streamingText || settledParagraphs.join(" "))
      : "";
  const streamingWords = splitWords(activeStreamingText);
  const hasStreamingContent = activeStreamingText.length > 0;

  if ((isStreaming && !hasStreamingContent) || (!hasStreamingContent && settledParagraphs.length === 0)) {
    return null;
  }

  return (
    <div style={containerStyle}>
      <style>{`@keyframes wordIn{from{opacity:0}to{opacity:1}}@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}@keyframes cursorFade{to{opacity:0}}`}</style>
      <div style={contentStyle}>
        {hasStreamingContent ? (
          <p style={{ margin: 0, ...paragraphStyle }}>
            {streamingWords.map((word, index) => (
              <span
                key={`${word}-${index}`}
                style={{
                  display: "inline",
                  ...(isStreaming && index >= animateFromIndex
                    ? { opacity: 0, animation: "wordIn 150ms ease forwards" }
                    : undefined),
                }}
              >
                {word}
                {index < streamingWords.length - 1 ? " " : ""}
              </span>
            ))}
            {showCursor && (
              <span
                style={{
                  width: 2,
                  height: "1em",
                  background: "#4D302F",
                  display: "inline-block",
                  verticalAlign: "text-bottom",
                  marginLeft: 2,
                  animation: isStreaming ? "blink 0.9s step-end infinite" : "cursorFade 0.4s ease forwards",
                }}
              />
            )}
          </p>
        ) : (
          settledParagraphs.map((paragraph, index) => (
            <p
              key={`${paragraph}-${index}`}
              style={{
                margin: index < settledParagraphs.length - 1 ? `0 0 ${paragraphSpacing}px` : 0,
                ...paragraphStyle,
              }}
            >
              {paragraph}
            </p>
          ))
        )}
        <MukoFooter isStreaming={isStreaming} />
      </div>
    </div>
  );
}
