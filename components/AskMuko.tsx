"use client";
import React, { useState, useRef, useEffect } from "react";

/* ─── Types ─── */
export type AskMukoStep = "concept" | "spec" | "report";

export interface AskMukoMessage {
  role: "user" | "muko";
  content: string;
}

export interface AskMukoProps {
  step: AskMukoStep;
  suggestedQuestions: string[];
  context?: Record<string, any>;
  brand?: {
    oliveInk?: string;
    chartreuse?: string;
    rose?: string;
    camel?: string;
    steel?: string;
  };
}

const DEFAULT_BRAND = {
  oliveInk: "#43432B",
  chartreuse: "#A8B475",
  rose: "#A97B8F",
  camel: "#B8876B",
  steel: "#A9BFD6",
};

/* ─── Mock responses — replace with Claude API in Weeks 5-6 ─── */
const MOCK_RESPONSES: Record<string, string> = {
  "Why is Resonance at 75?":
    "Resonance reflects current market saturation for this aesthetic direction. At 75, there\u2019s healthy consumer interest but it\u2019s gaining traction \u2014 you\u2019re not first to market, but not late either. Refining with \u2018minimal\u2019 or \u2018structured\u2019 helps carve out whitespace within the trend.",
  "How does this compare to Refined Clarity?":
    "Refined Clarity scores higher on Identity (88 vs 81) because it maps more directly to your brand\u2019s minimalist, editorial DNA. If brand alignment matters more than trend novelty, Refined Clarity gives you a stronger foundation with less risk of feeling off-brand at retail.",
  "What brands are doing this well?":
    "The Row and Tot\u00eame have executed similar territories with strong commercial results, leaning on fabric quality over design complexity. Cos has moved in at a more accessible price point, which could signal growing saturation at the contemporary tier.",
  "Why is COGS $2 over ceiling?":
    "Your COGS of $182 exceeds the $180 ceiling by $2, driven by Cocoon requiring ~3.8 yards vs 3.0 for Straight. The overage comes from yardage, not fiber cost. Switching to Straight or dropping complexity to Moderate brings you under.",
  "What happens if I keep Cocoon?":
    "Keeping Cocoon means ~0.4% below your 60% margin target. On a 500-unit run, that\u2019s ~$1,000 in margin compression. The question is whether the silhouette is essential to the story or whether Belted/Straight carries the same weight with less fabric.",
  "Is Modal the right choice here?":
    "Modal at $24/yd gives excellent drape supporting Refined Clarity. Tencel at $22/yd offers similar properties with better sustainability. Silk Blend at $48/yd doubles cost but elevates perceived value significantly.",
  "Why did Execution score 64?":
    "Cotton Twill\u2019s 3-week lead time + High complexity leaves limited buffer for Resort. Cocoon adds volume (~3.8 yards), extending cutting time. Each factor is manageable alone, but together they compound into timeline pressure.",
  "Should I act on the silhouette redirect?":
    "Straight saves ~$16/unit and recovers 2 weeks of buffer \u2014 significant for Resort. Refined Clarity reads clean in both Cocoon and Straight. If oversized volume is core to your vision, keep it and pull cost elsewhere. If it\u2019s a nice-to-have, Straight is the pragmatic move.",
  "How confident is this score?":
    "The 78 is moderate-confidence. Identity (88) and Resonance (82) have strong data coverage. Execution (64) has more variability \u2014 lead times shift with supplier availability. Commercial Gates use industry benchmarks; your actual costs may differ 10-15%.",
};

function getMockResponse(question: string): string {
  if (MOCK_RESPONSES[question]) return MOCK_RESPONSES[question];
  const lower = question.toLowerCase();
  for (const [key, val] of Object.entries(MOCK_RESPONSES)) {
    if (lower.includes(key.toLowerCase().slice(0, 20))) return val;
  }
  return "Great question. When fully wired, Muko will use your session context \u2014 brand DNA, scores, material choices, and market data \u2014 for a specific answer. Try one of the suggested questions to preview this.";
}

export default function AskMuko({ step, suggestedQuestions, context, brand: brandOverride }: AskMukoProps) {
  const BRAND = { ...DEFAULT_BRAND, ...brandOverride };
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<AskMukoMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isTyping]);
  useEffect(() => { if (isExpanded && inputRef.current) setTimeout(() => inputRef.current?.focus(), 300); }, [isExpanded]);
  useEffect(() => { setMessages([]); setIsExpanded(false); setInputValue(""); }, [step]);

  const handleSend = (text: string) => {
    if (!text.trim()) return;
    setMessages(prev => [...prev, { role: "user", content: text.trim() }]);
    setInputValue("");
    setIsTyping(true);
    // TODO Week 5-6: Replace with Claude API. Pass `context` prop as system prompt.
    setTimeout(() => {
      setMessages(prev => [...prev, { role: "muko", content: getMockResponse(text.trim()) }]);
      setIsTyping(false);
    }, 800 + Math.random() * 600);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(inputValue); }
  };

  const askedQuestions = messages.filter(m => m.role === "user").map(m => m.content);
  const remainingChips = suggestedQuestions.filter(q => !askedQuestions.includes(q));

  const inter = "var(--font-inter), system-ui, sans-serif";
  const sohne = "var(--font-sohne-breit), system-ui, sans-serif";

  return (
    <div style={{
      marginTop: 24,
      borderRadius: 12,
      border: "1px solid rgba(67,67,43,0.08)",
      borderTop: `2px solid rgba(169,123,143,0.32)`,
      background: "rgba(250,249,246,0.97)",
      overflow: "hidden",
    }}>

      {/* ─── Collapsed trigger ─── */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          style={{ width: "100%", padding: "16px 20px", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(169,123,143,0.02)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
        >
          {/* Rose dot with ping */}
          <span style={{ position: "relative", width: 7, height: 7, flexShrink: 0 }}>
            <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: BRAND.rose, animation: "askMukoRadarPing 2.4s ease-out infinite" }} />
            <span style={{ position: "relative", display: "block", width: 7, height: 7, borderRadius: "50%", background: BRAND.rose }} />
          </span>
          <span style={{ fontFamily: sohne, fontSize: 12, fontWeight: 500, letterSpacing: "0.01em", color: "rgba(67,67,43,0.78)" }}>Muko</span>
          <span style={{
            fontSize: 8.5,
            fontWeight: 700,
            letterSpacing: "0.10em",
            textTransform: "uppercase" as const,
            color: BRAND.rose,
            background: "rgba(169,123,143,0.08)",
            border: "1px solid rgba(169,123,143,0.22)",
            borderRadius: 4,
            padding: "2px 6px",
            fontFamily: inter,
          }}>AI</span>
          <span style={{ marginLeft: "auto", fontFamily: inter, fontSize: 11, color: "rgba(67,67,43,0.35)" }}>Ask anything about this direction</span>
          <span style={{ color: BRAND.rose, fontSize: 14, lineHeight: 1 }}>›</span>
        </button>
      )}

      {/* ─── Expanded ─── */}
      {isExpanded && (
        <div>
          {/* Header */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid rgba(67,67,43,0.07)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ position: "relative", width: 7, height: 7, flexShrink: 0 }}>
                <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: BRAND.rose, animation: "askMukoRadarPing 2.4s ease-out infinite" }} />
                <span style={{ position: "relative", display: "block", width: 7, height: 7, borderRadius: "50%", background: BRAND.rose }} />
              </span>
              <span style={{ fontFamily: sohne, fontSize: 13, fontWeight: 500, letterSpacing: "0.01em", color: "rgba(67,67,43,0.82)" }}>Muko</span>
              <span style={{
                fontSize: 8.5,
                fontWeight: 700,
                letterSpacing: "0.10em",
                textTransform: "uppercase" as const,
                color: BRAND.rose,
                background: "rgba(169,123,143,0.08)",
                border: "1px solid rgba(169,123,143,0.22)",
                borderRadius: 4,
                padding: "2px 6px",
                fontFamily: inter,
              }}>AI</span>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              aria-label="Collapse"
              style={{ width: 24, height: 24, borderRadius: 999, border: "1px solid rgba(67,67,43,0.10)", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(67,67,43,0.35)", fontSize: 14, transition: "all 150ms ease" }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(67,67,43,0.04)"; e.currentTarget.style.color = "rgba(67,67,43,0.55)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(67,67,43,0.35)"; }}
            >&times;</button>
          </div>

          <div style={{ padding: "16px 20px" }}>
            {/* Suggested questions */}
            {remainingChips.length > 0 && (
              <div style={{ marginBottom: messages.length > 0 ? 20 : 0 }}>
                <div style={{ fontFamily: inter, fontSize: 9.5, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(67,67,43,0.30)", marginBottom: 10 }}>
                  Suggested
                </div>
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 0 }}>
                  {remainingChips.map((q, i) => (
                    <AskMukoQuestion key={i} question={q} onSend={() => handleSend(q)} disabled={isTyping} rose={BRAND.rose} inter={inter} />
                  ))}
                </div>
              </div>
            )}

            {/* Conversation */}
            {messages.length > 0 && (
              <div style={{ maxHeight: 300, overflowY: "auto" as const, display: "flex", flexDirection: "column" as const, gap: 14, marginBottom: 16, paddingRight: 2, scrollbarWidth: "thin" as const, scrollbarColor: "rgba(67,67,43,0.08) transparent" }}>
                {messages.map((msg, i) => (
                  <div key={i} style={{ animation: "askMukoFadeIn 280ms ease-out both" }}>
                    {msg.role === "user" ? (
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <div style={{
                          maxWidth: "84%",
                          padding: "9px 14px",
                          borderRadius: "10px 10px 3px 10px",
                          background: "rgba(67,67,43,0.04)",
                          border: "1px solid rgba(67,67,43,0.08)",
                          fontSize: 12.5,
                          lineHeight: 1.55,
                          color: "rgba(67,67,43,0.70)",
                          fontFamily: inter,
                        }}>{msg.content}</div>
                      </div>
                    ) : (
                      <div style={{ paddingLeft: 12, borderLeft: `2px solid rgba(169,123,143,0.30)` }}>
                        <div style={{ fontFamily: sohne, fontSize: 9.5, fontWeight: 500, letterSpacing: "0.06em", color: BRAND.rose, marginBottom: 5 }}>Muko</div>
                        <div style={{ fontSize: 12.5, lineHeight: 1.7, color: "rgba(67,67,43,0.72)", fontFamily: inter }}>{msg.content}</div>
                      </div>
                    )}
                  </div>
                ))}
                {isTyping && (
                  <div style={{ animation: "askMukoFadeIn 200ms ease-out both", paddingLeft: 12, borderLeft: `2px solid rgba(169,123,143,0.30)` }}>
                    <div style={{ fontFamily: sohne, fontSize: 9.5, fontWeight: 500, letterSpacing: "0.06em", color: BRAND.rose, marginBottom: 6 }}>Muko</div>
                    <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                      {[0, 1, 2].map(d => <span key={d} style={{ width: 4, height: 4, borderRadius: "50%", background: "rgba(169,123,143,0.45)", animation: `askMukoDotPulse 1.2s ease-in-out ${d * 0.15}s infinite` }} />)}
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}

            {/* Input */}
            <div style={{ position: "relative" as const, marginTop: messages.length > 0 ? 0 : 8 }}>
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={messages.length === 0 ? "Ask about scores, timing, tradeoffs…" : "Follow up…"}
                disabled={isTyping}
                style={{
                  width: "100%",
                  boxSizing: "border-box" as const,
                  padding: "11px 44px 11px 14px",
                  fontSize: 12.5,
                  borderRadius: 8,
                  border: "1px solid rgba(67,67,43,0.11)",
                  background: "rgba(255,255,255,0.80)",
                  color: "rgba(67,67,43,0.82)",
                  fontFamily: inter,
                  outline: "none",
                  transition: "border-color 180ms ease",
                  opacity: isTyping ? 0.5 : 1,
                }}
                onFocus={e => { e.currentTarget.style.borderColor = "rgba(169,123,143,0.42)"; }}
                onBlur={e => { e.currentTarget.style.borderColor = "rgba(67,67,43,0.11)"; }}
              />
              <button
                onClick={() => handleSend(inputValue)}
                disabled={!inputValue.trim() || isTyping}
                aria-label="Send"
                style={{
                  position: "absolute" as const,
                  right: 7,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  border: "none",
                  background: inputValue.trim() && !isTyping ? "rgba(169,123,143,0.12)" : "transparent",
                  cursor: !inputValue.trim() || isTyping ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: inputValue.trim() && !isTyping ? BRAND.rose : "rgba(67,67,43,0.20)",
                  transition: "all 160ms ease",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M3.5 8H12.5M12.5 8L8.5 4M12.5 8L8.5 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes askMukoFadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes askMukoDotPulse { 0%, 100% { opacity: 0.3; transform: scale(1); } 50% { opacity: 0.9; transform: scale(1.4); } }
        @keyframes askMukoRadarPing { 0% { transform: scale(1); opacity: 0.5; } 60% { transform: scale(2.4); opacity: 0; } 100% { transform: scale(2.4); opacity: 0; } }
      `}</style>
    </div>
  );
}

/* ─── Suggested question row ─────────────────────────────────────────────── */
function AskMukoQuestion({ question, onSend, disabled, rose, inter }: { question: string; onSend: () => void; disabled: boolean; rose: string; inter: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onSend}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        textAlign: "left" as const,
        padding: "10px 14px 10px 12px",
        border: "none",
        borderLeft: `2px solid ${hovered && !disabled ? "rgba(169,123,143,0.50)" : "transparent"}`,
        background: hovered && !disabled ? "rgba(169,123,143,0.03)" : "transparent",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        fontSize: 12.5,
        fontWeight: 450,
        color: hovered && !disabled ? "rgba(67,67,43,0.78)" : "rgba(67,67,43,0.60)",
        fontFamily: inter,
        lineHeight: 1.45,
        transition: "all 130ms ease",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
      }}
    >
      <span>{question}</span>
      {hovered && !disabled && (
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, color: rose }}>
          <path d="M3.5 8H12.5M12.5 8L8.5 4M12.5 8L8.5 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}
