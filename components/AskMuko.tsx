"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import type { AskMukoContext } from "@/lib/synthesizer/askMukoResponse";
import { trackEvent } from "@/lib/analytics";
import { useSessionStore } from "@/lib/store/sessionStore";

/* ─── Types ─── */
export type AskMukoStep = "concept" | "spec" | "pieces" | "report";

export interface AskMukoMessage {
  role: "user" | "muko";
  content: string;
}

export interface AskMukoProps {
  step: AskMukoStep;
  suggestedQuestions?: string[];
  context?: AskMukoContext;
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  openingMessage?: string | null;
  openingMessageVersion?: number;
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

export default function AskMuko(props: AskMukoProps) {
  return <AskMukoInner key={props.step} {...props} />;
}

function AskMukoInner({
  suggestedQuestions = [],
  context,
  isOpen,
  onOpenChange,
  openingMessage,
  openingMessageVersion,
  brand: brandOverride,
}: AskMukoProps) {
  const BRAND = { ...DEFAULT_BRAND, ...brandOverride };
  const [internalExpanded, setInternalExpanded] = useState(false);
  const [messages, setMessages] = useState<AskMukoMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [dynamicSuggestions, setDynamicSuggestions] = useState<string[]>([]);
  const activeCollection = useSessionStore((state) => state.activeCollection);
  const collectionName = useSessionStore((state) => state.collectionName);
  const savedAnalysisId = useSessionStore((state) => state.savedAnalysisId);
  const setAskMukoLastResponse = useSessionStore((state) => state.setAskMukoLastResponse);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastSuggestionContextRef = useRef<string | null>(null);
  const lastOpeningMessageVersionRef = useRef<number | null>(null);
  const isExpanded = typeof isOpen === "boolean" ? isOpen : internalExpanded;

  const setExpanded = useCallback(
    (next: boolean) => {
      if (typeof isOpen !== "boolean") {
        setInternalExpanded(next);
      }
      onOpenChange?.(next);
    },
    [isOpen, onOpenChange]
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (isExpanded && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isExpanded]);

  // Load dynamic suggested questions on mount / context change
  useEffect(() => {
    if (!context) return;
    const contextSignature = JSON.stringify(context);
    if (lastSuggestionContextRef.current === contextSignature) return;
    lastSuggestionContextRef.current = contextSignature;

    let isActive = true;
    import("@/lib/synthesizer/askMukoResponse").then(({ generateSuggestedQuestions }) => {
      generateSuggestedQuestions(context)
        .then((questions) => {
          if (isActive) setDynamicSuggestions(questions);
        })
        .catch(() => {});
    });
    return () => {
      isActive = false;
    };
  }, [context]);

  const handleSend = useCallback(async (text: string, options?: { track?: boolean }) => {
    if (!text.trim()) return;
    const trimmedText = text.trim();
    const collectionId = activeCollection || collectionName || savedAnalysisId || null;
    const history = messages.slice(-20).map((message) => ({
      role: message.role === "muko" ? "assistant" : "user",
      content: message.content,
    }));

    if (options?.track !== false) {
      trackEvent(null, "ask_muko_submitted", {
        question_length: trimmedText.length,
        collection_id: collectionId,
      });
    }

    setMessages(prev => [...prev, { role: "user", content: trimmedText }]);
    setInputValue("");
    setIsTyping(true);
    try {
      const response = await fetch("/api/ask-muko", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: trimmedText,
          context,
          history,
        }),
      });

      if (!response.ok) {
        throw new Error("Ask Muko request failed");
      }

      const data = await response.json();
      const answer = data.answer ?? "Muko couldn't process that right now. Try rephrasing or ask something else.";
      setMessages(prev => [...prev, { role: "muko", content: answer }]);
      setAskMukoLastResponse(answer);
    } catch {
      const fallbackAnswer = "Muko couldn't process that right now. Try rephrasing or ask something else.";
      setMessages(prev => [...prev, { role: "muko", content: fallbackAnswer }]);
      setAskMukoLastResponse(fallbackAnswer);
    } finally {
      setIsTyping(false);
    }
  }, [activeCollection, collectionName, context, messages, savedAnalysisId, setAskMukoLastResponse]);

  useEffect(() => {
    if (!isExpanded || isTyping) return;
    if (!openingMessage?.trim()) return;
    if (typeof openingMessageVersion !== "number") return;
    if (lastOpeningMessageVersionRef.current === openingMessageVersion) return;

    lastOpeningMessageVersionRef.current = openingMessageVersion;
    void handleSend(openingMessage, { track: false });
  }, [handleSend, isExpanded, isTyping, openingMessage, openingMessageVersion]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(inputValue); }
  };

  const effectiveSuggestions = suggestedQuestions.length > 0 ? suggestedQuestions : dynamicSuggestions;
  const askedQuestions = messages.filter(m => m.role === "user").map(m => m.content);
  const remainingChips = effectiveSuggestions.filter(q => !askedQuestions.includes(q));
  const showSuggestions = messages.length === 0 && remainingChips.length > 0;

  const inter = "var(--font-inter), system-ui, sans-serif";
  const sohne = "var(--font-sohne-breit), system-ui, sans-serif";

  const styleTag = (
    <style>{`
      @keyframes askMukoFadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes askMukoDotPulse { 0%, 100% { opacity: 0.3; transform: scale(1); } 50% { opacity: 0.9; transform: scale(1.4); } }
      @keyframes askMukoRadarPing { 0% { transform: scale(1); opacity: 0.5; } 60% { transform: scale(2.4); opacity: 0; } 100% { transform: scale(2.4); opacity: 0; } }
    `}</style>
  );

  /* ─── Collapsed: 28px edge tab ─── */
  if (!isExpanded) {
    return (
      <>
        <div
          onClick={() => setExpanded(true)}
          role="button"
          aria-label="Open Muko"
          style={{
            width: 28,
            height: "100%",
            flexShrink: 0,
            background: "rgba(250,249,246,0.97)",
            borderLeft: "2px solid rgba(169,123,143,0.32)",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            paddingTop: 20,
            gap: 10,
            transition: "background 150ms ease",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = "rgba(169,123,143,0.04)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = "rgba(250,249,246,0.97)"; }}
        >
          {/* Pinging rose dot */}
          <span style={{ position: "relative", width: 7, height: 7, flexShrink: 0 }}>
            <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: BRAND.rose, animation: "askMukoRadarPing 2.4s ease-out infinite" }} />
            <span style={{ position: "relative", display: "block", width: 7, height: 7, borderRadius: "50%", background: BRAND.rose }} />
          </span>
          {/* Vertical "Muko" label */}
          <span style={{
            fontFamily: sohne,
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: "0.08em",
            color: "rgba(67,67,43,0.55)",
            writingMode: "vertical-rl" as const,
            textOrientation: "mixed" as const,
            transform: "rotate(180deg)",
            userSelect: "none" as const,
          }}>Muko</span>
        </div>
        {styleTag}
      </>
    );
  }

  /* ─── Expanded: 280px inline panel ─── */
  return (
    <>
      <div style={{
        width: 280,
        flexShrink: 0,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "rgba(250,249,246,0.97)",
        borderLeft: "2px solid rgba(169,123,143,0.32)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px",
          borderBottom: "1px solid rgba(67,67,43,0.07)",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ position: "relative", width: 7, height: 7, flexShrink: 0 }}>
              <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: BRAND.rose, animation: "askMukoRadarPing 2.4s ease-out infinite" }} />
              <span style={{ position: "relative", display: "block", width: 7, height: 7, borderRadius: "50%", background: BRAND.rose }} />
            </span>
            <span style={{ fontFamily: sohne, fontSize: 12, fontWeight: 500, letterSpacing: "0.01em", color: "rgba(67,67,43,0.82)" }}>Muko</span>
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
            onClick={() => setExpanded(false)}
            aria-label="Collapse"
            style={{ width: 24, height: 24, borderRadius: 999, border: "1px solid rgba(67,67,43,0.10)", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(67,67,43,0.35)", fontSize: 14, transition: "all 150ms ease" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(67,67,43,0.04)"; e.currentTarget.style.color = "rgba(67,67,43,0.55)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(67,67,43,0.35)"; }}
          >&times;</button>
        </div>

        {/* Scrollable content */}
        <div style={{
          flex: 1,
          overflowY: "auto",
          padding: "14px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 0,
          scrollbarWidth: "thin" as const,
          scrollbarColor: "rgba(67,67,43,0.08) transparent",
        }}>
          {/* Suggested questions */}
          {showSuggestions && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontFamily: inter, fontSize: 9.5, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(67,67,43,0.30)", marginBottom: 8, paddingLeft: 12 }}>
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
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 14 }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ animation: "askMukoFadeIn 280ms ease-out both" }}>
                {msg.role === "user" ? (
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <div style={{
                      maxWidth: "88%",
                      padding: "8px 12px",
                      borderRadius: "10px 10px 2px 10px",
                      background: "rgba(67,67,43,0.06)",
                      fontSize: 12.5,
                      lineHeight: 1.55,
                      color: "rgba(67,67,43,0.70)",
                      fontFamily: inter,
                    }}>{msg.content}</div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontFamily: sohne, fontSize: 9, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: BRAND.rose, marginBottom: 5 }}>Muko</div>
                    <div style={{ fontSize: 12.5, lineHeight: 1.7, color: "rgba(67,67,43,0.72)", fontFamily: inter }}>
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p style={{ margin: 0 }}>{children}</p>,
                          strong: ({ children }) => <strong style={{ fontWeight: 700, color: "rgba(67,67,43,0.82)" }}>{children}</strong>,
                          em: ({ children }) => <em style={{ fontStyle: "italic" }}>{children}</em>,
                          ul: ({ children }) => <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>{children}</ul>,
                          ol: ({ children }) => <ol style={{ margin: "8px 0 0", paddingLeft: 18 }}>{children}</ol>,
                          li: ({ children }) => <li style={{ marginTop: 4 }}>{children}</li>,
                          a: ({ href, children }) => (
                            <a href={href} style={{ color: BRAND.rose, textDecoration: "underline" }}>
                              {children}
                            </a>
                          ),
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {isTyping && (
              <div style={{ animation: "askMukoFadeIn 200ms ease-out both" }}>
                <div style={{ fontFamily: sohne, fontSize: 9, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: BRAND.rose, marginBottom: 6 }}>Muko</div>
                <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                  {[0, 1, 2].map(d => <span key={d} style={{ width: 4, height: 4, borderRadius: "50%", background: "rgba(169,123,143,0.45)", animation: `askMukoDotPulse 1.2s ease-in-out ${d * 0.15}s infinite` }} />)}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input row */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(67,67,43,0.07)", flexShrink: 0 }}>
          <div style={{ position: "relative" as const }}>
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
                padding: "10px 40px 10px 12px",
                fontSize: 12,
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
                right: 6,
                top: "50%",
                transform: "translateY(-50%)",
                width: 26,
                height: 26,
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
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d="M3.5 8H12.5M12.5 8L8.5 4M12.5 8L8.5 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      {styleTag}
    </>
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
