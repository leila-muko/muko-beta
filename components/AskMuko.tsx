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

  const glassPanelBase: React.CSSProperties = {
    borderRadius: 20,
    border: "1px solid rgba(255, 255, 255, 0.35)",
    background: "rgba(255, 255, 255, 0.25)",
    backdropFilter: "blur(40px) saturate(180%)",
    WebkitBackdropFilter: "blur(40px) saturate(180%)",
    boxShadow: "0 24px 80px rgba(0,0,0,0.05), 0 8px 32px rgba(67,67,43,0.04), inset 0 1px 0 rgba(255,255,255,0.60), inset 0 -1px 0 rgba(255,255,255,0.12)",
    overflow: "hidden",
    position: "relative" as const,
  };

  const glassSheen: React.CSSProperties = {
    position: "absolute" as const, inset: 0, pointerEvents: "none" as const,
    background: "radial-gradient(ellipse 280px 120px at 15% -5%, rgba(255,255,255,0.35), transparent 65%), radial-gradient(ellipse 200px 100px at 90% 10%, rgba(255,255,255,0.15), transparent 60%)",
  };

  const askedQuestions = messages.filter(m => m.role === "user").map(m => m.content);
  const remainingChips = suggestedQuestions.filter(q => !askedQuestions.includes(q));

  return (
    <div style={{ ...glassPanelBase, marginTop: 16, padding: 0, transition: "all 400ms cubic-bezier(0.4, 0, 0.2, 1)" }}>
      <div style={glassSheen} />
      <div style={{ position: "relative" }}>

        {/* ─── Collapsed trigger ─── */}
        {!isExpanded && (
          <button
            onClick={() => setIsExpanded(true)}
            style={{ width: "100%", padding: "20px 22px", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 200ms ease" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(169,123,143,0.04)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
          >
            <span style={{ position: "relative", width: 8, height: 8 }}>
  {/* Ping ring */}
  <span style={{
    position: "absolute",
    inset: 0,
    borderRadius: "50%",
    background: BRAND.rose,
    animation: "askMukoRadarPing 2.4s ease-out infinite",
  }} />
  {/* Solid dot */}
  <span style={{
    position: "relative",
    display: "block",
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: BRAND.rose,
    boxShadow: "0 0 0 3px rgba(169,123,143,0.15)",
  }} />
</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(67,67,43,0.72)", fontFamily: "var(--font-sohne-breit), system-ui, sans-serif", letterSpacing: "0.01em" }}>Ask Muko</span>
          </button>
        )}

        {/* ─── Expanded ─── */}
        {isExpanded && (
          <div style={{ padding: "20px 22px" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: BRAND.rose, boxShadow: "0 0 0 3px rgba(169,123,143,0.15)" }} />
                <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.10em", textTransform: "uppercase" as const, color: "rgba(67,67,43,0.42)", fontFamily: "var(--font-sohne-breit), system-ui, sans-serif" }}>Ask Muko</span>
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                aria-label="Collapse"
                style={{ width: 28, height: 28, borderRadius: 999, border: "1px solid rgba(67,67,43,0.10)", background: "rgba(255,255,255,0.50)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(67,67,43,0.45)", fontSize: 14, transition: "all 180ms ease" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.80)"; e.currentTarget.style.color = "rgba(67,67,43,0.70)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.50)"; e.currentTarget.style.color = "rgba(67,67,43,0.45)"; }}
              >&times;</button>
            </div>

            {/* Suggested question chips */}
            {remainingChips.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column" as const, gap: 10, marginBottom: messages.length > 0 ? 16 : 0 }}>
                {remainingChips.map((q, i) => (
                  <button
                    key={i} onClick={() => handleSend(q)} disabled={isTyping}
                    style={{ textAlign: "left" as const, padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(169,123,143,0.20)", background: "rgba(169,123,143,0.04)", cursor: isTyping ? "not-allowed" : "pointer", opacity: isTyping ? 0.5 : 1, fontSize: 13, fontWeight: 500, color: "rgba(67,67,43,0.72)", fontFamily: "var(--font-inter), system-ui, sans-serif", lineHeight: 1.4, transition: "all 180ms ease" }}
                    onMouseEnter={e => { if (!isTyping) { e.currentTarget.style.background = "rgba(169,123,143,0.08)"; e.currentTarget.style.borderColor = "rgba(169,123,143,0.30)"; }}}
                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(169,123,143,0.04)"; e.currentTarget.style.borderColor = "rgba(169,123,143,0.20)"; }}
                  >{q}</button>
                ))}
              </div>
            )}

            {/* Conversation */}
            {messages.length > 0 && (
              <div style={{ maxHeight: 320, overflowY: "auto" as const, display: "flex", flexDirection: "column" as const, gap: 12, marginBottom: 18, paddingRight: 4, scrollbarWidth: "thin" as const, scrollbarColor: "rgba(67,67,43,0.12) transparent" }}>
                {messages.map((msg, i) => (
                  <div key={i} style={{ animation: "askMukoFadeIn 300ms ease-out both" }}>
                    {msg.role === "user" ? (
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <div style={{ maxWidth: "88%", padding: "10px 14px", borderRadius: "14px 14px 4px 14px", background: "rgba(67,67,43,0.06)", border: "1px solid rgba(67,67,43,0.08)", fontSize: 13, lineHeight: 1.5, color: "rgba(67,67,43,0.78)", fontFamily: "var(--font-inter), system-ui, sans-serif" }}>{msg.content}</div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: BRAND.rose, fontFamily: "var(--font-sohne-breit), system-ui, sans-serif", marginBottom: 6, opacity: 0.7 }}>Muko</div>
                        <div style={{ padding: "12px 14px", borderRadius: "14px 14px 14px 4px", background: "rgba(255,255,255,0.50)", border: "1px solid rgba(169,123,143,0.12)", fontSize: 13, lineHeight: 1.6, color: "rgba(67,67,43,0.82)", fontFamily: "var(--font-inter), system-ui, sans-serif" }}>{msg.content}</div>
                      </div>
                    )}
                  </div>
                ))}
                {isTyping && (
                  <div style={{ animation: "askMukoFadeIn 200ms ease-out both" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: BRAND.rose, fontFamily: "var(--font-sohne-breit), system-ui, sans-serif", marginBottom: 6, opacity: 0.7 }}>Muko</div>
                    <div style={{ padding: "12px 14px", borderRadius: "14px 14px 14px 4px", background: "rgba(255,255,255,0.50)", border: "1px solid rgba(169,123,143,0.12)", display: "flex", gap: 4, alignItems: "center" }}>
                      {[0,1,2].map(d => <span key={d} style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(67,67,43,0.25)", animation: `askMukoDotPulse 1.2s ease-in-out ${d*0.15}s infinite` }} />)}
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}

            {/* Input */}
            <div style={{ position: "relative" as const, marginTop: messages.length > 0 ? 0 : 14 }}>
              <input
                ref={inputRef} type="text" value={inputValue}
                onChange={e => setInputValue(e.target.value)} onKeyDown={handleKeyDown}
                placeholder={messages.length === 0 ? "Ask about tradeoffs, scores, alternatives..." : "Follow up..."}
                disabled={isTyping}
                style={{ width: "100%", boxSizing: "border-box" as const, padding: "12px 44px 12px 14px", fontSize: 13, borderRadius: 12, border: "1px solid rgba(67,67,43,0.10)", background: "rgba(255,255,255,0.60)", color: "rgba(67,67,43,0.85)", fontFamily: "var(--font-inter), system-ui, sans-serif", outline: "none", transition: "all 200ms ease", opacity: isTyping ? 0.5 : 1 }}
                onFocus={e => { e.currentTarget.style.borderColor = "rgba(169,123,143,0.25)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(169,123,143,0.06)"; }}
                onBlur={e => { e.currentTarget.style.borderColor = "rgba(67,67,43,0.10)"; e.currentTarget.style.boxShadow = "none"; }}
              />
              <button
                onClick={() => handleSend(inputValue)} disabled={!inputValue.trim() || isTyping} aria-label="Send"
                style={{ position: "absolute" as const, right: 6, top: "50%", transform: "translateY(-50%)", width: 32, height: 32, borderRadius: 999, border: "none", background: inputValue.trim() && !isTyping ? "rgba(169,123,143,0.12)" : "transparent", cursor: !inputValue.trim() || isTyping ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: inputValue.trim() && !isTyping ? "rgba(67,67,43,0.65)" : "rgba(67,67,43,0.25)", transition: "all 180ms ease" }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3.5 8H12.5M12.5 8L8.5 4M12.5 8L8.5 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>
          </div>
        )}
      </div>
      <style>{`
        @keyframes askMukoFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes askMukoDotPulse { 0%, 100% { opacity: 0.3; transform: scale(1); } 50% { opacity: 0.8; transform: scale(1.3); } }
        @keyframes askMukoRadarPing {
  0% { transform: scale(1); opacity: 0.6; }
  50% { transform: scale(2.2); opacity: 0; }
  100% { transform: scale(2.2); opacity: 0; }
}
      `}</style>
    </div>
  );
}
