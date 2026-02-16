"use client";

import React, { useState, useEffect, useRef } from "react";
import AskMuko from "@/components/AskMuko";

/* ═══════════════════════════════════════════════════════════════
   Muko — The Standard Report (Step 4)
   The definitive commercial assessment. Scored, synthesized,
   and ready to act on.
   ═══════════════════════════════════════════════════════════════ */

/* ─── Brand Tokens (matched to Spec Studio) ─── */
const BRAND = {
  chartreuse: "#ABAB63",
  rose: "#A97B8F",
  steelBlue: "#A9BFD6",
  camel: "#B8876B",
  oliveInk: "#43432B",
  cream: "#E8E3D6",
  warmWhite: "#F5F2EB",
  parchment: "#FAF9F6",
};

/* ─── Reusable Style Objects (from Spec Studio) ─── */
const glassPanelBase: React.CSSProperties = {
  borderRadius: 20,
  border: "1px solid rgba(255, 255, 255, 0.35)",
  background: "rgba(255, 255, 255, 0.25)",
  backdropFilter: "blur(40px) saturate(180%)",
  WebkitBackdropFilter: "blur(40px) saturate(180%)",
  boxShadow:
    "0 24px 80px rgba(0,0,0,0.05), 0 8px 32px rgba(67,67,43,0.04), inset 0 1px 0 rgba(255,255,255,0.60), inset 0 -1px 0 rgba(255,255,255,0.12)",
  overflow: "hidden",
  position: "relative" as const,
};

const glassSheen: React.CSSProperties = {
  position: "absolute" as const,
  inset: 0,
  pointerEvents: "none" as const,
  background:
    "radial-gradient(ellipse 280px 120px at 15% -5%, rgba(255,255,255,0.35), transparent 65%), radial-gradient(ellipse 200px 100px at 90% 10%, rgba(255,255,255,0.15), transparent 60%)",
};

const microLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "0.10em",
  textTransform: "uppercase" as const,
  color: "rgba(67, 67, 43, 0.42)",
  fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
};

const sectionHeading: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 650,
  color: BRAND.oliveInk,
  fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
};

const scoreTextStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 650,
  color: "rgba(67, 67, 43, 0.62)",
  fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
};

const bodyText: React.CSSProperties = {
  fontSize: 13.5,
  lineHeight: 1.62,
  color: "rgba(67,67,43,0.66)",
  fontFamily: "var(--font-inter), system-ui, sans-serif",
};

const bodyStrong: React.CSSProperties = {
  fontWeight: 650,
  color: "rgba(67,67,43,0.85)",
};

/* ─── Icons (matched to Spec Studio) ─── */
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
      <path
        d="M17 21V19C17 16.79 15.21 15 13 15H5C2.79 15 1 16.79 1 19V21"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="9"
        cy="7"
        r="4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M23 21V19C22.99 17.18 21.8 15.58 20 15.13"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 3.13C17.8 3.58 18.99 5.18 18.99 7C18.99 8.82 17.8 10.42 16 10.87"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconExecution({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68 1.65 1.65 0 0 0 10 3.17V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="6" fill={BRAND.chartreuse} opacity="0.22" />
      <path
        d="M4.5 7.2L6.2 8.8L9.5 5.5"
        stroke={BRAND.chartreuse}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconArrowRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M3.5 8H12.5M12.5 8L8.5 4M12.5 8L8.5 12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ─── Score color helper ─── */
function getScoreColor(score: number): string {
  if (score >= 80) return BRAND.chartreuse;
  if (score >= 60) return BRAND.camel;
  return BRAND.rose;
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

/* ─── Premium Radar Chart Component ─── */
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

  // Grid rings
  const rings = [0.25, 0.5, 0.75, 1.0];
  const ringPolygons = rings.map((pct) => {
    const pts = Array.from({ length: n }, (_, i) => {
      const p = polarToCart(i * angleStep, maxR * pct);
      return `${p.x},${p.y}`;
    });
    return pts.join(" ");
  });

  // Axis endpoints
  const axes = Array.from({ length: n }, (_, i) => {
    const outer = polarToCart(i * angleStep, maxR);
    return { x2: outer.x, y2: outer.y };
  });

  // Data shape
  const dataPts = data.map((d, i) => {
    const r = (d.value / 100) * maxR;
    return polarToCart(i * angleStep, r);
  });
  const dataPath = dataPts.map((p) => `${p.x},${p.y}`).join(" ");

  // Labels
  const labels = data.map((d, i) => {
    const p = polarToCart(i * angleStep, maxR + 30);
    return { ...d, x: p.x, y: p.y };
  });

  // Score labels positioned outside the data point, away from center
  const scoreLabels = data.map((d, i) => {
    const r = (d.value / 100) * maxR;
    const angle = i * angleStep;
    // Push label outward from the data point
    const labelR = r + 18;
    const p = polarToCart(angle, labelR);
    return { value: d.value, x: p.x, y: p.y, color: d.color };
  });

  return (
    <svg viewBox="0 0 360 360" style={{ width: "100%", maxWidth: 380 }}>
      <defs>
        {/* Multi-stop radial gradient for the data fill — gives depth like the reference */}
        <radialGradient id="dataFillRadial" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor={BRAND.steelBlue} stopOpacity="0.20" />
          <stop offset="40%" stopColor={BRAND.steelBlue} stopOpacity="0.12" />
          <stop offset="70%" stopColor="#8BA0B4" stopOpacity="0.08" />
          <stop offset="100%" stopColor={BRAND.steelBlue} stopOpacity="0.04" />
        </radialGradient>

        {/* Secondary fill layer — warm undertone for richness */}
        <linearGradient id="dataFillWarm" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={BRAND.camel} stopOpacity="0.06" />
          <stop offset="50%" stopColor={BRAND.rose} stopOpacity="0.04" />
          <stop offset="100%" stopColor={BRAND.camel} stopOpacity="0.06" />
        </linearGradient>

        {/* Outer "ideal zone" tint */}
        <radialGradient id="idealZone" cx="50%" cy="50%" r="50%">
          <stop offset="60%" stopColor="rgba(67,67,43,0)" stopOpacity="0" />
          <stop offset="100%" stopColor="rgba(67,67,43,0.015)" stopOpacity="1" />
        </radialGradient>

        {/* Inner "risk zone" tint */}
        <radialGradient id="riskZone" cx="50%" cy="50%" r="35%">
          <stop offset="0%" stopColor={BRAND.rose} stopOpacity="0.05" />
          <stop offset="100%" stopColor={BRAND.rose} stopOpacity="0" />
        </radialGradient>

        {/* Soft shadow for the data shape */}
        <filter id="dataShadow" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="6" stdDeviation="12" floodColor={BRAND.steelBlue} floodOpacity="0.12" />
        </filter>

        {/* Glow for data points */}
        <filter id="pointGlow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background zones */}
      <polygon
        points={ringPolygons[3]}
        fill="url(#idealZone)"
      />
      <polygon
        points={ringPolygons[0]}
        fill="url(#riskZone)"
      />

      {/* Grid rings — outer solid, inner dashed */}
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

      {/* Axis lines */}
      {axes.map((a, i) => (
        <line
          key={i}
          x1={cx}
          y1={cy}
          x2={a.x2}
          y2={a.y2}
          stroke="rgba(67,67,43,0.05)"
          strokeWidth="0.8"
        />
      ))}

      {/* Axis endpoint markers */}
      {axes.map((a, i) => (
        <circle
          key={`ep-${i}`}
          cx={a.x2}
          cy={a.y2}
          r={2.5}
          fill="rgba(67,67,43,0.12)"
          stroke="rgba(67,67,43,0.06)"
          strokeWidth="1"
        />
      ))}

      {/* Data shape: shadow layer */}
      <polygon
        points={dataPath}
        fill="url(#dataFillRadial)"
        stroke="none"
        filter="url(#dataShadow)"
        style={{ animation: "radarReveal 1s cubic-bezier(0.22,1,0.36,1) 0.4s both" }}
      />

      {/* Data shape: warm undertone layer */}
      <polygon
        points={dataPath}
        fill="url(#dataFillWarm)"
        stroke="none"
        style={{ animation: "radarReveal 1s cubic-bezier(0.22,1,0.36,1) 0.4s both" }}
      />

      {/* Data shape: primary fill */}
      <polygon
        points={dataPath}
        fill="url(#dataFillRadial)"
        stroke="none"
        style={{ animation: "radarReveal 1s cubic-bezier(0.22,1,0.36,1) 0.4s both" }}
      />

      {/* Data stroke — steel blue, the main visual anchor */}
      <polygon
        points={dataPath}
        fill="none"
        stroke={BRAND.steelBlue}
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity={0.85}
        style={{ animation: "radarReveal 1s cubic-bezier(0.22,1,0.36,1) 0.45s both" }}
      />

      {/* Data points — layered circles for premium feel */}
      {dataPts.map((p, i) => (
        <g key={i} style={{ animation: `radarReveal 0.5s ease ${0.7 + i * 0.08}s both` }}>
          {/* Outer glow halo */}
          <circle cx={p.x} cy={p.y} r={12} fill={data[i].color} opacity={0.08} />
          {/* Mid ring */}
          <circle cx={p.x} cy={p.y} r={8} fill="white" opacity={0.6} />
          {/* Colored ring */}
          <circle
            cx={p.x}
            cy={p.y}
            r={6}
            fill="white"
            stroke={data[i].color}
            strokeWidth="2"
          />
          {/* Center dot */}
          <circle cx={p.x} cy={p.y} r={2.2} fill={data[i].color} />
        </g>
      ))}

      {/* Score value labels */}
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
          fontFamily="var(--font-sohne-breit), system-ui, sans-serif"
          style={{ animation: `radarReveal 0.4s ease ${0.9 + i * 0.08}s both` }}
        >
          {s.value}
        </text>
      ))}

      {/* Axis labels */}
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
          fontFamily="var(--font-sohne-breit), system-ui, sans-serif"
          letterSpacing="0.08em"
        >
          {l.label.toUpperCase()}
        </text>
      ))}

      {/* Center point */}
      <circle cx={cx} cy={cy} r={1.8} fill="rgba(67,67,43,0.08)" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MOCK DATA — Replace with real Orchestrator Blackboard output
   ═══════════════════════════════════════════════════════════════ */
const MOCK_REPORT = {
  // Context (from Steps 1–3)
  collectionName: "Desert Mirage",
  seasonLabel: "SS26",
  aestheticName: "Refined Clarity",
  modifiers: ["Feminine", "Soft"],
  category: "Outerwear",
  material: "Cotton Twill",
  materialCostPerYd: 20,
  materialLeadWeeks: 3,
  silhouette: "Cocoon",
  yardage: 3.8,
  constructionTier: "High" as const,
  targetMSRP: 450,
  targetMargin: 0.6,

  // Scores (from Calculator + Critic + Researcher)
  overallScore: 78,
  identity: 88,
  resonance: 82,
  execution: 64,

  // Sub-dimensions for radar
  brandFit: 90,
  demand: 82,
  saturation: 78,
  margin: 75,
  cost: 72,
  timeline: 58,

  // Gates (from Calculator)
  cogs: 142,
  ceiling: 180,
  projectedMargin: 68.4,
  costGatePassed: true,

  // Narrative (from Synthesizer LLM)
  narrative: {
    working:
      "Your aesthetic direction aligns strongly with your brand DNA. Refined Clarity captures the clean, editorial sensibility your customer expects, and its resonance score of 82 signals healthy demand without the saturation risk of more trending directions. This is a confident choice.",
    consider:
      "Execution presents the main tension. Cotton Twill at $20/yd keeps you well within margin, but the high construction complexity paired with a 3-week lead time leaves limited buffer for your Resort timeline. The Cocoon silhouette adds yardage that compounds this pressure.",
    recommendation:
      "This direction works — don't abandon it. Consider simplifying construction from High to Moderate tier, or switching silhouette from Cocoon to Straight to reduce yardage by 0.8 yards/unit and gain 2 weeks of production buffer.",
  },

  // Redirect highlight (from hardcoded redirects)
  redirect: {
    label: "Switch Cocoon → Straight silhouette",
    savings: "~$16/unit in material",
    timeline: "recovers 2 weeks of buffer",
    detail: "Maintains the aesthetic integrity of Refined Clarity without the execution risk.",
  },

  // Considerations (from Synthesizer + flags)
  considerations: [
    {
      title: "Timeline pressure from Cocoon yardage",
      detail:
        "Cocoon requires ~3.8 yards vs. 3.0 for Straight. This extends cutting time and increases material waste risk at volume.",
      dimension: "execution" as const,
    },
    {
      title: "Cotton Twill sourcing window",
      detail:
        "3-week lead time is standard, but seasonal demand spikes in Q1 could extend this. Place orders early or identify backup supplier.",
      dimension: "execution" as const,
    },
    {
      title: "Refined Clarity is trending — watch saturation",
      detail:
        "Currently at 35% saturation (healthy), but velocity is accelerating. If competitors converge here for Resort, differentiation becomes critical.",
      dimension: "resonance" as const,
    },
  ],

  // Action items (from redirects + Synthesizer)
  actions: [
    {
      title: "Simplify silhouette to Straight",
      detail:
        "Saves ~$16/unit in material and recovers 2 weeks of production buffer. Maintains aesthetic integrity.",
      tags: ["Cost", "Timeline"],
    },
    {
      title: "Lock material sourcing this week",
      detail:
        "Place a preliminary order for Cotton Twill to secure pricing and lead time before Q1 demand peaks.",
      tags: ["Execution"],
    },
    {
      title: "Branch a Tencel version for comparison",
      detail:
        "Tencel at $22/yd offers similar hand feel with better drape. Run a parallel analysis to compare margin and timeline impact.",
      tags: ["Identity", "Cost"],
    },
  ],
};

/* ─── Dimension tag colors ─── */
const DIM_TAG_COLORS: Record<string, { bg: string; text: string }> = {
  identity: { bg: "rgba(184,135,107,0.12)", text: BRAND.camel },
  resonance: { bg: "rgba(169,191,214,0.12)", text: BRAND.steelBlue },
  execution: { bg: "rgba(171,171,99,0.10)", text: "#5B6638" },
  cost: { bg: "rgba(169,123,143,0.10)", text: BRAND.rose },
  Cost: { bg: "rgba(169,123,143,0.10)", text: BRAND.rose },
  Timeline: { bg: "rgba(171,171,99,0.10)", text: "#5B6638" },
  Execution: { bg: "rgba(171,171,99,0.10)", text: "#5B6638" },
  Identity: { bg: "rgba(184,135,107,0.12)", text: BRAND.camel },
  Resonance: { bg: "rgba(169,191,214,0.12)", text: BRAND.steelBlue },
};

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function StandardReportPage() {
  const report = MOCK_REPORT;

  const animatedScore = useCountUp(report.overallScore, 1400, 500);
  const animatedIdentity = useCountUp(report.identity, 1000, 800);
  const animatedResonance = useCountUp(report.resonance, 1000, 900);
  const animatedExecution = useCountUp(report.execution, 1000, 1000);

  const scoreColor = getScoreColor(report.overallScore);
  const identityColor = getScoreColor(report.identity);
  const resonanceColor = getScoreColor(report.resonance);
  const executionColor = getScoreColor(report.execution);

  const [headerCollectionName, setHeaderCollectionName] = useState(report.collectionName);
  const [headerSeasonLabel, setHeaderSeasonLabel] = useState(report.seasonLabel);

  useEffect(() => {
    try {
      const n = window.localStorage.getItem("muko_collectionName");
      const s = window.localStorage.getItem("muko_seasonLabel");
      if (n) setHeaderCollectionName(n);
      if (s) setHeaderSeasonLabel(s);
    } catch {}
  }, []);

  const radarData = [
    { label: "Brand Fit", value: report.brandFit, color: getScoreColor(report.brandFit) },
    { label: "Demand", value: report.demand, color: getScoreColor(report.demand) },
    { label: "Timeline", value: report.timeline, color: getScoreColor(report.timeline) },
    { label: "Cost", value: report.cost, color: getScoreColor(report.cost) },
    { label: "Margin", value: report.margin, color: getScoreColor(report.margin) },
    { label: "Saturation", value: report.saturation, color: getScoreColor(report.saturation) },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: BRAND.parchment,
        display: "flex",
        position: "relative",
      }}
    >
      {/* ═══ TOP NAV ═══ */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: 72,
          background: "rgba(250, 249, 246, 0.86)",
          backdropFilter: "blur(26px) saturate(180%)",
          WebkitBackdropFilter: "blur(26px) saturate(180%)",
          borderBottom: "1px solid rgba(67, 67, 43, 0.10)",
          zIndex: 200,
        }}
      >
        <div
          style={{
            maxWidth: 1520,
            margin: "0 auto",
            height: "100%",
            padding: "0 64px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div
              style={{
                fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: BRAND.oliveInk,
                fontSize: 18,
              }}
            >
              muko
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {[
                { label: "Entry", state: "done" },
                { label: "Concept", state: "done" },
                { label: "Spec", state: "done" },
                { label: "Report", state: "active" },
              ].map((s) => {
                const isDone = s.state === "done";
                const isActive = s.state === "active";
                return (
                  <div
                    key={s.label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      padding: "7px 14px",
                      borderRadius: 999,
                      border: isDone
                        ? `1.5px solid ${BRAND.chartreuse}`
                        : isActive
                          ? `1.5px solid ${BRAND.steelBlue}`
                          : "1.5px solid rgba(67, 67, 43, 0.10)",
                      background: isDone
                        ? "rgba(171, 171, 99, 0.10)"
                        : isActive
                          ? "rgba(169, 191, 214, 0.08)"
                          : "rgba(67, 67, 43, 0.03)",
                      boxShadow: isActive
                        ? "0 8px 24px rgba(169, 191, 214, 0.14), inset 0 1px 0 rgba(255,255,255,0.80)"
                        : isDone
                          ? "0 6px 18px rgba(171, 171, 99, 0.08)"
                          : "none",
                      fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                      fontSize: 12,
                      fontWeight: 650,
                      letterSpacing: "0.01em",
                    }}
                  >
                    {isDone ? (
                      <IconCheck />
                    ) : isActive ? (
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 999,
                          background: BRAND.steelBlue,
                          boxShadow: "0 0 0 3px rgba(169, 191, 214, 0.22)",
                        }}
                      />
                    ) : (
                      <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: 999,
                          background: "rgba(67, 67, 43, 0.18)",
                        }}
                      />
                    )}
                    <span
                      style={{
                        color: isDone
                          ? "rgba(67, 67, 43, 0.72)"
                          : isActive
                            ? "rgba(67, 67, 43, 0.85)"
                            : "rgba(67, 67, 43, 0.38)",
                      }}
                    >
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "rgba(67, 67, 43, 0.55)",
                fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                letterSpacing: "0.04em",
              }}
            >
              {headerSeasonLabel}
              <span style={{ padding: "0 8px", opacity: 0.35 }}>·</span>
              {headerCollectionName}
            </div>

            <div style={{ display: "flex", gap: 6 }}>
              {[
                {
                  label: "Back",
                  icon: (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M8.5 3L4.5 7L8.5 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ),
                },
                {
                  label: "Save & Close",
                  icon: (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M11 8.5V11.5C11 11.776 10.776 12 10.5 12H3.5C3.224 12 3 11.776 3 11.5V2.5C3 2.224 3.224 2 3.5 2H8.5L11 4.5V8.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M8.5 2V4.5H11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M5 8H9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                      <path d="M5 10H7.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                    </svg>
                  ),
                },
              ].map((btn) => (
                <button
                  key={btn.label}
                  style={{
                    fontSize: 12,
                    fontWeight: 650,
                    color: BRAND.rose,
                    background: "rgba(169, 123, 143, 0.06)",
                    border: "1px solid rgba(169, 123, 143, 0.18)",
                    borderRadius: 999,
                    padding: "7px 14px 7px 10px",
                    cursor: "pointer",
                    fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    transition: "all 180ms ease",
                  }}
                >
                  {btn.icon}
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ MAIN CONTENT ═══ */}
      <main style={{ flex: 1, paddingTop: 88 }}>
        <div style={{ padding: "46px 72px 120px", maxWidth: 1520, margin: "0 auto" }}>
          {/* ─── Page Header ─── */}
          <div style={{ marginBottom: 24, animation: "fadeIn 600ms ease-out" }}>
            <h1
              style={{
                fontSize: 32,
                fontWeight: 600,
                color: BRAND.oliveInk,
                margin: 0,
                fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                letterSpacing: "-0.01em",
              }}
            >
              The Muko Standard
            </h1>
            <p
              style={{
                fontSize: 14,
                color: "rgba(67, 67, 43, 0.55)",
                fontFamily: "var(--font-inter), system-ui, sans-serif",
                marginTop: 14,
                marginBottom: 0,
              }}
            >
              Your definitive commercial assessment — scored, synthesized, and ready to act on.
            </p>
          </div>

          {/* ─── Context Ribbon ─── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 18px",
              borderRadius: 14,
              background: "rgba(255,255,255,0.62)",
              border: `1px solid ${BRAND.chartreuse}`,
              boxShadow: "0 10px 32px rgba(67, 67, 43, 0.06), inset 0 0 0 1px rgba(255,255,255,0.50)",
              marginBottom: 32,
              flexWrap: "wrap" as const,
              animation: "fadeIn 600ms ease-out 100ms both",
            }}
          >
            <span
              style={{
                fontSize: 16,
                fontWeight: 650,
                color: BRAND.oliveInk,
                fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
              }}
            >
              {report.aestheticName}
            </span>
            <span style={{ color: "rgba(67,67,43,0.18)", fontSize: 14 }}>·</span>
            <span style={{ ...scoreTextStyle, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: identityColor }}><IconIdentity size={14} /></span>
              {report.identity}
            </span>
            <span style={{ ...scoreTextStyle, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: resonanceColor }}><IconResonance size={14} /></span>
              {report.resonance}
            </span>
            <span style={{ ...scoreTextStyle, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: executionColor }}><IconExecution size={14} /></span>
              {report.execution}
            </span>
            <span style={{ color: "rgba(67,67,43,0.18)", fontSize: 14 }}>·</span>
            <span style={{ fontSize: 13, color: "rgba(67,67,43,0.55)", fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
              {report.category}
            </span>
            <span style={{ color: "rgba(67,67,43,0.18)", fontSize: 14 }}>·</span>
            <span style={{ fontSize: 13, color: "rgba(67,67,43,0.55)", fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
              {report.material}
            </span>
            <span style={{ color: "rgba(67,67,43,0.18)", fontSize: 14 }}>·</span>
            <span style={{ fontSize: 13, color: "rgba(67,67,43,0.55)", fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
              ${report.targetMSRP}
            </span>
            {report.modifiers.map((m) => (
              <span
                key={m}
                style={{
                  padding: "4px 10px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 650,
                  color: "rgba(67, 67, 43, 0.60)",
                  background: "rgba(171, 171, 99, 0.10)",
                  border: "1px solid rgba(171, 171, 99, 0.18)",
                  fontFamily: "var(--font-inter), system-ui, sans-serif",
                }}
              >
                {m}
              </span>
            ))}
          </div>

          {/* ═══ HERO: Score + Dimensions ═══ */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 28,
              marginBottom: 32,
            }}
          >
            {/* ── Big Score Card ── */}
            <div
              style={{
                ...glassPanelBase,
                padding: "56px 48px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                animation: "fadeIn 600ms ease-out 200ms both",
              }}
            >
              <div style={glassSheen} />
              <div style={{ position: "relative", textAlign: "center" }}>
                <div style={{ ...microLabel, marginBottom: 16 }}>Muko Standard Score</div>
                <div
                  style={{
                    fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                    fontSize: 112,
                    fontWeight: 700,
                    lineHeight: 1,
                    color: BRAND.oliveInk,
                    letterSpacing: "-0.03em",
                    position: "relative",
                    display: "inline-block",
                  }}
                >
                  {animatedScore}
                  <span
                    style={{
                      fontSize: 32,
                      fontWeight: 500,
                      color: "rgba(67,67,43,0.28)",
                      position: "absolute",
                      top: 10,
                      marginLeft: 4,
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
                    gap: 8,
                    marginTop: 16,
                    marginBottom: 16,
                  }}
                >
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 999,
                      background: scoreColor,
                      boxShadow: `0 0 0 4px ${scoreColor}22`,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 650,
                      color: scoreColor,
                      fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                    }}
                  >
                    {getScoreLabel(report.overallScore)} Foundation
                  </span>
                </div>
                <p
                  style={{
                    fontSize: 13,
                    lineHeight: 1.55,
                    color: "rgba(67,67,43,0.50)",
                    fontFamily: "var(--font-inter), system-ui, sans-serif",
                    maxWidth: 320,
                    margin: "0 auto",
                  }}
                >
                  {getVerdictText(report.overallScore)}
                </p>
              </div>
            </div>

            {/* ── Three Dimension Cards ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                {
                  label: "Identity",
                  desc: "Strong alignment with your brand DNA. Refined Clarity echoes your minimalist, feminine positioning.",
                  score: animatedIdentity,
                  rawScore: report.identity,
                  color: identityColor,
                  icon: <IconIdentity size={16} />,
                  delay: 300,
                },
                {
                  label: "Resonance",
                  desc: "Healthy consumer demand with emerging momentum. Not yet saturated — window of opportunity open.",
                  score: animatedResonance,
                  rawScore: report.resonance,
                  color: resonanceColor,
                  icon: <IconResonance size={16} />,
                  delay: 400,
                },
                {
                  label: "Execution",
                  desc: "Timeline is achievable but tight. Cotton twill sourcing adds 3 weeks — monitor lead times closely.",
                  score: animatedExecution,
                  rawScore: report.execution,
                  color: executionColor,
                  icon: <IconExecution size={16} />,
                  delay: 500,
                },
              ].map((dim) => (
                <div
                  key={dim.label}
                  style={{
                    ...glassPanelBase,
                    padding: "22px 24px",
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    alignItems: "center",
                    gap: 20,
                    animation: `fadeIn 600ms ease-out ${dim.delay}ms both`,
                  }}
                >
                  <div style={glassSheen} />
                  <div style={{ position: "relative" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 999,
                          background: dim.color,
                          boxShadow: `0 0 0 4px ${dim.color}22`,
                        }}
                      />
                      <span
                        style={{
                          fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                          fontWeight: 750,
                          fontSize: 12,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase" as const,
                          color: "rgba(67,67,43,0.74)",
                        }}
                      >
                        {dim.label}
                      </span>
                      <span style={{ color: dim.color, opacity: 0.85 }}>{dim.icon}</span>
                    </div>
                    <p
                      style={{
                        fontSize: 13,
                        lineHeight: 1.5,
                        color: "rgba(67,67,43,0.55)",
                        fontFamily: "var(--font-inter), system-ui, sans-serif",
                        margin: 0,
                        paddingLeft: 20,
                      }}
                    >
                      {dim.desc}
                    </p>
                    {/* Progress bar */}
                    <div
                      style={{
                        height: 3,
                        borderRadius: 2,
                        background: "rgba(67,67,43,0.06)",
                        marginTop: 10,
                        marginLeft: 20,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          borderRadius: 2,
                          background: dim.color,
                          width: `${dim.rawScore}%`,
                          transition: "width 1.4s cubic-bezier(0.22,1,0.36,1)",
                        }}
                      />
                    </div>
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                      fontSize: 38,
                      fontWeight: 700,
                      color: BRAND.oliveInk,
                      letterSpacing: "-0.02em",
                      position: "relative",
                      zIndex: 1,
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
              gap: 28,
              marginBottom: 32,
            }}
          >
            {/* ── Muko Insight Narrative ── */}
            <div
              style={{
                ...glassPanelBase,
                padding: "32px 28px",
                animation: "fadeIn 600ms ease-out 600ms both",
              }}
            >
              <div style={glassSheen} />
              <div style={{ position: "relative" }}>
                <div style={{ ...microLabel, marginBottom: 18 }}>Muko Insight</div>
                <div
                  style={{
                    fontSize: 17,
                    fontWeight: 650,
                    lineHeight: 1.4,
                    color: BRAND.oliveInk,
                    fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                    marginBottom: 20,
                  }}
                >
                  {report.aestheticName} is a smart direction for {report.seasonLabel} — with one
                  thing to watch.
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase" as const,
                        color: BRAND.chartreuse,
                        marginBottom: 6,
                        fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                      }}
                    >
                      What&apos;s Working
                    </div>
                    <p style={bodyText}>{report.narrative.working}</p>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase" as const,
                        color: BRAND.rose,
                        marginBottom: 6,
                        fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                      }}
                    >
                      What to Consider
                    </div>
                    <p style={bodyText}>{report.narrative.consider}</p>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase" as const,
                        color: BRAND.steelBlue,
                        marginBottom: 6,
                        fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                      }}
                    >
                      Recommendation
                    </div>
                    <p style={bodyText}>{report.narrative.recommendation}</p>
                  </div>
                </div>

                {/* Redirect highlight */}
                <div
                  style={{
                    marginTop: 20,
                    padding: "16px 18px",
                    borderRadius: 14,
                    background: "rgba(171,171,99,0.08)",
                    border: "1px solid rgba(171,171,99,0.18)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12.5,
                      fontWeight: 700,
                      color: "rgba(67,67,43,0.82)",
                      fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                      marginBottom: 6,
                    }}
                  >
                    Key Redirect: {report.redirect.label}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      lineHeight: 1.5,
                      color: "rgba(67,67,43,0.55)",
                      fontFamily: "var(--font-inter), system-ui, sans-serif",
                    }}
                  >
                    Saves {report.redirect.savings} and {report.redirect.timeline}.{" "}
                    {report.redirect.detail}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Radar Chart ── */}
            <div
              style={{
                ...glassPanelBase,
                padding: "32px 28px",
                display: "flex",
                flexDirection: "column",
                animation: "fadeIn 600ms ease-out 700ms both",
              }}
            >
              <div style={glassSheen} />
              <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column" }}>
                <div style={{ ...microLabel, marginBottom: 12 }}>Dimension Map</div>
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "12px 0",
                  }}
                >
                  <RadarChart data={radarData} />
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 16,
                    justifyContent: "center",
                    paddingTop: 14,
                    borderTop: "1px solid rgba(67,67,43,0.06)",
                  }}
                >
                  {[
                    { label: "Strong", color: BRAND.chartreuse },
                    { label: "Watch", color: BRAND.camel },
                    { label: "At Risk", color: BRAND.rose },
                  ].map((l) => (
                    <div
                      key={l.label}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 11,
                        fontWeight: 600,
                        color: "rgba(67,67,43,0.50)",
                        fontFamily: "var(--font-inter), system-ui, sans-serif",
                      }}
                    >
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: l.color,
                        }}
                      />
                      {l.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ═══ COMMERCIAL GATES ═══ */}
          <div style={{ marginBottom: 32, animation: "fadeIn 600ms ease-out 800ms both" }}>
            <div style={{ ...microLabel, marginBottom: 14 }}>Commercial Gates</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
              {[
                {
                  name: "Cost Viability",
                  passed: report.costGatePassed,
                  metric: `$${report.cogs}`,
                  detail: `Estimated COGS per unit. Target ceiling is $${report.ceiling} at ${Math.round(report.targetMargin * 100)}% margin on $${report.targetMSRP} MSRP. You have $${report.ceiling - report.cogs} of headroom.`,
                },
                {
                  name: "Margin Health",
                  passed: report.projectedMargin >= report.targetMargin * 100,
                  metric: `${report.projectedMargin}%`,
                  detail: `Projected margin exceeds your ${Math.round(report.targetMargin * 100)}% target. ${report.silhouette} silhouette adds ~$16 in material vs. Straight — still within range.`,
                },
                {
                  name: "Sustainability",
                  passed: null,
                  metric: "—",
                  detail: "Environmental impact scoring, material circularity assessment, and regulatory compliance (EU Digital Product Passport, California SB 707) will be available in Phase 2.",
                },
              ].map((gate) => (
                <div
                  key={gate.name}
                  style={{
                    ...glassPanelBase,
                    padding: "22px 24px",
                  }}
                >
                  <div style={glassSheen} />
                  <div style={{ position: "relative" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 12,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                          fontWeight: 750,
                          fontSize: 11,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase" as const,
                          color: "rgba(67,67,43,0.60)",
                        }}
                      >
                        {gate.name}
                      </span>
                      <span
                        style={{
                          padding: "4px 12px",
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 700,
                          fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                          ...(gate.passed === true
                            ? {
                                background: "rgba(171,171,99,0.10)",
                                color: "#5B6638",
                                border: "1px solid rgba(171,171,99,0.18)",
                              }
                            : gate.passed === false
                              ? {
                                  background: "rgba(184,135,107,0.10)",
                                  color: BRAND.camel,
                                  border: "1px solid rgba(184,135,107,0.18)",
                                }
                              : {
                                  background: "rgba(67,67,43,0.04)",
                                  color: "rgba(67,67,43,0.35)",
                                  border: "1px solid rgba(67,67,43,0.08)",
                                }),
                        }}
                      >
                        {gate.passed === true ? "✓ Pass" : gate.passed === false ? "✗ Fail" : "Coming Soon"}
                      </span>
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                        fontSize: 28,
                        fontWeight: 700,
                        color: gate.passed === null ? "rgba(67,67,43,0.22)" : BRAND.oliveInk,
                        letterSpacing: "-0.02em",
                        marginBottom: 8,
                      }}
                    >
                      {gate.metric}
                    </div>
                    <p
                      style={{
                        fontSize: 12.5,
                        lineHeight: 1.55,
                        color: "rgba(67,67,43,0.50)",
                        fontFamily: "var(--font-inter), system-ui, sans-serif",
                        margin: 0,
                      }}
                    >
                      {gate.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ═══ CONSIDERATIONS + ACTIONS ═══ */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 28,
              marginBottom: 32,
              animation: "fadeIn 600ms ease-out 900ms both",
            }}
          >
            {/* Considerations */}
            <div style={{ ...glassPanelBase, padding: "28px 28px" }}>
              <div style={glassSheen} />
              <div style={{ position: "relative" }}>
                <div style={{ ...microLabel, marginBottom: 18 }}>Considerations</div>
                {report.considerations.map((c, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      gap: 14,
                      padding: "16px 0",
                      borderBottom:
                        i < report.considerations.length - 1
                          ? "1px solid rgba(67,67,43,0.06)"
                          : "none",
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                        fontSize: 18,
                        fontWeight: 600,
                        color: "rgba(67,67,43,0.22)",
                        flexShrink: 0,
                        width: 28,
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 650,
                          color: "rgba(67,67,43,0.82)",
                          fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                          marginBottom: 4,
                        }}
                      >
                        {c.title}
                      </div>
                      <p
                        style={{
                          fontSize: 12.5,
                          lineHeight: 1.55,
                          color: "rgba(67,67,43,0.50)",
                          fontFamily: "var(--font-inter), system-ui, sans-serif",
                          margin: 0,
                          marginBottom: 8,
                        }}
                      >
                        {c.detail}
                      </p>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "3px 10px",
                          borderRadius: 999,
                          fontSize: 10,
                          fontWeight: 650,
                          fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                          letterSpacing: "0.04em",
                          textTransform: "uppercase" as const,
                          background: DIM_TAG_COLORS[c.dimension]?.bg || "rgba(67,67,43,0.06)",
                          color: DIM_TAG_COLORS[c.dimension]?.text || "rgba(67,67,43,0.50)",
                        }}
                      >
                        {c.dimension}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div style={{ ...glassPanelBase, padding: "28px 28px" }}>
              <div style={glassSheen} />
              <div style={{ position: "relative" }}>
                <div style={{ ...microLabel, marginBottom: 18 }}>Recommended Actions</div>
                {report.actions.map((a, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      gap: 14,
                      padding: "16px 0",
                      borderBottom:
                        i < report.actions.length - 1
                          ? "1px solid rgba(67,67,43,0.06)"
                          : "none",
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                        fontSize: 16,
                        fontWeight: 600,
                        color: BRAND.chartreuse,
                        flexShrink: 0,
                        width: 28,
                      }}
                    >
                      →
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 650,
                          color: "rgba(67,67,43,0.82)",
                          fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                          marginBottom: 4,
                        }}
                      >
                        {a.title}
                      </div>
                      <p
                        style={{
                          fontSize: 12.5,
                          lineHeight: 1.55,
                          color: "rgba(67,67,43,0.50)",
                          fontFamily: "var(--font-inter), system-ui, sans-serif",
                          margin: 0,
                          marginBottom: 8,
                        }}
                      >
                        {a.detail}
                      </p>
                      <div style={{ display: "flex", gap: 6 }}>
                        {a.tags.map((t) => (
                          <span
                            key={t}
                            style={{
                              display: "inline-block",
                              padding: "3px 10px",
                              borderRadius: 999,
                              fontSize: 10,
                              fontWeight: 650,
                              fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                              letterSpacing: "0.04em",
                              textTransform: "uppercase" as const,
                              background: DIM_TAG_COLORS[t]?.bg || "rgba(67,67,43,0.06)",
                              color: DIM_TAG_COLORS[t]?.text || "rgba(67,67,43,0.50)",
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
          </div>

          <AskMuko
  step="report"
  suggestedQuestions={[
    "Why did Execution score 64?",
    "Should I act on the silhouette redirect?",
    "How confident is this score?",
  ]}
  context={{
    score: report.overallScore,
    identity: report.identity,
    resonance: report.resonance,
    execution: report.execution,
    gates: { costGatePassed: report.costGatePassed },
    narrative: report.narrative,
  }}
/>

          {/* ═══ ACTION BAR ═══ */}
          <div
            style={{
              ...glassPanelBase,
              padding: "22px 28px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              animation: "fadeIn 600ms ease-out 1000ms both",
            }}
          >
            <div style={glassSheen} />
            <div
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 13.5,
                color: "rgba(67,67,43,0.55)",
                fontFamily: "var(--font-inter), system-ui, sans-serif",
              }}
            >
              <span style={{ color: BRAND.chartreuse, fontSize: 16 }}>✦</span>
              Ready to act on this analysis, or explore an alternative direction?
            </div>
            <div style={{ position: "relative", display: "flex", gap: 8 }}>
              {[
                { label: "Branch Design", primary: false },
                { label: "Export PDF", primary: false },
                { label: "Save to Collection", primary: true },
              ].map((btn) => (
                <button
                  key={btn.label}
                  style={{
                    padding: "12px 22px",
                    borderRadius: 12,
                    fontSize: 13,
                    fontWeight: 650,
                    fontFamily: "var(--font-sohne-breit), system-ui, sans-serif",
                    border: btn.primary
                      ? `1.5px solid ${BRAND.steelBlue}`
                      : "1px solid rgba(67,67,43,0.12)",
                    background: btn.primary
                      ? "rgba(169,191,214,0.08)"
                      : "rgba(255,255,255,0.55)",
                    color: btn.primary ? BRAND.steelBlue : "rgba(67,67,43,0.70)",
                    cursor: "pointer",
                    boxShadow: btn.primary
                      ? "0 14px 44px rgba(169,191,214,0.16), inset 0 1px 0 rgba(255,255,255,0.60)"
                      : "0 8px 24px rgba(67,67,43,0.04)",
                    transition: "all 200ms cubic-bezier(0.4, 0, 0.2, 1)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {btn.label}
                  {btn.primary && <IconArrowRight />}
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* ═══ CSS ANIMATIONS ═══ */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes radarReveal {
          from { opacity: 0; transform: scale(0.85); }
          to { opacity: 1; transform: scale(1); }
        }
        @media (max-width: 1100px) {
          main > div > div[style*="grid-template-columns: 1fr 1fr"] { grid-template-columns: 1fr !important; }
          main > div > div[style*="grid-template-columns: 1.15fr"] { grid-template-columns: 1fr !important; }
          main > div > div[style*="grid-template-columns: repeat(3"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}