"use client";
import React, { useState, useRef, useEffect } from "react";

/* ═══════════════════════════════════════════════════════════════
   FloatingMukoOrb — Living thinking orb for Concept, Spec & Report
   Four states: rest → hover → active ↔ thinking
   ═══════════════════════════════════════════════════════════════ */

type OrbState = "rest" | "hover" | "active" | "thinking";

interface Message {
  role: "user" | "muko";
  content: string;
}

export interface FloatingMukoOrbProps {
  step: "concept" | "spec" | "report";
  context?: Record<string, unknown>;
  conceptName?: string;
  identityScore?: number;
  resonanceScore?: number;
}

/* ─── Mock responses (TODO Week 5-6: replace with Claude API,
       pass `context` as system prompt) ─── */
const MOCK_RESPONSES: Record<string, string> = {
  "Why is Resonance at this level?":
    "Resonance reflects current market saturation for this aesthetic direction. There\u2019s healthy consumer interest \u2014 you\u2019re not first to market, but not late either. Refining with \u2018minimal\u2019 or \u2018structured\u2019 chips helps carve out whitespace within the trend.",
  "How does this compare to other directions?":
    "Refined Clarity scores higher on Identity (88 vs 81) because it maps more directly to a minimalist, editorial DNA. If brand alignment matters more than trend novelty, that direction gives you a stronger foundation with less risk of feeling off-brand at retail.",
  "What brands are doing this well?":
    "The Row and Tot\u00eame have executed similar territories with strong commercial results, leaning on fabric quality over design complexity. Cos has moved in at a more accessible price point, which could signal growing saturation at the contemporary tier.",
  "Why is COGS over ceiling?":
    "Your COGS exceeds the ceiling, driven by silhouette yardage rather than fiber cost. Switching to a straight silhouette or dropping complexity to Moderate brings you under ceiling.",
  "What happens if I keep Cocoon?":
    "Keeping Cocoon means slightly below your margin target. On a 500-unit run that\u2019s roughly $1,000 in margin compression. The question is whether the silhouette is essential to the story or whether Straight carries the same weight with less fabric.",
  "Is Modal the right choice here?":
    "Modal gives excellent drape for this direction. Tencel offers similar properties with better sustainability at a lower price. Silk Blend doubles cost but elevates perceived value significantly.",
};

function getMockResponse(q: string): string {
  if (MOCK_RESPONSES[q]) return MOCK_RESPONSES[q];
  const lower = q.toLowerCase();
  for (const [key, val] of Object.entries(MOCK_RESPONSES)) {
    if (lower.includes(key.toLowerCase().slice(0, 18))) return val;
  }
  return "Great question. When fully wired, Muko will use your session context \u2014 brand DNA, scores, material choices, and market data \u2014 for a specific, grounded answer.";
}

/* ─── Design tokens ─── */
const CHARTREUSE = "#A8B475";
const STEEL      = "#7D96AC";
const ROSE_DUST  = "#CDAAB3";
const CAMEL      = "#B8876B";
const ORB_REST   = "#4D302F";   // warm dark brown in dormant state


/* ════════════════════════════════════════════════════════════════
   Component
   ════════════════════════════════════════════════════════════════ */
export default function FloatingMukoOrb({
  step,
  context,
  conceptName,
  identityScore,
  resonanceScore,
}: FloatingMukoOrbProps) {
  const [orbState, setOrbState]     = useState<OrbState>("rest");
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages]     = useState<Message[]>([]);

  const wrapperRef   = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLInputElement>(null);
  const messagesEnd  = useRef<HTMLDivElement>(null);

  /* ─── Escape → rest ─── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && orbState !== "rest") setOrbState("rest");
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [orbState]);

  /* ─── Click outside → rest ─── */
  useEffect(() => {
    if (orbState !== "active" && orbState !== "thinking") return;
    const onDown = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOrbState("rest");
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [orbState]);

  /* ─── Focus input when active ─── */
  useEffect(() => {
    if (orbState === "active") {
      const t = setTimeout(() => inputRef.current?.focus(), 220);
      return () => clearTimeout(t);
    }
  }, [orbState]);

  /* ─── Scroll to latest message ─── */
  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ─── Reset on step change ─── */
  useEffect(() => {
    setMessages([]);
    setOrbState("rest");
    setInputValue("");
  }, [step]);

  /* ─── Send handler ─── */
  const handleSend = (text: string) => {
    if (!text.trim() || orbState === "thinking") return;
    setMessages(prev => [...prev, { role: "user", content: text.trim() }]);
    setInputValue("");
    setOrbState("thinking");
    // TODO Week 5-6: Replace with Claude API, passing `context` as system prompt
    setTimeout(() => {
      setMessages(prev => [...prev, { role: "muko", content: getMockResponse(text.trim()) }]);
      setOrbState("active");
    }, 900 + Math.random() * 500);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(inputValue); }
  };

  /* ─── Orb click ─── */
  const handleOrbClick = () => {
    if (orbState === "thinking") return;
    if (orbState === "active") setOrbState("rest");
    else setOrbState("active");
  };

  /* ─── Close: collapse to rest + clear conversation ─── */
  const handleClose = () => {
    setOrbState("rest");
    setMessages([]);
    setInputValue("");
  };

  /* ─── Derived state ─── */
  const isExpanded   = orbState === "active" || orbState === "thinking";
  const isThinking   = orbState === "thinking";
  const isHover      = orbState === "hover";
  const hasMessages  = messages.length > 0;

  const orbPx     = isExpanded ? 72 : 44;
  // Barely-there frosted veil — lets the glow blobs read through
  const frostedBg = "rgba(240,237,230,0.06)";

  /* ─── Fonts ─── */
  const inter = "var(--font-inter), system-ui, sans-serif";
  const sohne = "var(--font-sohne-breit), system-ui, sans-serif";

  return (
    <>
      {/* ══ Fixed wrapper ══ */}
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
          gap: 0,
          pointerEvents: "none", // let page clicks pass through the invisible gap
        }}
      >

        {/* ══ × CLOSE BUTTON — top right of active panel ══ */}
        {isExpanded && (
          <button
            onClick={handleClose}
            aria-label="Close"
            style={{
              alignSelf: "flex-end",
              marginBottom: 10,
              width: 24,
              height: 24,
              border: "1px solid rgba(180,172,160,0.30)",
              borderRadius: 6,
              background: "rgba(248,246,241,0.90)",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#b0a898",
              fontSize: 15,
              lineHeight: 1,
              transition: "color 130ms ease, border-color 130ms ease",
              pointerEvents: "auto",
              flexShrink: 0,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = "#2d2b28";
              e.currentTarget.style.borderColor = "rgba(100,95,88,0.28)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = "#b0a898";
              e.currentTarget.style.borderColor = "rgba(180,172,160,0.30)";
            }}
          >
            ×
          </button>
        )}

        {/* ══ CONTEXT PILLS — visible when active ══ */}
        {orbState === "active" && (conceptName || identityScore !== undefined || resonanceScore !== undefined) && (
          <div style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap" as const,
            justifyContent: "flex-end",
            marginBottom: 10,
            pointerEvents: "auto",
            animation: "orbFadeUp 200ms ease-out both",
          }}>
            <span style={{
              fontFamily: inter,
              fontSize: 10,
              color: "rgba(100,95,88,0.55)",
              letterSpacing: "0.04em",
              alignSelf: "center",
            }}>
              Context
            </span>
            {conceptName && (
              <span style={{
                fontFamily: inter,
                fontSize: 10,
                color: "#4a5630",
                background: "rgba(168,180,117,0.14)",
                border: "1px solid rgba(168,180,117,0.28)",
                borderRadius: 20,
                padding: "2px 8px",
                letterSpacing: "0.02em",
              }}>
                {conceptName}
              </span>
            )}
            {(identityScore !== undefined || resonanceScore !== undefined) && (
              <span style={{
                fontFamily: inter,
                fontSize: 10,
                color: "#2e4558",
                background: "rgba(125,150,172,0.12)",
                border: "1px solid rgba(125,150,172,0.24)",
                borderRadius: 20,
                padding: "2px 8px",
                letterSpacing: "0.02em",
              }}>
                {[
                  identityScore  !== undefined ? `Identity ${identityScore}`  : null,
                  resonanceScore !== undefined ? `Resonance ${resonanceScore}` : null,
                ].filter(Boolean).join(" · ")}
              </span>
            )}
          </div>
        )}

        {/* ══ FROSTED MESSAGE PANEL — materializes when messages exist ══ */}
        <div style={{
          width: 320,
          maxHeight: hasMessages ? 300 : 0,
          padding: hasMessages ? "18px 20px" : "0 20px",
          background: hasMessages ? "rgba(245,242,238,0.88)" : "transparent",
          backdropFilter: hasMessages ? "blur(20px)" : "none",
          WebkitBackdropFilter: hasMessages ? "blur(20px)" : "none",
          borderRadius: 16,
          overflowX: "hidden" as const,
          overflowY: hasMessages ? "auto" : "hidden",
          transition: "max-height 0.4s ease, padding 0.4s ease, background 0.4s ease",
          scrollbarWidth: "none" as const,
          display: "flex",
          flexDirection: "column" as const,
          gap: 14,
          marginBottom: hasMessages ? 12 : 0,
          pointerEvents: hasMessages ? "auto" : "none",
          boxSizing: "border-box" as const,
        }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ animation: "orbFadeUp 300ms ease-out both" }}>
              {msg.role === "user" ? (
                /* User message — right-aligned */
                <div style={{
                  textAlign: "right",
                  fontFamily: inter,
                  fontSize: 13,
                  lineHeight: 1.75,
                  color: "#7a7268",
                }}>
                  {msg.content}
                </div>
              ) : (
                /* Muko response */
                <div>
                  <div style={{
                    fontFamily: sohne,
                    fontSize: 9,
                    fontWeight: 600,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase" as const,
                    color: CHARTREUSE,
                    marginBottom: 5,
                  }}>
                    Muko
                  </div>
                  <div style={{
                    fontFamily: inter,
                    fontSize: 13,
                    lineHeight: 1.75,
                    color: "#2d2b28",
                    fontStyle: "italic",
                  }}>
                    {msg.content}
                  </div>
                  {/* Gradient rule */}
                  <div style={{
                    width: 20,
                    height: 1,
                    background: `linear-gradient(90deg, ${CHARTREUSE}, ${STEEL})`,
                    marginTop: 8,
                  }} />
                </div>
              )}
            </div>
          ))}

          {/* Thinking indicator — inside panel, after messages */}
          {isThinking && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              animation: "orbFadeUp 200ms ease-out both",
            }}>
              {[CHARTREUSE, STEEL, ROSE_DUST].map((color, i) => (
                <span key={i} style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: color,
                  display: "inline-block",
                  animation: `orbBounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                }} />
              ))}
              <span style={{
                fontFamily: inter,
                fontSize: 11,
                fontStyle: "italic",
                color: "#a09888",
              }}>
                Muko is thinking...
              </span>
            </div>
          )}

          <div ref={messagesEnd} />
        </div>

        {/* ══ INPUT LINE — visible when active ══ */}
        {orbState === "active" && (
          <div style={{
            marginBottom: 14,
            pointerEvents: "auto",
            animation: "orbFadeUp 200ms ease-out both",
          }}>
            <div style={{ position: "relative", width: 280 }}>
              {/* "↵ send" hint */}
              {inputValue && (
                <div style={{
                  position: "absolute",
                  top: -18,
                  right: 0,
                  fontFamily: inter,
                  fontSize: 10,
                  color: CHARTREUSE,
                  letterSpacing: "0.03em",
                  pointerEvents: "none",
                  animation: "orbFadeUp 150ms ease-out both",
                }}>
                  ↵ send
                </div>
              )}
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about this direction..."
                style={{
                  width: "100%",
                  boxSizing: "border-box" as const,
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  fontSize: 13,
                  color: "#2d2b28",
                  fontFamily: inter,
                  padding: "0 0 9px 0",
                  caretColor: CHARTREUSE,
                }}
              />
              {/* Animated underline */}
              <div style={{
                height: 1,
                background: inputValue
                  ? `linear-gradient(90deg, ${CHARTREUSE}, ${STEEL}, ${ROSE_DUST})`
                  : "rgba(180,172,160,0.4)",
                transition: "background 0.25s ease",
              }} />
            </div>
          </div>
        )}

        {/* ══ ORB ══ */}
        {/* Outer wrapper sizes with spring transition — siblings are the rings */}
        <div
          style={{
            position: "relative",
            width: orbPx,
            height: orbPx,
            flexShrink: 0,
            transition: "width 0.4s cubic-bezier(0.34,1.56,0.64,1), height 0.4s cubic-bezier(0.34,1.56,0.64,1)",
            pointerEvents: "auto",
          }}
        >
          {/* Ring halo 1 */}
          {isExpanded && (
            <div style={{
              position: "absolute",
              top: -8, right: -8, bottom: -8, left: -8,
              borderRadius: "50%",
              border: "1px solid rgba(168,180,117,0.20)",
              animation: "orbRing 3s ease-in-out infinite",
              pointerEvents: "none",
            }} />
          )}
          {/* Ring halo 2 */}
          {isExpanded && (
            <div style={{
              position: "absolute",
              top: -16, right: -16, bottom: -16, left: -16,
              borderRadius: "50%",
              border: "1px solid rgba(125,150,172,0.12)",
              animation: "orbRing 3s ease-in-out 0.5s infinite",
              pointerEvents: "none",
            }} />
          )}

          {/* Inner circle — clips blobs, handles click/hover */}
          <div
            onClick={handleOrbClick}
            onMouseEnter={() => { if (orbState === "rest") setOrbState("hover"); }}
            onMouseLeave={() => { if (orbState === "hover") setOrbState("rest"); }}
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              overflow: "hidden",
              cursor: orbState === "thinking" ? "default" : "pointer",
              // Deep warm dark base — blobs float above this
              background: (isHover || isExpanded) ? "#1e1310" : ORB_REST,
              transition: "background 0.4s ease",
            }}
          >
            {/* ── Glow blobs (visible on hover + active) — radial gradients, mix-blend: screen ── */}
            {(isHover || isExpanded) && (
              <>
                {/* Blob 1 — Chartreuse glow, upper-left */}
                <div style={{
                  position: "absolute",
                  width: "100%", height: "100%",
                  top: "-25%", left: "-25%",
                  borderRadius: "50%",
                  background: `radial-gradient(circle at center, ${CHARTREUSE}66 0%, transparent 68%)`,
                  mixBlendMode: "screen" as const,
                  animation: "orbDrift1 8s ease-in-out infinite",
                  willChange: "transform",
                }} />
                {/* Blob 2 — Steel glow, right */}
                <div style={{
                  position: "absolute",
                  width: "90%", height: "90%",
                  top: "5%", right: "-25%",
                  borderRadius: "50%",
                  background: `radial-gradient(circle at center, ${STEEL}55 0%, transparent 68%)`,
                  mixBlendMode: "screen" as const,
                  animation: "orbDrift2 11s ease-in-out infinite",
                  willChange: "transform",
                }} />
                {/* Blob 3 — Rose glow, lower-center */}
                <div style={{
                  position: "absolute",
                  width: "90%", height: "90%",
                  bottom: "-22%", left: "5%",
                  borderRadius: "50%",
                  background: `radial-gradient(circle at center, ${ROSE_DUST}44 0%, transparent 68%)`,
                  mixBlendMode: "screen" as const,
                  animation: "orbDrift3 9s ease-in-out infinite",
                  willChange: "transform",
                }} />
              </>
            )}

            {/* Barely-there frosted veil */}
            <div style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background: frostedBg,
            }} />

            {/* Center content */}
            <div style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              {isThinking ? (
                /* Pulsing white dot — replaces M lettermark while thinking */
                <div style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#fff",
                  animation: "orbPulse 1s ease-in-out infinite",
                }} />
              ) : (
                /* M lettermark */
                <span style={{
                  fontFamily: sohne,
                  fontSize: isExpanded ? 18 : 13,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.88)",
                  letterSpacing: "0.02em",
                  lineHeight: 1,
                  transition: "font-size 0.3s ease",
                  userSelect: "none" as const,
                }}>
                  M
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ══ "Ask Muko" label — fades in on hover only ══ */}
        <div style={{
          marginTop: 7,
          fontFamily: sohne,
          fontSize: 10,
          color: "#8a8478",
          letterSpacing: "0.03em",
          opacity: isHover ? 1 : 0,
          transform: isHover ? "translateY(0)" : "translateY(3px)",
          transition: "opacity 0.18s ease, transform 0.18s ease",
          pointerEvents: "none",
          whiteSpace: "nowrap" as const,
        }}>
          Ask Muko
        </div>

      </div>

      {/* ══ Keyframes ══ */}
      <style>{`
        /* ── Glow blob drift animations (translate + scale only, no rotation) ── */
        @keyframes orbDrift1 {
          0%, 100% { transform: translate(0px,   0px)  scale(1);    }
          50%      { transform: translate(7px,  -9px)  scale(1.08); }
        }
        @keyframes orbDrift2 {
          0%, 100% { transform: translate(0px,  0px)  scale(1);    }
          50%      { transform: translate(-7px, 6px)  scale(1.06); }
        }
        @keyframes orbDrift3 {
          0%, 100% { transform: translate(0px,   0px)  scale(1);    }
          50%      { transform: translate(5px,  -6px)  scale(1.05); }
        }

        /* ── Orb ring halos ── */
        @keyframes orbRing {
          0%, 100% { opacity: 0.6; transform: scale(1);    }
          50%      { opacity: 1;   transform: scale(1.05); }
        }

        /* ── Thinking dot pulse ── */
        @keyframes orbPulse {
          0%, 100% { opacity: 0.4; transform: scale(0.8); }
          50%      { opacity: 1;   transform: scale(1.2); }
        }

        /* ── Thinking text dots bounce ── */
        @keyframes orbBounce {
          0%, 80%, 100% { transform: translateY(0);    opacity: 0.4; }
          40%           { transform: translateY(-5px); opacity: 1;   }
        }

        /* ── Panel / element entrance ── */
        @keyframes orbFadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
      `}</style>
    </>
  );
}
