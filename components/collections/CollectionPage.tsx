'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import materialsData from '@/data/materials.json';
import { createClient } from '@/lib/supabase/client';
import { getFlatForPiece } from '@/components/flats';
import { buildCollectionReport } from '@/lib/collection-report/buildCollectionReport';
import { trackEvent } from '@/lib/analytics';
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
import { resolveSelectedPieceImage } from '@/lib/piece-image';
import { buildAssortmentIntelligence } from '@/lib/collection-report/buildAssortmentIntelligence';
import { hydrateSpecSessionFromAnalysis, type PersistedSpecAnalysisRow } from '@/lib/collections/hydrateSpecSessionFromAnalysis';
import { sectionCard, sectionEyebrow } from '@/components/report/reportStyles';
import { BRAND } from '@/lib/concept-studio/constants';
import { IconIdentity, IconResonance } from '../concept-studio/Icons';

const inter = 'var(--font-inter), system-ui, sans-serif';
const sohne = 'var(--font-sohne-breit), system-ui, sans-serif';
const MIN_REPORT_PIECES = 5;
const STEEL_BLUE = '#7D96AC';

function HoverHint({
  copy,
  children,
}: {
  copy: string;
  children: React.ReactNode;
}) {
  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const panelId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<{
    bottom: number;
    left?: number;
    right?: number;
    width: number;
  } | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const viewportWidth = window.innerWidth;
      const maxWidth = Math.min(320, viewportWidth - 32);
      const preferredLeft = rect.left;
      const overflowRight = preferredLeft + maxWidth > viewportWidth - 16;

      setPanelStyle({
        bottom: Math.max(window.innerHeight - rect.top + 10, 16),
        width: maxWidth,
        ...(overflowRight
          ? { right: Math.max(16, viewportWidth - rect.right), left: undefined }
          : { left: Math.max(16, preferredLeft), right: undefined }),
      });
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen]);

  return (
    <span
      ref={triggerRef}
      aria-describedby={isOpen ? panelId : undefined}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      onFocus={() => setIsOpen(true)}
      onBlur={() => setIsOpen(false)}
      style={{ position: 'relative', display: 'inline-flex' }}
    >
      {children}
      {isOpen && panelStyle ? (
        <span
          id={panelId}
          role="note"
          style={{
            position: 'fixed',
            bottom: panelStyle.bottom,
            left: panelStyle.left,
            right: panelStyle.right,
            zIndex: 9999,
            width: panelStyle.width,
            maxWidth: 'calc(100vw - 32px)',
            padding: '12px 14px',
            borderRadius: 14,
            border: '1px solid rgba(67,67,43,0.08)',
            background: '#FFFFFF',
            color: '#43432B',
            fontFamily: inter,
            fontSize: 11.5,
            lineHeight: 1.55,
            boxShadow: '0 12px 28px rgba(67,67,43,0.08)',
            whiteSpace: 'normal',
            pointerEvents: 'none',
          }}
        >
          {copy}
        </span>
      ) : null}
    </span>
  );
}

function CollectionExecutionIcon({ size = 13, color = BRAND.oliveInk }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68 1.65 1.65 0 0 0 10 3.17V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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

const collectionAddPieceButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  minHeight: 38,
  padding: '0 16px',
  borderRadius: 999,
  border: `1px solid ${STEEL_BLUE}`,
  background: 'transparent',
  boxShadow: 'none',
  fontFamily: sohne,
  fontSize: 10.5,
  fontWeight: 600,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: STEEL_BLUE,
  cursor: 'pointer',
  flexShrink: 0,
  transition: 'transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease, background 140ms ease',
  whiteSpace: 'nowrap',
};

const headerTextLinkBase: React.CSSProperties = {
  fontFamily: inter,
  fontSize: 12,
  fontWeight: 500,
  color: 'rgba(67,67,43,0.45)',
  background: 'transparent',
  border: 'none',
  padding: 0,
  lineHeight: 1.2,
  flexShrink: 0,
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

function formatSavedDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
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
            background: '#FAF9F6',
            border: '1px solid #E8E3D6',
            borderRadius: 12,
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
  onRename,
}: {
  analysis: AnalysisRow;
  execution_notes?: string | null;
  onClick: () => void;
  onDelete: () => void;
  onRename: (nextName: string) => Promise<void>;
}) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const pieceName = getPieceName(analysis);
  const score = getScore(analysis);
  const selectedPieceImage = resolveSelectedPieceImage({
    storedImageRaw: getAgentString(analysis.agent_versions, 'selected_piece_image'),
    pieceName,
    category: analysis.category,
    silhouette: analysis.silhouette,
  });
  const flat = selectedPieceImage?.pieceType
    ? getFlatForPiece(selectedPieceImage.pieceType, selectedPieceImage.signal)
    : null;
  const materialLabel = titleCase(analysis.material_id) || 'Unknown material';
  const complexityLabel = titleCase(analysis.construction_tier) || 'Unknown';
  const role = getAssignedRole(analysis) ?? getPieceRole(analysis);
  const roleLabel = getRoleLabel(role);
  const scoreColor = score >= 80 ? '#A8B475' : '#B8876B';
  const scoreDotBg = score >= 80 ? '#EDF5EE' : '#FBF3EA';
  const executionNoteCount = execution_notes
    ?.split('\n')
    .map((note) => note.trim())
    .filter(Boolean).length ?? 0;
  const isExpanded = hovered || focused;

  const beginRename = () => {
    setDraftName(pieceName);
    setIsEditingName(true);
    setMenuOpen(false);
    setIsConfirmingDelete(false);
  };

  const cancelRename = () => {
    setDraftName(pieceName);
    setIsEditingName(false);
    setIsSavingName(false);
  };

  const beginDeleteConfirm = () => {
    setIsConfirmingDelete(true);
  };

  const cancelDeleteConfirm = () => {
    setIsConfirmingDelete(false);
  };

  const confirmRename = async () => {
    const nextName = draftName.trim();
    if (!nextName || nextName === pieceName || isSavingName) {
      if (!nextName) {
        setDraftName(pieceName);
      }
      setIsEditingName(false);
      return;
    }

    setIsSavingName(true);
    try {
      await onRename(nextName);
      setIsEditingName(false);
    } finally {
      setIsSavingName(false);
    }
  };

  return (
    <div
      style={{ position: 'relative' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setMenuOpen(false);
        setIsConfirmingDelete(false);
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      <div
        onClick={() => {
          if (isEditingName) return;
          onClick();
        }}
        onKeyDown={(e) => {
          if (isEditingName) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }}
        role="button"
        tabIndex={0}
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          background: '#FFFFFF',
          border: hovered ? '1px solid #C4BDB5' : '1px solid #E8E3D6',
          borderRadius: 14,
          overflow: 'hidden',
          cursor: 'pointer',
          boxShadow: hovered ? '0 6px 20px rgba(0,0,0,0.07)' : 'none',
          transform: hovered ? 'translateY(-1px)' : 'none',
          padding: 0,
          textAlign: 'left',
          fontFamily: inter,
          transition: 'border-color 150ms ease, box-shadow 150ms ease, transform 150ms ease',
        }}
      >
        {/* Visual zone */}
        <div
          style={{
            width: '100%',
            height: 120,
            background: '#FAF9F6',
            borderBottom: '1px solid #E8E3D6',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
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
              top: 12,
              left: 12,
              width: 26,
              height: 26,
              borderRadius: '50%',
              background: scoreDotBg,
              color: scoreColor,
              fontSize: 10,
              fontWeight: 700,
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: inter,
            }}
          >
            {score}
          </span>
        </div>

        {/* Body zone */}
        <div
          style={{
            padding: '14px 18px 16px',
            background: '#FFFFFF',
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
            {isEditingName ? (
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  flex: 1,
                  minWidth: 0,
                  padding: '4px 6px',
                  borderRadius: 8,
                  background: '#F7F3EE',
                  border: '1px solid rgba(196,123,107,0.22)',
                  boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.45)',
                }}
              >
                <input
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void confirmRename();
                    }
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      cancelRename();
                    }
                  }}
                  autoFocus
                  aria-label="Rename piece"
                  disabled={isSavingName}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    fontSize: 13,
                    fontWeight: 500,
                    color: '#191919',
                    lineHeight: 1.4,
                    fontFamily: inter,
                  }}
                />

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void confirmRename();
                  }}
                  disabled={isSavingName}
                  aria-label="Confirm piece rename"
                  title="Confirm rename"
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 999,
                    border: 'none',
                    background: isSavingName ? 'rgba(168,180,117,0.55)' : '#A8B475',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: isSavingName ? 'default' : 'pointer',
                    flexShrink: 0,
                    fontSize: 12,
                    fontWeight: 700,
                    lineHeight: 1,
                    padding: 0,
                  }}
                >
                  ✓
                </button>
              </div>
            ) : (
              <div
                style={{
                  fontFamily: sohne,
                  fontSize: 15,
                  fontWeight: 500,
                  color: pieceName ? '#191919' : '#A8A09A',
                  fontStyle: pieceName ? 'normal' : 'italic',
                  lineHeight: 1.24,
                  letterSpacing: '-0.02em',
                }}
              >
                {pieceName || 'Unnamed Piece'}
              </div>
            )}

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

          <div
            style={{
              display: 'grid',
              gridTemplateRows: isExpanded ? '1fr' : '0fr',
              opacity: isExpanded ? 1 : 0,
              marginTop: isExpanded ? 10 : 0,
              transition: 'grid-template-rows 160ms ease, opacity 140ms ease, margin-top 160ms ease',
            }}
          >
            <div style={{ overflow: 'hidden' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {[materialLabel, complexityLabel].map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontFamily: inter,
                      fontSize: 10,
                      fontWeight: 400,
                      border: '0.5px solid #E8E3D6',
                      color: '#8B837B',
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 10 }}>
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
          </div>
        </div>
      </div>

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
            borderRadius: 999,
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
            borderRadius: 12,
            boxShadow: '0 6px 20px rgba(25,25,25,0.1)',
            zIndex: 20,
            overflow: 'hidden',
            minWidth: 140,
          }}
        >
          {isConfirmingDelete ? (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                padding: '10px 12px 12px',
                display: 'grid',
                gap: 10,
                minWidth: 188,
              }}
            >
              <div
                style={{
                  fontFamily: inter,
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#6F4A43',
                  lineHeight: 1.4,
                }}
              >
                Delete this piece?
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    cancelDeleteConfirm();
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    borderRadius: 999,
                    border: '1px solid rgba(67,67,43,0.12)',
                    background: '#FFFFFF',
                    color: '#5F5953',
                    fontFamily: inter,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                    setMenuOpen(false);
                    setIsConfirmingDelete(false);
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    borderRadius: 999,
                    border: 'none',
                    background: '#C47B6B',
                    color: '#FFFFFF',
                    fontFamily: inter,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  beginRename();
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '10px 14px',
                  textAlign: 'left',
                  fontFamily: inter,
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#43432B',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background 120ms ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#F7F3EE';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                Rename piece
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  beginDeleteConfirm();
                }}
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
            </>
          )}
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
  const conceptSilhouette = useSessionStore((state) => state.conceptSilhouette);
  const directionInterpretationText = useSessionStore((state) => state.directionInterpretationText);
  const directionInterpretationChips = useSessionStore((state) => state.directionInterpretationChips);
  const collectionContextSnapshots = useSessionStore((state) => state.collectionContextSnapshots);
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
    const { error } = await supabase.from('analyses').delete().eq('id', id);
    if (error) {
      setToastMessage('Unable to delete piece');
      return;
    }
    setAnalyses((prev) => prev.filter((a) => a.id !== id));
    onPieceDeleted?.();
    setToastMessage('Piece removed from collection');
  };

  const handleRenamePiece = async (id: string, nextName: string) => {
    const cleanedName = nextName.trim();
    if (!cleanedName) return;

    const supabase = createClient();
    const { error } = await supabase
      .from('analyses')
      .update({
        piece_name: cleanedName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      setToastMessage('Unable to rename piece');
      throw error;
    }

    setAnalyses((prev) =>
      prev.map((analysis) =>
        analysis.id === id
          ? {
              ...analysis,
              piece_name: cleanedName,
              updated_at: new Date().toISOString(),
            }
          : analysis
      )
    );
    setToastMessage('Piece renamed');
  };

  const seasonLabel = season ?? analyses[0]?.season ?? '';
  const pieceCount = analyses.length;
  const canGenerateReport = pieceCount >= MIN_REPORT_PIECES;
  const piecesNeededForReport = Math.max(0, MIN_REPORT_PIECES - pieceCount);
  const reportLockedHoverCopy = `Report is enabled after ${MIN_REPORT_PIECES} pieces are added`;

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

  const currentCollectionSnapshot = useMemo(() => {
    const normalizedCollectionName = collectionName.trim().toLowerCase();
    return normalizedCollectionName ? collectionContextSnapshots[normalizedCollectionName] ?? null : null;
  }, [collectionContextSnapshots, collectionName]);

  const conceptSetupComplete = useMemo(() => {
    const candidates: unknown[] = [
      currentCollectionSnapshot?.agent_versions?.concept_setup_complete,
      ...analyses.map((analysis) => analysis.agent_versions?.concept_setup_complete),
    ];

    for (const candidate of candidates) {
      if (typeof candidate === 'boolean') return candidate;
      if (typeof candidate === 'string') {
        const trimmed = candidate.trim().toLowerCase();
        if (trimmed === 'true') return true;
        if (trimmed === 'false') return false;
      }
    }

    return analyses.length > 0;
  }, [analyses, currentCollectionSnapshot]);

  const editorialDirection = useMemo(() => {
    const preferred = [
      currentCollectionSnapshot?.collection_aesthetic,
      currentCollectionSnapshot?.aesthetic_inflection,
      currentCollectionSnapshot?.aesthetic_matched_id,
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
    currentCollectionSnapshot,
    directionInterpretationText,
    storeMatchesCollection,
  ]);

  const conceptCompleteForCollection = useMemo(() => {
    if (!conceptSetupComplete) {
      return false;
    }

    if (
      storeMatchesCollection &&
      conceptSilhouette.trim() &&
      (collectionAesthetic?.trim() || aestheticInflection?.trim() || directionInterpretationText?.trim())
    ) {
      return true;
    }

    return analyses.some((analysis) => {
      const hasDirection = Boolean(
        analysis.collection_aesthetic?.trim() ||
        analysis.aesthetic_inflection?.trim() ||
        analysis.aesthetic_matched_id?.trim()
      );

      return hasDirection && Boolean(analysis.silhouette?.trim());
    });
  }, [
    aestheticInflection,
    analyses,
    collectionAesthetic,
    conceptSilhouette,
    conceptSetupComplete,
    directionInterpretationText,
    storeMatchesCollection,
  ]);

  const editorialChips = useMemo(() => {
    if (storeMatchesCollection && directionInterpretationChips.length > 0) {
      return directionInterpretationChips.slice(0, 4);
    }
    return [];
  }, [directionInterpretationChips, storeMatchesCollection]);

  const showConceptInProgressBanner = useMemo(
    () => !conceptSetupComplete && Boolean(editorialDirection),
    [conceptSetupComplete, editorialDirection]
  );

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
    if (!canGenerateReport) return;

    if (snapshot?.id) {
      trackEvent(userId, 'report_opened', {
        collection_id: snapshot.id,
        source: 'hub',
      });
    }

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
          background: '#FAF9F6',
        }}
      >
        {/* ── Collection header ──────────────────────────────────────────── */}
        <div
          style={{
            padding: 0,
            flexShrink: 0,
            background: '#FAF9F6',
            width: '100%',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: '100%',
              minWidth: 0,
              padding: '24px 28px 16px',
              overflow: 'hidden',
              boxSizing: 'border-box',
              background:
                'linear-gradient(180deg, rgba(252,251,247,0.82) 0%, rgba(250,249,246,0.72) 58%, rgba(246,243,236,0.62) 100%)',
              backdropFilter: 'blur(18px) saturate(140%)',
              WebkitBackdropFilter: 'blur(18px) saturate(140%)',
              borderTop: '1px solid rgba(255,255,255,0.52)',
              borderBottom: '1px solid rgba(255,255,255,0.36)',
              boxShadow: '0 18px 48px rgba(67,67,43,0.06), inset 0 1px 0 rgba(255,255,255,0.34)',
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 24,
                flex: '1 1 auto',
                minWidth: 0,
              }}
            >
              <div style={{ minWidth: 0, flex: '1 1 auto' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 6,
                    flexWrap: 'wrap',
                  }}
                >
                  <h1
                    style={{
                      margin: 0,
                      fontFamily: sohne,
                      fontSize: 15,
                      fontWeight: 700,
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
                        fontSize: 11,
                        fontWeight: 400,
                        color: '#888078',
                      }}
                    >
                      · {seasonLabel}
                    </span>
                  ) : null}
                  {reportExists ? (
                    <>
                      <span
                        style={{
                          display: 'inline-block',
                          width: 1,
                          height: 14,
                          background: 'rgba(67,67,43,0.12)',
                          margin: '0 10px',
                          verticalAlign: 'middle',
                        }}
                      />
                      <span
                        style={{
                          fontFamily: inter,
                          fontSize: 20,
                          fontWeight: 700,
                          color: '#191919',
                          letterSpacing: '-0.03em',
                        }}
                      >
                        {collectionScore}
                      </span>
                      <span
                        style={{
                          fontFamily: inter,
                          fontSize: 9,
                          fontWeight: 700,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          color: 'rgba(67,67,43,0.38)',
                          marginLeft: 6,
                        }}
                      >
                        {displayedCollectionRead.collection_state}
                      </span>
                    </>
                  ) : null}
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                flexShrink: 0,
              }}
            >
              {reportExists ? (
                <button
                  onClick={handleRerunCollectionAnalysis}
                  disabled={!collectionReportInput || isRefreshingCollectionRead}
                  style={{
                    ...headerTextLinkBase,
                    cursor: !collectionReportInput || isRefreshingCollectionRead ? 'not-allowed' : 'pointer',
                    opacity: !collectionReportInput || isRefreshingCollectionRead ? 0.6 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!collectionReportInput || isRefreshingCollectionRead) return;
                    e.currentTarget.style.color = '#191919';
                  }}
                  onMouseLeave={(e) => {
                    if (!collectionReportInput || isRefreshingCollectionRead) return;
                    e.currentTarget.style.color = '#888078';
                  }}
                >
                  {isRefreshingCollectionRead ? 'Refreshing...' : '↻ Re-run'}
                </button>
              ) : null}

              <button
                onClick={() => router.push('/intent')}
                style={{
                  ...headerTextLinkBase,
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#191919'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#888078'; }}
              >
                Edit Setup →
              </button>
            </div>
          </div>

          {showConceptInProgressBanner ? (
            <div
              style={{
                marginTop: 16,
                padding: '18px 28px',
                borderTop: '1px solid rgba(67,67,43,0.09)',
                borderBottom: '1px solid rgba(67,67,43,0.09)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 20,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: sohne,
                    fontSize: 14,
                    fontWeight: 500,
                    color: '#191919',
                    marginBottom: 6,
                    lineHeight: 1.28,
                    letterSpacing: '-0.02em',
                  }}
                >
                  Concept in progress — language and product direction not yet set
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontFamily: inter,
                    fontSize: 12,
                    color: 'rgba(67,67,43,0.62)',
                    lineHeight: 1.4,
                  }}
                >
                  <span style={{ color: '#A8B475', fontSize: 18, lineHeight: 1 }}>→</span>
                  Continue in Concept Studio to finish
                </div>
              </div>

              <button
                onClick={() => router.push('/concept')}
                style={{
                  flexShrink: 0,
                  borderRadius: 999,
                  border: '1px solid rgba(67,67,43,0.18)',
                  background: 'transparent',
                  color: '#191919',
                  padding: '12px 20px',
                  fontFamily: sohne,
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: '0.01em',
                  cursor: 'pointer',
                  boxShadow: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                Continue Concept →
              </button>
            </div>
          ) : null}

          {reportExists ? (
            <div
              style={{
                marginTop: 12,
                padding: '12px 28px 0',
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr)',
                gap: 4,
              }}
            >
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

              <div
                style={{
                  display: 'flex',
                  gap: 22,
                  alignItems: 'center',
                  marginBottom: 16,
                }}
              >
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <IconIdentity size={13} />
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      letterSpacing: '-0.02em',
                      color: avgIdentity >= 50 ? '#43432B' : '#C47B6B',
                      fontFamily: inter,
                    }}
                  >
                    {avgIdentity || '—'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <IconResonance size={13} />
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      letterSpacing: '-0.02em',
                      color: avgResonance >= 50 ? '#43432B' : '#C47B6B',
                      fontFamily: inter,
                    }}
                  >
                    {avgResonance || '—'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <CollectionExecutionIcon size={13} color={avgExecution >= 50 ? '#43432B' : '#C47B6B'} />
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      letterSpacing: '-0.02em',
                      color: avgExecution >= 50 ? '#43432B' : '#C47B6B',
                      fontFamily: inter,
                    }}
                  >
                    {avgExecution || '—'}
                  </span>
                </div>
              </div>

              {displayedCollectionRead.next_action ? (
                <div
                  style={{
                    display: 'flex',
                    gap: 10,
                    alignItems: 'center',
                    padding: '14px 0',
                    borderTop: '1px solid rgba(67,67,43,0.08)',
                    borderBottom: '1px solid rgba(67,67,43,0.08)',
                    marginBottom: 18,
                  }}
                >
                  <div
                    style={{
                      fontFamily: inter,
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: '0.13em',
                      textTransform: 'uppercase',
                      color: '#A8B475',
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
            </div>
          ) : null}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: reportExists ? '18px 28px 20px' : '20px 28px 24px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              height: '48px',
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
                gap: 28,
                padding: 0,
                borderRadius: 0,
                border: 'none',
                background: 'transparent',
              }}
            >
              {(['pieces', 'report'] as const).map((tab) => {
                const isActive = activeTab === tab;
                const isReportTab = tab === 'report';
                const isLocked = isReportTab && !canGenerateReport;
                const tabButton = (
                  <button
                    key={tab}
                    onClick={() => {
                      if (isLocked) return;
                      setActiveTab(tab);
                    }}
                    aria-disabled={isLocked}
                    style={{
                      border: 'none',
                      borderBottom: isActive ? '2px solid #43432B' : 'none',
                      borderRadius: 0,
                      padding: '10px 16px',
                      background: 'transparent',
                      color: isLocked ? 'rgba(67,67,43,0.2)' : isActive ? '#43432B' : 'rgba(67,67,43,0.35)',
                      fontFamily: inter,
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      cursor: isLocked ? 'not-allowed' : 'pointer',
                      opacity: isLocked ? 0.7 : 1,
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <span>{tab}</span>
                      {isReportTab && canGenerateReport ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            borderRadius: 999,
                            padding: '2px 8px',
                            background: '#A8B475',
                            color: '#F8F4EC',
                            fontFamily: inter,
                            fontSize: 9,
                            fontWeight: 700,
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            lineHeight: 1.2,
                          }}
                        >
                          Ready
                        </span>
                      ) : null}
                      {isReportTab && !canGenerateReport ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            borderRadius: 999,
                            padding: '2px 8px',
                            background: 'rgba(67,67,43,0.08)',
                            color: 'rgba(67,67,43,0.5)',
                            fontFamily: inter,
                            fontSize: 9,
                            fontWeight: 700,
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            lineHeight: 1.2,
                          }}
                        >
                          {`${pieceCount}/${MIN_REPORT_PIECES}`}
                        </span>
                      ) : null}
                    </span>
                  </button>
                );

                return isLocked ? (
                  <HoverHint key={tab} copy={reportLockedHoverCopy}>
                    {tabButton}
                  </HoverHint>
                ) : (
                  tabButton
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
                  <button
                    type="button"
                    onClick={conceptCompleteForCollection ? onNewPiece : undefined}
                    aria-disabled={!conceptCompleteForCollection}
                    style={{
                      ...collectionAddPieceButtonStyle,
                      opacity: conceptCompleteForCollection ? 1 : 0.35,
                      cursor: conceptCompleteForCollection ? 'pointer' : 'not-allowed',
                    }}
                    onMouseEnter={(e) => {
                      if (!conceptCompleteForCollection) return;
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 10px 24px rgba(125,150,172,0.14)';
                      e.currentTarget.style.borderColor = 'rgba(125,150,172,0.72)';
                      e.currentTarget.style.background = 'rgba(125,150,172,0.04)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.borderColor = STEEL_BLUE;
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <span style={{ fontSize: 13, lineHeight: 1 }}>+</span>
                    Add Piece
                  </button>
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

                  {canGenerateReport ? (
                    <button
                      onClick={handleOpenReport}
                      aria-disabled={false}
                      style={{
                        ...headerActionButtonBase,
                        border: '1px solid rgba(67,67,43,0.12)',
                        background: '#43432B',
                        color: '#F8F4EC',
                        cursor: 'pointer',
                        boxShadow: headerActionButtonBase.boxShadow,
                        opacity: 1,
                      }}
                    >
                      Refresh Report
                    </button>
                  ) : (
                    <HoverHint copy={reportLockedHoverCopy}>
                      <button
                        onClick={handleOpenReport}
                        aria-disabled
                        style={{
                          ...headerActionButtonBase,
                          border: '1px solid rgba(67,67,43,0.12)',
                          background: '#E2DDD6',
                          color: '#888078',
                          cursor: 'not-allowed',
                          boxShadow: 'none',
                          opacity: 0.8,
                        }}
                      >
                        {`Add ${piecesNeededForReport} More Piece${piecesNeededForReport === 1 ? '' : 's'}`}
                      </button>
                    </HoverHint>
                  )}

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
                      minHeight: 420,
                      padding: '54px 0 36px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: 54,
                        height: 54,
                        borderRadius: 18,
                        border: '1px solid rgba(67,67,43,0.18)',
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,244,236,0.92) 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 22,
                        boxShadow: '0 8px 22px rgba(67,67,43,0.06)',
                      }}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <rect x="6" y="3.5" width="12" height="17" rx="2.5" stroke="rgba(67,67,43,0.58)" strokeWidth="1.5" />
                        <path d="M9 9.5H15" stroke="rgba(67,67,43,0.58)" strokeWidth="1.5" strokeLinecap="round" />
                        <path d="M9 13.5H15" stroke="rgba(67,67,43,0.58)" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </div>
                    <div
                      style={{
                        fontFamily: inter,
                        fontSize: 18,
                        fontWeight: 700,
                        color: '#191919',
                        marginBottom: 12,
                        letterSpacing: '-0.02em',
                      }}
                    >
                      No pieces yet
                    </div>
                    <div
                      style={{
                        maxWidth: 420,
                        fontFamily: inter,
                        fontSize: 13,
                        lineHeight: 1.55,
                        color: '#888078',
                      }}
                    >
                      {showConceptInProgressBanner
                        ? 'Finish setting up your concept direction first, then add pieces to start building this collection.'
                        : 'Add your first piece to start building this collection.'}
                    </div>
                  </div>
                ) : (
                  analyses.map((analysis) => (
                    <PieceCard
                      key={analysis.id}
                      analysis={analysis}
                      execution_notes={analysis.execution_notes ?? null}
                      onClick={() => handleOpenExistingPiece(analysis)}
                      onDelete={() => handleDeletePiece(analysis.id)}
                      onRename={(nextName) => handleRenamePiece(analysis.id, nextName)}
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
              <OverallReadCallout
                topRightMeta={`Saved ${formatSavedDateTime(snapshot.report_saved_at)}`}
                value={snapshot.report_snapshot.overall_read}
                thesis={snapshot.report_snapshot.collection_thesis}
                detail={snapshot.report_snapshot.overall_read_detail}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                {canGenerateReport ? (
                  <button
                    onClick={handleOpenReport}
                    className="pieces-read-ready-pill"
                  >
                    View full report
                    <span className="collection-read-ready-arrow">→</span>
                  </button>
                ) : (
                  <HoverHint copy={reportLockedHoverCopy}>
                    <button
                      onClick={handleOpenReport}
                      aria-disabled
                      className="pieces-read-ready-pill"
                    >
                      {`${pieceCount}/${MIN_REPORT_PIECES} pieces required`}
                      <span className="collection-read-ready-arrow">→</span>
                    </button>
                  </HoverHint>
                )}
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
                  {canGenerateReport
                    ? 'Generate a report to capture a snapshot of this collection.'
                    : `Add ${piecesNeededForReport} more piece${piecesNeededForReport === 1 ? '' : 's'} to unlock collection reporting.`}
                </p>
                <div style={{ marginTop: 20 }}>
                  {canGenerateReport ? (
                    <button
                      onClick={handleOpenReport}
                      className="pieces-read-ready-pill"
                    >
                      {pieceCount > 0 ? <span className="pieces-read-ready-count">{pieceCount}</span> : null}
                      <span>{`${pieceCount > 0 ? `${pieceCount} pieces · ` : ''}Generate report →`}</span>
                    </button>
                  ) : (
                    <HoverHint copy={reportLockedHoverCopy}>
                      <button
                        onClick={handleOpenReport}
                        aria-disabled
                        className="pieces-read-ready-pill"
                      >
                        {pieceCount > 0 ? <span className="pieces-read-ready-count">{pieceCount}</span> : null}
                        <span>{`${pieceCount}/${MIN_REPORT_PIECES} pieces required`}</span>
                      </button>
                    </HoverHint>
                  )}
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
          padding: 7px 14px;
          border-radius: 9999px;
          font-family: Inter, sans-serif;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          cursor: pointer;
          white-space: nowrap;
          border: 1px solid rgba(184,135,107,0.35);
          background: rgba(184,135,107,0.10);
          color: #7A4A2A;
          transition: background 160ms ease, border-color 160ms ease;
        }

        .collection-read-ready-pill:disabled,
        .collection-read-ready-pill[aria-disabled='true'] {
          cursor: not-allowed;
          background: rgba(67,67,43,0.06);
          border-color: rgba(67,67,43,0.14);
          color: rgba(67,67,43,0.45);
        }

        .collection-read-ready-pill:hover {
          background: rgba(184,135,107,0.18);
          border-color: rgba(184,135,107,0.55);
        }

        .collection-read-ready-pill:disabled:hover,
        .collection-read-ready-pill[aria-disabled='true']:hover {
          background: rgba(67,67,43,0.06);
          border-color: rgba(67,67,43,0.14);
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
          color: #7A4A2A;
          display: inline-block;
          animation: collectionReadReadyArrowBounce 1.8s ease-in-out infinite;
        }

        .pieces-read-ready-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          border-radius: 100px;
          font-family: "Söhne Breit", sans-serif;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.01em;
          cursor: pointer;
          white-space: nowrap;
          border: none;
          background: #c8cc9e;
          color: #3a3d20;
          box-shadow: 0 10px 30px rgba(67,67,43,0.12);
          transition: background 160ms ease, border-color 160ms ease;
        }

        .pieces-read-ready-pill:hover {
          background: #c8cc9e;
        }

        .pieces-read-ready-count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 1px 7px;
          border-radius: 100px;
          background: rgba(0,0,0,0.08);
          font-size: 11px;
          line-height: 1.2;
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
