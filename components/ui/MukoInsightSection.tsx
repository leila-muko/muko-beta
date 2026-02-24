"use client";

import React, { useState, useEffect } from "react";
import { CheckIcon, PencilIcon } from "@/components/ui/icons/InsightIcons";
import type { SpecSuggestion } from "@/lib/types/next-move";

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

export interface MukoInsightSectionProps {
  headline: string;
  paragraphs: string[];
  opportunity: { items: string[]; subtitle?: string };
  edit: { items: string[]; subtitle?: string };
  nextMove: NextMoveProps;
}

export function MukoInsightSection({
  headline,
  paragraphs,
  opportunity,
  edit,
  nextMove,
}: MukoInsightSectionProps) {
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

      {/* Headline — pullquote style */}
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
        {headline}
      </div>

      {/* Body paragraphs */}
      {paragraphs.map((p, i) => (
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

      {/* The Opportunity card — compact */}
      {opportunity.items.length > 0 && (
        <div
          style={{
            padding: "11px 16px",
            borderRadius: 10,
            border: "1px solid rgba(168,180,117,0.22)",
            borderLeft: "3px solid rgba(168,180,117,0.30)",
            background: "transparent",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontFamily: inter,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#A8B475",
              marginBottom: 4,
            }}
          >
            THE OPPORTUNITY
          </div>
          <div
            style={{
              fontFamily: inter,
              fontSize: 11,
              fontStyle: "italic",
              color: "rgba(67,67,43,0.45)",
              marginBottom: 10,
            }}
          >
            {opportunity.subtitle || "What\u2019s working in your favor right now"}
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 7 }}>
            {opportunity.items.map((point, i) => (
              <li
                key={i}
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "flex-start",
                  fontFamily: inter,
                  fontSize: 12,
                  color: "rgba(67,67,43,0.62)",
                  lineHeight: 1.5,
                }}
              >
                <CheckIcon size={12} color="#A8B475" />
                <span style={{ marginTop: -1 }}>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* The Edit card — compact */}
      {edit.items.length > 0 && (
        <div
          style={{
            padding: "11px 16px",
            borderRadius: 10,
            border: "1px solid rgba(184,135,107,0.22)",
            borderLeft: "3px solid rgba(184,135,107,0.30)",
            background: "transparent",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontFamily: inter,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#B8876B",
              marginBottom: 4,
            }}
          >
            THE EDIT
          </div>
          <div
            style={{
              fontFamily: inter,
              fontSize: 11,
              fontStyle: "italic",
              color: "rgba(67,67,43,0.45)",
              marginBottom: 10,
            }}
          >
            {edit.subtitle || "Inputs worth revisiting before you commit"}
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 7 }}>
            {edit.items.map((item, i) => (
              <li
                key={i}
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "flex-start",
                  fontFamily: inter,
                  fontSize: 12,
                  color: "rgba(67,67,43,0.62)",
                  lineHeight: 1.5,
                }}
              >
                <PencilIcon size={12} color="#B8876B" />
                <span style={{ marginTop: -1 }}>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Next Move section */}
      {nextMove.mode === "concept" && nextMove.items.length > 0 && (
        <NextMoveContainer subtitle={nextMove.subtitle || "Suggested pivots and creative additions \u2014 apply a swap or layer in what resonates."}>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {nextMove.items.map((item, i) => (
              <React.Fragment key={item.label}>
                {i > 0 && (
                  <div style={{ height: 1, background: "rgba(125,150,172,0.10)", margin: "0 4px" }} />
                )}
                <ConceptNextMoveRow
                  label={item.label}
                  rationale={item.rationale}
                  itemType={item.type}
                  isAdded={nextMove.addedItems?.has(item.label) ?? false}
                  onAdd={() => nextMove.onAdd(item.label)}
                  onRemove={nextMove.onRemove ? () => nextMove.onRemove!(item.label) : undefined}
                />
              </React.Fragment>
            ))}
          </div>
        </NextMoveContainer>
      )}

      {nextMove.mode === "spec" && nextMove.suggestions.length > 0 && (
        <NextMoveContainer subtitle={nextMove.subtitle || "Adjustments that improve feasibility without changing your direction."}>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {nextMove.suggestions.slice(0, 3).map((suggestion, i) => (
              <React.Fragment key={suggestion.id}>
                {i > 0 && (
                  <div style={{ height: 1, background: "rgba(125,150,172,0.10)", margin: "0 4px" }} />
                )}
                <SpecNextMoveRow
                  suggestion={suggestion}
                  isApplied={nextMove.appliedIds.has(suggestion.id)}
                  onApply={() => nextMove.onApply(suggestion.id)}
                  onUndo={() => nextMove.onUndo(suggestion.id)}
                />
              </React.Fragment>
            ))}
          </div>
        </NextMoveContainer>
      )}
    </div>
  );
}

/* ─── Next Move container ───────────────────────────────────────────────── */

function NextMoveContainer({ subtitle, children }: { subtitle: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        border: "1px solid rgba(125,150,172,0.18)",
        borderLeft: "3px solid rgba(125,150,172,0.45)",
        borderRadius: 10,
        padding: "16px 18px",
        background: "rgba(125,150,172,0.06)",
      }}
    >
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
      {children}
    </div>
  );
}

/* ─── Concept mode row ──────────────────────────────────────────────────── */

function ConceptNextMoveRow({
  label,
  rationale,
  itemType,
  isAdded,
  onAdd,
  onRemove,
}: {
  label: string;
  rationale: string;
  itemType?: 'chip' | 'silhouette_swap' | 'palette_swap';
  isAdded: boolean;
  onAdd: () => void;
  onRemove?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const isSwap = itemType === 'silhouette_swap' || itemType === 'palette_swap';

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        padding: "10px 4px",
        gap: 10,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, flex: 1, minWidth: 0 }}>
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: isAdded ? "#A8B475" : "#7D96AC",
            flexShrink: 0,
            marginTop: 5,
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span
            style={{
              fontFamily: inter,
              fontSize: 12.5,
              fontWeight: 600,
              color: isAdded ? "#A8B475" : "rgba(67,67,43,0.72)",
              lineHeight: 1.4,
            }}
          >
            {label}
          </span>
          <span
            style={{
              fontFamily: inter,
              fontSize: 11,
              fontStyle: "italic",
              color: "rgba(67,67,43,0.40)",
              lineHeight: 1.4,
            }}
          >
            {rationale}
          </span>
        </div>
      </div>

      {isAdded ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span
            style={{
              fontFamily: inter,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.08em",
              color: "#A8B475",
            }}
          >
            {isSwap ? "Applied \u2713" : "Added \u2713"}
          </span>
          {onRemove && (
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
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
              {isSwap ? "Undo" : "Remove"}
            </button>
          )}
        </div>
      ) : (
        <button
          onClick={onAdd}
          style={{
            fontFamily: inter,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.08em",
            color: "#A8B475",
            background: "transparent",
            border: `1px solid rgba(168,180,117,${hovered ? 0.5 : 0.35})`,
            borderRadius: 999,
            padding: "4px 10px",
            cursor: "pointer",
            opacity: hovered ? 1 : 0.7,
            transition: "opacity 150ms ease, border-color 150ms ease",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {isSwap ? "\u2190 Apply" : "+ Add"}
        </button>
      )}
    </div>
  );
}

/* ─── Spec mode row ─────────────────────────────────────────────────────── */

function SpecNextMoveRow({
  suggestion,
  isApplied,
  onApply,
  onUndo,
}: {
  suggestion: SpecSuggestion;
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
        justifyContent: "space-between",
        padding: "10px 4px",
        gap: 10,
        transition: "background 300ms ease",
        background: flashActive ? "rgba(168,180,117,0.10)" : "transparent",
        borderRadius: 6,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, flex: 1, minWidth: 0 }}>
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: isApplied ? "#A8B475" : "#7D96AC",
            flexShrink: 0,
            marginTop: 5,
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span
            style={{
              fontFamily: inter,
              fontSize: 12.5,
              fontWeight: 600,
              color: isApplied ? "#A8B475" : "rgba(67,67,43,0.72)",
              lineHeight: 1.4,
            }}
          >
            {suggestion.label}
          </span>
          {suggestion.sub && (
            <span
              style={{
                fontFamily: inter,
                fontSize: 11,
                fontStyle: "italic",
                color: "rgba(67,67,43,0.40)",
                lineHeight: 1.4,
              }}
            >
              {suggestion.sub}
            </span>
          )}
        </div>
      </div>

      {isApplied ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
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
            border: `1px solid rgba(168,180,117,${hovered ? 0.5 : 0.35})`,
            borderRadius: 999,
            padding: "4px 10px",
            cursor: "pointer",
            opacity: hovered ? 1 : 0.7,
            transition: "opacity 150ms ease, border-color 150ms ease",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {"\u2190"} Apply
        </button>
      )}
    </div>
  );
}
