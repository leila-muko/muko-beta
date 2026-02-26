"use client";
import React, { useState, useRef, useEffect } from "react";

/* ─── Types ─── */
type DotMode = "rest" | "hover" | "active";

interface Message {
  role: "user" | "muko";
  content: string;
}

export interface FloatingMukoDotProps {
  step: "concept" | "spec";
  context?: Record<string, unknown>;
  /** Short label shown in the panel footer, e.g. "Refined Clarity" */
  contextLabel?: string;
}

/* ─── Mock responses (same source of truth as AskMuko.tsx — replace with
       Claude API in Weeks 5-6, passing `context` as system prompt) ─── */
const MOCK_RESPONSES: Record<string, string> = {
  "Why is Resonance at this level?":
    "Resonance reflects current market saturation for this aesthetic direction. There\u2019s healthy consumer interest \u2014 you\u2019re not first to market, but not late either. Refining with \u2018minimal\u2019 or \u2018structured\u2019 chips helps carve out whitespace within the trend.",
  "How does this compare to other directions?":
    "Refined Clarity scores higher on Identity (88 vs 81) because it maps more directly to a minimalist, editorial DNA. If brand alignment matters more than trend novelty, that direction gives you a stronger foundation with less risk of feeling off-brand at retail.",
  "What brands are doing this well?":
    "The Row and Tot\u00eame have executed similar territories with strong commercial results, leaning on fabric quality over design complexity. Cos has moved in at a more accessible price point, which could signal growing saturation at the contemporary tier.",
  "Why is COGS $2 over ceiling?":
    "Your COGS exceeds the ceiling by a small amount, driven by silhouette yardage rather than fiber cost. Switching to a straight silhouette or dropping complexity to Moderate brings you under ceiling.",
  "What happens if I keep Cocoon?":
    "Keeping Cocoon means slightly below your margin target. On a 500-unit run, that\u2019s roughly $1,000 in margin compression. The question is whether the silhouette is essential to the story or whether Straight carries the same weight with less fabric.",
  "Is Modal the right choice here?":
    "Modal gives excellent drape for this direction. Tencel at a lower price offers similar properties with better sustainability. Silk Blend doubles cost but elevates perceived value significantly.",
};

function getMockResponse(question: string): string {
  if (MOCK_RESPONSES[question]) return MOCK_RESPONSES[question];
  const lower = question.toLowerCase();
  for (const [key, val] of Object.entries(MOCK_RESPONSES)) {
    if (lower.includes(key.toLowerCase().slice(0, 20))) return val;
  }
  return "Great question. When fully wired, Muko will use your session context \u2014 brand DNA, scores, material choices, and market data \u2014 for a specific answer.";
}

/* ─── Component ─── */
export default function FloatingMukoDot({
  step,
  context,
  contextLabel = "this direction",
}: FloatingMukoDotProps) {
  const [mode, setMode] = useState<DotMode>("rest");
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  const wrapperRef   = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLInputElement>(null);
  const messagesEnd  = useRef<HTMLDivElement>(null);

  /* ─── Escape key → rest ─── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMode("rest"); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  /* ─── Click outside panel → rest ─── */
  useEffect(() => {
    if (mode !== "active") return;
    const onDown = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setMode("rest");
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [mode]);

  /* ─── Focus input when panel opens ─── */
  useEffect(() => {
    if (mode === "active") {
      const t = setTimeout(() => inputRef.current?.focus(), 200);
      return () => clearTimeout(t);
    }
  }, [mode]);

  /* ─── Scroll to latest message ─── */
  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  /* ─── Reset on step change ─── */
  useEffect(() => {
    setMessages([]);
    setMode("rest");
    setInputValue("");
  }, [step]);

  /* ─── Send handler ─── */
  // TODO Week 5-6: Replace mock with Claude API call, pass `context` as system prompt.
  const handleSend = (text: string) => {
    if (!text.trim() || isTyping) return;
    setMessages(prev => [...prev, { role: "user", content: text.trim() }]);
    setInputValue("");
    setIsTyping(true);
    setTimeout(() => {
      setMessages(prev => [...prev, { role: "muko", content: getMockResponse(text.trim()) }]);
      setIsTyping(false);
    }, 800 + Math.random() * 600);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(inputValue); }
  };

  /* ─── Dot interaction helpers ─── */
  const onDotEnter = () => { if (mode === "rest") setMode("hover"); };
  const onDotLeave = () => { if (mode === "hover") setMode("rest"); };
  const onDotClick = () => setMode(prev => prev === "active" ? "rest" : "active");

  const isActive = mode === "active";
  const isHover  = mode === "hover";

  /* ─── Fonts / colours ─── */
  const inter     = "var(--font-inter), system-ui, sans-serif";
  const sohne     = "var(--font-sohne-breit), system-ui, sans-serif";
  const ROSE      = "#A97B8F";
  const NEAR_BLACK = "#191919";

  return (
    <>
      {/* ══════════════════════════════════════════════════════════════
          Fixed wrapper — both panel and dot live here so click-outside
          logic can use a single ref
      ══════════════════════════════════════════════════════════════ */}
      <div
        ref={wrapperRef}
        style={{
          position: "fixed",
          bottom: 28,
          right: 28,
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 10,
          // No pointer-events on the wrapper itself — children handle their own
        }}
      >

        {/* ─── Compact input panel (ACTIVE state) ─── */}
        {isActive && (
          <div
            style={{
              width: 320,
              background: "#fff",
              border: "1px solid rgba(200,194,182,0.5)",
              borderRadius: 12,
              boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
              overflow: "hidden",
              animation: "fdPanelIn 200ms ease-out both",
            }}
          >
            {/* Header */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 14px 10px",
              borderBottom: "1px solid rgba(200,194,182,0.22)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                {/* Rose dot with ping */}
                <span style={{ position: "relative", width: 6, height: 6, flexShrink: 0 }}>
                  <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: ROSE, animation: "fdPing 2.4s ease-out infinite" }} />
                  <span style={{ position: "relative", display: "block", width: 6, height: 6, borderRadius: "50%", background: ROSE }} />
                </span>
                <span style={{ fontFamily: inter, fontSize: 12, color: "#8a8478", fontWeight: 500 }}>
                  Ask Muko
                </span>
              </div>
              <button
                onClick={() => setMode("rest")}
                aria-label="Close"
                style={{
                  width: 22, height: 22,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#c8c0b4",
                  borderRadius: 4,
                  transition: "color 130ms ease",
                  padding: 0,
                }}
                onMouseEnter={e => { e.currentTarget.style.color = NEAR_BLACK; }}
                onMouseLeave={e => { e.currentTarget.style.color = "#c8c0b4"; }}
              >
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                  <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* Messages (fade in as conversation grows) */}
            {(messages.length > 0 || isTyping) && (
              <div style={{
                maxHeight: 200,
                overflowY: "auto",
                padding: "12px 14px 0",
                display: "flex",
                flexDirection: "column",
                gap: 10,
                scrollbarWidth: "thin",
                scrollbarColor: "rgba(0,0,0,0.06) transparent",
              }}>
                {messages.map((msg, i) => (
                  <div key={i} style={{ animation: "fdPanelIn 220ms ease-out both" }}>
                    {msg.role === "user" ? (
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <div style={{
                          maxWidth: "85%",
                          padding: "7px 11px",
                          borderRadius: "9px 9px 3px 9px",
                          background: "rgba(67,67,43,0.04)",
                          border: "1px solid rgba(67,67,43,0.07)",
                          fontSize: 12,
                          lineHeight: 1.5,
                          color: "#2d2b28",
                          fontFamily: inter,
                        }}>
                          {msg.content}
                        </div>
                      </div>
                    ) : (
                      <div style={{ paddingLeft: 10, borderLeft: "2px solid rgba(169,123,143,0.28)" }}>
                        <div style={{
                          fontFamily: sohne,
                          fontSize: 9,
                          fontWeight: 500,
                          letterSpacing: "0.06em",
                          color: ROSE,
                          marginBottom: 4,
                          textTransform: "uppercase" as const,
                        }}>
                          Muko
                        </div>
                        <div style={{ fontSize: 12, lineHeight: 1.65, color: "#2d2b28", fontFamily: inter }}>
                          {msg.content}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {isTyping && (
                  <div style={{ paddingLeft: 10, borderLeft: "2px solid rgba(169,123,143,0.28)", paddingBottom: 4 }}>
                    <div style={{ fontFamily: sohne, fontSize: 9, fontWeight: 500, letterSpacing: "0.06em", color: ROSE, marginBottom: 5, textTransform: "uppercase" as const }}>
                      Muko
                    </div>
                    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      {[0, 1, 2].map(d => (
                        <span key={d} style={{
                          width: 4, height: 4, borderRadius: "50%",
                          background: "rgba(169,123,143,0.45)",
                          animation: `fdDotPulse 1.2s ease-in-out ${d * 0.15}s infinite`,
                        }} />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={messagesEnd} />
              </div>
            )}

            {/* Text input */}
            <div style={{ padding: "12px 14px 0" }}>
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about this direction..."
                disabled={isTyping}
                style={{
                  width: "100%",
                  boxSizing: "border-box" as const,
                  border: "none",
                  outline: "none",
                  fontSize: 13,
                  color: "#2d2b28",
                  fontFamily: inter,
                  padding: "2px 0",
                  background: "transparent",
                  opacity: isTyping ? 0.5 : 1,
                }}
              />
            </div>

            {/* Bottom row: context label + send button */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 14px 12px",
            }}>
              <span style={{
                fontFamily: inter,
                fontSize: 11,
                fontStyle: "italic",
                color: "#b0a898",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap" as const,
                maxWidth: 190,
              }}>
                Context: {contextLabel}
              </span>
              <button
                onClick={() => handleSend(inputValue)}
                disabled={!inputValue.trim() || isTyping}
                aria-label="Send"
                style={{
                  border: "none",
                  background: inputValue.trim() && !isTyping ? NEAR_BLACK : "rgba(25,25,25,0.12)",
                  color: "#fff",
                  borderRadius: 6,
                  padding: "6px 10px",
                  cursor: !inputValue.trim() || isTyping ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "background 150ms ease",
                }}
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                  <path d="M3.5 8H12.5M12.5 8L8.5 4M12.5 8L8.5 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* ─── Dot / Pill trigger (REST + HOVER + ACTIVE states) ─── */}
        <div
          role="button"
          aria-label="Ask Muko"
          onMouseEnter={onDotEnter}
          onMouseLeave={onDotLeave}
          onClick={onDotClick}
          style={{
            height: 36,
            width: isHover ? 130 : 36,
            borderRadius: 18,
            background: NEAR_BLACK,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: isHover ? "flex-start" : "center",
            padding: isHover ? "0 14px 0 11px" : "0",
            gap: isHover ? 8 : 0,
            transition: "width 0.2s ease, padding 0.2s ease, justify-content 0s",
            overflow: "hidden",
            userSelect: "none" as const,
            // Subtle glow when active
            boxShadow: isActive ? "0 0 0 2px rgba(169,123,143,0.35)" : "none",
          }}
        >
          {/* Rose indicator dot */}
          <span style={{ position: "relative", width: 7, height: 7, flexShrink: 0 }}>
            <span style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background: ROSE,
              animation: "fdPing 2.4s ease-out infinite",
            }} />
            <span style={{
              position: "relative",
              display: "block",
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: ROSE,
            }} />
          </span>

          {/* "Ask Muko" label — fades in on hover, stays visible when active */}
          <span style={{
            fontFamily: inter,
            fontSize: 12,
            color: "#fff",
            fontWeight: 500,
            letterSpacing: "0.02em",
            opacity: isHover ? 1 : 0,
            transition: "opacity 0.15s ease 0.05s",
            whiteSpace: "nowrap" as const,
            pointerEvents: "none",
          }}>
            Ask Muko
          </span>
        </div>

      </div>

      <style>{`
        @keyframes fdPing {
          0%   { transform: scale(1);   opacity: 0.5; }
          60%  { transform: scale(2.4); opacity: 0;   }
          100% { transform: scale(2.4); opacity: 0;   }
        }
        @keyframes fdPanelIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        @keyframes fdDotPulse {
          0%, 100% { opacity: 0.3; transform: scale(1);   }
          50%      { opacity: 0.9; transform: scale(1.4); }
        }
      `}</style>
    </>
  );
}
