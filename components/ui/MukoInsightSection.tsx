"use client";

import React, { useState, useEffect, useRef } from "react";
import { CheckIcon, PencilIcon } from "@/components/ui/icons/InsightIcons";
import type { SpecSuggestion } from "@/lib/types/next-move";
import type { InsightMode } from "@/lib/types/insight";

const sohne = "var(--font-sohne-breit), system-ui, sans-serif";
const inter = "var(--font-inter), system-ui, sans-serif";

/* ─── Next Move discriminated union ─────────────────────────────────────── */

export type ConceptNextMoveItem = { label: string; rationale: string; type?: 'chip' | 'silhouette_swap' | 'palette_swap' };

type NextMoveConceptProps = {
  mode: "concept";
  items: ConceptNextMoveItem[];
  subtitle?: string;
  onAdd: (item: string) => void;
  onRemove?: (item: string) => void;
  addedItems?: Set<string>;
};

type NextMoveSpecProps = {
  mode: "spec";
  suggestions: SpecSuggestion[];
  subtitle?: string;
  appliedIds: Set<string>;
  onApply: (id: string) => void;
  onUndo: (id: string) => void;
};

type NextMoveProps = NextMoveConceptProps | NextMoveSpecProps;

/* ─── Main component ────────────────────────────────────────────────────── */

export interface ConstructionImplication {
  chip: string;
  detail: string;
  cost_note: string;
  complexity_flag: string;
  avoid: string;
}

export interface MukoInsightSectionProps {
  headline: string;
  paragraphs: string[];
  bullets: { label: string; items: string[]; subtitle?: string };
  nextMove: NextMoveProps;
  constructionImplications?: ConstructionImplication[];
  mode?: InsightMode;
  /** True while the LLM is streaming new text */
  isStreaming?: boolean;
  /** Partial value extracted from the in-progress JSON */
  streamingText?: string;
  /** 'concept' activates the narrative right-panel layout */
  pageMode?: "concept" | "spec";
  /** Called when "Apply All & Continue →" is clicked in concept narrative mode */
  onContinue?: () => void;
}

/* ─── Fixed positioning row labels (concept narrative mode) ─────────────── */
const POSITION_LABELS = ["Market Gap", "Reference Point", "Brand Permission"];

export function MukoInsightSection({
  headline,
  paragraphs,
  bullets,
  nextMove,
  constructionImplications,
  mode,
  isStreaming = false,
  streamingText = '',
  pageMode,
  onContinue,
}: MukoInsightSectionProps) {
  const [dlExpanded, setDlExpanded] = useState(true);
  const [bulletsExpanded, setBulletsExpanded] = useState(true);
  const [expandedChips, setExpandedChips] = useState<Set<string>>(new Set());
  const implKey = constructionImplications?.map(s => s.chip).join('|') ?? '';
  useEffect(() => {
    setExpandedChips(new Set());
  }, [implKey]);
  function toggleChip(label: string) {
    setExpandedChips(prev => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  }
  function getFirstSentence(text: string): string {
    const match = text.match(/^[^.!?]*[.!?]/);
    return match ? match[0] : text;
  }
  function getLastSentence(text: string): string {
    const sentences = text.match(/[^.!?]+[.!?]+/g);
    return sentences ? sentences[sentences.length - 1].trim() : text;
  }

  /* ══════════════════════════════════════════════════════════════════════
     CONCEPT NARRATIVE MODE — flowing Situation → Meaning → Action layout
  ══════════════════════════════════════════════════════════════════════ */
  if (pageMode === "concept") {
    return (
      <div style={{ marginBottom: 28 }}>

        {/* Streaming keyframes */}
        {isStreaming && (
          <style>{`@keyframes mukoCursorBlink{0%,100%{opacity:1}50%{opacity:0}}@keyframes mukoCardPulse{0%,100%{opacity:0.5}50%{opacity:0.8}}`}</style>
        )}

        {/* ── INSIGHT — Headline anchors the panel ───────────────────── */}
        <div
          style={{
            fontFamily: sohne,
            fontWeight: 500,
            fontSize: 20,
            color: "#191919",
            lineHeight: 1.3,
            marginBottom: 14,
            borderLeft: "3px solid #A8B475",
            paddingLeft: 16,
          }}
        >
          {isStreaming && streamingText ? (
            <>
              {streamingText}
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
            </>
          ) : isStreaming ? (
            <span style={{ opacity: 0.35, animation: "mukoCardPulse 1.2s ease-in-out infinite" }}>
              {headline}
            </span>
          ) : (
            headline
          )}
        </div>

        {/* Body paragraphs — no wrapping card, no box-shadow */}
        {!isStreaming && paragraphs.map((p, i) => (
          <p
            key={i}
            style={{
              margin: i < paragraphs.length - 1 ? "0 0 10px" : "0 0 0",
              fontFamily: inter,
              fontSize: 13.5,
              color: "rgba(67,67,43,0.82)",
              lineHeight: 1.65,
            }}
          >
            {p}
          </p>
        ))}

        {/* Construction Implications (kept as-is, concept mode rarely has these) */}
        {constructionImplications && constructionImplications.length > 0 && (
          <div style={{
            marginTop: 16,
            marginBottom: 0,
            borderRadius: 10,
            border: "1px solid rgba(67,67,43,0.09)",
            background: "transparent",
            padding: "16px 20px",
          }}>
            <button
              onClick={() => setDlExpanded(e => !e)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                width: "100%", background: "none", border: "none", cursor: "pointer",
                padding: 0, marginBottom: dlExpanded ? 6 : 0,
              }}
            >
              <span style={{ fontFamily: inter, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "#A8A09A" }}>
                construction implications ({constructionImplications.length})
              </span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, transform: dlExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 180ms ease", color: "rgba(67,67,43,0.35)" }}>
                <path d="M2 4.5L6 8L10 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {dlExpanded && (
              <>
                <div style={{ fontFamily: inter, fontSize: 11, fontStyle: "italic", color: "rgba(67,67,43,0.40)", marginBottom: 12 }}>
                  These signals influence complexity, cost, and production risk.
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {constructionImplications.map((s, i) => {
                    const isExpanded = expandedChips.has(s.chip);
                    const hasComplexity = s.complexity_flag === "high";
                    const firstSentence = getFirstSentence(s.detail);
                    return (
                      <div key={i}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                          <span style={{ padding: "3px 9px", borderRadius: 999, fontSize: 11, fontWeight: 500, fontFamily: inter, background: "rgba(125,150,172,0.08)", border: "1px solid rgba(125,150,172,0.55)", color: "#7D96AC", display: "inline-flex", alignItems: "center", flexShrink: 0 }}>
                            {s.chip}
                          </span>
                          <div style={{ flex: 1 }} />
                          {hasComplexity && (
                            <span style={{ fontFamily: inter, fontSize: 10, fontStyle: "italic", color: "#B8876B", flexShrink: 0 }}>↑ complexity</span>
                          )}
                          <button onClick={() => toggleChip(s.chip)} style={{ fontFamily: inter, fontSize: 11, color: "rgba(67,67,43,0.38)", background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}>
                            {isExpanded ? "[− less]" : "[+ more]"}
                          </button>
                        </div>
                        <div style={{ fontFamily: inter, fontSize: 12, color: "rgba(67,67,43,0.64)", lineHeight: 1.65 }}>
                          {isExpanded ? s.detail : (
                            <>{firstSentence}{s.cost_note && <span style={{ fontWeight: 600 }}>{" "}{getLastSentence(s.cost_note)}</span>}</>
                          )}
                        </div>
                        {isExpanded && (
                          <>
                            {s.cost_note && <div style={{ fontFamily: inter, fontSize: 11, color: "rgba(67,67,43,0.45)", marginTop: 8, lineHeight: 1.6 }}>$ {s.cost_note}</div>}
                            {s.avoid && (
                              <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(67,67,43,0.07)" }}>
                                <div style={{ fontFamily: inter, fontSize: 11, color: "rgba(169,123,143,0.70)", lineHeight: 1.6 }}>
                                  <span style={{ fontFamily: inter, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "#A97B8F", marginRight: 4 }}>AVOID</span>
                                  {s.avoid}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── SECTION DIVIDER ─────────────────────────────────────────── */}
        <div style={{ height: 1, background: "#E8E3D6", margin: "24px 0" }} />

        {/* ── POSITIONING — two-column grid ───────────────────────────── */}
        {bullets.items.length > 0 && (
          <div style={{ marginBottom: 0 }}>
            <button
              onClick={() => setBulletsExpanded(e => !e)}
              disabled={isStreaming}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                background: "none",
                border: "none",
                cursor: isStreaming ? "default" : "pointer",
                padding: 0,
                marginBottom: bulletsExpanded ? 12 : 0,
              }}
            >
              <span
                style={{
                  fontFamily: inter,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase" as const,
                  color: "#A8A09A",
                }}
              >
                {bullets.label || "Positioning"}
              </span>
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                style={{
                  flexShrink: 0,
                  transform: bulletsExpanded ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 180ms ease",
                  color: "rgba(67,67,43,0.30)",
                }}
              >
                <path d="M2 4.5L6 8L10 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {bulletsExpanded && !isStreaming && (
              <div>
                {bullets.items.slice(0, 3).map((item, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && (
                      <div style={{ height: 1, background: "#F0EDE8" }} />
                    )}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "108px 1fr",
                        gap: 0,
                      }}
                    >
                      <div
                        style={{
                          padding: "11px 12px 11px 0",
                          fontFamily: inter,
                          fontSize: 11,
                          fontWeight: 600,
                          color: "#A8B475",
                          lineHeight: 1.4,
                          letterSpacing: "0.01em",
                        }}
                      >
                        {POSITION_LABELS[i] ?? bullets.label}
                      </div>
                      <div
                        style={{
                          padding: "11px 0",
                          fontFamily: inter,
                          fontSize: 13,
                          color: "rgba(67,67,43,0.70)",
                          lineHeight: 1.6,
                        }}
                      >
                        {item}
                      </div>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            )}

            {isStreaming && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
                {[70, 55, 80].map((w, i) => (
                  <div key={i} style={{ height: 11, borderRadius: 4, background: "rgba(67,67,43,0.07)", width: `${w}%`, animation: "mukoCardPulse 1.5s ease-in-out infinite" }} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── NEXT MOVE — concept mode ─────────────────────────────────── */}
        {nextMove.mode === "concept" && nextMove.items.length > 0 && (() => {
          const addedItems = nextMove.addedItems ?? new Set<string>();
          const addedCount = addedItems.size;
          return (
            <ConceptNarrativeNextMove
              items={nextMove.items}
              addedItems={addedItems}
              onAdd={nextMove.onAdd}
              onRemove={nextMove.onRemove}
            />
          );
        })()}

        {/* ── Next Move — Spec (narrative card style) ──────────────────── */}
        {nextMove.mode === "spec" && nextMove.suggestions.length > 0 && (() => {
          const suggestions = nextMove.suggestions.slice(0, 3);
          return (
            <SpecNarrativeNextMove
              suggestions={suggestions}
              appliedIds={nextMove.appliedIds}
              onApply={nextMove.onApply}
              onUndo={nextMove.onUndo}
            />
          );
        })()}

      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════════════════
     DEFAULT MODE — existing layout (spec page, etc.)
  ══════════════════════════════════════════════════════════════════════ */
  return (
    <div style={{ marginBottom: 28 }}>
      {/* Section divider */}
      <div style={{ height: 1, background: "rgba(67,67,43,0.12)", margin: "24px 0" }} />

      {/* Section label */}
      <div
        style={{
          fontFamily: inter,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "rgba(67,67,43,0.38)",
          marginBottom: 16,
        }}
      >
        MUKO INSIGHT
      </div>

      {/* Streaming cursor keyframes */}
      {isStreaming && (
        <style>{`@keyframes mukoCursorBlink{0%,100%{opacity:1}50%{opacity:0}}@keyframes mukoCardPulse{0%,100%{opacity:0.5}50%{opacity:0.8}}`}</style>
      )}

      {/* Headline */}
      <div
        style={{
          fontFamily: sohne,
          fontWeight: 500,
          fontSize: "clamp(1.15rem, 2vw, 1.35rem)",
          color: "#43432B",
          lineHeight: 1.3,
          marginBottom: 16,
          borderLeft: "3px solid #A8B475",
          paddingLeft: 16,
        }}
      >
        {isStreaming && streamingText ? (
          <>
            {streamingText}
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
          </>
        ) : isStreaming ? (
          <span style={{ opacity: 0.35, animation: "mukoCardPulse 1.2s ease-in-out infinite" }}>
            {headline}
          </span>
        ) : (
          headline
        )}
      </div>

      {/* Body paragraphs */}
      {!isStreaming && paragraphs.map((p, i) => (
        <p
          key={i}
          style={{
            margin: i < paragraphs.length - 1 ? "0 0 12px" : "0 0 20px",
            fontFamily: inter,
            fontSize: 12.5,
            color: `rgba(67,67,43,${0.64 - i * 0.04})`,
            lineHeight: 1.7,
          }}
        >
          {p}
        </p>
      ))}

      {/* Construction Implications */}
      {constructionImplications && constructionImplications.length > 0 && (
        <div style={{
          marginBottom: 16,
          borderRadius: 10,
          border: "1px solid rgba(67,67,43,0.09)",
          background: "transparent",
          padding: "16px 20px",
        }}>
          <button
            onClick={() => setDlExpanded(e => !e)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              width: "100%", background: "none", border: "none", cursor: "pointer",
              padding: 0, marginBottom: dlExpanded ? 6 : 0,
            }}
          >
            <span style={{ fontFamily: inter, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(67,67,43,0.38)" }}>
              construction implications ({constructionImplications.length})
            </span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, transform: dlExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 180ms ease", color: "rgba(67,67,43,0.35)" }}>
              <path d="M2 4.5L6 8L10 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          {dlExpanded && (
            <>
              <div style={{ fontFamily: inter, fontSize: 11, fontStyle: "italic", color: "rgba(67,67,43,0.40)", marginBottom: 12 }}>
                These signals influence complexity, cost, and production risk.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {constructionImplications.map((s, i) => {
                  const isExpanded = expandedChips.has(s.chip);
                  const hasComplexity = s.complexity_flag === "high";
                  const firstSentence = getFirstSentence(s.detail);
                  return (
                    <div key={i}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                        <span style={{ padding: "3px 9px", borderRadius: 999, fontSize: 11, fontWeight: 500, fontFamily: inter, background: "rgba(125,150,172,0.08)", border: "1px solid rgba(125,150,172,0.55)", color: "#7D96AC", display: "inline-flex", alignItems: "center", flexShrink: 0 }}>
                          {s.chip}
                        </span>
                        <div style={{ flex: 1 }} />
                        {hasComplexity && (
                          <span style={{ fontFamily: inter, fontSize: 10, fontStyle: "italic", color: "#B8876B", flexShrink: 0 }}>↑ complexity</span>
                        )}
                        <button onClick={() => toggleChip(s.chip)} style={{ fontFamily: inter, fontSize: 11, color: "rgba(67,67,43,0.38)", background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}>
                          {isExpanded ? "[− less]" : "[+ more]"}
                        </button>
                      </div>
                      <div style={{ fontFamily: inter, fontSize: 12, color: "rgba(67,67,43,0.64)", lineHeight: 1.65 }}>
                        {isExpanded ? s.detail : (
                          <>{firstSentence}{s.cost_note && <span style={{ fontWeight: 600 }}>{" "}{getLastSentence(s.cost_note)}</span>}</>
                        )}
                      </div>
                      {isExpanded && (
                        <>
                          {s.cost_note && <div style={{ fontFamily: inter, fontSize: 11, color: "rgba(67,67,43,0.45)", marginTop: 8, lineHeight: 1.6 }}>$ {s.cost_note}</div>}
                          {s.avoid && (
                            <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(67,67,43,0.07)" }}>
                              <div style={{ fontFamily: inter, fontSize: 11, color: "rgba(169,123,143,0.70)", lineHeight: 1.6 }}>
                                <span style={{ fontFamily: inter, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "#A97B8F", marginRight: 4 }}>AVOID</span>
                                {s.avoid}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Bullets card — camel, always renders */}
      <div
        style={{
          padding: "11px 16px",
          borderRadius: 10,
          border: "1px solid rgba(184,135,107,0.22)",
          borderLeft: "3px solid rgba(184,135,107,0.40)",
          background: "transparent",
          marginBottom: 16,
          animation: isStreaming ? "mukoCardPulse 1.5s ease-in-out infinite" : undefined,
        }}
      >
        <button
          onClick={() => setBulletsExpanded(e => !e)}
          disabled={isStreaming}
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            width: "100%", background: "none", border: "none", cursor: isStreaming ? "default" : "pointer",
            padding: 0, marginBottom: (!isStreaming && bulletsExpanded) ? 4 : 0,
          }}
        >
          <span style={{ fontFamily: inter, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "#B8876B" }}>
            {bullets.label}
          </span>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, transform: (!isStreaming && bulletsExpanded) ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 180ms ease", color: "#B8876B" }}>
            <path d="M2 4.5L6 8L10 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        {!isStreaming && bulletsExpanded && bullets.items.length > 0 && (
          <ul style={{ margin: "8px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 7 }}>
            {bullets.items.map((item, i) => (
              <li key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontFamily: inter, fontSize: 12, color: "rgba(67,67,43,0.66)", lineHeight: 1.55 }}>
                <span style={{ color: "rgba(184,135,107,0.55)", flexShrink: 0, marginTop: 1, fontSize: 11 }}>·</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Next Move — Concept ──────────────────────────────────────────── */}
      {nextMove.mode === "concept" && nextMove.items.length > 0 && (() => {
        const addedCount = nextMove.addedItems?.size ?? 0;
        return (
          <NextMoveCard subtitle={nextMove.subtitle || "Suggested pivots and creative additions \u2014 apply a swap or layer in what resonates."}>
            {nextMove.items.map((item, i) => {
              const isSwap = item.type === 'silhouette_swap' || item.type === 'palette_swap';
              const tagType: 'add' | 'swap' | 'redirect' = isSwap ? 'swap' : 'add';
              const impact: 'HIGH' | 'MED' | 'LOW' = isSwap ? 'HIGH' : i === 0 ? 'MED' : 'LOW';
              const isAdded = nextMove.addedItems?.has(item.label) ?? false;
              return (
                <React.Fragment key={item.label}>
                  {i > 0 && <div style={{ height: 1, background: "rgba(125,150,172,0.10)", margin: "0 4px" }} />}
                  <NextMoveRow
                    index={i}
                    action={item.label}
                    rationale={item.rationale}
                    tagType={tagType}
                    impact={impact}
                    isAdded={isAdded}
                    applyLabel={isSwap ? "← Apply" : "+ Add"}
                    onToggle={() => {
                      if (isAdded) {
                        nextMove.onRemove?.(item.label);
                      } else {
                        nextMove.onAdd(item.label);
                      }
                    }}
                    onUndo={nextMove.onRemove ? () => nextMove.onRemove!(item.label) : undefined}
                  />
                </React.Fragment>
              );
            })}
            <NextMoveFooter
              total={nextMove.items.length}
              added={addedCount}
              onApplyAll={() => {
                nextMove.items.forEach(item => {
                  if (!(nextMove.addedItems?.has(item.label))) {
                    nextMove.onAdd(item.label);
                  }
                });
              }}
            />
          </NextMoveCard>
        );
      })()}

      {/* ── Next Move — Spec ─────────────────────────────────────────────── */}
      {nextMove.mode === "spec" && nextMove.suggestions.length > 0 && (() => {
        const suggestions = nextMove.suggestions.slice(0, 3);
        const addedCount = suggestions.filter(s => nextMove.appliedIds.has(s.id)).length;
        return (
          <NextMoveCard subtitle={nextMove.subtitle || "Adjustments that improve feasibility without changing your direction."}>
            {suggestions.map((suggestion, i) => {
              let tagType: 'add' | 'swap' | 'redirect' = 'swap';
              if (suggestion.kind === 'material' || suggestion.kind === 'upgrade-material') {
                tagType = 'redirect';
              } else if (suggestion.id === 'invest-finishing') {
                tagType = 'add';
              }
              const saving = Math.abs(suggestion.after.saving);
              const impact: 'HIGH' | 'MED' | 'LOW' = saving > 20 ? 'HIGH' : saving > 10 ? 'MED' : 'LOW';
              const isApplied = nextMove.appliedIds.has(suggestion.id);
              return (
                <React.Fragment key={suggestion.id}>
                  {i > 0 && <div style={{ height: 1, background: "rgba(125,150,172,0.10)", margin: "0 4px" }} />}
                  <SpecNextMoveRow
                    index={i}
                    suggestion={suggestion}
                    tagType={tagType}
                    impact={impact}
                    isApplied={isApplied}
                    onApply={() => nextMove.onApply(suggestion.id)}
                    onUndo={() => nextMove.onUndo(suggestion.id)}
                  />
                </React.Fragment>
              );
            })}
            <NextMoveFooter
              total={suggestions.length}
              added={addedCount}
              onApplyAll={() => {
                suggestions.forEach(s => {
                  if (!nextMove.appliedIds.has(s.id)) {
                    nextMove.onApply(s.id);
                  }
                });
              }}
            />
          </NextMoveCard>
        );
      })()}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   CONCEPT NARRATIVE NEXT MOVE — new flowing card layout
══════════════════════════════════════════════════════════════════════════ */

function ConceptNarrativeNextMove({
  items,
  addedItems,
  onAdd,
  onRemove,
}: {
  items: ConceptNextMoveItem[];
  addedItems: Set<string>;
  onAdd: (label: string) => void;
  onRemove?: (label: string) => void;
}) {
  return (
    <div>
      {/* Section divider */}
      <div style={{ height: 1, background: "#E8E3D6", margin: "24px 0" }} />

      {/* Section label */}
      <div
        style={{
          fontFamily: inter,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "#A8A09A",
          marginBottom: 12,
        }}
      >
        Next Move
      </div>

      {/* Move items */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((item, idx) => {
          const isSwap = item.type === 'silhouette_swap' || item.type === 'palette_swap';
          const impact: 'HIGH' | 'MED' | 'LOW' = isSwap ? 'HIGH' : idx === 0 ? 'MED' : 'LOW';
          const isApplied = addedItems.has(item.label);
          return (
            <ConceptMoveCard
              key={item.label}
              item={item}
              isSwap={isSwap}
              impact={impact}
              isApplied={isApplied}
              onToggle={() => {
                if (isApplied) {
                  onRemove?.(item.label);
                } else {
                  onAdd(item.label);
                }
              }}
              onUndo={onRemove ? () => onRemove(item.label) : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}

const MOVE_TAG_STYLES = {
  add:   { bg: "rgba(168,180,117,0.16)", border: "rgba(168,180,117,0.40)", text: "#6B7D30" },
  shift: { bg: "rgba(184,135,107,0.14)", border: "rgba(184,135,107,0.38)", text: "#A06840" },
};

const MOVE_IMPACT_COLORS = { HIGH: "#A8B475", MED: "#B8876B", LOW: "#A97B8F" };

function ConceptMoveCard({
  item,
  isSwap,
  impact,
  isApplied,
  onToggle,
  onUndo,
}: {
  item: ConceptNextMoveItem;
  isSwap: boolean;
  impact: 'HIGH' | 'MED' | 'LOW';
  isApplied: boolean;
  onToggle: () => void;
  onUndo?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const tag = isSwap ? MOVE_TAG_STYLES.shift : MOVE_TAG_STYLES.add;
  const tagLabel = isSwap ? "SHIFT" : "ADD";

  return (
    <div
      style={{
        padding: "14px 16px",
        borderRadius: 10,
        border: isApplied
          ? "1.5px solid rgba(168,180,117,0.50)"
          : hovered
          ? "1px solid rgba(67,67,43,0.18)"
          : "1px solid rgba(67,67,43,0.10)",
        background: isApplied ? "rgba(168,180,117,0.06)" : "#FAFAF8",
        transition: "border-color 150ms ease, background 150ms ease",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Top row: tag + impact dot LEFT · Apply button RIGHT */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* ADD / SHIFT tag */}
          <span
            style={{
              fontFamily: inter,
              fontSize: 9.5,
              fontWeight: 700,
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              color: tag.text,
              background: tag.bg,
              border: `1px solid ${tag.border}`,
              borderRadius: 4,
              padding: "2px 7px",
              lineHeight: 1.4,
            }}
          >
            {tagLabel}
          </span>
          {/* Impact dot + label */}
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: MOVE_IMPACT_COLORS[impact],
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontFamily: inter,
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "rgba(67,67,43,0.38)",
              }}
            >
              {impact}
            </span>
          </div>
        </div>

        {/* Apply / Applied button */}
        {isApplied ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: inter, fontSize: 11, fontWeight: 700, color: "#A8B475" }}>
              ✓ Applied
            </span>
            {onUndo && (
              <button
                onClick={e => { e.stopPropagation(); onUndo(); }}
                style={{ fontFamily: inter, fontSize: 11, color: "rgba(67,67,43,0.40)", textDecoration: "underline", background: "none", border: "none", cursor: "pointer", padding: 0 }}
              >
                Remove
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={onToggle}
            style={{
              fontFamily: inter,
              fontSize: 11.5,
              fontWeight: 600,
              color: "rgba(67,67,43,0.62)",
              background: "transparent",
              border: "1.5px solid rgba(67,67,43,0.22)",
              borderRadius: 999,
              padding: "5px 14px",
              cursor: "pointer",
              transition: "border-color 150ms ease, color 150ms ease",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(67,67,43,0.40)";
              (e.currentTarget as HTMLButtonElement).style.color = "rgba(67,67,43,0.82)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(67,67,43,0.22)";
              (e.currentTarget as HTMLButtonElement).style.color = "rgba(67,67,43,0.62)";
            }}
          >
            + Apply
          </button>
        )}
      </div>

      {/* Title — inter */}
      <div
        style={{
          fontFamily: inter,
          fontSize: 13.5,
          fontWeight: 600,
          color: isApplied ? "#A8B475" : "#191919",
          lineHeight: 1.3,
          marginBottom: item.rationale ? 6 : 0,
        }}
      >
        {item.label}
      </div>

      {/* Reason — inter */}
      {item.rationale && (
        <div
          style={{
            fontFamily: inter,
            fontSize: 12,
            color: "#6B6560",
            lineHeight: 1.55,
          }}
        >
          {item.rationale}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   SPEC NARRATIVE NEXT MOVE — same card layout as concept, spec data shape
══════════════════════════════════════════════════════════════════════════ */

const SPEC_TAG_STYLES = {
  add:      { bg: "rgba(168,180,117,0.16)", border: "rgba(168,180,117,0.40)", text: "#6B7D30", label: "ADD" },
  shift:    { bg: "rgba(184,135,107,0.14)", border: "rgba(184,135,107,0.38)", text: "#A06840", label: "SHIFT" },
  redirect: { bg: "rgba(125,150,172,0.14)", border: "rgba(125,150,172,0.38)", text: "#4A6E85", label: "REDIRECT" },
};

function SpecNarrativeNextMove({
  suggestions,
  appliedIds,
  onApply,
  onUndo,
}: {
  suggestions: SpecSuggestion[];
  appliedIds: Set<string>;
  onApply: (id: string) => void;
  onUndo: (id: string) => void;
}) {
  return (
    <div>
      <div style={{ height: 1, background: "#E8E3D6", margin: "24px 0" }} />
      <div style={{ fontFamily: inter, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#A8A09A", marginBottom: 12 }}>
        Next Move
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {suggestions.map((suggestion) => {
          let tagKey: 'add' | 'shift' | 'redirect' = 'shift';
          if (suggestion.kind === 'material' || suggestion.kind === 'upgrade-material') tagKey = 'redirect';
          else if (suggestion.id === 'invest-finishing') tagKey = 'add';
          const saving = Math.abs(suggestion.after.saving);
          const impact: 'HIGH' | 'MED' | 'LOW' = saving > 20 ? 'HIGH' : saving > 10 ? 'MED' : 'LOW';
          const isApplied = appliedIds.has(suggestion.id);
          return (
            <SpecNarrativeMoveCard
              key={suggestion.id}
              suggestion={suggestion}
              tagKey={tagKey}
              impact={impact}
              isApplied={isApplied}
              onApply={() => onApply(suggestion.id)}
              onUndo={() => onUndo(suggestion.id)}
            />
          );
        })}
      </div>
    </div>
  );
}

function SpecNarrativeMoveCard({
  suggestion,
  tagKey,
  impact,
  isApplied,
  onApply,
  onUndo,
}: {
  suggestion: SpecSuggestion;
  tagKey: 'add' | 'shift' | 'redirect';
  impact: 'HIGH' | 'MED' | 'LOW';
  isApplied: boolean;
  onApply: () => void;
  onUndo: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [flashActive, setFlashActive] = useState(false);
  const tag = SPEC_TAG_STYLES[tagKey];

  useEffect(() => {
    if (isApplied) {
      setFlashActive(true);
      const timer = setTimeout(() => setFlashActive(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isApplied]);

  return (
    <div
      style={{
        padding: "14px 16px",
        borderRadius: 10,
        border: isApplied
          ? "1.5px solid rgba(168,180,117,0.50)"
          : hovered
          ? "1px solid rgba(67,67,43,0.18)"
          : "1px solid rgba(67,67,43,0.10)",
        background: flashActive
          ? "rgba(168,180,117,0.10)"
          : isApplied
          ? "rgba(168,180,117,0.06)"
          : "#FAFAF8",
        transition: "border-color 150ms ease, background 200ms ease",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Top row: tag + impact LEFT · Apply button RIGHT */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: inter, fontSize: 9.5, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", color: tag.text, background: tag.bg, border: `1px solid ${tag.border}`, borderRadius: 4, padding: "2px 7px", lineHeight: 1.4 }}>
            {tag.label}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: MOVE_IMPACT_COLORS[impact], flexShrink: 0 }} />
            <span style={{ fontFamily: inter, fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(67,67,43,0.38)" }}>
              {impact}
            </span>
          </div>
        </div>
        {isApplied ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: inter, fontSize: 11, fontWeight: 700, color: "#A8B475" }}>✓ Applied</span>
            <button onClick={onUndo} style={{ fontFamily: inter, fontSize: 11, color: "rgba(67,67,43,0.40)", textDecoration: "underline", background: "none", border: "none", cursor: "pointer", padding: 0 }}>Undo</button>
          </div>
        ) : (
          <button
            onClick={onApply}
            style={{ fontFamily: inter, fontSize: 11.5, fontWeight: 600, color: "rgba(67,67,43,0.62)", background: "transparent", border: "1.5px solid rgba(67,67,43,0.22)", borderRadius: 999, padding: "5px 14px", cursor: "pointer", transition: "border-color 150ms ease, color 150ms ease", whiteSpace: "nowrap" }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(67,67,43,0.40)"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(67,67,43,0.82)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(67,67,43,0.22)"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(67,67,43,0.62)"; }}
          >
            + Apply
          </button>
        )}
      </div>
      {/* Title — inter */}
      <div style={{ fontFamily: inter, fontSize: 13.5, fontWeight: 600, color: isApplied ? "#A8B475" : "#191919", lineHeight: 1.3, marginBottom: suggestion.sub ? 6 : 0 }}>
        {suggestion.label}
      </div>
      {suggestion.sub && (
        <div style={{ fontFamily: inter, fontSize: 12, color: "#6B6560", lineHeight: 1.55 }}>
          {suggestion.sub}
        </div>
      )}
    </div>
  );
}

/* ─── Tag + impact helpers ──────────────────────────────────────────────── */

const TAG_STYLES = {
  add:      { bg: "rgba(168,180,117,0.14)", border: "rgba(168,180,117,0.38)", text: "#7A8C3A" },
  swap:     { bg: "rgba(184,135,107,0.12)", border: "rgba(184,135,107,0.35)", text: "#B8876B" },
  redirect: { bg: "rgba(125,150,172,0.12)", border: "rgba(125,150,172,0.35)", text: "#7D96AC" },
};
const TAG_LABELS = { add: "Add", swap: "Swap", redirect: "Redirect" };
const IMPACT_COLORS = { HIGH: "#A8B475", MED: "#B8876B", LOW: "#7D96AC" };

/* ─── Next Move card shell (default mode) ───────────────────────────────── */

function NextMoveCard({ subtitle, children }: { subtitle: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: "11px 16px",
        borderRadius: 10,
        border: "1px solid rgba(125,150,172,0.22)",
        borderLeft: "3px solid rgba(125,150,172,0.35)",
        background: "transparent",
      }}
    >
      <div style={{ fontFamily: inter, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#7D96AC", marginBottom: 4 }}>
        NEXT MOVE
      </div>
      <div style={{ fontFamily: inter, fontSize: 11, fontStyle: "italic", color: "rgba(67,67,43,0.45)", marginBottom: 12 }}>
        {subtitle}
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {children}
      </div>
    </div>
  );
}

/* ─── Shared row chrome ─────────────────────────────────────────────────── */

function RowShell({
  index,
  tagType,
  impact,
  isAdded,
  hovered,
  onMouseEnter,
  onMouseLeave,
  children,
}: {
  index: number;
  tagType: 'add' | 'swap' | 'redirect';
  impact: 'HIGH' | 'MED' | 'LOW';
  isAdded: boolean;
  hovered: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  children: React.ReactNode;
}) {
  const tag = TAG_STYLES[tagType];
  const numStr = String(index + 1).padStart(2, '0');

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
        padding: "9px 4px",
        transition: "background 150ms ease",
        background: isAdded ? "rgba(168,180,117,0.07)" : "transparent",
        borderRadius: 6,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div style={{ fontFamily: inter, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", color: isAdded ? "rgba(168,180,117,0.70)" : "rgba(67,67,43,0.22)", flexShrink: 0, marginTop: 2, width: 18 }}>
        {numStr}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
          <span style={{ fontFamily: inter, fontSize: 9, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", color: tag.text, background: tag.bg, border: `1px solid ${tag.border}`, borderRadius: 3, padding: "1px 5px", lineHeight: 1.4 }}>
            {TAG_LABELS[tagType]}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <div style={{ width: 4, height: 4, borderRadius: "50%", background: IMPACT_COLORS[impact], flexShrink: 0 }} />
            <span style={{ fontFamily: inter, fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(67,67,43,0.32)" }}>
              {impact}
            </span>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ─── Concept mode row (default layout) ─────────────────────────────────── */

function NextMoveRow({
  index,
  action,
  rationale,
  tagType,
  impact,
  isAdded,
  applyLabel,
  onToggle,
  onUndo,
}: {
  index: number;
  action: string;
  rationale: string;
  tagType: 'add' | 'swap' | 'redirect';
  impact: 'HIGH' | 'MED' | 'LOW';
  isAdded: boolean;
  applyLabel: string;
  onToggle: () => void;
  onUndo?: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <RowShell
      index={index}
      tagType={tagType}
      impact={impact}
      isAdded={isAdded}
      hovered={hovered}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ fontFamily: inter, fontSize: 12.5, fontWeight: 600, color: isAdded ? "#A8B475" : "rgba(67,67,43,0.72)", lineHeight: 1.4 }}>
        {action}
      </div>
      <div style={{ fontFamily: inter, fontSize: 11, fontStyle: "italic", color: "rgba(67,67,43,0.40)", lineHeight: 1.4, marginTop: 2 }}>
        {rationale}
      </div>
      {isAdded ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
          <span style={{ fontFamily: inter, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#A8B475" }}>
            {applyLabel.startsWith("←") ? "Applied \u2713" : "Added \u2713"}
          </span>
          {onUndo && (
            <button onClick={(e) => { e.stopPropagation(); onUndo(); }} style={{ fontFamily: inter, fontSize: 10, color: "rgba(67,67,43,0.45)", textDecoration: "underline", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              {applyLabel.startsWith("←") ? "Undo" : "Remove"}
            </button>
          )}
        </div>
      ) : (
        <button
          onClick={onToggle}
          style={{ fontFamily: inter, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#A8B475", background: "transparent", border: `1px solid rgba(168,180,117,${hovered ? 0.50 : 0.35})`, borderRadius: 999, padding: "4px 10px", cursor: "pointer", opacity: hovered ? 1 : 0.7, transition: "opacity 150ms ease, border-color 150ms ease", whiteSpace: "nowrap", marginTop: 6 }}
        >
          {applyLabel}
        </button>
      )}
    </RowShell>
  );
}

/* ─── Spec mode row ─────────────────────────────────────────────────────── */

function SpecNextMoveRow({
  index,
  suggestion,
  tagType,
  impact,
  isApplied,
  onApply,
  onUndo,
}: {
  index: number;
  suggestion: SpecSuggestion;
  tagType: 'add' | 'swap' | 'redirect';
  impact: 'HIGH' | 'MED' | 'LOW';
  isApplied: boolean;
  onApply: () => void;
  onUndo: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [flashActive, setFlashActive] = useState(false);

  useEffect(() => {
    if (isApplied) {
      setFlashActive(true);
      const timer = setTimeout(() => setFlashActive(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isApplied]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "11px 8px",
        borderRadius: 8,
        background: flashActive ? "rgba(168,180,117,0.12)" : isApplied ? "rgba(168,180,117,0.07)" : "transparent",
        transition: "background 200ms ease",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ fontFamily: inter, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", color: isApplied ? "rgba(168,180,117,0.70)" : "rgba(67,67,43,0.22)", flexShrink: 0, marginTop: 2, width: 18 }}>
        {String(index + 1).padStart(2, '0')}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
          <span style={{ fontFamily: inter, fontSize: 9, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", color: TAG_STYLES[tagType].text, background: TAG_STYLES[tagType].bg, border: `1px solid ${TAG_STYLES[tagType].border}`, borderRadius: 3, padding: "1px 5px", lineHeight: 1.4 }}>
            {TAG_LABELS[tagType]}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <div style={{ width: 4, height: 4, borderRadius: "50%", background: IMPACT_COLORS[impact], flexShrink: 0 }} />
            <span style={{ fontFamily: inter, fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(67,67,43,0.32)" }}>
              {impact}
            </span>
          </div>
        </div>
        <div style={{ fontFamily: inter, fontSize: 12.5, fontWeight: 600, color: isApplied ? "#A8B475" : "rgba(67,67,43,0.72)", lineHeight: 1.4 }}>
          {suggestion.label}
        </div>
        {suggestion.sub && (
          <div style={{ fontFamily: inter, fontSize: 11, fontStyle: "italic", color: "rgba(67,67,43,0.40)", lineHeight: 1.4, marginTop: 2 }}>
            {suggestion.sub}
          </div>
        )}
        {isApplied ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
            <span style={{ fontFamily: inter, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#A8B475" }}>Applied {"\u2713"}</span>
            <button onClick={onUndo} style={{ fontFamily: inter, fontSize: 10, color: "rgba(67,67,43,0.45)", textDecoration: "underline", background: "none", border: "none", cursor: "pointer", padding: 0 }}>Undo</button>
          </div>
        ) : (
          <button
            onClick={onApply}
            style={{ fontFamily: inter, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#A8B475", background: "transparent", border: `1px solid rgba(168,180,117,${hovered ? 0.50 : 0.35})`, borderRadius: 999, padding: "4px 10px", cursor: "pointer", opacity: hovered ? 1 : 0.7, transition: "opacity 150ms ease, border-color 150ms ease", whiteSpace: "nowrap", marginTop: 6 }}
          >
            {"\u2190"} Apply
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Footer (default mode) ─────────────────────────────────────────────── */

function NextMoveFooter({
  total,
  added,
  onApplyAll,
}: {
  total: number;
  added: number;
  onApplyAll: () => void;
}) {
  const allAdded = added >= total;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(125,150,172,0.12)" }}>
      <span style={{ fontFamily: inter, fontSize: 10, fontStyle: "italic", color: "rgba(67,67,43,0.38)" }}>
        {added} of {total} applied
      </span>
      {!allAdded && (
        <button
          onClick={onApplyAll}
          style={{ fontFamily: inter, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#A8B475", background: "transparent", border: "1px solid rgba(168,180,117,0.35)", borderRadius: 999, padding: "4px 10px", cursor: "pointer", opacity: 0.8, transition: "opacity 150ms ease" }}
          onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
          onMouseLeave={e => (e.currentTarget.style.opacity = "0.8")}
        >
          Apply all →
        </button>
      )}
    </div>
  );
}
