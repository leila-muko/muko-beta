'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getFlatForPiece } from '@/components/flats';
import { useSessionStore } from '@/lib/store/sessionStore';
import { parseSelectedPieceImage, resolvePieceImageType } from '@/lib/piece-image';
import { buildAssortmentIntelligence } from '@/lib/collection-report/buildAssortmentIntelligence';

const inter = 'var(--font-inter), system-ui, sans-serif';
const sohne = 'var(--font-sohne-breit), system-ui, sans-serif';

type PieceRole = 'hero' | 'core' | 'support';
type ComplexityLevel = 'high' | 'medium' | 'low';

interface AnalysisRow {
  id: string;
  piece_name?: string | null;
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

function titleCase(value: string | null | undefined) {
  if (!value) return '';
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
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

function getPieceName(analysis: AnalysisRow) {
  return analysis.piece_name?.trim() || analysis.agent_versions?.saved_piece_name?.trim() || analysis.category?.trim() || 'Untitled Piece';
}

function getRoleBadgeStyles(role: PieceRole): React.CSSProperties {
  if (role === 'hero') return { background: '#eef2e6', color: '#5a6e2a' };
  if (role === 'core') return { background: '#e8eef2', color: '#2e4a5a' };
  return { background: '#f0eeee', color: '#5a4a4a' };
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

  const pieceName = getPieceName(analysis);
  const score = getScore(analysis);
  const storedPieceImage = parseSelectedPieceImage(analysis.agent_versions?.selected_piece_image);
  const resolvedPieceType = resolvePieceImageType({
    type: storedPieceImage?.pieceType,
    pieceName,
    category: analysis.category,
    silhouette: analysis.silhouette,
  });
  const flat = resolvedPieceType ? getFlatForPiece(resolvedPieceType, storedPieceImage?.signal ?? null) : null;
  const materialLabel = titleCase(analysis.material_id) || 'Unknown material';
  const complexityLabel = titleCase(analysis.construction_tier) || 'Unknown';
  const role = getPieceRole(analysis);
  const roleLabel = getRoleLabel(role);
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
  const storeCollectionName = useSessionStore((state) => state.collectionName);
  const collectionAesthetic = useSessionStore((state) => state.collectionAesthetic);
  const aestheticInflection = useSessionStore((state) => state.aestheticInflection);
  const directionInterpretationText = useSessionStore((state) => state.directionInterpretationText);
  const directionInterpretationChips = useSessionStore((state) => state.directionInterpretationChips);
  const [analyses, setAnalyses] = useState<AnalysisRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);

      const supabase = createClient();
      const primary = await supabase
        .from('analyses')
        .select('*')
        .eq('user_id', userId)
        .eq('collection_name', collectionName)
        .order('created_at', { ascending: false });

      if (cancelled) return;

      if (primary.error) {
        setAnalyses([]);
        setLoading(false);
        return;
      }

      setAnalyses(
        ((primary.data as AnalysisRow[] | null) ?? []).map((row) => ({
          ...row,
          piece_name: row.piece_name ?? row.agent_versions?.saved_piece_name ?? null,
        }))
      );
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
    });
  }, [avgExecution, scoredAnalyses]);

  const editorialDirection = useMemo(() => {
    const preferred = [
      collectionAesthetic,
      aestheticInflection,
      directionInterpretationText,
      analyses[0]?.aesthetic_input,
    ].find((value) => value?.trim());

    return preferred?.trim() ?? null;
  }, [aestheticInflection, analyses, collectionAesthetic, directionInterpretationText]);

  const editorialChips = useMemo(() => {
    const storeMatchesCollection = storeCollectionName?.trim().toLowerCase() === collectionName.trim().toLowerCase();
    if (storeMatchesCollection && directionInterpretationChips.length > 0) {
      return directionInterpretationChips.slice(0, 4);
    }
    return [];
  }, [analyses, collectionName, directionInterpretationChips, storeCollectionName]);

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

                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
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
                  maxWidth: 620,
                }}
              >
                <div style={{ fontFamily: inter, fontSize: 12, fontWeight: 600, lineHeight: 1.4, color: 'rgba(67,67,43,0.72)' }}>
                  {collectionScore} — {assortmentIntelligence.collection_state}
                </div>

                <p
                  style={{
                    margin: 0,
                    fontFamily: inter,
                    fontSize: 11.5,
                    lineHeight: 1.48,
                    color: 'rgba(67,67,43,0.62)',
                    maxWidth: 580,
                  }}
                >
                  {assortmentIntelligence.supporting_line}
                </p>

                <p
                  style={{
                    margin: 0,
                    fontFamily: inter,
                    fontSize: 11,
                    lineHeight: 1.48,
                    color: 'rgba(67,67,43,0.52)',
                    maxWidth: 580,
                  }}
                >
                  {assortmentIntelligence.muko_insight}
                </p>

                <div
                  style={{
                    fontFamily: inter,
                    fontSize: 9.5,
                    lineHeight: 1.4,
                    color: 'rgba(67,67,43,0.36)',
                    letterSpacing: '0.03em',
                  }}
                >
                  Identity {avgIdentity || '—'} · Resonance {avgResonance || '—'} · Execution {avgExecution || '—'}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* ── Pieces section ─────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: reportExists ? '2px 32px 24px' : '20px 32px 24px' }}>
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
                  onClick={() => router.push('/spec')}
                  onDelete={() => handleDeletePiece(analysis.id)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      <div
        style={{
          position: 'fixed',
          right: 32,
          bottom: 28,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: 10,
          zIndex: 25,
        }}
      >
        <button
          onClick={onNewPiece}
          style={{
            border: '1px solid #D9D3CB',
            background: 'rgba(255,255,255,0.94)',
            color: '#6F675F',
            borderRadius: 999,
            padding: '10px 18px',
            fontSize: 12,
            fontWeight: 600,
            fontFamily: inter,
            cursor: 'pointer',
            transition: 'border-color 150ms ease, color 150ms ease',
            minWidth: 136,
            boxShadow: '0 10px 28px rgba(67,67,43,0.08)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#A8B475'; e.currentTarget.style.color = '#A8B475'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#D9D3CB'; e.currentTarget.style.color = '#6F675F'; }}
        >
          Add Piece
        </button>

        {reportExists ? (
          <>
            <button
              onClick={handleGenerateReport}
              style={{
                background: '#A8B475',
                color: '#3A4020',
                borderRadius: 999,
                border: 'none',
                padding: '10px 18px',
                fontSize: 12,
                fontWeight: 600,
                fontFamily: inter,
                cursor: 'pointer',
                minWidth: 136,
                boxShadow: '0 10px 28px rgba(67,67,43,0.08)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#95A164'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#A8B475'; }}
            >
              View Report
            </button>
          </>
        ) : (
          <button
            disabled
            style={{
              background: '#E2DDD6',
              color: '#888078',
              borderRadius: 999,
              border: 'none',
              padding: '10px 18px',
              fontSize: 12,
              fontFamily: inter,
              cursor: 'not-allowed',
              minWidth: 136,
              boxShadow: '0 10px 28px rgba(67,67,43,0.08)',
            }}
          >
            Generate Report
          </button>
        )}
      </div>

      {reportExists ? (
        <button
          onClick={handleGenerateReport}
          style={{
            position: 'fixed',
            right: 32,
            bottom: 6,
            fontFamily: inter,
            fontSize: 10,
            color: '#888078',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            textAlign: 'right',
            zIndex: 25,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#191919'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#888078'; }}
        >
          Re-run analysis
        </button>
      ) : null}

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
