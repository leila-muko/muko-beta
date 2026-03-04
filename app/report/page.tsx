"use client";

import React, { useState, useEffect, useRef } from "react";
import FloatingMukoOrb from "@/components/FloatingMukoOrb";
import { useSessionStore } from "@/lib/store/sessionStore";
import type { KeyPiece } from "@/lib/store/sessionStore";
import { AESTHETIC_CONTENT } from "@/lib/concept-studio/constants";
import { buildReportBlackboard, toAestheticSlug } from "@/lib/synthesizer/assemble";
import { calculateCOGS } from "@/lib/spec-studio/calculator";
import { createClient } from "@/lib/supabase/client";
import materialsData from "@/data/materials.json";
import type { Material, ConstructionTier } from "@/lib/types/spec-studio";
import type { InsightData } from "@/lib/types/insight";
import type { ReportComputedData } from "@/lib/synthesizer/reportNarrative";

/* ═══════════════════════════════════════════════════════════════
   Muko — The Standard Report (Step 4)
   The definitive commercial assessment. Scored, synthesized,
   and ready to act on.
   ═══════════════════════════════════════════════════════════════ */

/* ─── Design Tokens (matched to Concept Studio) ─── */
const CHARTREUSE = "#A8B475";
const STEEL      = "#7D96AC";
const CAMEL      = "#B8876B";
const ROSE       = "#A97B8F";
const OLIVE      = "#43432B";
const PULSE_RED  = "#8A3A3A";

/* ─── Shared font aliases ─── */
const inter  = "var(--font-inter), system-ui, sans-serif";
const sohne  = "var(--font-sohne-breit), system-ui, sans-serif";

/* ─── Simple card style (matches Concept Studio cards exactly) ─── */
const card: React.CSSProperties = {
  borderRadius: 10,
  border: "1px solid rgba(67,67,43,0.09)",
  background: "rgba(255,255,255,0.75)",
  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  overflow: "hidden",
};

/* ─── Section label (matches Concept Studio PULSE / MUKO INSIGHT labels) ─── */
const microLabel: React.CSSProperties = {
  fontFamily: inter,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase" as const,
  color: "rgba(67,67,43,0.38)",
  marginBottom: 16,
};

/* ─── Body text (matches Concept Studio body paragraphs) ─── */
const bodyText: React.CSSProperties = {
  fontFamily: inter,
  fontSize: 12.5,
  lineHeight: 1.7,
  color: "rgba(67,67,43,0.64)",
  margin: 0,
};

/* ─── Icons (same as Concept Studio) ─── */
function IconIdentity({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconResonance({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M17 21V19C17 16.79 15.21 15 13 15H5C2.79 15 1 16.79 1 19V21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M23 21V19C22.99 17.18 21.8 15.58 20 15.13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 3.13C17.8 3.58 18.99 5.18 18.99 7C18.99 8.82 17.8 10.42 16 10.87" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconExecution({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68 1.65 1.65 0 0 0 10 3.17V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ─── Score color helper ─── */
function getScoreColor(score: number): string {
  if (score >= 80) return CHARTREUSE;
  if (score >= 60) return CAMEL;
  return PULSE_RED;
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "Strong";
  if (score >= 60) return "Moderate";
  return "At Risk";
}

function getVerdictText(score: number): string {
  if (score >= 85) return "Strong across all dimensions — ready for production commitment.";
  if (score >= 75) return "Strong foundation — minor adjustments recommended before production.";
  if (score >= 60) return "Viable direction — address flagged dimensions before committing.";
  return "Significant risk detected — consider redirecting before production.";
}

/* ─── Animated Counter Hook ─── */
function useCountUp(target: number, duration = 1200, delay = 400) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const timeout = setTimeout(() => {
      const start = performance.now();
      const animate = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(Math.round(eased * target));
        if (progress < 1) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    }, delay);
    return () => clearTimeout(timeout);
  }, [target, duration, delay]);
  return value;
}

/* ─── Radar Chart Component ─── */
function RadarChart({
  data,
}: {
  data: { label: string; value: number; color: string }[];
}) {
  const cx = 180,
    cy = 175,
    maxR = 130;
  const n = data.length;

  function polarToCart(angle: number, r: number) {
    const rad = ((angle - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  const angleStep = 360 / n;

  const rings = [0.25, 0.5, 0.75, 1.0];
  const ringPolygons = rings.map((pct) => {
    const pts = Array.from({ length: n }, (_, i) => {
      const p = polarToCart(i * angleStep, maxR * pct);
      return `${p.x},${p.y}`;
    });
    return pts.join(" ");
  });

  const axes = Array.from({ length: n }, (_, i) => {
    const outer = polarToCart(i * angleStep, maxR);
    return { x2: outer.x, y2: outer.y };
  });

  const dataPts = data.map((d, i) => {
    const r = (d.value / 100) * maxR;
    return polarToCart(i * angleStep, r);
  });
  const dataPath = dataPts.map((p) => `${p.x},${p.y}`).join(" ");

  const labels = data.map((d, i) => {
    const p = polarToCart(i * angleStep, maxR + 30);
    return { ...d, x: p.x, y: p.y };
  });

  const scoreLabels = data.map((d, i) => {
    const r = (d.value / 100) * maxR;
    const angle = i * angleStep;
    const labelR = r + 18;
    const p = polarToCart(angle, labelR);
    return { value: d.value, x: p.x, y: p.y, color: d.color };
  });

  return (
    <svg viewBox="0 0 360 360" style={{ width: "100%", maxWidth: 380 }}>
      <defs>
        <radialGradient id="dataFillRadial" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor={STEEL} stopOpacity="0.20" />
          <stop offset="40%" stopColor={STEEL} stopOpacity="0.12" />
          <stop offset="70%" stopColor="#8BA0B4" stopOpacity="0.08" />
          <stop offset="100%" stopColor={STEEL} stopOpacity="0.04" />
        </radialGradient>
        <linearGradient id="dataFillWarm" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={CAMEL} stopOpacity="0.06" />
          <stop offset="50%" stopColor={ROSE} stopOpacity="0.04" />
          <stop offset="100%" stopColor={CAMEL} stopOpacity="0.06" />
        </linearGradient>
        <radialGradient id="idealZone" cx="50%" cy="50%" r="50%">
          <stop offset="60%" stopColor="rgba(67,67,43,0)" stopOpacity="0" />
          <stop offset="100%" stopColor="rgba(67,67,43,0.015)" stopOpacity="1" />
        </radialGradient>
        <radialGradient id="riskZone" cx="50%" cy="50%" r="35%">
          <stop offset="0%" stopColor={ROSE} stopOpacity="0.05" />
          <stop offset="100%" stopColor={ROSE} stopOpacity="0" />
        </radialGradient>
        <filter id="dataShadow" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="6" stdDeviation="12" floodColor={STEEL} floodOpacity="0.12" />
        </filter>
      </defs>

      <polygon points={ringPolygons[3]} fill="url(#idealZone)" />
      <polygon points={ringPolygons[0]} fill="url(#riskZone)" />

      {ringPolygons.map((pts, i) => (
        <polygon
          key={i}
          points={pts}
          fill="none"
          stroke={i === 3 ? "rgba(67,67,43,0.14)" : "rgba(67,67,43,0.06)"}
          strokeWidth={i === 3 ? 1.2 : 0.7}
          strokeDasharray={i < 3 ? "4,6" : "none"}
        />
      ))}

      {axes.map((a, i) => (
        <line key={i} x1={cx} y1={cy} x2={a.x2} y2={a.y2} stroke="rgba(67,67,43,0.05)" strokeWidth="0.8" />
      ))}

      {axes.map((a, i) => (
        <circle key={`ep-${i}`} cx={a.x2} cy={a.y2} r={2.5} fill="rgba(67,67,43,0.12)" stroke="rgba(67,67,43,0.06)" strokeWidth="1" />
      ))}

      <polygon
        points={dataPath}
        fill="url(#dataFillRadial)"
        stroke="none"
        filter="url(#dataShadow)"
        style={{ animation: "radarReveal 1s cubic-bezier(0.22,1,0.36,1) 0.4s both" }}
      />
      <polygon
        points={dataPath}
        fill="url(#dataFillWarm)"
        stroke="none"
        style={{ animation: "radarReveal 1s cubic-bezier(0.22,1,0.36,1) 0.4s both" }}
      />
      <polygon
        points={dataPath}
        fill="url(#dataFillRadial)"
        stroke="none"
        style={{ animation: "radarReveal 1s cubic-bezier(0.22,1,0.36,1) 0.4s both" }}
      />
      <polygon
        points={dataPath}
        fill="none"
        stroke={STEEL}
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity={0.85}
        style={{ animation: "radarReveal 1s cubic-bezier(0.22,1,0.36,1) 0.45s both" }}
      />

      {dataPts.map((p, i) => (
        <g key={i} style={{ animation: `radarReveal 0.5s ease ${0.7 + i * 0.08}s both` }}>
          <circle cx={p.x} cy={p.y} r={12} fill={data[i].color} opacity={0.08} />
          <circle cx={p.x} cy={p.y} r={8} fill="white" opacity={0.6} />
          <circle cx={p.x} cy={p.y} r={6} fill="white" stroke={data[i].color} strokeWidth="2" />
          <circle cx={p.x} cy={p.y} r={2.2} fill={data[i].color} />
        </g>
      ))}

      {scoreLabels.map((s, i) => (
        <text
          key={`sv-${i}`}
          x={s.x}
          y={s.y}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={s.color}
          fontSize="11"
          fontWeight="800"
          fontFamily={sohne}
          style={{ animation: `radarReveal 0.4s ease ${0.9 + i * 0.08}s both` }}
        >
          {s.value}
        </text>
      ))}

      {labels.map((l, i) => (
        <text
          key={`al-${i}`}
          x={l.x}
          y={l.y}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="rgba(67,67,43,0.48)"
          fontSize="10"
          fontWeight="700"
          fontFamily={inter}
          letterSpacing="0.08em"
        >
          {l.label.toUpperCase()}
        </text>
      ))}

      <circle cx={cx} cy={cy} r={1.8} fill="rgba(67,67,43,0.08)" />
    </svg>
  );
}

/* ─── Default target margin (used until brand profile is wired) ─── */
const DEFAULT_TARGET_MARGIN = 0.60;

/* ─── Dimension tag style by type ─── */
const DIM_TAG: Record<string, { bg: string; text: string; border: string }> = {
  identity:   { bg: "rgba(184,135,107,0.08)", text: CAMEL,      border: `1px solid rgba(184,135,107,0.28)` },
  resonance:  { bg: "rgba(168,180,117,0.08)", text: "#5B6A38",  border: `1px solid rgba(168,180,117,0.28)` },
  execution:  { bg: "rgba(125,150,172,0.08)", text: STEEL,      border: `1px solid rgba(125,150,172,0.28)` },
  cost:       { bg: "rgba(169,123,143,0.08)", text: ROSE,       border: `1px solid rgba(169,123,143,0.28)` },
  Cost:       { bg: "rgba(169,123,143,0.08)", text: ROSE,       border: `1px solid rgba(169,123,143,0.28)` },
  Timeline:   { bg: "rgba(67,67,43,0.04)",    text: "rgba(67,67,43,0.48)", border: "1px solid rgba(67,67,43,0.14)" },
  Execution:  { bg: "rgba(125,150,172,0.08)", text: STEEL,      border: `1px solid rgba(125,150,172,0.28)` },
  Identity:   { bg: "rgba(184,135,107,0.08)", text: CAMEL,      border: `1px solid rgba(184,135,107,0.28)` },
  Resonance:  { bg: "rgba(168,180,117,0.08)", text: "#5B6A38",  border: `1px solid rgba(168,180,117,0.28)` },
};

/* ─── Collection Alignment helper ─── */
type AlignmentStatus = 'pass' | 'advisory' | 'conflict';
interface AlignmentSignal {
  label: string;
  text: string;
  status: AlignmentStatus;
}

function getCollectionAlignment(
  role: string,
  costGatePassed: boolean,
  constructionTier: string,
  resonanceScore: number,
  keyPiece: KeyPiece | null
): AlignmentSignal[] {
  const signals: AlignmentSignal[] = [];

  // Signal 1: Margin vs Role
  if (role === 'volume-driver') {
    if (costGatePassed) {
      signals.push({ label: "Margin vs Role", text: "Cost gate passed — fits a volume driver's margin requirements.", status: 'pass' });
    } else {
      signals.push({ label: "Margin vs Role", text: "Cost gate failed. Volume drivers need tight margins — current COGS exceeds ceiling.", status: 'conflict' });
    }
  } else if (role === 'hero') {
    if (costGatePassed) {
      signals.push({ label: "Margin vs Role", text: "Margin is healthy. For a hero piece, you have room to invest further in materials or construction.", status: 'pass' });
    } else {
      signals.push({ label: "Margin vs Role", text: "Over budget — acceptable for a hero piece if the creative direction justifies it. Flag for review.", status: 'advisory' });
    }
  } else if (role === 'directional') {
    signals.push({ label: "Margin vs Role", text: costGatePassed ? "Margin holds — directional piece is commercially viable." : "Margin pressure on a directional piece — consider simplifying construction to restore headroom.", status: costGatePassed ? 'pass' : 'advisory' });
  } else {
    signals.push({ label: "Margin vs Role", text: costGatePassed ? "Core evolution holds on margin — on track." : "Core evolution piece is over budget. Tighten material or construction before committing.", status: costGatePassed ? 'pass' : 'conflict' });
  }

  // Signal 2: Complexity vs Role
  const tierLower = constructionTier.toLowerCase();
  if (role === 'volume-driver' && tierLower === 'high') {
    signals.push({ label: "Complexity vs Role", text: "High construction complexity conflicts with volume driver requirements. Velocity and cost control will suffer.", status: 'conflict' });
  } else if (role === 'hero' && tierLower === 'high') {
    signals.push({ label: "Complexity vs Role", text: "High complexity is appropriate for a hero piece — construction is part of the identity.", status: 'pass' });
  } else if (role === 'core-evolution' && tierLower === 'high') {
    signals.push({ label: "Complexity vs Role", text: "High complexity on a core evolution piece adds risk. Moderate tier is recommended.", status: 'advisory' });
  } else {
    signals.push({ label: "Complexity vs Role", text: `${constructionTier} construction is well-matched to the ${role === 'directional' ? 'directional' : role} role.`, status: 'pass' });
  }

  // Signal 3: Market Signal vs Role
  if (keyPiece && !keyPiece.custom) {
    const signal = keyPiece.signal;
    if (signal === 'high-volume' && (role === 'directional' || role === 'hero')) {
      signals.push({ label: "Market Signal vs Role", text: `${keyPiece.item} is a high-volume market signal — may not deliver the freshness expected of a ${role} piece.`, status: 'advisory' });
    } else if (signal === 'emerging' && role === 'volume-driver') {
      signals.push({ label: "Market Signal vs Role", text: `${keyPiece.item} is an emerging trend — market volume may not be there yet for a volume driver.`, status: 'advisory' });
    } else if (signal === 'ascending') {
      signals.push({ label: "Market Signal vs Role", text: `${keyPiece.item} is in the ascending window — timing is strong for any collection role.`, status: 'pass' });
    } else if (resonanceScore >= 75) {
      signals.push({ label: "Market Signal vs Role", text: "Resonance is strong — market appetite aligns with this piece's role in the collection.", status: 'pass' });
    } else {
      signals.push({ label: "Market Signal vs Role", text: "Resonance score is moderate. Validate demand before committing production units.", status: 'advisory' });
    }
  } else {
    if (resonanceScore >= 80) {
      signals.push({ label: "Market Signal vs Role", text: "Strong resonance — market timing supports this role.", status: 'pass' });
    } else if (resonanceScore >= 65) {
      signals.push({ label: "Market Signal vs Role", text: "Moderate resonance. Consider the market timing relative to your collection role before finalizing.", status: 'advisory' });
    } else {
      signals.push({ label: "Market Signal vs Role", text: "Low resonance — reconsider the timing or direction before committing.", status: 'conflict' });
    }
  }

  return signals;
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function StandardReportPage() {
  const {
    collectionName: storeCollection,
    season: storeSeason,
    aestheticMatchedId: storeAesthetic,
    refinementModifiers: storeModifiers,
    category: storeCategory,
    targetMsrp: storeTargetMsrp,
    materialId: storeMaterial,
    silhouette: storeSilhouette,
    constructionTier: storeTier,
    chipSelection: storeChipSelection,
    collectionRole,
    selectedKeyPiece,
    executionPulse: storeExecutionPulse,
  } = useSessionStore();

  const aestheticScores = storeAesthetic ? AESTHETIC_CONTENT[storeAesthetic] : null;
  const derivedIdentity  = aestheticScores?.identityScore  ?? 0;
  const derivedResonance = aestheticScores?.resonanceScore ?? 0;
  const derivedExecution = storeExecutionPulse?.score ?? 0;

  // ─── reportComputed: populated by synthesizer API on mount ───────────────
  const [reportComputed, setReportComputed] = useState<ReportComputedData | null>(null);

  // Local pre-synthesizer fallbacks (computed from store, never from MOCK)
  const localOverallScore = Math.round(
    derivedIdentity * 0.35 + derivedResonance * 0.35 + derivedExecution * 0.30
  );

  const report = {
    collectionName:   storeCollection || "—",
    seasonLabel:      storeSeason     || "—",
    aestheticName:    storeAesthetic  || "—",
    category:         storeCategory   || "—",
    material:         storeMaterial   || "—",
    silhouette:       storeSilhouette || "—",
    targetMSRP:       storeTargetMsrp ?? 0,
    targetMargin:     reportComputed?.targetMargin ?? DEFAULT_TARGET_MARGIN,
    constructionTier: (storeTier
      ? storeTier.charAt(0).toUpperCase() + storeTier.slice(1)
      : "Moderate") as "Low" | "Moderate" | "High",
    modifiers: storeModifiers,
    identity:  derivedIdentity,
    resonance: derivedResonance,
    execution: derivedExecution,
    // Synthesizer-computed fields (fall back to 0/empty while loading)
    overallScore:     reportComputed?.overallScore     ?? localOverallScore,
    brandFit:         reportComputed?.brandFit         ?? derivedIdentity,
    demand:           reportComputed?.demand           ?? derivedResonance,
    saturation:       reportComputed?.saturation       ?? 0,
    margin:           reportComputed?.margin           ?? 0,
    cost:             reportComputed?.cost             ?? 0,
    timeline:         reportComputed?.timeline         ?? 0,
    cogs:             reportComputed?.cogs             ?? 0,
    ceiling:          reportComputed?.ceiling          ?? 0,
    projectedMargin:  reportComputed?.projectedMargin  ?? 0,
    costGatePassed:   reportComputed?.costGatePassed   ?? true,
    considerations:   reportComputed?.considerations   ?? [],
    actions:          reportComputed?.actions          ?? [],
    redirect:         reportComputed?.redirect         ?? null,
  };

  // ─── Synthesizer: one-time report on mount ────────────────────────────────
  const reportAbortRef = useRef<AbortController | null>(null);
  const [reportNarrativeData, setReportNarrativeData] = useState<InsightData | null>(null);

  useEffect(() => {
    if (!storeAesthetic) return;
    const slug = toAestheticSlug(storeAesthetic);
    if (!slug || !storeMaterial) return;

    const materials = materialsData as unknown as Material[];
    const mat = materials.find((m) => m.id === storeMaterial);
    const tier = (storeTier ?? 'moderate') as ConstructionTier;
    const cogsResult = mat
      ? calculateCOGS(mat, 2.5, tier, false, storeTargetMsrp ?? 0, DEFAULT_TARGET_MARGIN)
      : null;
    const cogsUsd = cogsResult?.totalCOGS ?? 0;
    const marginPass = cogsResult ? !cogsResult.isOverBudget : true;
    const overallScore = Math.round(derivedIdentity * 0.35 + derivedResonance * 0.35 + derivedExecution * 0.30);

    const blackboard = buildReportBlackboard({
      aestheticSlug: slug,
      brandKeywords: storeModifiers,
      identity_score: derivedIdentity,
      resonance_score: derivedResonance,
      execution_score: derivedExecution,
      overall_score: overallScore,
      materialId: storeMaterial,
      cogs_usd: cogsUsd,
      target_msrp: storeTargetMsrp ?? 0,
      margin_pass: marginPass,
      construction_tier: storeTier ?? 'moderate',
      timeline_weeks: 14,
      season: storeSeason || 'SS27',
      collectionName: storeCollection || '',
      collection_role: collectionRole,
    });
    if (!blackboard) return;

    reportAbortRef.current?.abort();
    const controller = new AbortController();
    reportAbortRef.current = controller;

    (async () => {
      try {
        const res = await fetch('/api/synthesizer/report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(blackboard),
          signal: controller.signal,
        });
        if (!res.ok || controller.signal.aborted) return;
        const result = await res.json();
        if (controller.signal.aborted) return;
        setReportNarrativeData(result.data as InsightData);
        setReportComputed(result.computed as ReportComputedData);
        // Fire-and-forget DB log
        try {
          const supabase = createClient();
          supabase.from('analyses').insert({
            narrative: (result.data as InsightData).statements?.join(' ') ?? '',
            agent_versions: { synthesizer: result.meta?.method ?? 'unknown' },
          }).then(() => {});
        } catch { /* fire-and-forget */ }
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
      }
    })();

    return () => { controller.abort(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedScore     = useCountUp(report.overallScore, 1400, 500);
  const animatedIdentity  = useCountUp(report.identity,     1000, 800);
  const animatedResonance = useCountUp(report.resonance,    1000, 900);
  const animatedExecution = useCountUp(report.execution,    1000, 1000);

  const scoreColor     = getScoreColor(report.overallScore);
  const identityColor  = getScoreColor(report.identity);
  const resonanceColor = getScoreColor(report.resonance);
  const executionColor = getScoreColor(report.execution);

  const headerCollectionName = storeCollection || '—';
  const headerSeasonLabel    = storeSeason     || '—';

  const radarData = [
    { label: "Brand Fit",  value: report.brandFit,   color: getScoreColor(report.brandFit) },
    { label: "Demand",     value: report.demand,     color: getScoreColor(report.demand) },
    { label: "Timeline",   value: report.timeline,   color: getScoreColor(report.timeline) },
    { label: "Cost",       value: report.cost,       color: getScoreColor(report.cost) },
    { label: "Margin",     value: report.margin,     color: getScoreColor(report.margin) },
    { label: "Saturation", value: report.saturation, color: getScoreColor(report.saturation) },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#FAF9F6", display: "flex", flexDirection: "column" }}>

      {/* ═══ TOP NAV — matches Concept Studio exactly ═══ */}
      <header
        style={{
          position: "fixed",
          top: 0, left: 0, right: 0,
          height: 72,
          background: "rgba(250,249,246,0.92)",
          backdropFilter: "blur(24px) saturate(160%)",
          WebkitBackdropFilter: "blur(24px) saturate(160%)",
          borderBottom: "1px solid rgba(67,67,43,0.09)",
          zIndex: 200,
          display: "flex",
          alignItems: "center",
          padding: "0 40px",
          justifyContent: "space-between",
          gap: 20,
        }}
      >
        {/* Left: logo + stepper */}
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <span style={{ fontFamily: sohne, fontWeight: 700, fontSize: 18, letterSpacing: "-0.02em", color: OLIVE }}>
            muko
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {[
              { label: "Intent",  done: true,  active: false },
              { label: "Concept", done: true,  active: false },
              { label: "Spec",    done: true,  active: false },
              { label: "Report",  done: false, active: true  },
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 12px",
                  borderRadius: 999,
                  border: s.done
                    ? `1.5px solid ${CHARTREUSE}`
                    : s.active
                      ? `1.5px solid ${OLIVE}`
                      : "1.5px solid rgba(67,67,43,0.10)",
                  background: s.done
                    ? "rgba(168,180,117,0.08)"
                    : s.active
                      ? OLIVE
                      : "rgba(67,67,43,0.03)",
                  fontFamily: sohne,
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.01em",
                  color: s.done
                    ? "rgba(67,67,43,0.70)"
                    : s.active
                      ? "#F5F0E8"
                      : "rgba(67,67,43,0.35)",
                }}
              >
                {s.done ? (
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                    <path d="M4.5 7.2L6.2 8.8L9.5 5.5" stroke={CHARTREUSE} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : s.active ? null : (
                  <span style={{ width: 6, height: 6, borderRadius: 999, background: "rgba(67,67,43,0.18)" }} />
                )}
                {s.label}
              </div>
            ))}
          </div>
        </div>

        {/* Right: session meta + actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontFamily: sohne, fontSize: 12, fontWeight: 600, color: "rgba(67,67,43,0.50)", letterSpacing: "0.03em" }}>
            {headerSeasonLabel}<span style={{ padding: "0 7px", opacity: 0.35 }}>·</span>{headerCollectionName}
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => window.history.back()}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "7px 13px 7px 10px",
                borderRadius: 999,
                border: "1px solid rgba(67,67,43,0.14)",
                background: "transparent",
                fontFamily: sohne,
                fontSize: 11,
                fontWeight: 600,
                color: "rgba(67,67,43,0.62)",
                cursor: "pointer",
                letterSpacing: "0.01em",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path d="M8.5 3L4.5 7L8.5 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Back
            </button>
            <button
              style={{
                padding: "7px 14px",
                borderRadius: 999,
                border: "none",
                background: OLIVE,
                fontFamily: sohne,
                fontSize: 11,
                fontWeight: 600,
                color: "#F5F0E8",
                cursor: "pointer",
                letterSpacing: "0.01em",
              }}
            >
              SAVE & CLOSE
            </button>
          </div>
        </div>
      </header>

      {/* ═══ MAIN CONTENT ═══ */}
      <main style={{ flex: 1, paddingTop: 88 }}>
        <div style={{ padding: "40px 44px 120px" }}>

          {/* ─── Page Header ─── */}
          <div style={{ marginBottom: 20, animation: "fadeIn 600ms ease-out" }}>
            <h1
              style={{
                fontFamily: sohne,
                fontWeight: 500,
                fontSize: 28,
                color: OLIVE,
                margin: 0,
                letterSpacing: "-0.01em",
                lineHeight: 1.1,
              }}
            >
              The Muko Standard
            </h1>
            <p
              style={{
                fontFamily: inter,
                fontSize: 13,
                color: "rgba(67,67,43,0.52)",
                lineHeight: 1.55,
                marginTop: 10,
                marginBottom: 0,
                maxWidth: 460,
              }}
            >
              Your definitive commercial assessment — scored, synthesized, and ready to act on.
            </p>
          </div>

          {/* ─── Summary Banner ─── */}
          {(() => {
            // All chips: concept studio activated chips + refinement modifiers + spec selections
            const conceptChips = storeChipSelection?.activatedChips.map((c) => c.label) ?? [];
            const modifierChips = report.modifiers;
            const specChips = [
              report.category,
              report.material,
              report.silhouette,
              report.constructionTier ? `${report.constructionTier} Construction` : null,
              `$${report.targetMSRP}`,
            ].filter(Boolean) as string[];

            // Deduplicate: concept chips may overlap with modifiers
            const seenChips = new Set<string>();
            const allChips: string[] = [];
            for (const chip of [...conceptChips, ...modifierChips, ...specChips]) {
              if (chip && !seenChips.has(chip)) {
                seenChips.add(chip);
                allChips.push(chip);
              }
            }

            const greyChip: React.CSSProperties = {
              padding: "3px 9px",
              borderRadius: 999,
              fontSize: 10.5,
              fontWeight: 500,
              fontFamily: inter,
              background: "transparent",
              border: "1px solid rgba(67,67,43,0.14)",
              color: "rgba(67,67,43,0.50)",
              whiteSpace: "nowrap" as const,
            };

            return (
              <div
                style={{
                  ...card,
                  padding: "12px 16px",
                  marginBottom: 28,
                  animation: "fadeIn 600ms ease-out 100ms both",
                }}
              >
                {/* Row 1: aesthetic name + scores */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: allChips.length > 0 ? 10 : 0 }}>
                  <span style={{ fontFamily: sohne, fontWeight: 500, fontSize: 13.5, color: OLIVE, letterSpacing: "-0.01em" }}>
                    {report.aestheticName}
                  </span>
                  <span style={{ color: "rgba(67,67,43,0.18)" }}>·</span>
                  <span style={{ fontFamily: inter, fontSize: 11, fontWeight: 650, color: identityColor, display: "flex", alignItems: "center", gap: 3 }}>
                    <IconIdentity size={11} />{report.identity}
                  </span>
                  <span style={{ fontFamily: inter, fontSize: 11, fontWeight: 650, color: resonanceColor, display: "flex", alignItems: "center", gap: 3 }}>
                    <IconResonance size={11} />{report.resonance}
                  </span>
                  <span style={{ fontFamily: inter, fontSize: 11, fontWeight: 650, color: executionColor, display: "flex", alignItems: "center", gap: 3 }}>
                    <IconExecution size={11} />{report.execution}
                  </span>
                </div>

                {/* Row 2: all chips */}
                {allChips.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {allChips.map((chip) => (
                      <span key={chip} style={greyChip}>{chip}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* ═══ HERO: Score + Dimensions ═══ */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 20,
              marginBottom: 20,
            }}
          >
            {/* ── Big Score Card ── */}
            <div
              style={{
                ...card,
                padding: "48px 40px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                animation: "fadeIn 600ms ease-out 200ms both",
              }}
            >
              <div style={{ textAlign: "center" }}>
                <div style={{ ...microLabel, marginBottom: 14 }}>Muko Standard Score</div>
                <div
                  style={{
                    fontFamily: sohne,
                    fontSize: 104,
                    fontWeight: 700,
                    lineHeight: 1,
                    color: OLIVE,
                    letterSpacing: "-0.03em",
                    position: "relative",
                    display: "inline-block",
                  }}
                >
                  {animatedScore}
                  <span
                    style={{
                      fontFamily: inter,
                      fontSize: 22,
                      fontWeight: 400,
                      color: "rgba(67,67,43,0.28)",
                      position: "absolute",
                      top: 12,
                      marginLeft: 3,
                    }}
                  >
                    /100
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 7,
                    marginTop: 14,
                    marginBottom: 12,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 999,
                      background: scoreColor,
                      boxShadow: `0 0 0 3px ${scoreColor}22`,
                    }}
                  />
                  <span
                    style={{
                      fontFamily: inter,
                      fontSize: 12,
                      fontWeight: 650,
                      color: scoreColor,
                    }}
                  >
                    {getScoreLabel(report.overallScore)} Foundation
                  </span>
                </div>
                <p
                  style={{
                    ...bodyText,
                    fontSize: 12,
                    color: "rgba(67,67,43,0.50)",
                    maxWidth: 280,
                    margin: "0 auto",
                  }}
                >
                  {getVerdictText(report.overallScore)}
                </p>
              </div>
            </div>

            {/* ── Three Dimension Cards ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                {
                  label: "IDENTITY",
                  desc: "Strong alignment with your brand DNA. Refined Clarity echoes your minimalist, feminine positioning.",
                  score: animatedIdentity,
                  rawScore: report.identity,
                  color: identityColor,
                  icon: <IconIdentity size={13} />,
                  delay: 300,
                },
                {
                  label: "RESONANCE",
                  desc: "Healthy consumer demand with emerging momentum. Not yet saturated — window of opportunity open.",
                  score: animatedResonance,
                  rawScore: report.resonance,
                  color: resonanceColor,
                  icon: <IconResonance size={13} />,
                  delay: 400,
                },
                {
                  label: "EXECUTION",
                  desc: "Timeline is achievable but tight. Cotton twill sourcing adds 3 weeks — monitor lead times closely.",
                  score: animatedExecution,
                  rawScore: report.execution,
                  color: executionColor,
                  icon: <IconExecution size={13} />,
                  delay: 500,
                },
              ].map((dim) => (
                <div
                  key={dim.label}
                  style={{
                    ...card,
                    padding: "18px 20px",
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    alignItems: "center",
                    gap: 16,
                    animation: `fadeIn 600ms ease-out ${dim.delay}ms both`,
                  }}
                >
                  <div>
                    {/* Label row */}
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
                      <span style={{ display: "flex", alignItems: "center", color: dim.color, opacity: 0.85 }}>{dim.icon}</span>
                      <span
                        style={{
                          fontFamily: inter,
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: "0.10em",
                          textTransform: "uppercase" as const,
                          color: "rgba(67,67,43,0.68)",
                        }}
                      >
                        {dim.label}
                      </span>
                      <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: 999,
                          background: dim.color,
                          boxShadow: `0 0 0 3px ${dim.color}22`,
                          marginLeft: 2,
                        }}
                      />
                    </div>
                    {/* Description */}
                    <p
                      style={{
                        ...bodyText,
                        fontSize: 12,
                        color: "rgba(67,67,43,0.55)",
                        paddingLeft: 20,
                        marginBottom: 8,
                      }}
                    >
                      {dim.desc}
                    </p>
                    {/* Progress bar — 2px, matches Concept Studio pulse bars */}
                    <div
                      style={{
                        height: 2,
                        borderRadius: 1,
                        background: "rgba(67,67,43,0.08)",
                        marginLeft: 20,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          borderRadius: 1,
                          background: dim.color,
                          width: `${dim.rawScore}%`,
                          transition: "width 1.4s cubic-bezier(0.22,1,0.36,1)",
                        }}
                      />
                    </div>
                  </div>
                  {/* Score number — Söhne Breit, matches Concept Studio pulse numerals */}
                  <div
                    style={{
                      fontFamily: sohne,
                      fontSize: 32,
                      fontWeight: 700,
                      color: OLIVE,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {dim.score}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ═══ BODY: Narrative + Radar ═══ */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.15fr 0.85fr",
              gap: 20,
              marginBottom: 20,
            }}
          >
            {/* ── Muko Insight ── */}
            <div
              style={{
                ...card,
                padding: "24px 24px",
                animation: "fadeIn 600ms ease-out 600ms both",
              }}
            >
              {/* Section label */}
              <div style={microLabel}>Muko Insight</div>

              {/* Headline — Söhne Breit, same weight as Concept Studio insight headline */}
              <div
                style={{
                  fontFamily: sohne,
                  fontWeight: 500,
                  fontSize: 17,
                  color: OLIVE,
                  lineHeight: 1.3,
                  marginBottom: 18,
                }}
              >
                {report.aestheticName} is a smart direction for {report.seasonLabel} — with one
                thing to watch.
              </div>

              {(() => {
                const alignmentSignals = collectionRole
                  ? getCollectionAlignment(collectionRole, report.costGatePassed, report.constructionTier, report.resonance, selectedKeyPiece ?? null)
                  : [];
                const passSignals     = alignmentSignals.filter(s => s.status === 'pass');
                const advisorySignals = alignmentSignals.filter(s => s.status === 'advisory');
                const conflictSignals = alignmentSignals.filter(s => s.status === 'conflict');
                const watchSignals    = [...advisorySignals, ...conflictSignals];

                function AlignmentLine({ signal }: { signal: { label: string; text: string; status: string } }) {
                  const isConflict = signal.status === 'conflict';
                  const color = isConflict ? ROSE : signal.status === 'pass' ? CHARTREUSE : CAMEL;
                  return (
                    <div style={{ display: "flex", alignItems: "baseline", gap: 5, marginTop: 7 }}>
                      <span style={{ fontFamily: inter, fontSize: 10, fontWeight: 700, color, flexShrink: 0, letterSpacing: "0.04em" }}>
                        {signal.label.toUpperCase()}
                      </span>
                      <span style={{ fontFamily: inter, fontSize: 11.5, color: "rgba(67,67,43,0.52)", lineHeight: 1.55 }}>
                        — {signal.text}
                      </span>
                    </div>
                  );
                }

                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {/* WHAT'S WORKING — chartreuse */}
                    <div>
                      <div style={{ fontFamily: inter, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: CHARTREUSE, marginBottom: 6 }}>
                        What&apos;s Working
                      </div>
                      <p style={bodyText}>{reportNarrativeData?.statements[0] ?? ''}</p>
                      {passSignals.map((s, i) => <AlignmentLine key={i} signal={s} />)}
                    </div>

                    {/* WHAT TO CONSIDER — steel blue */}
                    <div>
                      <div style={{ fontFamily: inter, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: STEEL, marginBottom: 6 }}>
                        What to Consider
                      </div>
                      <p style={bodyText}>{reportNarrativeData?.statements[1] ?? ''}</p>
                      {watchSignals.map((s, i) => <AlignmentLine key={i} signal={s} />)}
                    </div>

                    {/* RECOMMENDATION — rose */}
                    <div>
                      <div style={{ fontFamily: inter, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: ROSE, marginBottom: 6 }}>
                        Recommendation
                      </div>
                      <p style={bodyText}>{reportNarrativeData?.statements[2] ?? ''}</p>
                    </div>
                  </div>
                );
              })()}

              {/* Key Redirect — rendered when synthesizer resolves a redirect */}
              {report.redirect && (
                <div
                  style={{
                    marginTop: 18,
                    padding: "10px 12px",
                    borderRadius: 6,
                    border: "1px dashed rgba(67,67,43,0.22)",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                  }}
                >
                  <span style={{ color: CHARTREUSE, fontSize: 16, flexShrink: 0, lineHeight: 1.4 }}>→</span>
                  <div>
                    <div
                      style={{
                        fontFamily: inter,
                        fontSize: 12,
                        fontWeight: 650,
                        color: "rgba(67,67,43,0.72)",
                        marginBottom: 3,
                      }}
                    >
                      Key Redirect: {report.redirect.label}
                    </div>
                    <div
                      style={{
                        fontFamily: inter,
                        fontSize: 12,
                        lineHeight: 1.55,
                        color: "rgba(67,67,43,0.52)",
                      }}
                    >
                      {report.redirect.savings ? `${report.redirect.savings} — ` : ''}{report.redirect.detail}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── Dimension Map (Radar) ── */}
            <div
              style={{
                ...card,
                padding: "24px 24px",
                display: "flex",
                flexDirection: "column",
                animation: "fadeIn 600ms ease-out 700ms both",
              }}
            >
              <div style={microLabel}>Dimension Map</div>
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "8px 0",
                }}
              >
                <RadarChart data={radarData} />
              </div>
              {/* Legend */}
              <div
                style={{
                  display: "flex",
                  gap: 16,
                  justifyContent: "center",
                  paddingTop: 12,
                  borderTop: "1px solid rgba(67,67,43,0.06)",
                }}
              >
                {[
                  { label: "Strong",  color: CHARTREUSE },
                  { label: "Watch",   color: CAMEL      },
                  { label: "At Risk", color: PULSE_RED  },
                ].map((l) => (
                  <div
                    key={l.label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      fontFamily: inter,
                      fontSize: 10,
                      fontWeight: 600,
                      color: "rgba(67,67,43,0.50)",
                    }}
                  >
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: l.color }} />
                    {l.label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ═══ COMMERCIAL GATES ═══ */}
          <div style={{ marginBottom: 20, animation: "fadeIn 600ms ease-out 800ms both" }}>
            <div style={microLabel}>Commercial Gates</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
              {[
                {
                  name: "Cost Viability",
                  passed: report.costGatePassed,
                  metric: `$${report.cogs}`,
                  detail: `Estimated COGS per unit. Target ceiling is $${report.ceiling} at ${Math.round(report.targetMargin * 100)}% margin on $${report.targetMSRP} MSRP.${report.costGatePassed ? ` You have $${Math.round(report.ceiling - report.cogs)} of headroom.` : ` You are $${Math.round(report.cogs - report.ceiling)} over ceiling.`}`,
                },
                {
                  name: "Margin Health",
                  passed: report.projectedMargin >= report.targetMargin * 100,
                  metric: `${report.projectedMargin}%`,
                  detail: `Projected margin at ${report.projectedMargin}% vs. your ${Math.round(report.targetMargin * 100)}% target.${report.projectedMargin >= report.targetMargin * 100 ? ' Within range.' : ' Below target — consider a cost reduction.'}`,
                },
                {
                  name: "Sustainability",
                  passed: null,
                  metric: "—",
                  detail: "Environmental impact scoring, material circularity assessment, and regulatory compliance (EU Digital Product Passport, California SB 707) will be available in Phase 2.",
                },
              ].map((gate) => (
                <div key={gate.name} style={{ ...card, padding: "18px 20px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 10,
                    }}
                  >
                    {/* Gate name label — same as section labels */}
                    <span
                      style={{
                        fontFamily: inter,
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase" as const,
                        color: "rgba(67,67,43,0.38)",
                      }}
                    >
                      {gate.name}
                    </span>
                    {/* Pass/Fail badge */}
                    <span
                      style={{
                        padding: "3px 10px",
                        borderRadius: 999,
                        fontFamily: inter,
                        fontSize: 10.5,
                        fontWeight: 700,
                        ...(gate.passed === true
                          ? {
                              background: "rgba(168,180,117,0.10)",
                              color: "#5B6A38",
                              border: `1px solid rgba(168,180,117,0.30)`,
                            }
                          : gate.passed === false
                            ? {
                                background: `rgba(138,58,58,0.08)`,
                                color: PULSE_RED,
                                border: `1px solid rgba(138,58,58,0.22)`,
                              }
                            : {
                                background: "rgba(67,67,43,0.04)",
                                color: "rgba(67,67,43,0.35)",
                                border: "1px solid rgba(67,67,43,0.10)",
                              }),
                      }}
                    >
                      {gate.passed === true ? "✓ Pass" : gate.passed === false ? "✗ Fail" : "Coming Soon"}
                    </span>
                  </div>
                  {/* Large metric */}
                  <div
                    style={{
                      fontFamily: sohne,
                      fontSize: 28,
                      fontWeight: 700,
                      color: gate.passed === null ? "rgba(67,67,43,0.22)" : OLIVE,
                      letterSpacing: "-0.02em",
                      marginBottom: 8,
                    }}
                  >
                    {gate.metric}
                  </div>
                  <p
                    style={{
                      ...bodyText,
                      fontSize: 12,
                      color: "rgba(67,67,43,0.50)",
                    }}
                  >
                    {gate.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* ═══ CONSIDERATIONS + RECOMMENDED ACTIONS ═══ */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 20,
              marginBottom: 20,
              animation: "fadeIn 600ms ease-out 900ms both",
            }}
          >
            {/* Considerations */}
            <div style={{ ...card, padding: "20px 20px" }}>
              <div style={microLabel}>Considerations</div>
              {report.considerations.map((c, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: 14,
                    padding: "14px 0",
                    borderBottom:
                      i < report.considerations.length - 1
                        ? "1px solid rgba(67,67,43,0.06)"
                        : "none",
                  }}
                >
                  {/* Number — muted, not prominent */}
                  <div
                    style={{
                      fontFamily: inter,
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      color: "rgba(67,67,43,0.28)",
                      flexShrink: 0,
                      width: 22,
                      paddingTop: 1,
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div>
                    <div
                      style={{
                        fontFamily: inter,
                        fontSize: 13,
                        fontWeight: 600,
                        color: "rgba(67,67,43,0.82)",
                        marginBottom: 4,
                      }}
                    >
                      {c.title}
                    </div>
                    <p
                      style={{
                        ...bodyText,
                        fontSize: 12,
                        color: "rgba(67,67,43,0.52)",
                        marginBottom: 8,
                      }}
                    >
                      {c.detail}
                    </p>
                    {/* Dimension tag with color border */}
                    <span
                      style={{
                        display: "inline-block",
                        padding: "3px 9px",
                        borderRadius: 999,
                        fontFamily: inter,
                        fontSize: 10,
                        fontWeight: 650,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase" as const,
                        background: DIM_TAG[c.dimension]?.bg   || "rgba(67,67,43,0.04)",
                        color:      DIM_TAG[c.dimension]?.text || "rgba(67,67,43,0.46)",
                        border:     DIM_TAG[c.dimension]?.border || "1px solid rgba(67,67,43,0.12)",
                      }}
                    >
                      {c.dimension}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Recommended Actions */}
            <div style={{ ...card, padding: "20px 20px" }}>
              <div style={microLabel}>Recommended Actions</div>
              {report.actions.map((a, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: 14,
                    padding: "14px 0",
                    borderBottom:
                      i < report.actions.length - 1
                        ? "1px solid rgba(67,67,43,0.06)"
                        : "none",
                  }}
                >
                  {/* Arrow — chartreuse */}
                  <div
                    style={{
                      fontFamily: inter,
                      fontSize: 16,
                      color: CHARTREUSE,
                      flexShrink: 0,
                      width: 22,
                      lineHeight: 1.2,
                    }}
                  >
                    →
                  </div>
                  <div>
                    <div
                      style={{
                        fontFamily: inter,
                        fontSize: 13,
                        fontWeight: 600,
                        color: "rgba(67,67,43,0.82)",
                        marginBottom: 4,
                      }}
                    >
                      {a.title}
                    </div>
                    <p
                      style={{
                        ...bodyText,
                        fontSize: 12,
                        color: "rgba(67,67,43,0.52)",
                        marginBottom: 8,
                      }}
                    >
                      {a.detail}
                    </p>
                    {/* Tags with dimension color borders */}
                    <div style={{ display: "flex", gap: 5 }}>
                      {a.tags.map((t) => (
                        <span
                          key={t}
                          style={{
                            display: "inline-block",
                            padding: "3px 9px",
                            borderRadius: 999,
                            fontFamily: inter,
                            fontSize: 10,
                            fontWeight: 650,
                            letterSpacing: "0.06em",
                            textTransform: "uppercase" as const,
                            background: DIM_TAG[t]?.bg   || "rgba(67,67,43,0.04)",
                            color:      DIM_TAG[t]?.text || "rgba(67,67,43,0.46)",
                            border:     DIM_TAG[t]?.border || "1px solid rgba(67,67,43,0.12)",
                          }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ═══ BOTTOM CTA BAR ═══ */}
          <div
            style={{
              ...card,
              padding: "18px 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              animation: "fadeIn 600ms ease-out 1000ms both",
            }}
          >
            {/* Prompt text — italic, muted */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontFamily: inter,
                fontSize: 12.5,
                fontStyle: "italic",
                color: "rgba(67,67,43,0.50)",
              }}
            >
              <span style={{ color: CHARTREUSE, fontSize: 14, fontStyle: "normal" }}>✦</span>
              Ready to act on this analysis, or explore an alternative direction?
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 7 }}>
              {/* Ghost buttons */}
              {["Revise Design", "Export PDF"].map((label) => (
                <button
                  key={label}
                  style={{
                    padding: "9px 18px",
                    borderRadius: 8,
                    fontFamily: sohne,
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.01em",
                    border: "1px solid rgba(67,67,43,0.14)",
                    background: "transparent",
                    color: "rgba(67,67,43,0.62)",
                    cursor: "pointer",
                    transition: "all 160ms ease",
                  }}
                >
                  {label}
                </button>
              ))}
              {/* Primary CTA — steel blue */}
              <button
                style={{
                  padding: "9px 18px",
                  borderRadius: 8,
                  fontFamily: sohne,
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.01em",
                  border: "none",
                  background: STEEL,
                  color: "#fff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  transition: "all 160ms ease",
                }}
              >
                Save to Collection
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                  <path d="M3.5 8H12.5M12.5 8L8.5 4M12.5 8L8.5 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* ═══ FLOATING MUKO ORB ═══ */}
      <FloatingMukoOrb
        step="report"
        context={{
          score:     report.overallScore,
          identity:  report.identity,
          resonance: report.resonance,
          execution: report.execution,
          gates:     { costGatePassed: report.costGatePassed },
          narrative: {
            working:        reportNarrativeData?.statements[0] ?? '',
            consider:       reportNarrativeData?.statements[1] ?? '',
            recommendation: reportNarrativeData?.statements[2] ?? '',
          },
        }}
        conceptName={report.aestheticName}
        identityScore={report.identity}
        resonanceScore={report.resonance}
      />

      {/* ═══ CSS ANIMATIONS ═══ */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes radarReveal {
          from { opacity: 0; transform: scale(0.85); }
          to   { opacity: 1; transform: scale(1); }
        }
        @media (max-width: 1100px) {
          main > div > div[style*="grid-template-columns: 1fr 1fr"] { grid-template-columns: 1fr !important; }
          main > div > div[style*="grid-template-columns: 1.15fr"]  { grid-template-columns: 1fr !important; }
          main > div > div[style*="grid-template-columns: repeat(3"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
