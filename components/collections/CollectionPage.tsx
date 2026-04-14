'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import materialsData from '@/data/materials.json';
import { createClient } from '@/lib/supabase/client';
import { getFlatForPiece } from '@/components/flats';
import { buildCollectionReport } from '@/lib/collection-report/buildCollectionReport';
import { CollectionThesis } from '@/components/report/CollectionThesis';
import { OverallReadCallout } from '@/components/report/OverallReadCallout';
import type {
  CollectionComplexity,
  CollectionPieceRole,
  CollectionReportBrandInput,
  CollectionReportIntentInput,
  CollectionReportInput,
  CollectionReportPayload,
} from '@/lib/collection-report/types';
import { useSessionStore } from '@/lib/store/sessionStore';
import { parseSelectedPieceImage, resolvePieceImageType } from '@/lib/piece-image';
import { buildAssortmentIntelligence } from '@/lib/collection-report/buildAssortmentIntelligence';
import { hydrateSpecSessionFromAnalysis, type PersistedSpecAnalysisRow } from '@/lib/collections/hydrateSpecSessionFromAnalysis';
import { formatMonthYear, reportPalette, sectionCard, sectionEyebrow } from '@/components/report/reportStyles';

const inter = 'var(--font-inter), system-ui, sans-serif';
const sohne = 'var(--font-sohne-breit), system-ui, sans-serif';

type PieceRole = 'hero' | 'core' | 'support';
type AssignedRole = 'hero' | 'volume-driver' | 'core-evolution' | 'directional' | 'core' | 'support';
type ComplexityLevel = 'high' | 'medium' | 'low';

interface AnalysisRow {
  id: string;
  piece_name?: string | null;
  category: string | null;
  collection_role?: string | null;
  aesthetic_input: string | null;
  aesthetic_matched_id?: string | null;
  season: string | null;
  material_id: string | null;
  silhouette: string | null;
  construction_tier: 'low' | 'moderate' | 'high' | null;
  construction_tier_override?: boolean | null;
  target_msrp?: number | null;
  collection_aesthetic?: string | null;
  aesthetic_inflection?: string | null;
  created_at: string;
  score?: number | null;
  gates_passed?: { cost?: boolean | null } | null;
  agent_versions?: Record<string, unknown> | null;
  dimensions?: { identity?: number | null; resonance?: number | null; execution?: number | null } | null;
  narrative?: string | null;
  execution_notes?: string | null;
  updated_at?: string | null;
}

interface CollectionSnapshotRow {
  id: string;
  user_id: string;
  collection_name: string;
  report_snapshot: CollectionReportPayload;
  report_saved_at: string;
  piece_count: number | null;
}

interface CollectionPageProps {
  collectionName: string;
  season: string | null;
  userId: string;
  onNewPiece: () => void;
  onPieceDeleted?: () => void;
}

interface BrandProfileRow {
  brand_name: string | null;
  keywords: string[] | null;
  customer_profile: string | null;
  price_tier: string | null;
  tension_context: string | null;
  reference_brands: string[] | null;
}

const materialNameById = new Map(
  (materialsData as Array<{ id: string; name: string }>).map((material) => [material.id, material.name])
);

const headerActionButtonBase: React.CSSProperties = {
  borderRadius: 999,
  padding: '11px 18px',
  minHeight: 42,
  fontFamily: inter,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  transition: 'background 150ms ease, border-color 150ms ease, color 150ms ease, box-shadow 150ms ease',
  boxShadow: '0 12px 30px rgba(67,67,43,0.08)',
  whiteSpace: 'nowrap',
};

function normalizeToken(value: string | null | undefined) {
  return (value ?? '')
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getAgentString(
  agentVersions: Record<string, unknown> | null | undefined,
  key: string
) {
  const value = agentVersions?.[key];
  return typeof value === 'string' ? value : null;
}

function getScore(row: AnalysisRow) {
  return row.score ?? 0;
}

function titleCase(value: string | null | undefined) {
  if (!value) return '';
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

function getAssignedRole(analysis: AnalysisRow): AssignedRole | null {
  const storedRole = normalizeToken(
    analysis.collection_role ?? getAgentString(analysis.agent_versions, 'collection_role')
  );

  if (
    storedRole === 'hero' ||
    storedRole === 'volume-driver' ||
    storedRole === 'core-evolution' ||
    storedRole === 'directional' ||
    storedRole === 'core' ||
    storedRole === 'support'
  ) {
    return storedRole;
  }

  return null;
}

function inferReportRole(analysis: AnalysisRow): CollectionPieceRole | null {
  const storedRole = normalizeToken(
    analysis.collection_role ?? getAgentString(analysis.agent_versions, 'collection_role')
  );

  if (
    storedRole === 'hero' ||
    storedRole === 'volume-driver' ||
    storedRole === 'core-evolution' ||
    storedRole === 'directional'
  ) {
    return storedRole;
  }

  return null;
}

function inferReportComplexity(value: AnalysisRow['construction_tier']): CollectionComplexity {
  if (value === 'high') return 'high';
  if (value === 'low') return 'low';
  return 'medium';
}

function inferReportStatus(score: number | null | undefined) {
  if ((score ?? 0) >= 80) return 'strong' as const;
  if ((score ?? 0) >= 62) return 'watch' as const;
  return 'revise' as const;
}

function readIntentFromStorage(): CollectionReportIntentInput | null {
  try {
    const raw = window.localStorage.getItem('muko_intent');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      success?: string[];
      tradeoff?: string | null;
      collectionRole?: string | null;
      tensions?: {
        trendForward_vs_timeless?: 'left' | 'center' | 'right';
        creative_vs_commercial?: 'left' | 'center' | 'right';
        elevated_vs_accessible?: 'left' | 'center' | 'right';
        novelty_vs_continuity?: 'left' | 'center' | 'right';
      };
    };
    const mapTension = (value?: 'left' | 'center' | 'right') =>
      value === 'left' ? 20 : value === 'right' ? 80 : 50;

    return {
      primary_goals: parsed.success ?? [],
      tradeoff: parsed.tradeoff ?? null,
      collection_role: parsed.collectionRole ?? null,
      tension_sliders: {
        trend_forward: mapTension(parsed.tensions?.trendForward_vs_timeless),
        creative_expression: mapTension(parsed.tensions?.creative_vs_commercial),
        elevated_design: mapTension(parsed.tensions?.elevated_vs_accessible),
        novelty: mapTension(parsed.tensions?.novelty_vs_continuity),
      },
    };
  } catch {
    return null;
  }
}

async function fetchBrandProfile(userId: string): Promise<CollectionReportBrandInput | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('brand_profiles')
    .select('brand_name, keywords, customer_profile, price_tier, tension_context, reference_brands')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as BrandProfileRow;
  return {
    brand_name: row.brand_name,
    keywords: row.keywords,
    customer_profile: row.customer_profile,
    price_tier: row.price_tier,
    tension_context: row.tension_context,
    reference_brands: row.reference_brands,
  };
}

async function fetchCollectionSnapshot(
  userId: string,
  collectionName: string
): Promise<CollectionSnapshotRow | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('collection_snapshots')
    .select('id, user_id, collection_name, report_snapshot, report_saved_at, piece_count')
    .eq('user_id', userId)
    .eq('collection_name', collectionName)
    .maybeSingle();

  if (error || !data) return null;
  return data as CollectionSnapshotRow;
}

function toCollectionReportInput({
  collectionName,
  season,
  pieces,
  brand,
  intent,
}: {
  collectionName: string;
  season: string;
  pieces: AnalysisRow[];
  brand?: CollectionReportBrandInput | null;
  intent?: CollectionReportIntentInput | null;
}): CollectionReportInput {
  return {
    collection_name: collectionName,
    season,
    version_label: 'Latest Snapshot',
    snapshot_id: pieces[0]?.created_at ?? null,
    collection_aesthetic: pieces[0]?.collection_aesthetic ?? null,
    aesthetic_inflection: pieces[0]?.aesthetic_inflection ?? null,
    generated_at: new Date().toISOString(),
    brand: brand ?? null,
    intent: intent ?? null,
    pieces: pieces.map((row) => ({
      id: row.id,
      piece_name: getPieceName(row),
      category: row.category,
      role: inferReportRole(row),
      complexity: inferReportComplexity(row.construction_tier),
      direction_tag: row.aesthetic_input,
      material: row.material_id ? materialNameById.get(row.material_id) ?? row.material_id : null,
      silhouette: row.silhouette,
      score: row.score,
      status: inferReportStatus(row.score),
      dimensions: row.dimensions,
      margin_passed: row.gates_passed?.cost ?? null,
      construction: row.construction_tier,
    })),
  };
}

function getPieceRole(analysis: AnalysisRow): PieceRole {
  const assignedRole = getAssignedRole(analysis);
  if (assignedRole === 'hero') return 'hero';
  if (assignedRole === 'volume-driver' || assignedRole === 'core-evolution' || assignedRole === 'core') return 'core';
  if (assignedRole === 'directional' || assignedRole === 'support') return 'support';

  const storedRole = normalizeToken(getAgentString(analysis.agent_versions, 'collection_role'));
  if (storedRole === 'hero' || storedRole === 'core' || storedRole === 'support') {
    return storedRole;
  }

  const score = getScore(analysis);
  if (score >= 80) return 'hero';
  if (score >= 60) return 'core';
  return 'support';
}

function getRoleLabel(role: AssignedRole) {
  if (role === 'hero') return 'Hero';
  if (role === 'volume-driver') return 'Volume Driver';
  if (role === 'core-evolution') return 'Core Evolution';
  if (role === 'directional') return 'Directional Signal';
  return role === 'core' ? 'Core' : 'Support';
}

function getComplexityLevel(analysis: AnalysisRow): ComplexityLevel {
  const tier = normalizeToken(analysis.construction_tier);
  if (tier === 'high') return 'high';
  if (tier === 'low') return 'low';
  return 'medium';
}

function getPieceName(analysis: AnalysisRow) {
  return (
    analysis.piece_name?.trim() ||
    getAgentString(analysis.agent_versions, 'saved_piece_name')?.trim() ||
    analysis.category?.trim() ||
    'Untitled Piece'
  );
}

function getRoleBadgeStyles(role: AssignedRole): React.CSSProperties {
  if (role === 'hero') return { background: '#eef2e6', color: '#5a6e2a' };
  if (role === 'volume-driver') return { background: '#e8eef2', color: '#2e4a5a' };
  if (role === 'core-evolution') return { background: '#f4ecdf', color: '#7a5d2a' };
  if (role === 'directional') return { background: '#f2e9ee', color: '#7a4a5d' };
  if (role === 'core') return { background: '#e8eef2', color: '#2e4a5a' };
  return { background: '#f0eeee', color: '#5a4a4a' };
}

function getMetricScoreColor(score: number) {
  if (score >= 80) return '#A8B475';
  if (score >= 60) return '#B8876B';
  return '#C47B6B';
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

function PieceCard({
  analysis,
  execution_notes,
  onClick,
  onDelete,
}: {
  analysis: AnalysisRow;
  execution_notes?: string | null;
  onClick: () => void;
  onDelete: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const pieceName = getPieceName(analysis);
  const score = getScore(analysis);
  const storedPieceImage = parseSelectedPieceImage(
    getAgentString(analysis.agent_versions, 'selected_piece_image')
  );
  const resolvedPieceType =
    resolvePieceImageType({
      pieceName,
      category: analysis.category,
      silhouette: analysis.silhouette,
    }) ??
    resolvePieceImageType({
      type: storedPieceImage?.pieceType,
      pieceName,
      category: analysis.category,
      silhouette: analysis.silhouette,
    });
  const flat = resolvedPieceType ? getFlatForPiece(resolvedPieceType, storedPieceImage?.signal ?? null) : null;
  const materialLabel = titleCase(analysis.material_id) || 'Unknown material';
  const complexityLabel = titleCase(analysis.construction_tier) || 'Unknown';
  const role = getAssignedRole(analysis) ?? getPieceRole(analysis);
  const roleLabel = getRoleLabel(role);
  const scoreColor = score >= 80 ? '#A8B475' : '#B8876B';
  const executionNoteCount = execution_notes
    ?.split('\n')
    .map((note) => note.trim())
    .filter(Boolean).length ?? 0;

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

          {executionNoteCount > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 7 }}>
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: '#A8B475',
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: 10,
                  color: 'rgba(67,67,43,0.36)',
                  fontFamily: inter,
                }}
              >
                {executionNoteCount} execution notes
              </span>
            </div>
          ) : null}
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
  const storeCollectionName = useSessionStore((state) => state.collectionName);
  const collectionAesthetic = useSessionStore((state) => state.collectionAesthetic);
  const aestheticInflection = useSessionStore((state) => state.aestheticInflection);
  const directionInterpretationText = useSessionStore((state) => state.directionInterpretationText);
  const directionInterpretationChips = useSessionStore((state) => state.directionInterpretationChips);
  const [analyses, setAnalyses] = useState<AnalysisRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isReadHovering, setIsReadHovering] = useState(false);
  const [isReadPinnedOpen, setIsReadPinnedOpen] = useState(false);
  const [isReadPinnedClosed, setIsReadPinnedClosed] = useState(false);
  const [collectionReadReport, setCollectionReadReport] = useState<CollectionReportPayload | null>(null);
  const [isRefreshingCollectionRead, setIsRefreshingCollectionRead] = useState(false);
  const [activeTab, setActiveTab] = useState<'pieces' | 'report'>('pieces');
  const [snapshot, setSnapshot] = useState<CollectionSnapshotRow | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);

      const supabase = createClient();
      const [primary, snapshotRow] = await Promise.all([
        supabase
          .from('analyses')
          .select('*')
          .eq('user_id', userId)
          .eq('collection_name', collectionName)
          .order('created_at', { ascending: false }),
        fetchCollectionSnapshot(userId, collectionName),
      ]);

      if (cancelled) return;

      if (primary.error) {
        setAnalyses([]);
        setSnapshot(snapshotRow);
        setLoading(false);
        return;
      }

      setAnalyses(
        ((primary.data as AnalysisRow[] | null) ?? []).map((row) => ({
          ...row,
          piece_name: row.piece_name ?? getAgentString(row.agent_versions, 'saved_piece_name') ?? null,
        }))
      );
      setSnapshot(snapshotRow);
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
  const assortmentIntelligence = useMemo(() => {
    const roleCounts: Record<PieceRole, number> = { hero: 0, core: 0, support: 0 };
    const complexityCounts: Record<ComplexityLevel, number> = { low: 0, medium: 0, high: 0 };
    const categories = new Set<string>();

    for (const analysis of scoredAnalyses) {
      roleCounts[getPieceRole(analysis)] += 1;
      complexityCounts[getComplexityLevel(analysis)] += 1;
      const category = normalizeToken(analysis.category);
      if (category) categories.add(category);
    }

    return buildAssortmentIntelligence({
      totalPieces: scoredAnalyses.length,
      heroCount: roleCounts.hero,
      coreCount: roleCounts.core,
      supportCount: roleCounts.support,
      lowCount: complexityCounts.low,
      mediumCount: complexityCounts.medium,
      highCount: complexityCounts.high,
      uniqueCategoryCount: categories.size,
      executionScore: avgExecution,
      collectionScore,
    });
  }, [avgExecution, collectionScore, scoredAnalyses]);
  const collectionReportInput = useMemo<CollectionReportInput | null>(() => {
    if (analyses.length === 0) return null;

    return toCollectionReportInput({
      collectionName,
      season: seasonLabel || 'Current Season',
      pieces: analyses,
    });
  }, [analyses, collectionName, seasonLabel]);
  const displayedCollectionRead = collectionReadReport?.assortment_intelligence ?? assortmentIntelligence;
  const isReadExpanded = reportExists
    ? isReadPinnedOpen || (isReadHovering && !isReadPinnedClosed)
    : true;

  useEffect(() => {
    if (!collectionReportInput) {
      setCollectionReadReport(null);
      return;
    }

    setCollectionReadReport(buildCollectionReport(collectionReportInput).collection_report);
  }, [collectionReportInput]);

  function handleReadToggle() {
    if (!reportExists) return;
    if (isReadPinnedOpen) {
      setIsReadPinnedOpen(false);
      setIsReadPinnedClosed(true);
      return;
    }

    setIsReadPinnedOpen(true);
    setIsReadPinnedClosed(false);
  }

  const storeMatchesCollection = useMemo(
    () => storeCollectionName?.trim().toLowerCase() === collectionName.trim().toLowerCase(),
    [collectionName, storeCollectionName]
  );

  const editorialDirection = useMemo(() => {
    const preferred = [
      analyses[0]?.collection_aesthetic,
      analyses[0]?.aesthetic_inflection,
      analyses[0]?.aesthetic_input,
      storeMatchesCollection ? collectionAesthetic : null,
      storeMatchesCollection ? aestheticInflection : null,
      storeMatchesCollection ? directionInterpretationText : null,
    ].find((value) => value?.trim());

    return preferred?.trim() ?? null;
  }, [
    aestheticInflection,
    analyses,
    collectionAesthetic,
    directionInterpretationText,
    storeMatchesCollection,
  ]);

  const editorialChips = useMemo(() => {
    if (storeMatchesCollection && directionInterpretationChips.length > 0) {
      return directionInterpretationChips.slice(0, 4);
    }
    return [];
  }, [directionInterpretationChips, storeMatchesCollection]);

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

  const handleOpenReport = () => {
    const params = new URLSearchParams({ collection: collectionName });
    if (seasonLabel) {
      params.set('season', seasonLabel);
    }
    router.push(`/report?${params.toString()}`);
  };

  const handleRerunCollectionAnalysis = async () => {
    if (!collectionReportInput || isRefreshingCollectionRead) return;

    setIsRefreshingCollectionRead(true);

    const fallbackReport = buildCollectionReport(collectionReportInput).collection_report;
    setCollectionReadReport(fallbackReport);

    try {
      const [brand, intent] = await Promise.all([
        fetchBrandProfile(userId),
        Promise.resolve(typeof window !== 'undefined' ? readIntentFromStorage() : null),
      ]);

      const response = await fetch('/api/synthesizer/collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'collection_report',
          payload: {
            ...collectionReportInput,
            brand,
            intent,
            generated_at: new Date().toISOString(),
          },
        }),
      });
      console.log('collection synth raw response', await response.clone().text());

      if (!response.ok) {
        throw new Error('Collection read request failed');
      }

      const contentType = response.headers.get('content-type') ?? '';

      if (contentType.includes('text/event-stream') && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let nextReport: CollectionReportPayload | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const raw = line.slice(6).trim();
            if (!raw) continue;

            try {
              const event = JSON.parse(raw) as {
                type: 'fallback' | 'delta' | 'done';
                payload?: CollectionReportPayload;
              };

              if (event.type === 'fallback' && event.payload) {
                setCollectionReadReport(event.payload);
              }

              if (event.type === 'done' && event.payload) {
                nextReport = event.payload;
              }
            } catch {
              // Ignore malformed stream events and keep the last valid payload.
            }
          }
        }

        if (nextReport) {
          setCollectionReadReport(nextReport);
        }
      } else {
        const json = (await response.json()) as { collection_report: CollectionReportPayload };
        setCollectionReadReport(json.collection_report);
      }
    } catch {
      setCollectionReadReport(fallbackReport);
    } finally {
      setIsRefreshingCollectionRead(false);
    }
  };

  const handleOpenExistingPiece = (analysis: AnalysisRow) => {
    hydrateSpecSessionFromAnalysis(collectionName, analysis as PersistedSpecAnalysisRow);
    router.push(`/spec?analysis=${encodeURIComponent(analysis.id)}`);
  };

  const snapshotSavedAt = snapshot?.report_saved_at ?? null;
  const isSnapshotOutdated = useMemo(() => {
    if (!snapshotSavedAt) return false;
    const snapshotTime = new Date(snapshotSavedAt).getTime();
    if (Number.isNaN(snapshotTime)) return false;

    return analyses.some((analysis) => {
      const updatedTime = new Date(analysis.updated_at ?? analysis.created_at).getTime();
      return !Number.isNaN(updatedTime) && updatedTime > snapshotTime;
    });
  }, [analyses, snapshotSavedAt]);

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
            padding: 0,
            flexShrink: 0,
            background: '#F9F7F4',
          }}
        >
          <div
            style={{
              width: '100%',
              minWidth: 0,
              padding: '20px 32px 18px',
              background:
                'linear-gradient(180deg, rgba(252,251,247,0.82) 0%, rgba(250,249,246,0.72) 58%, rgba(246,243,236,0.62) 100%)',
              backdropFilter: 'blur(18px) saturate(140%)',
              WebkitBackdropFilter: 'blur(18px) saturate(140%)',
              borderTop: '1px solid rgba(255,255,255,0.52)',
              borderBottom: '1px solid rgba(255,255,255,0.36)',
              boxShadow: '0 18px 48px rgba(67,67,43,0.06), inset 0 1px 0 rgba(255,255,255,0.34)',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 24,
                }}
              >
                <div style={{ minWidth: 0, flex: '1 1 620px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: 10,
                      flexWrap: 'wrap',
                      marginBottom: 8,
                    }}
                  >
                    <h1
                      style={{
                        margin: 0,
                        fontFamily: sohne,
                        fontSize: 24,
                        fontWeight: 600,
                        letterSpacing: '-0.02em',
                        color: '#191919',
                        lineHeight: 1.04,
                        textTransform: 'lowercase',
                      }}
                    >
                      {collectionName}
                    </h1>
                    {seasonLabel ? (
                      <span
                        style={{
                          fontFamily: inter,
                          fontSize: 10,
                          fontWeight: 600,
                          letterSpacing: '0.14em',
                          textTransform: 'uppercase',
                          color: '#888078',
                        }}
                      >
                        {seasonLabel}
                      </span>
                    ) : null}
                  </div>

                  {editorialDirection ? (
                    <div
                      style={{
                        fontFamily: inter,
                        fontSize: 9.5,
                        fontWeight: 700,
                        letterSpacing: '0.15em',
                        textTransform: 'uppercase',
                        color: '#5F5953',
                        marginBottom: editorialChips.length > 0 ? 6 : 0,
                      }}
                    >
                      {editorialDirection}
                    </div>
                  ) : null}

                  {editorialChips.length > 0 && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
                      <span
                        style={{
                          fontFamily: inter,
                          fontSize: 11,
                          color: '#888078',
                          lineHeight: 1.4,
                        }}
                      >
                        {editorialChips.join(' · ')}
                      </span>
                    </div>
                  )}

                  <div
                    style={{
                      display: 'flex',
                      gap: 8,
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      marginTop: editorialDirection || editorialChips.length > 0 ? 8 : 2,
                    }}
                  >
                    <button
                      onClick={() => router.push('/intent')}
                      style={{
                        fontFamily: inter,
                        fontSize: 10.5,
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

              </div>

            {reportExists ? (
              <div
                style={{
                  marginTop: 14,
                  paddingTop: 12,
                  borderTop: '1px solid rgba(67,67,43,0.08)',
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr)',
                  gap: 4,
                  cursor: 'pointer',
                }}
                onMouseEnter={() => setIsReadHovering(true)}
                onMouseLeave={() => setIsReadHovering(false)}
                onClick={handleReadToggle}
              >
                <div
                  style={{
                    fontFamily: inter,
                    fontSize: 9,
                    fontWeight: 600,
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    color: '#888078',
                    marginBottom: 6,
                  }}
                >
                  Collection Read
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: 14 }}>
                  <div
                    style={{
                      fontFamily: inter,
                      fontSize: isReadExpanded ? 32 : 38,
                      fontWeight: 500,
                      color: '#191919',
                      letterSpacing: '-0.04em',
                      lineHeight: 1,
                    }}
                  >
                    {collectionScore}
                  </div>
                  <div
                    style={{
                      fontFamily: inter,
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: 'rgba(67,67,43,0.38)',
                      marginLeft: 12,
                      alignSelf: 'flex-end',
                      background: 'rgba(67,67,43,0.04)',
                      border: '1px solid rgba(67,67,43,0.08)',
                      borderRadius: 999,
                      padding: '6px 10px',
                      lineHeight: 1,
                    }}
                  >
                    {displayedCollectionRead.collection_state}
                  </div>
                </div>

                {isReadExpanded ? (
                  <>
                    <div
                      style={{
                        fontFamily: sohne,
                        fontSize: 17,
                        fontWeight: 400,
                        color: '#191919',
                        lineHeight: 1.38,
                        letterSpacing: '-0.025em',
                        marginBottom: 14,
                      }}
                    >
                      {displayedCollectionRead.supporting_line}
                    </div>

                    <div
                      style={{
                        fontFamily: inter,
                        fontSize: 12.5,
                        color: 'rgba(67,67,43,0.6)',
                        lineHeight: 1.65,
                        marginBottom: displayedCollectionRead.next_action ? 18 : 16,
                      }}
                    >
                      {displayedCollectionRead.muko_insight}
                    </div>

                    {displayedCollectionRead.next_action ? (
                      <div
                        style={{
                          display: 'inline-flex',
                          gap: 14,
                          alignItems: 'flex-start',
                          padding: '11px 14px',
                          background: 'rgba(67,67,43,0.04)',
                          borderRadius: 6,
                          marginBottom: 18,
                          maxWidth: 'min(100%, 820px)',
                        }}
                      >
                        <div
                          style={{
                            fontFamily: inter,
                            fontSize: 9,
                            fontWeight: 700,
                            letterSpacing: '0.13em',
                            textTransform: 'uppercase',
                            color: 'rgba(67,67,43,0.32)',
                            paddingTop: 2,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Next
                        </div>
                        <div
                          style={{
                            fontFamily: inter,
                            fontSize: 12,
                            color: 'rgba(67,67,43,0.72)',
                            lineHeight: 1.58,
                          }}
                        >
                          {displayedCollectionRead.next_action}
                        </div>
                      </div>
                    ) : null}

                    <div
                      style={{
                        fontFamily: inter,
                        fontSize: 11,
                        lineHeight: 1.4,
                        color: 'rgba(67,67,43,0.38)',
                        display: 'flex',
                        gap: 20,
                        flexWrap: 'wrap',
                      }}
                    >
                      <div>
                        Identity
                        <span style={{ fontWeight: 700, color: getMetricScoreColor(avgIdentity), marginLeft: 4 }}>
                          {avgIdentity || '—'}
                        </span>
                      </div>
                      <div>
                        Resonance
                        <span style={{ fontWeight: 700, color: getMetricScoreColor(avgResonance), marginLeft: 4 }}>
                          {avgResonance || '—'}
                        </span>
                      </div>
                      <div>
                        Execution
                        <span style={{ fontWeight: 700, color: getMetricScoreColor(avgExecution), marginLeft: 4 }}>
                          {avgExecution || '—'}
                        </span>
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: reportExists ? '2px 32px 24px' : '20px 32px 24px' }}>
          {reportExists ? (
            <div
              style={{
                borderTop: '1px solid rgba(67,67,43,0.08)',
                margin: '24px 0 18px',
              }}
            />
          ) : null}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              marginBottom: 18,
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: 4,
                borderRadius: 999,
                border: '1px solid rgba(67,67,43,0.08)',
                background: 'rgba(255,255,255,0.72)',
              }}
            >
              {(['pieces', 'report'] as const).map((tab) => {
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      border: 'none',
                      borderRadius: 999,
                      padding: '10px 16px',
                      background: isActive ? '#43432B' : 'transparent',
                      color: isActive ? '#F8F4EC' : '#6B6459',
                      fontFamily: inter,
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                    }}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 10,
                flexWrap: 'wrap',
                marginLeft: 'auto',
              }}
            >
              {activeTab === 'pieces' ? (
                <>
                  {reportExists ? (
                    <button
                      onClick={handleRerunCollectionAnalysis}
                      disabled={!collectionReportInput || isRefreshingCollectionRead}
                      style={{
                        ...headerActionButtonBase,
                        border: !collectionReportInput || isRefreshingCollectionRead
                          ? '1px solid rgba(67,67,43,0.08)'
                          : '1px solid rgba(67,67,43,0.12)',
                        background: !collectionReportInput || isRefreshingCollectionRead
                          ? 'rgba(244,240,233,0.95)'
                          : 'rgba(248,245,239,0.96)',
                        color: !collectionReportInput || isRefreshingCollectionRead ? '#AAA198' : '#6B6459',
                        cursor: !collectionReportInput || isRefreshingCollectionRead ? 'not-allowed' : 'pointer',
                        boxShadow: !collectionReportInput || isRefreshingCollectionRead
                          ? 'none'
                          : headerActionButtonBase.boxShadow,
                      }}
                    >
                      {isRefreshingCollectionRead ? 'Refreshing...' : 'Re-run Analysis'}
                    </button>
                  ) : null}

                  <button
                    onClick={onNewPiece}
                    style={{
                      ...headerActionButtonBase,
                      border: '1px solid rgba(67,67,43,0.14)',
                      background: 'rgba(255,255,255,0.92)',
                      color: '#575143',
                    }}
                  >
                    Add Piece
                  </button>

                  {reportExists ? (
                    <button onClick={handleGenerateReport} className="collection-read-ready-pill">
                      <span className="collection-read-ready-dot-wrap">
                        <span className="collection-read-ready-dot-ping" />
                        <span className="collection-read-ready-dot-core" />
                      </span>
                      Collection read ready
                      <span className="collection-read-ready-arrow">→</span>
                    </button>
                  ) : (
                    <button
                      disabled
                      style={{
                        ...headerActionButtonBase,
                        border: '1px solid rgba(67,67,43,0.08)',
                        background: '#E2DDD6',
                        color: '#888078',
                        cursor: 'not-allowed',
                        boxShadow: 'none',
                      }}
                    >
                      Collection read ready →
                    </button>
                  )}
                </>
              ) : (
                <>
                  {snapshot && isSnapshotOutdated ? (
                    <span
                      style={{
                        fontFamily: inter,
                        fontSize: 12,
                        color: 'rgba(67,67,43,0.56)',
                      }}
                    >
                      Collection updated since last save
                    </span>
                  ) : null}

                  <button
                    onClick={handleOpenReport}
                    style={{
                      ...headerActionButtonBase,
                      border: '1px solid rgba(67,67,43,0.12)',
                      background: '#43432B',
                      color: '#F8F4EC',
                    }}
                  >
                    Refresh Report
                  </button>

                  <button
                    disabled
                    style={{
                      ...headerActionButtonBase,
                      border: '1px solid rgba(67,67,43,0.08)',
                      background: '#E2DDD6',
                      color: '#888078',
                      cursor: 'not-allowed',
                      boxShadow: 'none',
                    }}
                  >
                    Save to Collection
                  </button>
                </>
              )}
            </div>
          </div>

          {activeTab === 'pieces' ? (
            <>
              <div
                style={{
                  fontFamily: inter,
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: '#888078',
                  marginBottom: 16,
                }}
              >
                Pieces{analyses.length > 0 ? ` · ${analyses.length} total` : ''}
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
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
                      execution_notes={analysis.execution_notes ?? null}
                      onClick={() => handleOpenExistingPiece(analysis)}
                      onDelete={() => handleDeletePiece(analysis.id)}
                    />
                  ))
                )}
              </div>
            </>
          ) : loading ? (
            <div style={{ paddingBottom: 100 }}>
              <LoadingCards />
            </div>
          ) : snapshot ? (
            <div style={{ display: 'grid', gap: 18, paddingBottom: 100 }}>
              <section
                style={{
                  ...sectionCard,
                  padding: '18px 22px',
                  background: 'rgba(255,255,255,0.76)',
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontFamily: inter,
                    fontSize: 12,
                    color: reportPalette.muted,
                    lineHeight: 1.6,
                  }}
                >
                  {collectionName} · Saved snapshot · Generated {formatMonthYear(snapshot.report_saved_at)} ·{' '}
                  {snapshot.piece_count ?? snapshot.report_snapshot.header?.piece_count ?? 0} pieces reviewed
                </p>
              </section>

              <OverallReadCallout
                value={snapshot.report_snapshot.overall_read}
                detail={snapshot.report_snapshot.overall_read_detail}
              />

              <CollectionThesis thesis={snapshot.report_snapshot.collection_thesis} tightened />

              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <button onClick={handleOpenReport} className="collection-read-ready-pill">
                  View full report
                  <span className="collection-read-ready-arrow">→</span>
                </button>
              </div>
            </div>
          ) : (
            <div style={{ paddingBottom: 100 }}>
              <section style={{ ...sectionCard, padding: '30px' }}>
                <p style={sectionEyebrow}>Report</p>
                <h2
                  style={{
                    margin: '12px 0 0',
                    fontFamily: sohne,
                    fontSize: 30,
                    letterSpacing: '-0.04em',
                    color: '#191919',
                  }}
                >
                  No report saved yet
                </h2>
                <p
                  style={{
                    margin: '14px 0 0',
                    fontFamily: inter,
                    fontSize: 15,
                    lineHeight: 1.7,
                    color: '#6B6459',
                    maxWidth: 720,
                  }}
                >
                  Generate a report to capture a snapshot of this collection.
                </p>
                <div style={{ marginTop: 20 }}>
                  <button onClick={handleOpenReport} className="collection-read-ready-pill">
                    Generate Report
                    <span className="collection-read-ready-arrow">→</span>
                  </button>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>

      {toastMessage ? <Toast message={toastMessage} /> : null}

      <style>{`
        .collection-read-ready-pill {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          padding: 11px 20px;
          border-radius: 9999px;
          font-family: "Söhne Breit", sans-serif;
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.01em;
          cursor: pointer;
          white-space: nowrap;
          border: 0.5px solid rgba(168, 180, 117, 0.35);
          background: #43432B;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          color: #e8e4db;
          box-shadow: 0 12px 32px rgba(49, 31, 30, 0.18), inset 0 1px 0 rgba(245, 243, 238, 0.14);
          transition: background 160ms ease, border-color 160ms ease;
        }

        .collection-read-ready-pill:hover {
          background: rgba(67, 67, 43, 0.92);
          border-color: rgba(168, 180, 117, 0.55);
        }

        .collection-read-ready-dot-wrap {
          position: relative;
          width: 8px;
          height: 8px;
          flex-shrink: 0;
        }

        .collection-read-ready-dot-core {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: #A8B475;
        }

        .collection-read-ready-dot-ping {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: #A8B475;
          animation: collectionReadReadyPing 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
        }

        .collection-read-ready-arrow {
          color: #A8B475;
          display: inline-block;
          animation: collectionReadReadyArrowBounce 1.8s ease-in-out infinite;
        }

        @keyframes camelPulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(184,135,107,0.55); }
          50%       { opacity: 0.75; box-shadow: 0 0 0 5px rgba(184,135,107,0); }
        }

        @keyframes collectionReadReadyPing {
          0% { transform: scale(1); opacity: 1; }
          75%, 100% { transform: scale(2.4); opacity: 0; }
        }

        @keyframes collectionReadReadyArrowBounce {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(4px); }
        }
      `}</style>
    </>
  );
}
