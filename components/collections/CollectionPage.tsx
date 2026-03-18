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
}

interface CollectionPageProps {
  collectionName: string;
  season: string | null;
  userId: string;
  onNewPiece: () => void;
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
}: {
  health: CollectionHealthState;
  analysesCount: number;
  onGenerateReport: () => void;
}) {
  const canGenerateReport = analysesCount >= 2;

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

  return (
    <div
      style={{
        position: 'sticky',
        bottom: 0,
        padding: '14px 36px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        boxSizing: 'border-box',
        borderTop: '1px solid rgba(67,67,43,0.08)',
        background: 'rgba(250,249,246,0.98)',
      }}
    >
      {flaggedNames ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            minWidth: 0,
            padding: '6px 10px',
            borderRadius: 999,
            border: '1px solid rgba(67,67,43,0.08)',
            background: 'rgba(255,255,255,0.72)',
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#B8876B',
              flexShrink: 0,
            }}
          />
          <span
            style={{
              minWidth: 0,
              display: 'flex',
              alignItems: 'baseline',
              gap: 4,
              flexWrap: 'wrap',
              fontFamily: inter,
              fontSize: 12,
              lineHeight: 1.2,
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#8D7668',
                whiteSpace: 'nowrap',
              }}
            >
              Watchlist
            </span>
            <span style={{ fontWeight: 500, color: '#5B524D' }}>{flaggedNames}</span>
            <span style={{ fontWeight: 400, color: '#A8A09A' }}>{needsWord} attention</span>
          </span>
        </div>
      ) : <div />}

      <button
        onClick={onGenerateReport}
        disabled={!canGenerateReport}
        style={{
          padding: '14px 16px',
          borderRadius: 10,
          fontSize: 12,
          fontWeight: 700,
          fontFamily: sohne,
          letterSpacing: '0.02em',
          color: canGenerateReport ? '#7D96AC' : 'rgba(67,67,43,0.30)',
          background: canGenerateReport ? 'rgba(125,150,172,0.07)' : 'rgba(255,255,255,0.46)',
          border: canGenerateReport ? '1.5px solid #7D96AC' : '1.5px solid rgba(67,67,43,0.10)',
          cursor: canGenerateReport ? 'pointer' : 'not-allowed',
          transition: 'all 280ms ease',
          opacity: canGenerateReport ? 1 : 0.65,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          flexShrink: 0,
          minWidth: 180,
        }}
      >
        <span>Generate Report</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          style={{
            transition: 'transform 280ms ease',
            transform: canGenerateReport ? 'translateX(0)' : 'translateX(-2px)',
            opacity: canGenerateReport ? 1 : 0.4,
          }}
        >
          <path
            d="M3.5 8H12.5M12.5 8L8.5 4M12.5 8L8.5 12"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
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

function PieceCard({ analysis, onClick }: { analysis: AnalysisRow; onClick: () => void }) {
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
        boxShadow: 'none',
        padding: 0,
        textAlign: 'left',
        fontFamily: inter,
        transition: 'box-shadow 180ms ease',
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.boxShadow = '0 4px 16px rgba(25,25,25,0.07)';
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.boxShadow = 'none';
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
  );
}

export default function CollectionPage({
  collectionName,
  season,
  userId,
  onNewPiece,
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
          'id, category, aesthetic_input, season, material_id, silhouette, construction_tier, created_at, score, gates_passed, agent_versions'
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

  const collectionHealth = useMemo(() => getCollectionHealthMetrics(analyses), [analyses]);

  const seasonLabel = season ?? analyses[0]?.season ?? '';
  const canGenerateReport = analyses.length >= 2;

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
          minHeight: '100%',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            flex: 1,
            padding: '32px 36px 0',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              padding: '0 0 24px',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 24,
            }}
          >
            <div>
              <h1
                style={{
                  margin: 0,
                  fontFamily: sohne,
                  fontSize: 22,
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  color: '#191919',
                }}
              >
                {collectionName}
              </h1>

              <div
                style={{
                  marginTop: 4,
                  fontFamily: inter,
                  fontSize: 12,
                  color: '#A8A09A',
                }}
              >
                {seasonLabel || 'Season not set'}
              </div>
            </div>

            <button
              onClick={onNewPiece}
              style={{
                padding: '14px 16px',
                borderRadius: 10,
                fontSize: 12,
                fontFamily: sohne,
                fontWeight: 700,
                letterSpacing: '0.02em',
                color: '#A8B475',
                background: 'rgba(168,180,117,0.08)',
                border: '1.5px solid #A8B475',
                cursor: 'pointer',
                transition: 'all 280ms ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
              }}
            >
              <span>Add Piece</span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                style={{
                  transition: 'transform 280ms ease',
                  transform: 'translateX(0)',
                  opacity: 1,
                }}
              >
                <path
                  d="M3.5 8H12.5M12.5 8L8.5 4M12.5 8L8.5 12"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          <div
            style={{
              padding: '0 0 100px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 16,
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
                  minHeight: 260,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    fontFamily: inter,
                    fontSize: 14,
                    color: '#A8A09A',
                  }}
                >
                  No pieces yet.
                </div>
                <div
                  style={{
                    marginTop: 6,
                    fontFamily: inter,
                    fontSize: 12,
                    color: '#C8BFB8',
                  }}
                >
                  Run an analysis and add it to this collection.
                </div>
              </div>
            ) : (
              analyses.map((analysis) => (
                <PieceCard
                  key={analysis.id}
                  analysis={analysis}
                  onClick={() => router.push('/spec')}
                />
              ))
            )}
          </div>
        </div>

        {!loading && analyses.length > 0 && (
          <CollectionHealthFooter
            health={collectionHealth}
            analysesCount={analyses.length}
            onGenerateReport={handleGenerateReport}
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
