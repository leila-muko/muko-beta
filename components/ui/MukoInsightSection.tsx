"use client";

import React, { useState, useEffect, useRef } from "react";
import { CheckIcon, PencilIcon } from "@/components/ui/icons/InsightIcons";
import { MukoStreamingParagraph } from "@/components/ui/MukoStreamingParagraph";
import type { SpecSuggestion } from "@/lib/types/next-move";
import type { DecisionGuidance, InsightMode } from "@/lib/types/insight";

const sohne = "var(--font-sohne-breit), system-ui, sans-serif";
const inter = "var(--font-inter), system-ui, sans-serif";

/* ─── Next Move discriminated union ─────────────────────────────────────── */

export type ConceptNextMoveItem = { label: string; rationale: string; type?: 'chip' | 'silhouette_swap' | 'palette_swap' };

type NextMoveConceptProps = {
  mode: "concept";
  guidance: DecisionGuidance | null;
  recommendedKeyPieces?: string[];
  selectedAnchorPiece?: string | null;
  isConfirmed?: boolean;
  confirmedAnchorPiece?: string | null;
  onSelectAnchorPiece?: (piece: string) => void;
  onConfirm?: () => void;
  isLoading?: boolean;
  onRoleSelect?: (role: 'hero' | 'directional' | 'core-evolution' | 'volume-driver') => void;
  currentRole?: string | null;
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
  streamingParagraph?: string;
  isParagraphStreaming?: boolean;
  /** 'concept' activates the narrative right-panel layout */
  pageMode?: "concept" | "spec";
  /** Called when "Apply All & Continue →" is clicked in concept narrative mode */
  onContinue?: () => void;
  /** Whether the continue action is available (concept mode) */
  canContinue?: boolean;
  conceptStage?: "direction" | "language" | "product";
  languageRead?: {
    core_read: string;
    execution_moves: string[];
    guardrail: string;
  } | null;
  /** Streaming state for language stage */
  languageStreamingText?: string;
  languageStreamingRows?: { core_read: string; execution_moves: string[]; guardrail: string };
  isLanguageStreaming?: boolean;
  /** Streaming state for product/piece stage */
  pieceStreamingTitle?: string;
  pieceStreamingBody?: string;
  isPieceStreaming?: boolean;
  productPieceRead?: { title?: string; body: string } | null;
  productStrategicImplication?: {
    summary: string;
    suggestedRoles: CollectionRoleId[];
  } | null;
  productStructure?: {
    counts: Record<CollectionRoleId, number>;
    assignedCount: number;
    notes: string[];
  } | null;
  hasSelectedProductPiece?: boolean;
  /** Show "Shaped by your brand context" label near narrative output */
  showBrandContextLabel?: boolean;
}

/* ─── Fixed positioning row labels (concept narrative mode) ─────────────── */
const POSITION_LABELS = ["Market Gap", "Reference Point", "Brand Permission"];

/* ─── Decision Guidance Rail — concept mode ─────────────────────────────── */

type CollectionRoleId = 'hero' | 'directional' | 'core-evolution' | 'volume-driver';

const ROLE_CARDS: Array<{ id: CollectionRoleId; name: string; description: string }> = [
  { id: 'hero', name: 'Hero', description: "The statement. Margin pressure acceptable if it's right." },
  { id: 'directional', name: 'Directional', description: 'Pushes brand forward — needs to work commercially too.' },
  { id: 'core-evolution', name: 'Core Evolution', description: 'A proven category, refreshed for the season.' },
  { id: 'volume-driver', name: 'Volume Driver', description: 'This needs to sell. Margin and simplicity take priority.' },
];

const ANALYSIS_LABELS = ["Market Gap", "Competitive Position", "Brand Permission"];

function signalToRole(signal: string): CollectionRoleId {
  switch (signal) {
    case 'Hero Expression': return 'hero';
    case 'Increase Investment': return 'hero';
    case 'Controlled Test': return 'directional';
    case 'Maintain Exposure': return 'core-evolution';
    case 'Reduce Exposure': return 'volume-driver';
    default: return 'hero';
  }
}

function roleToDisplayName(role: string): string {
  switch (role) {
    case 'hero': return 'Hero';
    case 'directional': return 'Directional';
    case 'core-evolution': return 'Core Evolution';
    case 'volume-driver': return 'Volume Driver';
    default: return role;
  }
}

function ProductDecisionRail({
  productPieceRead,
  productStrategicImplication,
  productStructure,
  hasSelectedProductPiece = false,
  pieceStreamingTitle = '',
  pieceStreamingBody = '',
  isPieceStreaming = false,
}: {
  productPieceRead?: { title?: string; body: string } | null;
  productStrategicImplication?: {
    summary: string;
    suggestedRoles: CollectionRoleId[];
  } | null;
  productStructure?: {
    counts: Record<CollectionRoleId, number>;
    assignedCount: number;
    notes: string[];
  } | null;
  hasSelectedProductPiece?: boolean;
  pieceStreamingTitle?: string;
  pieceStreamingBody?: string;
  isPieceStreaming?: boolean;
}) {
  const zoneLabel: React.CSSProperties = {
    fontFamily: inter,
    fontSize: 9,
    fontWeight: 600,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: "#888078",
  };
  const hairline: React.CSSProperties = {
    height: 1,
    background: "rgba(67,67,43,0.08)",
    margin: "30px 0 24px",
  };
  const bodyText: React.CSSProperties = {
    margin: 0,
    fontFamily: inter,
    fontSize: 12.5,
    lineHeight: 1.76,
    color: "rgba(67,67,43,0.66)",
  };

  return (
    <div style={{ marginBottom: 36 }}>
      {isPieceStreaming && (
        <style>{`@keyframes mukoCursorBlink{0%,100%{opacity:1}50%{opacity:0}}@keyframes mukoCardPulse{0%,100%{opacity:0.5}50%{opacity:0.8}}`}</style>
      )}
      {(!productPieceRead && !isPieceStreaming) ? (
        <div style={{ marginBottom: 28 }}>
          <div style={{ ...zoneLabel, marginBottom: 10 }}>MUKO&apos;S TAKE</div>
          <div style={{ fontFamily: sohne, fontSize: 19, fontWeight: 500, lineHeight: 1.32, color: "#43432B", marginBottom: 8 }}>
            Begin with the piece carrying the clearest expression.
          </div>
          <p style={bodyText}>
            Review the assortment from the piece that most clearly holds the collection DNA, then assign roles as the structure starts to emerge.
          </p>
          {productStructure && (
            <>
              <div style={hairline} />
              <div>
                <div style={{ ...zoneLabel, marginBottom: 14 }}>COLLECTION STRUCTURE</div>
                <div style={{ display: "grid", gap: 12, marginBottom: (productStructure.notes ?? []).length ? 18 : 0 }}>
                  {(["hero", "directional", "core-evolution", "volume-driver"] as CollectionRoleId[]).map((role) => {
                    const count = productStructure.counts[role] ?? 0;
                    return (
                      <div key={role} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 12, alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ display: "flex", gap: 4 }}>
                            {Array.from({ length: 4 }).map((_, index) => (
                              <span
                                key={index}
                                style={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: "50%",
                                  background: index < count ? "#A8B475" : "rgba(67,67,43,0.12)",
                                }}
                              />
                            ))}
                          </div>
                          <div style={{ fontFamily: inter, fontSize: 11.5, color: "rgba(67,67,43,0.58)" }}>
                            {roleToDisplayName(role)}
                          </div>
                        </div>
                        <div style={{ fontFamily: sohne, fontSize: 16, color: "#43432B" }}>{count}</div>
                      </div>
                    );
                  })}
                </div>
                {(productStructure.notes ?? []).length > 0 && (
                  <div style={{ display: "grid", gap: 8 }}>
                    {(productStructure.notes ?? []).map((note) => (
                      <p key={note} style={{ ...bodyText, color: "rgba(67,67,43,0.54)" }}>
                        {note}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      ) : isPieceStreaming ? (
        <div style={{ marginBottom: 28 }}>
          <div style={{ ...zoneLabel, marginBottom: 10 }}>MUKO&apos;S READ</div>
          {pieceStreamingTitle ? (
            <div style={{ fontFamily: sohne, fontSize: 21, fontWeight: 500, lineHeight: 1.24, color: "#43432B", marginBottom: 12 }}>
              {pieceStreamingTitle}
              <span style={{ display: "inline-block", width: 2, height: "0.85em", background: "#A8B475", marginLeft: 2, verticalAlign: "text-bottom", animation: "mukoCursorBlink 0.9s step-start infinite" }} />
            </div>
          ) : null}
          {pieceStreamingBody ? (
            <p style={bodyText}>
              {pieceStreamingBody}
              {!pieceStreamingTitle && (
                <span style={{ display: "inline-block", width: 2, height: "0.85em", background: "#A8B475", marginLeft: 2, verticalAlign: "text-bottom", animation: "mukoCursorBlink 0.9s step-start infinite" }} />
              )}
            </p>
          ) : null}
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 28 }}>
            <div style={{ ...zoneLabel, marginBottom: 10 }}>{hasSelectedProductPiece ? "MUKO'S TAKE" : "MUKO'S READ"}</div>
            {productPieceRead?.title && (
              <div style={{ fontFamily: sohne, fontSize: 21, fontWeight: 500, lineHeight: 1.24, color: "#43432B", marginBottom: 12 }}>
                {productPieceRead.title}
              </div>
            )}
            <p style={bodyText}>{productPieceRead?.body ?? ''}</p>
          </div>

          {hasSelectedProductPiece && productStrategicImplication && (
            <>
              <div style={hairline} />
              <div style={{ marginBottom: 26 }}>
                <div style={{ ...zoneLabel, marginBottom: 10 }}>STRATEGIC IMPLICATION</div>
                <div style={{ fontFamily: sohne, fontSize: 19, fontWeight: 500, lineHeight: 1.28, color: "#43432B", marginBottom: 10 }}>
                  {productStrategicImplication.suggestedRoles.map((role) => roleToDisplayName(role)).join(" / ")}
                </div>
                <p style={bodyText}>{productStrategicImplication.summary}</p>
              </div>
            </>
          )}

          {hasSelectedProductPiece && (
            <>
              <div style={hairline} />

              <div style={{ marginBottom: 26 }}>
                <div style={{ ...zoneLabel, marginBottom: 14 }}>COLLECTION STRUCTURE</div>
                <div style={{ display: "grid", gap: 12, marginBottom: productStructure?.notes?.length ? 18 : 0 }}>
                  {(["hero", "directional", "core-evolution", "volume-driver"] as CollectionRoleId[]).map((role) => {
                    const count = productStructure?.counts[role] ?? 0;
                    return (
                      <div key={role} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 12, alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ display: "flex", gap: 4 }}>
                            {Array.from({ length: 4 }).map((_, index) => (
                              <span
                                key={index}
                                style={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: "50%",
                                  background: index < count ? "#A8B475" : "rgba(67,67,43,0.12)",
                                }}
                              />
                            ))}
                          </div>
                          <div style={{ fontFamily: inter, fontSize: 11.5, color: "rgba(67,67,43,0.58)" }}>
                            {roleToDisplayName(role)}
                          </div>
                        </div>
                        <div style={{ fontFamily: sohne, fontSize: 16, color: "#43432B" }}>{count}</div>
                      </div>
                    );
                  })}
                </div>
                {(productStructure?.notes ?? []).length > 0 && (
                  <div style={{ display: "grid", gap: 8 }}>
                    {(productStructure?.notes ?? []).map((note) => (
                      <p key={note} style={{ ...bodyText, color: "rgba(67,67,43,0.54)" }}>
                        {note}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}


function ConceptDecisionRail({
  headline,
  paragraphs,
  bullets,
  guidance,
  isLoading,
  isStreaming,
  streamingText,
  streamingParagraph,
  isParagraphStreaming,
  languageStreamingText = '',
  languageStreamingRows,
  isLanguageStreaming = false,
  pieceStreamingTitle = '',
  pieceStreamingBody = '',
  isPieceStreaming = false,
  recommendedKeyPieces,
  selectedAnchorPiece,
  onSelectAnchorPiece,
  onRoleSelect,
  currentRole,
  onContinue,
  canContinue,
  nextMove,
  pageMode,
  conceptStage = "product",
  languageRead,
  productPieceRead,
  productStrategicImplication,
  productStructure,
  hasSelectedProductPiece,
  showBrandContextLabel,
}: {
  headline: string;
  paragraphs: string[];
  bullets: { label: string; items: string[] };
  guidance: DecisionGuidance | null;
  isLoading?: boolean;
  isStreaming: boolean;
  streamingText: string;
  streamingParagraph?: string;
  isParagraphStreaming?: boolean;
  languageStreamingText?: string;
  languageStreamingRows?: { core_read: string; execution_moves: string[]; guardrail: string };
  isLanguageStreaming?: boolean;
  pieceStreamingTitle?: string;
  pieceStreamingBody?: string;
  isPieceStreaming?: boolean;
  recommendedKeyPieces: string[];
  selectedAnchorPiece?: string | null;
  onSelectAnchorPiece?: (piece: string) => void;
  onRoleSelect?: (role: CollectionRoleId) => void;
  currentRole?: string | null;
  onContinue?: () => void;
  canContinue?: boolean;
  nextMove?: NextMoveProps;
  pageMode?: "concept" | "spec";
  conceptStage?: "direction" | "language" | "product";
  languageRead?: {
    core_read: string;
    execution_moves: string[];
    guardrail: string;
  } | null;
  productPieceRead?: { title?: string; body: string } | null;
  productStrategicImplication?: {
    summary: string;
    suggestedRoles: CollectionRoleId[];
  } | null;
  productStructure?: {
    counts: Record<CollectionRoleId, number>;
    assignedCount: number;
    notes: string[];
  } | null;
  hasSelectedProductPiece?: boolean;
  showBrandContextLabel?: boolean;
}) {
  // ── Crossfade: pre-read → LLM headline ──────────────────────────────────
  const [headlineFadedOut, setHeadlineFadedOut] = useState(false);
  const [displayedHeadline, setDisplayedHeadline] = useState<string | null>(null);
  const prevIsStreamingRef = useRef(isStreaming);
  const paragraphsRef = useRef(paragraphs);
  const headlineRef = useRef(headline);
  const shouldPromoteParagraphLeadRef = useRef(pageMode !== "concept");

  useEffect(() => { paragraphsRef.current = paragraphs; }, [paragraphs]);
  useEffect(() => { headlineRef.current = headline; }, [headline]);
  useEffect(() => { shouldPromoteParagraphLeadRef.current = pageMode !== "concept"; }, [pageMode]);

  const shouldPromoteParagraphLead = pageMode !== "concept";

  useEffect(() => {
    const wasStreaming = prevIsStreamingRef.current;
    prevIsStreamingRef.current = isStreaming;
    let frameId = 0;

    if (isStreaming) {
      // New fetch cycle — reset so next settle can crossfade
      frameId = window.requestAnimationFrame(() => {
        setDisplayedHeadline(null);
        setHeadlineFadedOut(false);
      });
      return () => window.cancelAnimationFrame(frameId);
    } else if (shouldPromoteParagraphLeadRef.current && wasStreaming && paragraphsRef.current[0]) {
      const match = paragraphsRef.current[0].match(/^[^.!?]*[.!?]/);
      const newText = (match ? match[0] : paragraphsRef.current[0]).trim();
      if (newText !== headlineRef.current) {
        frameId = window.requestAnimationFrame(() => setHeadlineFadedOut(true));
        const timer = setTimeout(() => {
          setDisplayedHeadline(newText);
          setHeadlineFadedOut(false);
        }, 150);
        return () => {
          window.cancelAnimationFrame(frameId);
          clearTimeout(timer);
        };
      }
    }
  }, [isStreaming]);
  // ────────────────────────────────────────────────────────────────────────

  if (conceptStage === "product") {
    return (
      <ProductDecisionRail
        productPieceRead={productPieceRead}
        productStrategicImplication={productStrategicImplication}
        productStructure={productStructure}
        hasSelectedProductPiece={hasSelectedProductPiece}
        pieceStreamingTitle={pieceStreamingTitle}
        pieceStreamingBody={pieceStreamingBody}
        isPieceStreaming={isPieceStreaming}
      />
    );
  }

  const zoneOneLabel = "Muko's Read";

  function getFirstSentence(text: string): string {
    const match = text.match(/^[^.!?]*[.!?]/);
    return match ? match[0] : text;
  }
  function removeFirstSentence(text: string): string {
    const firstSentence = getFirstSentence(text);
    return text.slice(firstSentence.length).trim();
  }

  const zoneLabel: React.CSSProperties = {
    fontFamily: inter,
    fontSize: 9,
    fontWeight: 600,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: "#888078",
  };
  const hairline: React.CSSProperties = {
    height: 1,
    background: "rgba(67,67,43,0.08)",
    margin: "40px 0 30px",
  };
  const leadInsight =
    shouldPromoteParagraphLead && !isStreaming && paragraphs[0]
      ? getFirstSentence(paragraphs[0]).trim()
      : headline;
  const leadBody =
    shouldPromoteParagraphLead && !isStreaming && paragraphs[0]
      ? removeFirstSentence(paragraphs[0])
      : "";
  const settledParagraphs = shouldPromoteParagraphLead
    ? (leadBody ? [leadBody, ...paragraphs.slice(1)] : paragraphs.slice(1))
    : paragraphs;

  if (conceptStage === "language") {
    const displayHeadline = isLanguageStreaming && languageStreamingText ? languageStreamingText : headline;
    const displayCoreRead = languageRead?.core_read ?? languageStreamingRows?.core_read ?? "";
    const displayExecutionMoves = (languageRead?.execution_moves ?? languageStreamingRows?.execution_moves ?? []).slice(0, 3);
    const displayGuardrail = languageRead?.guardrail ?? languageStreamingRows?.guardrail ?? "";
    const activeStreamIndex =
      isLanguageStreaming && displayExecutionMoves.length > 0 && !languageRead?.execution_moves?.length
        ? displayExecutionMoves.length - 1
        : -1;
    const isCursorOnHeadline =
      isLanguageStreaming &&
      !!languageStreamingText &&
      !displayCoreRead &&
      displayExecutionMoves.length === 0 &&
      !displayGuardrail;

    return (
      <div style={{ marginBottom: 52 }}>
        {isLanguageStreaming && (
          <style>{`@keyframes mukoCursorBlink{0%,100%{opacity:1}50%{opacity:0}}`}</style>
        )}
        <div style={{ marginBottom: 34 }}>
          <div style={{ ...zoneLabel, marginBottom: 10 }}>{zoneOneLabel.toUpperCase()}</div>
          <div style={{ fontFamily: sohne, fontSize: 20, fontWeight: 700, lineHeight: 1.3, color: "#191919", letterSpacing: "-0.01em", width: "100%" }}>
            {displayHeadline}
            {isCursorOnHeadline && (
              <span style={{ display: "inline-block", width: 2, height: "0.85em", background: "#A8B475", marginLeft: 2, verticalAlign: "text-bottom", animation: "mukoCursorBlink 0.9s step-start infinite" }} />
            )}
          </div>
        </div>

        {(displayCoreRead || displayExecutionMoves.length > 0 || displayGuardrail) && (
          <div style={{ display: "grid", gap: 18 }}>
            {displayCoreRead && (
              <div style={{ fontFamily: inter, fontSize: 13, lineHeight: 1.72, color: "rgba(67,67,43,0.7)" }}>
                {displayCoreRead}
                {isLanguageStreaming && !languageRead?.core_read && !displayExecutionMoves.length && (
                  <span style={{ display: "inline-block", width: 2, height: "0.85em", background: "#A8B475", marginLeft: 2, verticalAlign: "text-bottom", animation: "mukoCursorBlink 0.9s step-start infinite" }} />
                )}
              </div>
            )}

            {displayExecutionMoves.length > 0 && (
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 10 }}>
                {displayExecutionMoves.map((move, idx) => (
                  <li key={`${move}-${idx}`} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontFamily: inter, fontSize: 12.5, lineHeight: 1.65, color: "#43432B" }}>
                    <span style={{ color: "#B8876B", flexShrink: 0, marginTop: 1.5 }}>•</span>
                    <span>
                      {move}
                      {idx === activeStreamIndex && (
                        <span style={{ display: "inline-block", width: 2, height: "0.85em", background: "#A8B475", marginLeft: 2, verticalAlign: "text-bottom", animation: "mukoCursorBlink 0.9s step-start infinite" }} />
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {displayGuardrail && (
              <div
                style={{
                  paddingTop: 14,
                  borderTop: "1px solid rgba(67,67,43,0.08)",
                  fontFamily: inter,
                  fontSize: 12,
                  lineHeight: 1.6,
                  color: "rgba(67,67,43,0.58)",
                }}
              >
                {displayGuardrail}
                {isLanguageStreaming && !languageRead?.guardrail && !!displayGuardrail && (
                  <span style={{ display: "inline-block", width: 2, height: "0.85em", background: "#A8B475", marginLeft: 2, verticalAlign: "text-bottom", animation: "mukoCursorBlink 0.9s step-start infinite" }} />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 52 }}>
      {isStreaming && (
        <style>{`@keyframes mukoCursorBlink{0%,100%{opacity:1}50%{opacity:0}}@keyframes mukoCardPulse{0%,100%{opacity:0.5}50%{opacity:0.8}}`}</style>
      )}

      {/* ── Zone 1 — Muko's Read ─────────────────────────────────────────── */}
      <div style={{ marginBottom: 34 }}>
        <div style={{ ...zoneLabel, marginBottom: 10 }}>{zoneOneLabel.toUpperCase()}</div>

        {/* Guidance statement */}
        <div style={{ fontFamily: sohne, fontSize: 20, fontWeight: 700, lineHeight: 1.3, color: "#191919", letterSpacing: "-0.01em", width: "100%", opacity: headlineFadedOut ? 0 : 1, transition: headlineFadedOut ? "opacity 150ms ease-out" : "opacity 250ms ease-in" }}>
          {isStreaming && streamingText ? (
            <>
              {streamingText}
              <span style={{ display: "inline-block", width: 2, height: "1em", background: "#A8B475", marginLeft: 2, verticalAlign: "text-bottom", animation: "mukoCursorBlink 0.9s step-start infinite" }} />
            </>
          ) : isStreaming ? (
            <span style={{ opacity: 0.35, animation: "mukoCardPulse 1.2s ease-in-out infinite" }}>{headline}</span>
          ) : (
            (displayedHeadline && displayedHeadline !== headline)
              ? displayedHeadline
              : leadInsight
          )}
        </div>
      </div>

      {/* ── Zone 2 — Insight Paragraph ───────────────────────────────────── */}
      {((!isParagraphStreaming && paragraphs.length > 0) || !!streamingParagraph) && (
        <div style={{ marginTop: -10, marginBottom: 32 }}>
          {pageMode !== "concept" && headline && headline !== leadInsight && (
            <div style={{ marginBottom: 12, fontFamily: inter, fontSize: 11, fontWeight: 500, color: "rgba(67,67,43,0.46)", lineHeight: 1.55 }}>
              {headline}
            </div>
          )}
          <MukoStreamingParagraph
            paragraphs={settledParagraphs}
            streamingText={streamingParagraph}
            isStreaming={isParagraphStreaming}
            paragraphStyle={{
              fontFamily: inter,
              fontSize: 12.5,
              lineHeight: 1.8,
              color: "rgba(67,67,43,0.65)",
            }}
            paragraphSpacing={12}
          />

          {showBrandContextLabel && (
            <div style={{ marginTop: 8, fontFamily: inter, fontSize: 11, color: "#9C9690" }}>
              Shaped by your brand context
            </div>
          )}
        </div>
      )}

      {/* ── Spec Next Move (spec mode only) ─────────────────────────────── */}
      {nextMove?.mode === "spec" && nextMove.suggestions.length > 0 && (() => {
        const suggestions = nextMove.suggestions
          .slice()
          .sort((a, b) => (a.kind === 'warning' ? -1 : 0) - (b.kind === 'warning' ? -1 : 0))
          .slice(0, 3);
        return (
          <>
            <div style={hairline} />
            <SpecNarrativeNextMove
              suggestions={suggestions}
              appliedIds={nextMove.appliedIds}
              onApply={nextMove.onApply}
              onUndo={nextMove.onUndo}
            />
          </>
        );
      })()}

    </div>
  );
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
  streamingParagraph = '',
  isParagraphStreaming = false,
  languageStreamingText = '',
  languageStreamingRows,
  isLanguageStreaming = false,
  pieceStreamingTitle = '',
  pieceStreamingBody = '',
  isPieceStreaming = false,
  pageMode,
  onContinue,
  canContinue,
  conceptStage,
  languageRead,
  productPieceRead,
  productStrategicImplication,
  productStructure,
  hasSelectedProductPiece,
  showBrandContextLabel,
}: MukoInsightSectionProps) {
  const [dlExpanded, setDlExpanded] = useState(true);
  const [bulletsExpanded, setBulletsExpanded] = useState(true);
  const [expandedChips, setExpandedChips] = useState<Set<string>>(new Set());
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
     CONCEPT NARRATIVE MODE — Decision Guidance Rail
  ══════════════════════════════════════════════════════════════════════ */
  if (pageMode === "concept") {
    const nmProps = nextMove.mode === "concept" ? nextMove : null;
    return (
      <ConceptDecisionRail
        headline={headline}
        paragraphs={paragraphs}
        bullets={bullets}
        guidance={nmProps?.guidance ?? null}
        isLoading={nmProps?.isLoading}
        isStreaming={isStreaming}
        streamingText={streamingText}
        streamingParagraph={streamingParagraph}
        isParagraphStreaming={isParagraphStreaming}
        languageStreamingText={languageStreamingText}
        languageStreamingRows={languageStreamingRows}
        isLanguageStreaming={isLanguageStreaming}
        pieceStreamingTitle={pieceStreamingTitle}
        pieceStreamingBody={pieceStreamingBody}
        isPieceStreaming={isPieceStreaming}
        recommendedKeyPieces={nmProps?.recommendedKeyPieces ?? []}
        selectedAnchorPiece={nmProps?.selectedAnchorPiece}
        onSelectAnchorPiece={nmProps?.onSelectAnchorPiece}
        onRoleSelect={nmProps?.onRoleSelect}
        currentRole={nmProps?.currentRole}
        onContinue={onContinue}
        canContinue={canContinue}
        nextMove={nextMove}
        pageMode={pageMode}
        conceptStage={conceptStage}
        languageRead={languageRead}
        productPieceRead={productPieceRead}
        productStrategicImplication={productStrategicImplication}
        productStructure={productStructure}
        hasSelectedProductPiece={hasSelectedProductPiece}
        showBrandContextLabel={showBrandContextLabel}
      />
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
      <MukoStreamingParagraph
        paragraphs={paragraphs}
        streamingText={streamingParagraph}
        isStreaming={isParagraphStreaming}
        containerStyle={{ marginBottom: 20 }}
        paragraphStyle={{
          fontFamily: inter,
          fontSize: 12.5,
          color: "rgba(67,67,43,0.64)",
          lineHeight: 1.7,
        }}
        paragraphSpacing={12}
      />

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

      {/* ── Decision Guidance — Concept ─────────────────────────────────── */}
      {nextMove.mode === "concept" && nextMove.guidance && (
        <DecisionGuidancePanel
          guidance={nextMove.guidance}
          recommendedKeyPieces={nextMove.recommendedKeyPieces ?? []}
          selectedAnchorPiece={nextMove.selectedAnchorPiece}
          isConfirmed={nextMove.isConfirmed}
          confirmedAnchorPiece={nextMove.confirmedAnchorPiece}
          onSelectAnchorPiece={nextMove.onSelectAnchorPiece}
          onConfirm={nextMove.onConfirm}
        />
      )}

      {/* ── Next Move — Spec ─────────────────────────────────────────────── */}
      {nextMove.mode === "spec" && nextMove.suggestions.length > 0 && (() => {
        const suggestions = nextMove.suggestions
          .slice()
          .sort((a, b) => (a.kind === 'warning' ? -1 : 0) - (b.kind === 'warning' ? -1 : 0))
          .slice(0, 3);
        const addedCount = suggestions.filter(s => nextMove.appliedIds.has(s.id)).length;
        return (
          <NextMoveCard subtitle={nextMove.subtitle || "Adjustments that improve feasibility without changing your direction."}>
            {suggestions.map((suggestion, i) => {
              let tagType: 'add' | 'swap' | 'redirect' = 'swap';
              if (suggestion.kind === 'warning') {
                tagType = 'redirect';
              } else if (suggestion.kind === 'material' || suggestion.kind === 'upgrade-material') {
                tagType = 'redirect';
              } else if (suggestion.id === 'invest-finishing') {
                tagType = 'add';
              }
              const saving = Math.abs(suggestion.after.saving);
              const impact: 'HIGH' | 'MED' | 'LOW' = suggestion.kind === 'warning' ? 'MED' : saving > 20 ? 'HIGH' : saving > 10 ? 'MED' : 'LOW';
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

function DecisionGuidanceNarrative({
  guidance,
  recommendedKeyPieces,
  selectedAnchorPiece,
  isConfirmed,
  confirmedAnchorPiece,
  onSelectAnchorPiece,
  onConfirm,
}: {
  guidance: DecisionGuidance;
  recommendedKeyPieces: string[];
  selectedAnchorPiece?: string | null;
  isConfirmed?: boolean;
  confirmedAnchorPiece?: string | null;
  onSelectAnchorPiece?: (piece: string) => void;
  onConfirm?: () => void;
}) {
  return (
    <div>
      <div style={{ height: 1, background: "#E8E3D6", margin: "24px 0" }} />
      <DecisionGuidanceCard
        guidance={guidance}
        recommendedKeyPieces={recommendedKeyPieces}
        selectedAnchorPiece={selectedAnchorPiece}
        isConfirmed={isConfirmed}
        confirmedAnchorPiece={confirmedAnchorPiece}
        onSelectAnchorPiece={onSelectAnchorPiece}
        onConfirm={onConfirm}
        tone="narrative"
      />
    </div>
  );
}

function DecisionGuidancePanel({
  guidance,
  recommendedKeyPieces,
  selectedAnchorPiece,
  isConfirmed,
  confirmedAnchorPiece,
  onSelectAnchorPiece,
  onConfirm,
}: {
  guidance: DecisionGuidance;
  recommendedKeyPieces: string[];
  selectedAnchorPiece?: string | null;
  isConfirmed?: boolean;
  confirmedAnchorPiece?: string | null;
  onSelectAnchorPiece?: (piece: string) => void;
  onConfirm?: () => void;
}) {
  return (
    <div style={{ marginTop: 18 }}>
      <DecisionGuidanceCard
        guidance={guidance}
        recommendedKeyPieces={recommendedKeyPieces}
        selectedAnchorPiece={selectedAnchorPiece}
        isConfirmed={isConfirmed}
        confirmedAnchorPiece={confirmedAnchorPiece}
        onSelectAnchorPiece={onSelectAnchorPiece}
        onConfirm={onConfirm}
        tone="default"
      />
    </div>
  );
}

function DecisionGuidanceCard({
  guidance,
  recommendedKeyPieces,
  selectedAnchorPiece = null,
  isConfirmed = false,
  confirmedAnchorPiece = null,
  onSelectAnchorPiece,
  onConfirm,
  tone,
}: {
  guidance: DecisionGuidance;
  recommendedKeyPieces: string[];
  selectedAnchorPiece?: string | null;
  isConfirmed?: boolean;
  confirmedAnchorPiece?: string | null;
  onSelectAnchorPiece?: (piece: string) => void;
  onConfirm?: () => void;
  tone: "narrative" | "default";
}) {
  const isNarrative = tone === "narrative";
  const directive = toDirectiveSentence(guidance.recommended_direction);
  const anchorPiece = selectedAnchorPiece ?? recommendedKeyPieces[0] ?? null;
  const supportingPieces = recommendedKeyPieces.filter((piece) => piece !== anchorPiece);
  return (
    <div
      style={{
        padding: isNarrative ? "20px 20px 18px" : "16px 18px",
        borderRadius: 10,
        border: isNarrative ? "1px solid rgba(67,67,43,0.10)" : "1px solid rgba(125,150,172,0.22)",
        borderLeft: isNarrative ? "1px solid rgba(67,67,43,0.10)" : "3px solid rgba(125,150,172,0.35)",
        background: isNarrative ? "#FAFAF8" : "transparent",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
        <div style={{ fontFamily: inter, fontSize: 10.5, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: isNarrative ? "#7C776F" : "#6D7F8D" }}>
          Decision Guidance
        </div>
      </div>
      <div style={{ display: "grid", gap: 20 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", columnGap: 12, rowGap: 10 }}>
            <CommitmentSignalChip signal={guidance.commitment_signal} />
            <div style={{ fontFamily: sohne, fontSize: isNarrative ? 17 : 15, lineHeight: 1.38, color: "#191919", flex: "1 1 320px", minWidth: 0 }}>
              {directive}
            </div>
          </div>
        </div>
        {anchorPiece && (
          <div style={{ marginTop: 2 }}>
            <div style={{ fontFamily: inter, fontSize: 9.5, fontWeight: 700, letterSpacing: "0.11em", textTransform: "uppercase", color: "rgba(67,67,43,0.36)", marginBottom: 9 }}>
              Suggested Anchor Piece
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <RecommendedKeyPieceChip label={anchorPiece} isSelected />
            </div>
            {supportingPieces.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontFamily: inter, fontSize: 9.5, fontWeight: 700, letterSpacing: "0.11em", textTransform: "uppercase", color: "rgba(67,67,43,0.32)", marginBottom: 8 }}>
                  Supporting Pieces
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {supportingPieces.map((piece) => (
                    <SupportingPieceChip
                      key={piece}
                      label={piece}
                      onClick={onSelectAnchorPiece ? () => onSelectAnchorPiece(piece) : undefined}
                    />
                  ))}
                </div>
                {onSelectAnchorPiece && !isConfirmed && (
                  <div style={{ marginTop: 8, fontFamily: inter, fontSize: 10.5, color: "rgba(67,67,43,0.42)", fontStyle: "italic" }}>
                    Tap another piece to make it the anchor.
                  </div>
                )}
              </div>
            )}
            {isConfirmed && confirmedAnchorPiece && (
              <div style={{ marginTop: 10, fontFamily: inter, fontSize: 11, color: "rgba(67,67,43,0.54)", lineHeight: 1.5 }}>
                <span style={{ color: "rgba(67,67,43,0.70)", fontWeight: 600 }}>Direction Confirmed</span>
                {"  "}
                <span>Hero Anchor: {toDisplayChipLabel(confirmedAnchorPiece)}</span>
              </div>
            )}
          </div>
        )}
        {guidance.execution_levers.length > 0 && (
          <div style={{ marginTop: 2 }}>
            <div style={{ fontFamily: inter, fontSize: 9.5, fontWeight: 700, letterSpacing: "0.11em", textTransform: "uppercase", color: "rgba(67,67,43,0.32)", marginBottom: 9 }}>
              Execution Levers
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {guidance.execution_levers.map((lever) => (
                <ExecutionLeverChip key={lever} label={lever} />
              ))}
            </div>
          </div>
        )}
        {onConfirm ? (
          <div style={{ marginTop: 2, paddingTop: 2 }}>
            {isConfirmed ? (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#7B8860", fontFamily: inter, fontSize: 10.5, fontWeight: 600 }}>
                <span style={{ width: 14, height: 14, borderRadius: 999, border: "1px solid rgba(168,180,117,0.32)", background: "rgba(168,180,117,0.10)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="8" height="8" viewBox="0 0 10 10" fill="none"><path d="M2 5.2L4 7.1L8 2.9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
                <span>Direction Confirmed</span>
              </div>
            ) : (
              <button
                onClick={onConfirm}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  border: "none",
                  background: "transparent",
                  padding: 0,
                  cursor: "pointer",
                  fontFamily: inter,
                  fontSize: 10.5,
                  fontWeight: 600,
                  color: "#6D7F8D",
                  letterSpacing: "0.02em",
                }}
              >
                <span>Confirm Direction</span>
                <span style={{ fontSize: 12, lineHeight: 1 }}>→</span>
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function CommitmentSignalChip({ signal }: { signal: DecisionGuidance["commitment_signal"] }) {
  const styles: Record<DecisionGuidance["commitment_signal"], { border: string; bg: string; text: string }> = {
    'Increase Investment': { border: 'rgba(168,180,117,0.45)', bg: 'rgba(168,180,117,0.16)', text: '#6B7D30' },
    'Hero Expression': { border: 'rgba(125,150,172,0.42)', bg: 'rgba(125,150,172,0.14)', text: '#4A6E85' },
    'Controlled Test': { border: 'rgba(184,135,107,0.45)', bg: 'rgba(184,135,107,0.15)', text: '#9A6D47' },
    'Maintain Exposure': { border: 'rgba(67,67,43,0.18)', bg: 'rgba(67,67,43,0.05)', text: 'rgba(67,67,43,0.76)' },
    'Reduce Exposure': { border: 'rgba(169,123,143,0.40)', bg: 'rgba(169,123,143,0.14)', text: '#A97B8F' },
  };
  const style = styles[signal];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "6px 11px",
        borderRadius: 999,
        border: `1px solid ${style.border}`,
        background: style.bg,
        color: style.text,
        fontFamily: sohne,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        boxShadow: "0 1px 0 rgba(255,255,255,0.35) inset",
      }}
    >
      {signal}
    </span>
  );
}

function ExecutionLeverChip({ label }: { label: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 10.5,
        fontWeight: 500,
        fontFamily: inter,
        background: "rgba(67,67,43,0.035)",
        border: "1px solid rgba(67,67,43,0.11)",
        color: "rgba(67,67,43,0.58)",
      }}
    >
      {toDisplayChipLabel(label)}
    </span>
  );
}

function RecommendedKeyPieceChip({ label, isSelected = false }: { label: string; isSelected?: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "5px 11px",
        borderRadius: 999,
        fontSize: 10.5,
        fontWeight: 600,
        fontFamily: inter,
        background: isSelected ? "rgba(168,180,117,0.12)" : "rgba(125,150,172,0.07)",
        border: isSelected ? "1px solid rgba(168,180,117,0.28)" : "1px solid rgba(125,150,172,0.22)",
        color: isSelected ? "rgba(67,67,43,0.84)" : "rgba(67,67,43,0.76)",
      }}
    >
      {toDisplayChipLabel(label)}
    </span>
  );
}

function SupportingPieceChip({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "5px 11px",
        borderRadius: 999,
        fontSize: 10.5,
        fontWeight: 500,
        fontFamily: inter,
        background: "transparent",
        border: "1px solid rgba(67,67,43,0.14)",
        color: "rgba(67,67,43,0.66)",
        cursor: onClick ? "pointer" : "default",
      }}
    >
      {toDisplayChipLabel(label)}
    </button>
  );
}

function toDirectiveSentence(value: string): string {
  const trimmed = value
    .replace(/\bone or two pieces\b/gi, "")
    .replace(/\b\d+\s*(?:to|-)\s*\d+\s*pieces\b/gi, "")
    .replace(/\b\d+\s*pieces\b/gi, "")
    .replace(/\s+,/g, ",")
    .replace(/\s{2,}/g, " ")
    .trim();
  const sentenceMatch = trimmed.match(/^[^.!?]+[.!?]?/);
  return sentenceMatch ? sentenceMatch[0].trim() : trimmed;
}

function toDisplayChipLabel(value: string): string {
  return value.replace(/\b([a-z])/gi, (match) => match.toUpperCase());
}

/* ══════════════════════════════════════════════════════════════════════════
   CONCEPT NARRATIVE NEXT MOVE — legacy layout kept for spec-adjacent reuse
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
          if (suggestion.kind === 'warning') tagKey = 'redirect';
          else if (suggestion.kind === 'material' || suggestion.kind === 'upgrade-material') tagKey = 'redirect';
          else if (suggestion.id === 'invest-finishing') tagKey = 'add';
          const saving = Math.abs(suggestion.after.saving);
          const impact: 'HIGH' | 'MED' | 'LOW' = suggestion.kind === 'warning' ? 'MED' : saving > 20 ? 'HIGH' : saving > 10 ? 'MED' : 'LOW';
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
  const tag = { ...SPEC_TAG_STYLES[tagKey], label: suggestion.kind === 'warning' ? 'CONFLICT' : SPEC_TAG_STYLES[tagKey].label };

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
        background: isApplied
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
        {suggestion.kind !== 'warning' && (isApplied ? (
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
        ))}
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

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "11px 8px",
        borderRadius: 8,
        background: isApplied ? "rgba(168,180,117,0.07)" : "transparent",
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
            {suggestion.kind === 'warning' ? 'CONFLICT' : TAG_LABELS[tagType]}
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
        {suggestion.kind !== 'warning' && (isApplied ? (
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
        ))}
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
