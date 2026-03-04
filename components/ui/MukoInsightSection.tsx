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
  /** True while the LLM is streaming new text — activates streaming display state */
  isStreaming?: boolean;
  /** Partial `brand_alignment` / `margin_read` value extracted from the in-progress JSON */
  streamingText?: string;
}

export function MukoInsightSection({
  headline,
  paragraphs,
  bullets,
  nextMove,
  constructionImplications,
  mode,
  isStreaming = false,
  streamingText = '',
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

      {/* Streaming cursor keyframes — injected once per render */}
      {isStreaming && (
        <style>{`@keyframes mukoCursorBlink{0%,100%{opacity:1}50%{opacity:0}}@keyframes mukoCardPulse{0%,100%{opacity:0.5}50%{opacity:0.8}}`}</style>
      )}

      {/* Headline — pullquote style; shows streaming text while generating */}
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
          /* streaming started but no extractable text yet — pulse the border */
          <span style={{ opacity: 0.35, animation: "mukoCardPulse 1.2s ease-in-out infinite" }}>
            {headline}
          </span>
        ) : (
          headline
        )}
      </div>

      {/* Body paragraphs — hidden while streaming; show prior content faded */}
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

      {/* Construction Implications — collapsible */}
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
                      {/* Label row */}
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                        <span style={{
                          padding: "3px 9px",
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 500,
                          fontFamily: inter,
                          background: "rgba(125,150,172,0.08)",
                          border: "1px solid rgba(125,150,172,0.55)",
                          color: "#7D96AC",
                          display: "inline-flex",
                          alignItems: "center",
                          flexShrink: 0,
                        }}>
                          {s.chip}
                        </span>
                        <div style={{ flex: 1 }} />
                        {hasComplexity && (
                          <span style={{ fontFamily: inter, fontSize: 10, fontStyle: "italic", color: "#B8876B", flexShrink: 0 }}>
                            ↑ complexity
                          </span>
                        )}
                        <button
                          onClick={() => toggleChip(s.chip)}
                          style={{
                            fontFamily: inter,
                            fontSize: 11,
                            color: "rgba(67,67,43,0.38)",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: 0,
                            flexShrink: 0,
                          }}
                        >
                          {isExpanded ? "[− less]" : "[+ more]"}
                        </button>
                      </div>
                      <div style={{ fontFamily: inter, fontSize: 12, color: "rgba(67,67,43,0.64)", lineHeight: 1.65 }}>
                        {isExpanded ? s.detail : (
                          <>
                            {firstSentence}
                            {s.cost_note && (
                              <span style={{ fontWeight: 600 }}>{" "}{getLastSentence(s.cost_note)}</span>
                            )}
                          </>
                        )}
                      </div>
                      {isExpanded && (
                        <>
                          {s.cost_note && (
                            <div style={{ fontFamily: inter, fontSize: 11, color: "rgba(67,67,43,0.45)", marginTop: 8, lineHeight: 1.6 }}>
                              $ {s.cost_note}
                            </div>
                          )}
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

      {/* Single bullets card — camel, always renders; pulses while streaming */}
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

/* ─── Tag + impact helpers ──────────────────────────────────────────────── */

const TAG_STYLES = {
  add:      { bg: "rgba(168,180,117,0.14)", border: "rgba(168,180,117,0.38)", text: "#7A8C3A" },
  swap:     { bg: "rgba(184,135,107,0.12)", border: "rgba(184,135,107,0.35)", text: "#B8876B" },
  redirect: { bg: "rgba(125,150,172,0.12)", border: "rgba(125,150,172,0.35)", text: "#7D96AC" },
};
const TAG_LABELS = { add: "Add", swap: "Swap", redirect: "Redirect" };
const IMPACT_COLORS = { HIGH: "#A8B475", MED: "#B8876B", LOW: "#7D96AC" };

/* ─── Next Move card shell ──────────────────────────────────────────────── */

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
      {/* Micro-label — same pattern as THE OPPORTUNITY / THE EDIT */}
      <div
        style={{
          fontFamily: inter,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "#7D96AC",
          marginBottom: 4,
        }}
      >
        NEXT MOVE
      </div>
      <div
        style={{
          fontFamily: inter,
          fontSize: 11,
          fontStyle: "italic",
          color: "rgba(67,67,43,0.45)",
          marginBottom: 12,
        }}
      >
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
      {/* Row number — Inter, muted, same weight as micro-labels */}
      <div
        style={{
          fontFamily: inter,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.06em",
          color: isAdded ? "rgba(168,180,117,0.70)" : "rgba(67,67,43,0.22)",
          flexShrink: 0,
          marginTop: 2,
          width: 18,
        }}
      >
        {numStr}
      </div>

      {/* Content column */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Tag + impact row */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
          <span
            style={{
              fontFamily: inter,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              color: tag.text,
              background: tag.bg,
              border: `1px solid ${tag.border}`,
              borderRadius: 3,
              padding: "1px 5px",
              lineHeight: 1.4,
            }}
          >
            {TAG_LABELS[tagType]}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <div
              style={{
                width: 4,
                height: 4,
                borderRadius: "50%",
                background: IMPACT_COLORS[impact],
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontFamily: inter,
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "rgba(67,67,43,0.32)",
              }}
            >
              {impact}
            </span>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ─── Concept mode row ──────────────────────────────────────────────────── */

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
      {/* Action label */}
      <div
        style={{
          fontFamily: inter,
          fontSize: 12.5,
          fontWeight: 600,
          color: isAdded ? "#A8B475" : "rgba(67,67,43,0.72)",
          lineHeight: 1.4,
        }}
      >
        {action}
      </div>
      {/* Rationale */}
      <div
        style={{
          fontFamily: inter,
          fontSize: 11,
          fontStyle: "italic",
          color: "rgba(67,67,43,0.40)",
          lineHeight: 1.4,
          marginTop: 2,
        }}
      >
        {rationale}
      </div>
      {/* Button */}
      {isAdded ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
          <span
            style={{
              fontFamily: inter,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.08em",
              color: "#A8B475",
            }}
          >
            {applyLabel.startsWith("←") ? "Applied \u2713" : "Added \u2713"}
          </span>
          {onUndo && (
            <button
              onClick={(e) => { e.stopPropagation(); onUndo(); }}
              style={{
                fontFamily: inter,
                fontSize: 10,
                color: "rgba(67,67,43,0.45)",
                textDecoration: "underline",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
            >
              {applyLabel.startsWith("←") ? "Undo" : "Remove"}
            </button>
          )}
        </div>
      ) : (
        <button
          onClick={onToggle}
          style={{
            fontFamily: inter,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.08em",
            color: "#A8B475",
            background: "transparent",
            border: `1px solid rgba(168,180,117,${hovered ? 0.50 : 0.35})`,
            borderRadius: 999,
            padding: "4px 10px",
            cursor: "pointer",
            opacity: hovered ? 1 : 0.7,
            transition: "opacity 150ms ease, border-color 150ms ease",
            whiteSpace: "nowrap",
            marginTop: 6,
          }}
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
        background: flashActive
          ? "rgba(168,180,117,0.12)"
          : isApplied
          ? "rgba(168,180,117,0.07)"
          : "transparent",
        transition: "background 200ms ease",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Row number */}
      <div
        style={{
          fontFamily: inter,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.06em",
          color: isApplied ? "rgba(168,180,117,0.70)" : "rgba(67,67,43,0.22)",
          flexShrink: 0,
          marginTop: 2,
          width: 18,
        }}
      >
        {String(index + 1).padStart(2, '0')}
      </div>

      {/* Content column */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Tag + impact */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
          <span
            style={{
              fontFamily: inter,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              color: TAG_STYLES[tagType].text,
              background: TAG_STYLES[tagType].bg,
              border: `1px solid ${TAG_STYLES[tagType].border}`,
              borderRadius: 3,
              padding: "1px 5px",
              lineHeight: 1.4,
            }}
          >
            {TAG_LABELS[tagType]}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <div
              style={{
                width: 4,
                height: 4,
                borderRadius: "50%",
                background: IMPACT_COLORS[impact],
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontFamily: inter,
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "rgba(67,67,43,0.32)",
              }}
            >
              {impact}
            </span>
          </div>
        </div>

        {/* Label */}
        <div
          style={{
            fontFamily: inter,
            fontSize: 12.5,
            fontWeight: 600,
            color: isApplied ? "#A8B475" : "rgba(67,67,43,0.72)",
            lineHeight: 1.4,
          }}
        >
          {suggestion.label}
        </div>

        {/* Sub */}
        {suggestion.sub && (
          <div
            style={{
              fontFamily: inter,
              fontSize: 11,
              fontStyle: "italic",
              color: "rgba(67,67,43,0.40)",
              lineHeight: 1.4,
              marginTop: 2,
            }}
          >
            {suggestion.sub}
          </div>
        )}

        {/* Button */}
        {isApplied ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
            <span
              style={{
                fontFamily: inter,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.08em",
                color: "#A8B475",
              }}
            >
              Applied {"\u2713"}
            </span>
            <button
              onClick={onUndo}
              style={{
                fontFamily: inter,
                fontSize: 10,
                color: "rgba(67,67,43,0.45)",
                textDecoration: "underline",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
            >
              Undo
            </button>
          </div>
        ) : (
          <button
            onClick={onApply}
            style={{
              fontFamily: inter,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.08em",
              color: "#A8B475",
              background: "transparent",
              border: `1px solid rgba(168,180,117,${hovered ? 0.50 : 0.35})`,
              borderRadius: 999,
              padding: "4px 10px",
              cursor: "pointer",
              opacity: hovered ? 1 : 0.7,
              transition: "opacity 150ms ease, border-color 150ms ease",
              whiteSpace: "nowrap",
              marginTop: 6,
            }}
          >
            {"\u2190"} Apply
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Footer ────────────────────────────────────────────────────────────── */

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
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 10,
        paddingTop: 10,
        borderTop: "1px solid rgba(125,150,172,0.12)",
      }}
    >
      <span
        style={{
          fontFamily: inter,
          fontSize: 10,
          fontStyle: "italic",
          color: "rgba(67,67,43,0.38)",
        }}
      >
        {added} of {total} applied
      </span>
      {!allAdded && (
        <button
          onClick={onApplyAll}
          style={{
            fontFamily: inter,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.08em",
            color: "#A8B475",
            background: "transparent",
            border: "1px solid rgba(168,180,117,0.35)",
            borderRadius: 999,
            padding: "4px 10px",
            cursor: "pointer",
            opacity: 0.8,
            transition: "opacity 150ms ease",
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
          onMouseLeave={e => (e.currentTarget.style.opacity = "0.8")}
        >
          Apply all →
        </button>
      )}
    </div>
  );
}
