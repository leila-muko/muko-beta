'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getFlatForPiece } from '@/components/flats';
import { useSessionStore } from '@/lib/store/sessionStore';
import { parseSelectedPieceImage } from '@/lib/piece-image';

const inter = 'var(--font-inter), system-ui, sans-serif';
const sohne = 'var(--font-sohne-breit), system-ui, sans-serif';
const PULSE_COLORS = {
  green: '#A8B475',
  amber: '#B8876B',
  red: '#A97B8F',
} as const;

type PieceRole = 'hero' | 'core' | 'support';
type ComplexityLevel = 'high' | 'medium' | 'low';

interface CollectionHealthMetric {
  label: 'Role Balance' | 'Complexity Load' | 'Silhouette Diversity';
  value: number;
  tone: string;
  variant: 'green' | 'amber' | 'red';
  status: string;
  statusColor: string;
}

interface CollectionHealthState {
  metrics: CollectionHealthMetric[];
  insight: string;
}

interface AnalysisRow {
  id: string;
  category: string | null;
  aesthetic_input: string | null;
  season: string | null;
  material_id: string | null;
  silhouette: string | null;
  construction_tier: 'low' | 'moderate' | 'high' | null;
  created_at: string;
  score?: number | null;
  gates_passed?: { cost?: boolean | null } | null;
  agent_versions?: Record<string, string | null> | null;
  dimensions?: { identity?: number | null; resonance?: number | null; execution?: number | null } | null;
  narrative?: string | null;
}

interface CollectionPageProps {
  collectionName: string;
  season: string | null;
  userId: string;
  onNewPiece: () => void;
  onPieceDeleted?: () => void;
}

function normalizeToken(value: string | null | undefined) {
  return (value ?? '')
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getScore(row: AnalysisRow) {
  return row.score ?? 0;
}

function getMarginPassed(row: AnalysisRow) {
  return row.gates_passed?.cost ?? false;
}

function titleCase(value: string | null | undefined) {
  if (!value) return '';
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

function getScorePillStyle(score: number): React.CSSProperties {
  if (score >= 75) {
    return { background: '#F0F4E8', color: '#6B8F3E' };
  }

  if (score >= 50) {
    return { background: '#FAF4EF', color: '#B8876B' };
  }

  return { background: '#FAF0EF', color: '#C47B6B' };
}

function clampPercentage(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getPieceRole(analysis: AnalysisRow): PieceRole {
  const storedRole = normalizeToken(analysis.agent_versions?.collection_role);

  if (storedRole === 'hero' || storedRole === 'core' || storedRole === 'support') {
    return storedRole;
  }

  const score = getScore(analysis);
  if (score >= 80) return 'hero';
  if (score >= 60) return 'core';
  return 'support';
}

function getRoleLabel(role: PieceRole) {
  return role === 'hero' ? 'Hero' : role === 'core' ? 'Core' : 'Support';
}

function getComplexityLevel(analysis: AnalysisRow): ComplexityLevel {
  const tier = normalizeToken(analysis.construction_tier);
  if (tier === 'high') return 'high';
  if (tier === 'low') return 'low';
  return 'medium';
}

function getSilhouetteKey(analysis: AnalysisRow) {
  const silhouette = normalizeToken(analysis.silhouette);
  if (silhouette) return silhouette;

  const category = normalizeToken(analysis.category);
  if (category) return category;

  return normalizeToken(analysis.agent_versions?.saved_piece_name) || 'unknown';
}

function getRoleBalanceScore(analyses: AnalysisRow[]) {
  if (analyses.length === 0) return 0;

  const counts: Record<PieceRole, number> = { hero: 0, core: 0, support: 0 };
  for (const analysis of analyses) {
    counts[getPieceRole(analysis)] += 1;
  }

  const idealRatios: Record<PieceRole, number> = {
    hero: 0.2,
    core: 0.5,
    support: 0.3,
  };

  let variance = 0;
  for (const role of Object.keys(counts) as PieceRole[]) {
    const actual = counts[role] / analyses.length;
    variance += Math.abs(actual - idealRatios[role]);
  }

  return clampPercentage((1 - variance / 1.2) * 100);
}

function getComplexityLoadScore(analyses: AnalysisRow[]) {
  if (analyses.length === 0) return 0;

  const complexityWeights: Record<ComplexityLevel, number> = {
    high: 1,
    medium: 0.6,
    low: 0.3,
  };

  const average =
    analyses.reduce((sum, analysis) => sum + complexityWeights[getComplexityLevel(analysis)], 0) /
    analyses.length;

  return clampPercentage(average * 100);
}

function getSilhouetteDiversityScore(analyses: AnalysisRow[]) {
  if (analyses.length === 0) return 0;
  const uniqueKeys = new Set(analyses.map(getSilhouetteKey));
  return clampPercentage((uniqueKeys.size / analyses.length) * 100);
}

function getCollectionHealthInsight(metrics: CollectionHealthMetric[]) {
  const roleBalance = metrics.find((metric) => metric.label === 'Role Balance')?.value ?? 0;
  const complexityLoad = metrics.find((metric) => metric.label === 'Complexity Load')?.value ?? 0;
  const silhouetteDiversity = metrics.find((metric) => metric.label === 'Silhouette Diversity')?.value ?? 0;

  if (roleBalance < 45) {
    return 'Collection currently leans too heavily on one piece role.';
  }

  if (complexityLoad > 72) {
    return 'Complexity load is elevated relative to assortment size.';
  }

  if (silhouetteDiversity < 45) {
    return 'Silhouette repetition may reduce assortment breadth.';
  }

  return 'Collection architecture is currently balanced.';
}

function getCollectionHealthMetrics(analyses: AnalysisRow[]): CollectionHealthState {
  const roleBalance = getRoleBalanceScore(analyses);
  const complexityLoad = getComplexityLoadScore(analyses);
  const silhouetteDiversity = getSilhouetteDiversityScore(analyses);

  const metrics: CollectionHealthMetric[] = [
    {
      label: 'Role Balance',
      value: roleBalance,
      tone: roleBalance >= 70 ? PULSE_COLORS.green : roleBalance >= 45 ? PULSE_COLORS.amber : PULSE_COLORS.red,
      variant: roleBalance >= 70 ? 'green' : roleBalance >= 45 ? 'amber' : 'red',
      status: roleBalance >= 70 ? 'Balanced' : roleBalance >= 45 ? 'Skewed' : 'Imbalanced',
      statusColor:
        roleBalance >= 70 ? PULSE_COLORS.green : roleBalance >= 45 ? PULSE_COLORS.amber : PULSE_COLORS.red,
    },
    {
      label: 'Complexity Load',
      value: complexityLoad,
      tone: complexityLoad >= 72 ? PULSE_COLORS.red : complexityLoad >= 48 ? PULSE_COLORS.amber : PULSE_COLORS.green,
      variant: complexityLoad >= 72 ? 'red' : complexityLoad >= 48 ? 'amber' : 'green',
      status: complexityLoad >= 72 ? 'Heavy' : complexityLoad >= 48 ? 'Moderate' : 'Light',
      statusColor:
        complexityLoad >= 72 ? PULSE_COLORS.red : complexityLoad >= 48 ? PULSE_COLORS.amber : PULSE_COLORS.green,
    },
    {
      label: 'Silhouette Diversity',
      value: silhouetteDiversity,
      tone:
        silhouetteDiversity >= 70
          ? PULSE_COLORS.green
          : silhouetteDiversity >= 45
          ? PULSE_COLORS.amber
          : PULSE_COLORS.red,
      variant: silhouetteDiversity >= 70 ? 'green' : silhouetteDiversity >= 45 ? 'amber' : 'red',
      status:
        silhouetteDiversity >= 70 ? 'Diverse' : silhouetteDiversity >= 45 ? 'Narrowing' : 'Repetitive',
      statusColor:
        silhouetteDiversity >= 70
          ? PULSE_COLORS.green
          : silhouetteDiversity >= 45
          ? PULSE_COLORS.amber
          : PULSE_COLORS.red,
    },
  ];

  return {
    metrics,
    insight: getCollectionHealthInsight(metrics),
  };
}

function getRoleBadgeStyles(role: PieceRole): React.CSSProperties {
  if (role === 'hero') return { background: '#eef2e6', color: '#5a6e2a' };
  if (role === 'core') return { background: '#e8eef2', color: '#2e4a5a' };
  return { background: '#f0eeee', color: '#5a4a4a' };
}

function CollectionHealthFooter({
  health,
  analysesCount,
  onGenerateReport,
  reportExists,
}: {
  health: CollectionHealthState;
  analysesCount: number;
  onGenerateReport: () => void;
  reportExists: boolean;
}) {
  const flagged = health.metrics
    .filter((metric) => metric.variant !== 'green')
    .slice(0, 2);

  const flaggedNames =
    flagged.length === 0
      ? null
      : flagged.length === 1
      ? flagged[0].label
      : `${flagged[0].label} · ${flagged[1].label}`;

  const needsWord = flagged.length === 1 ? 'needs' : 'need';

  // Approximate last-run date from most recent analysis
  const lastRunLabel: string | null = null; // Would need stored report date — omit for now

  return (
    <div
      style={{
        flexShrink: 0,
        borderTop: '1px solid #E2DDD6',
        padding: '13px 32px',
        background: '#F9F7F4',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        boxSizing: 'border-box',
      }}
    >
      {/* Left: watchlist */}
      <div style={{ display: 'flex', flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#B8876B', flexShrink: 0 }} />
        <span style={{ fontFamily: inter, fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#B8876B' }}>
          Watchlist
        </span>
        {flaggedNames ? (
          <>
            <span style={{ fontFamily: inter, fontSize: 11, color: '#C8C2BA' }}> · </span>
            <span style={{ fontFamily: inter, fontSize: 11, color: '#888078' }}>
              {flaggedNames}{' '}
              <span style={{ color: '#B8876B' }}>{needsWord} attention</span>
            </span>
          </>
        ) : (
          <>
            <span style={{ fontFamily: inter, fontSize: 11, color: '#C8C2BA' }}> · </span>
            <span style={{ fontFamily: inter, fontSize: 11, color: '#888078' }}>
              see report for guidance
            </span>
          </>
        )}
      </div>

      {/* Right: report actions */}
      {analysesCount === 0 ? null : reportExists ? (
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {lastRunLabel && (
            <span style={{ fontFamily: inter, fontSize: 10, color: '#888078' }}>Last run: {lastRunLabel}</span>
          )}
          {lastRunLabel && <span style={{ fontFamily: inter, fontSize: 10, color: '#888078' }}> · </span>}
          <button
            onClick={onGenerateReport}
            style={{
              fontFamily: inter,
              fontSize: 10,
              color: '#191919',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#A8B475'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#191919'; }}
          >
            Re-run analysis
          </button>
        </div>
      ) : (
        <span style={{ fontFamily: inter, fontSize: 11, color: '#888078', opacity: 0.5 }}>
          {analysesCount < 2 ? 'Generate Report — spec all pieces first' : 'Generate Report from header above'}
        </span>
      )}
    </div>
  );
}

function getFlatMatch(category: string | null, silhouette: string | null) {
  const silhouetteKey = normalizeToken(silhouette);
  const categoryKey = normalizeToken(category);

  const aliases: Record<string, string> = {
    outerwear: 'trench',
    tops: 'top',
    bottoms: 'straight-pant',
    dresses: 'midi-dress',
    knitwear: 'knit-sweater',
    cocoon: 'coat',
    belted: 'trench',
    straight: 'straight-pant',
    cropped: 'jacket',
    relaxed: categoryKey === 'knitwear' ? 'knit-sweater' : 'top',
    fitted: categoryKey === 'knitwear' ? 'cardigan' : 'top',
    oversized: categoryKey === 'knitwear' ? 'knit-sweater' : 'tunic',
    boxy: 'top',
    'wide-leg': 'trouser',
    'straight-leg': 'straight-pant',
    slim: 'straight-pant',
    flare: 'trouser',
    column: 'column-dress',
    'a-line': 'midi-dress',
    wrap: 'shirt-dress',
    shift: 'midi-dress',
  };

  const candidates = [silhouetteKey, aliases[silhouetteKey], categoryKey, aliases[categoryKey]].filter(
    Boolean
  ) as string[];

  for (const candidate of candidates) {
    const flat = getFlatForPiece(candidate, null);
    if (flat) return flat;
  }

  return null;
}

function PlaceholderFlat() {
  return (
    <div
      style={{
        width: 80,
        height: 120,
        borderRadius: 4,
        background: '#E8E3D6',
      }}
    />
  );
}

function LoadingCards() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: 16,
      }}
    >
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className="animate-pulse"
          style={{
            background: '#F9F7F4',
            border: '1px solid #E8E3D6',
            borderRadius: 10,
            height: 260,
          }}
        />
      ))}
    </div>
  );
}

function Toast({ message }: { message: string }) {
  return (
    <div
      style={{
        position: 'fixed',
        right: 36,
        bottom: 88,
        background: '#191919',
        color: '#FFFFFF',
        borderRadius: 8,
        padding: '10px 14px',
        fontFamily: inter,
        fontSize: 12,
        zIndex: 30,
        boxShadow: '0 8px 24px rgba(25,25,25,0.16)',
      }}
    >
      {message}
    </div>
  );
}

function PieceCard({ analysis, onClick, onDelete }: { analysis: AnalysisRow; onClick: () => void; onDelete: () => void }) {
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const pieceName = analysis.agent_versions?.saved_piece_name?.trim() ?? '';
  const score = getScore(analysis);
  const storedPieceImage = parseSelectedPieceImage(analysis.agent_versions?.selected_piece_image);
  const flat = storedPieceImage?.pieceType
    ? getFlatForPiece(storedPieceImage.pieceType, storedPieceImage.signal)
    : getFlatMatch(analysis.category, analysis.silhouette);
  const materialLabel = titleCase(analysis.material_id) || 'Unknown material';
  const complexityLabel = titleCase(analysis.construction_tier) || 'Unknown';
  const role = getPieceRole(analysis);
  const roleLabel = getRoleLabel(role);
  const aestheticLabel = analysis.aesthetic_input?.trim() || 'No aesthetic';
  const scoreColor = score >= 80 ? '#A8B475' : '#B8876B';

  return (
    <div
      style={{ position: 'relative' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setMenuOpen(false); }}
    >
      <button
        onClick={onClick}
        style={{
          appearance: 'none',
          WebkitAppearance: 'none',
          display: 'block',
          width: '100%',
          background: 'transparent',
          border: '1px solid #E8E3D6',
          borderRadius: 10,
          overflow: 'hidden',
          cursor: 'pointer',
          boxShadow: hovered ? '0 4px 16px rgba(25,25,25,0.07)' : 'none',
          padding: 0,
          textAlign: 'left',
          fontFamily: inter,
          transition: 'box-shadow 180ms ease',
        }}
      >
        {/* Visual zone */}
        <div
          style={{
            width: '100%',
            height: 120,
            background: '#F9F7F4',
            borderTopLeftRadius: 9,
            borderTopRightRadius: 9,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {flat ? (
            <div style={{ height: '100%', width: 'auto' }}>
              <flat.Flat color={flat.color} />
            </div>
          ) : (
            <PlaceholderFlat />
          )}

          <span
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              background: '#FFFFFF',
              border: '0.5px solid #E8E3D6',
              borderRadius: 20,
              padding: '3px 10px',
              fontSize: 12,
              fontWeight: 500,
              color: scoreColor,
              lineHeight: 1,
            }}
          >
            {score}
          </span>
        </div>

        {/* Body zone */}
        <div
          style={{
            padding: '10px 12px 14px',
            background: '#FFFFFF',
            borderBottomLeftRadius: 9,
            borderBottomRightRadius: 9,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 8,
              marginBottom: 8,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: pieceName ? '#191919' : '#A8A09A',
                fontStyle: pieceName ? 'normal' : 'italic',
                lineHeight: 1.4,
              }}
            >
              {pieceName || 'Unnamed Piece'}
            </div>

            <span
              style={{
                ...getRoleBadgeStyles(role),
                fontSize: 9,
                fontWeight: 500,
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
                borderRadius: 20,
                padding: '2px 8px',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                lineHeight: 1.6,
              }}
            >
              {roleLabel}
            </span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 500,
                background: '#F5F1EA',
                color: '#A8A09A',
                borderRadius: 20,
                padding: '2px 7px',
                lineHeight: 1.5,
              }}
            >
              {aestheticLabel}
            </span>

            {[materialLabel, complexityLabel].map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: 10,
                  fontWeight: 400,
                  border: '0.5px solid #E8E3D6',
                  color: '#C8BFB8',
                  borderRadius: 20,
                  padding: '2px 7px',
                  lineHeight: 1.5,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </button>

      {/* Ellipsis button — appears on hover */}
      {(hovered || menuOpen) && (
        <button
          onClick={(e) => { e.stopPropagation(); setMenuOpen((prev) => !prev); }}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 24,
            height: 24,
            borderRadius: 6,
            background: 'rgba(255,255,255,0.92)',
            border: '0.5px solid rgba(67,67,43,0.14)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            color: 'rgba(67,67,43,0.55)',
            zIndex: 2,
            letterSpacing: '0.04em',
            lineHeight: 1,
            padding: 0,
          }}
          title="More options"
        >
          ···
        </button>
      )}

      {/* Delete popover */}
      {menuOpen && (
        <div
          style={{
            position: 'absolute',
            top: 36,
            right: 8,
            background: '#FFFFFF',
            border: '1px solid rgba(67,67,43,0.1)',
            borderRadius: 8,
            boxShadow: '0 6px 20px rgba(25,25,25,0.1)',
            zIndex: 20,
            overflow: 'hidden',
            minWidth: 140,
          }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); setMenuOpen(false); }}
            style={{
              display: 'block',
              width: '100%',
              padding: '10px 14px',
              textAlign: 'left',
              fontFamily: inter,
              fontSize: 13,
              fontWeight: 500,
              color: '#C47B6B',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              transition: 'background 120ms ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#FAF0EF'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            Delete piece
          </button>
        </div>
      )}
    </div>
  );
}

export default function CollectionPage({
  collectionName,
  season,
  userId,
  onNewPiece,
  onPieceDeleted,
}: CollectionPageProps) {
  const router = useRouter();
  const setActiveCollection = useSessionStore((state) => state.setActiveCollection);
  const setCollectionName = useSessionStore((state) => state.setCollectionName);
  const setSeason = useSessionStore((state) => state.setSeason);
  const [analyses, setAnalyses] = useState<AnalysisRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);

      const supabase = createClient();
      const { data } = await supabase
        .from('analyses')
        .select(
          'id, category, aesthetic_input, season, material_id, silhouette, construction_tier, created_at, score, gates_passed, agent_versions, dimensions, narrative'
        )
        .eq('user_id', userId)
        .eq('collection_name', collectionName)
        .order('created_at', { ascending: false });

      if (cancelled) return;

      setAnalyses((data as AnalysisRow[] | null) ?? []);
      setLoading(false);
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [collectionName, userId]);

  useEffect(() => {
    if (!toastMessage) return undefined;

    const timeoutId = window.setTimeout(() => {
      setToastMessage(null);
    }, 2200);

    return () => window.clearTimeout(timeoutId);
  }, [toastMessage]);

  const handleDeletePiece = async (id: string) => {
    const supabase = createClient();
    await supabase.from('analyses').delete().eq('id', id);
    setAnalyses((prev) => prev.filter((a) => a.id !== id));
    onPieceDeleted?.();
    setToastMessage('Piece removed from collection');
  };

  const collectionHealth = useMemo(() => getCollectionHealthMetrics(analyses), [analyses]);

  const seasonLabel = season ?? analyses[0]?.season ?? '';
  const canGenerateReport = analyses.length >= 2;

  // Aggregate scores for score banner
  const scoredAnalyses = useMemo(() => analyses.filter(a => (a.score ?? 0) > 0), [analyses]);
  const reportExists = scoredAnalyses.length > 0;
  const collectionScore = reportExists
    ? Math.round(scoredAnalyses.reduce((sum, a) => sum + (a.score ?? 0), 0) / scoredAnalyses.length)
    : 0;
  const avgIdentity = reportExists
    ? Math.round(scoredAnalyses.reduce((sum, a) => sum + (a.dimensions?.identity ?? 0), 0) / scoredAnalyses.length)
    : 0;
  const avgResonance = reportExists
    ? Math.round(scoredAnalyses.reduce((sum, a) => sum + (a.dimensions?.resonance ?? 0), 0) / scoredAnalyses.length)
    : 0;
  const avgExecution = reportExists
    ? Math.round(scoredAnalyses.reduce((sum, a) => sum + (a.dimensions?.execution ?? 0), 0) / scoredAnalyses.length)
    : 0;
  const mukoReadNarrative = scoredAnalyses[0]?.narrative ?? null;

  const handleGenerateReport = () => {
    if (!canGenerateReport) return;

    setActiveCollection(collectionName);
    setCollectionName(collectionName);
    if (seasonLabel) {
      setSeason(seasonLabel);
    }

    try {
      localStorage.setItem('muko_collectionName', collectionName);
      if (seasonLabel) {
        localStorage.setItem('muko_seasonLabel', seasonLabel);
      }
    } catch {}

    const params = new URLSearchParams({ collection: collectionName });
    if (seasonLabel) {
      params.set('season', seasonLabel);
    }

    router.push(`/report?${params.toString()}`);
  };

  return (
    <>
      <div
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          background: '#F9F7F4',
        }}
      >
        {/* ── Collection header ──────────────────────────────────────────── */}
        <div
          style={{
            padding: '22px 32px',
            borderBottom: '1px solid #E2DDD6',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 24,
            flexShrink: 0,
            background: '#F9F7F4',
          }}
        >
          <div>
            {seasonLabel && (
              <div style={{ fontFamily: inter, fontSize: 11, color: '#888078', marginBottom: 4 }}>
                {seasonLabel}
              </div>
            )}
            <h1
              style={{
                margin: '0 0 10px 0',
                fontFamily: sohne,
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: '#191919',
                lineHeight: 1.1,
              }}
            >
              {collectionName}
            </h1>
            {/* Tags row */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {analyses[0]?.aesthetic_input && (
                <span
                  style={{
                    background: '#EFF2E5',
                    color: '#6B7A40',
                    border: '1px solid #C8D49A',
                    borderRadius: 100,
                    fontSize: 9,
                    fontWeight: 600,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    padding: '4px 10px',
                    fontFamily: inter,
                  }}
                >
                  ✓ {analyses[0].aesthetic_input}
                </span>
              )}
              <button
                onClick={() => router.push('/intent')}
                style={{
                  fontFamily: inter,
                  fontSize: 11,
                  color: '#888078',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#191919'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#888078'; }}
              >
                Edit Setup →
              </button>
            </div>
          </div>

          {/* Right CTAs */}
          <div style={{ display: 'flex', flexDirection: 'row', gap: 12, alignItems: 'flex-start', flexShrink: 0 }}>
            <button
              onClick={onNewPiece}
              style={{
                border: '1px solid #E2DDD6',
                background: '#FFFFFF',
                color: '#888078',
                borderRadius: 100,
                padding: '8px 16px',
                fontSize: 11,
                fontFamily: inter,
                cursor: 'pointer',
                transition: 'border-color 150ms ease, color 150ms ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#A8B475'; e.currentTarget.style.color = '#A8B475'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E2DDD6'; e.currentTarget.style.color = '#888078'; }}
            >
              Add Piece →
            </button>

            {reportExists ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <button
                  onClick={handleGenerateReport}
                  style={{
                    background: '#A8B475',
                    color: '#3A4020',
                    borderRadius: 100,
                    border: 'none',
                    padding: '9px 20px',
                    fontSize: 12,
                    fontWeight: 500,
                    fontFamily: inter,
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#95A164'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#A8B475'; }}
                >
                  View Report →
                </button>
                <button
                  onClick={handleGenerateReport}
                  style={{
                    fontFamily: inter,
                    fontSize: 10,
                    color: '#888078',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    textAlign: 'right',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#191919'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#888078'; }}
                >
                  Re-run analysis
                </button>
              </div>
            ) : (
              <button
                disabled
                style={{
                  background: '#E2DDD6',
                  color: '#888078',
                  borderRadius: 100,
                  border: 'none',
                  padding: '9px 18px',
                  fontSize: 12,
                  fontFamily: inter,
                  cursor: 'not-allowed',
                }}
              >
                Generate Report
              </button>
            )}
          </div>
        </div>

        {/* ── Score banner (only when report exists) ─────────────────────── */}
        {reportExists && (
          <div
            style={{
              background: '#FFFFFF',
              borderBottom: '1px solid #E2DDD6',
              padding: '16px 32px',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 28,
              flexShrink: 0,
            }}
          >
            {/* Overall score */}
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontFamily: sohne, fontWeight: 700, fontSize: 48, color: '#191919', lineHeight: 1 }}>
                {collectionScore}
              </span>
              <span style={{ fontFamily: inter, fontSize: 11, color: '#888078' }}>Collection Score</span>
            </div>

            <div style={{ width: 1, height: 40, background: '#E2DDD6', flexShrink: 0 }} />

            {/* Dimension scores */}
            <div style={{ display: 'flex', flexDirection: 'row', gap: 24 }}>
              {([
                { label: 'Identity', score: avgIdentity, color: '#A8B475' },
                { label: 'Resonance', score: avgResonance, color: '#B8876B' },
                {
                  label: 'Execution',
                  score: avgExecution,
                  color: avgExecution >= 70 ? '#7A9E7E' : avgExecution >= 50 ? '#C4955A' : '#B85C5C',
                },
              ] as Array<{ label: string; score: number; color: string }>).map(({ label, score, color }) => (
                <div key={label}>
                  <div style={{ fontFamily: inter, fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#888078', marginBottom: 2 }}>
                    {label}
                  </div>
                  <div style={{ fontFamily: inter, fontSize: 20, fontWeight: 700, color }}>
                    {score || '—'}
                  </div>
                </div>
              ))}
            </div>

            {mukoReadNarrative && (
              <>
                <div style={{ width: 1, height: 40, background: '#E2DDD6', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: inter, fontSize: 13, fontWeight: 600, color: '#191919', marginBottom: 3 }}>
                    {mukoReadNarrative.split('.')[0]?.trim()}.
                  </div>
                  <div style={{ fontFamily: inter, fontSize: 11, color: '#888078', lineHeight: 1.5 }}>
                    {mukoReadNarrative.split('.')[1]?.trim() ?? ''}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Pieces section ─────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
          {/* Section label */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: 3,
                height: 14,
                background: '#A8B475',
                borderRadius: 2,
                marginRight: 10,
                verticalAlign: 'middle',
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontFamily: inter,
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: '#888078',
              }}
            >
              Pieces{analyses.length > 0 ? ` · ${analyses.length} total` : ''}
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 14,
              paddingBottom: 100,
            }}
          >
            {loading ? (
              <div style={{ gridColumn: '1 / -1' }}>
                <LoadingCards />
              </div>
            ) : analyses.length === 0 ? (
              <div
                style={{
                  gridColumn: '1 / -1',
                  padding: '40px 0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                }}
              >
                <span style={{ fontFamily: inter, fontSize: 13, color: '#888078' }}>
                  No pieces have been added yet. Add your first piece to get started.
                </span>
              </div>
            ) : (
              analyses.map((analysis) => (
                <PieceCard
                  key={analysis.id}
                  analysis={analysis}
                  onClick={() => router.push('/spec')}
                  onDelete={() => handleDeletePiece(analysis.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* ── Watchlist footer ───────────────────────────────────────────── */}
        {!loading && (
          <CollectionHealthFooter
            health={collectionHealth}
            analysesCount={analyses.length}
            onGenerateReport={handleGenerateReport}
            reportExists={reportExists}
          />
        )}
      </div>

      {toastMessage ? <Toast message={toastMessage} /> : null}

      <style>{`
        @keyframes camelPulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(184,135,107,0.55); }
          50%       { opacity: 0.75; box-shadow: 0 0 0 5px rgba(184,135,107,0); }
        }
      `}</style>
    </>
  );
}
