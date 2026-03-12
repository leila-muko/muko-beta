'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import materialsData from '@/data/materials.json';
import { CollectionReportView } from '@/components/report/CollectionReportView';
import { fonts, reportPalette, sectionCard, sectionEyebrow } from '@/components/report/reportStyles';
import { buildCollectionReport } from '@/lib/collection-report/buildCollectionReport';
import type {
  CollectionComplexity,
  CollectionPieceRole,
  CollectionReportBrandInput,
  CollectionReportInput,
  CollectionReportIntentInput,
  CollectionReportPayload,
} from '@/lib/collection-report/types';
import { createClient } from '@/lib/supabase/client';
import { useSessionStore } from '@/lib/store/sessionStore';

interface AnalysisRow {
  id: string;
  collection_name: string | null;
  season: string | null;
  category: string | null;
  aesthetic_input: string | null;
  material_id: string | null;
  silhouette: string | null;
  construction_tier: 'low' | 'moderate' | 'high' | null;
  score: number | null;
  dimensions: {
    identity?: number | null;
    resonance?: number | null;
    execution?: number | null;
  } | null;
  gates_passed: {
    cost?: boolean | null;
  } | null;
  piece_name?: string | null;
  created_at: string;
  agent_versions?: Record<string, string | null> | null;
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

function normalizeToken(value: string | null | undefined) {
  return (value ?? '')
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function inferRole(value: string | null | undefined, score: number | null | undefined): CollectionPieceRole {
  const token = normalizeToken(value);
  if (token === 'hero' || token === 'core' || token === 'support') return token;
  if ((score ?? 0) >= 82) return 'hero';
  if ((score ?? 0) >= 64) return 'core';
  return 'support';
}

function inferComplexity(value: AnalysisRow['construction_tier']): CollectionComplexity {
  if (value === 'high') return 'high';
  if (value === 'low') return 'low';
  return 'medium';
}

function inferStatus(score: number | null | undefined) {
  if ((score ?? 0) >= 80) return 'strong' as const;
  if ((score ?? 0) >= 62) return 'watch' as const;
  return 'revise' as const;
}

function getPieceName(row: AnalysisRow) {
  return row.piece_name?.trim() || row.agent_versions?.saved_piece_name?.trim() || 'Untitled Piece';
}

function toCollectionInput({
  collectionName,
  season,
  versionLabel,
  snapshotId,
  pieces,
  brand,
  intent,
}: {
  collectionName: string;
  season: string;
  versionLabel?: string | null;
  snapshotId?: string | null;
  pieces: AnalysisRow[];
  brand?: CollectionReportBrandInput | null;
  intent?: CollectionReportIntentInput | null;
}): CollectionReportInput {
  return {
    collection_name: collectionName,
    season,
    version_label: versionLabel ?? null,
    snapshot_id: snapshotId ?? null,
    generated_at: new Date().toISOString(),
    brand: brand ?? null,
    intent: intent ?? null,
    pieces: pieces.map((row) => ({
      id: row.id,
      piece_name: getPieceName(row),
      category: row.category,
      role: inferRole(row.agent_versions?.collection_role, row.score),
      complexity: inferComplexity(row.construction_tier),
      direction_tag: row.aesthetic_input,
      material: row.material_id ? materialNameById.get(row.material_id) ?? row.material_id : null,
      silhouette: row.silhouette,
      score: row.score,
      status: inferStatus(row.score),
      dimensions: row.dimensions,
      margin_passed: row.gates_passed?.cost ?? null,
    })),
  };
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

async function fetchCollectionAnalyses(
  userId: string,
  collectionName: string
): Promise<AnalysisRow[]> {
  const supabase = createClient();
  const primarySelect =
    'id, collection_name, season, category, aesthetic_input, material_id, silhouette, construction_tier, score, dimensions, gates_passed, piece_name, created_at, agent_versions';
  const fallbackSelect =
    'id, collection_name, season, category, aesthetic_input, material_id, silhouette, construction_tier, score, dimensions, gates_passed, created_at, agent_versions';

  const primary = await supabase
    .from('analyses')
    .select(primarySelect)
    .eq('user_id', userId)
    .eq('collection_name', collectionName)
    .order('created_at', { ascending: false });

  if (!primary.error) {
    return (primary.data as AnalysisRow[] | null) ?? [];
  }

  const fallback = await supabase
    .from('analyses')
    .select(fallbackSelect)
    .eq('user_id', userId)
    .eq('collection_name', collectionName)
    .order('created_at', { ascending: false });

  if (fallback.error) {
    throw fallback.error;
  }

  return ((fallback.data as AnalysisRow[] | null) ?? []).map((row) => ({
    ...row,
    piece_name: null,
  }));
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

function ReportPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeCollection = useSessionStore((state) => state.activeCollection);
  const collectionName = useSessionStore((state) => state.collectionName);
  const season = useSessionStore((state) => state.season);
  const category = useSessionStore((state) => state.category);
  const aestheticInput = useSessionStore((state) => state.aestheticInput);
  const materialId = useSessionStore((state) => state.materialId);
  const silhouette = useSessionStore((state) => state.silhouette);
  const constructionTier = useSessionStore((state) => state.constructionTier);
  const identityPulse = useSessionStore((state) => state.identityPulse);
  const resonancePulse = useSessionStore((state) => state.resonancePulse);
  const executionPulse = useSessionStore((state) => state.executionPulse);
  const collectionFromUrl = searchParams.get('collection');
  const seasonFromUrl = searchParams.get('season');

  const sessionFallbackInput = useMemo<CollectionReportInput | null>(() => {
    const resolvedCollectionName =
      collectionFromUrl || activeCollection || collectionName || 'Untitled Collection';
    const resolvedSeason = seasonFromUrl || season || 'Current Season';
    const intent = typeof window !== 'undefined' ? readIntentFromStorage() : null;

    if (!category && !aestheticInput && !materialId) {
      return null;
    }

    return {
      collection_name: resolvedCollectionName,
      season: resolvedSeason,
      generated_at: new Date().toISOString(),
      version_label: 'Session Snapshot',
      snapshot_id: 'live-session',
      intent,
      pieces: [
        {
          id: 'session-piece',
          piece_name: `${category || 'Collection'} Concept`,
          category: category || 'Emerging Category',
          role: 'hero',
          complexity:
            constructionTier === 'high'
              ? 'high'
              : constructionTier === 'low'
                ? 'low'
                : 'medium',
          direction_tag: aestheticInput || 'Collection Direction',
          material: materialId ? materialNameById.get(materialId) ?? materialId : 'Material TBD',
          silhouette: silhouette || 'Silhouette TBD',
          score: Math.round(
            ((identityPulse?.score ?? 72) +
              (resonancePulse?.score ?? 70) +
              (executionPulse?.score ?? 68)) /
              3
          ),
          status: 'watch',
          dimensions: {
            identity: identityPulse?.score ?? 72,
            resonance: resonancePulse?.score ?? 70,
            execution: executionPulse?.score ?? 68,
          },
          margin_passed: (executionPulse?.score ?? 68) >= 65,
        },
      ],
    };
  }, [
    activeCollection,
    aestheticInput,
    category,
    collectionName,
    collectionFromUrl,
    constructionTier,
    executionPulse?.score,
    identityPulse?.score,
    materialId,
    resonancePulse?.score,
    season,
    seasonFromUrl,
    silhouette,
  ]);

  const [report, setReport] = useState<CollectionReportPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadReport() {
      setLoading(true);
      setError(null);
      const supabase = createClient();
      const activeCollectionName = collectionFromUrl || activeCollection || collectionName;
      const activeSeason = seasonFromUrl || season;

      try {
        let input = sessionFallbackInput;
        const intent = typeof window !== 'undefined' ? readIntentFromStorage() : null;
        const {
          data: { user },
        } = await supabase.auth.getUser();
        let brand: CollectionReportBrandInput | null = null;

        if (user) {
          brand = await fetchBrandProfile(user.id);
        }

        if (user && activeCollectionName) {
          try {
            const data = await fetchCollectionAnalyses(user.id, activeCollectionName);

            if (data.length > 0) {
              input = toCollectionInput({
                collectionName: activeCollectionName,
                season: data[0].season || activeSeason || 'Current Season',
                versionLabel: 'Latest Snapshot',
                snapshotId: data[0].created_at,
                pieces: data,
                brand,
                intent,
              });
            } else if (input) {
              input = {
                ...input,
                brand,
                intent,
              };
            }
          } catch {
            // If collection fetch fails, keep any available session fallback instead of blanking the page.
          }
        }

        if (!input && activeCollectionName) {
          input = {
            collection_name: activeCollectionName,
            season: activeSeason || 'Current Season',
            generated_at: new Date().toISOString(),
            version_label: 'Collection Snapshot',
            snapshot_id: 'minimal-fallback',
            brand,
            intent,
            pieces: [],
          };
        }

        if (input && input.pieces.length === 0) {
          if (!cancelled) {
            setReport(buildCollectionReport(input).collection_report);
            setLoading(false);
          }
          return;
        }

        if (!input) {
          try {
            const storedCollectionName = window.localStorage.getItem('muko_collectionName');
            const storedSeason = window.localStorage.getItem('muko_seasonLabel');

            if (storedCollectionName) {
              input = {
                collection_name: storedCollectionName,
                season: storedSeason || activeSeason || 'Current Season',
                generated_at: new Date().toISOString(),
                version_label: 'Stored Snapshot',
                snapshot_id: 'local-storage',
                brand,
                intent,
                pieces: [],
              };
            }
          } catch {}
        }

        if (!input) {
          if (!cancelled) {
            setReport(null);
            setLoading(false);
          }
          return;
        }

        let nextReport: CollectionReportPayload;
        try {
          const response = await fetch('/api/synthesizer/collection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'collection_report',
              payload: input,
            }),
          });

          if (!response.ok) throw new Error('Report request failed');
          const json = (await response.json()) as { collection_report: CollectionReportPayload };
          nextReport = json.collection_report;
        } catch {
          nextReport = buildCollectionReport(input).collection_report;
        }

        if (!cancelled) {
          setReport(nextReport);
        }
      } catch {
        const activeCollectionName = collectionFromUrl || activeCollection || collectionName;
        const activeSeason = seasonFromUrl || season || 'Current Season';
        const intent = typeof window !== 'undefined' ? readIntentFromStorage() : null;

        if (!cancelled && activeCollectionName) {
          setReport(
            buildCollectionReport({
              collection_name: activeCollectionName,
              season: activeSeason,
              generated_at: new Date().toISOString(),
              version_label: 'Fallback Snapshot',
              snapshot_id: 'error-fallback',
              intent,
              pieces: [],
            }).collection_report
          );
          setError(null);
        } else if (!cancelled) {
          setError('Unable to build the collection report right now.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadReport();

    return () => {
      cancelled = true;
    };
  }, [activeCollection, collectionFromUrl, collectionName, season, seasonFromUrl, sessionFallbackInput]);

  return (
    <main
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(circle at top left, rgba(168,180,117,0.16), transparent 30%), radial-gradient(circle at top right, rgba(125,150,172,0.16), transparent 28%), linear-gradient(180deg, #FBF9F4 0%, #F4F0E7 100%)',
      }}
    >
      <div
        style={{
          maxWidth: 1240,
          margin: '0 auto',
          padding: '24px 20px 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <p style={sectionEyebrow}>Report</p>
          <p
            style={{
              margin: '8px 0 0',
              fontFamily: fonts.body,
              fontSize: 13,
              color: reportPalette.muted,
            }}
          >
            Collection-level intelligence memo for creative and merchandising review.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={() => router.push('/collections')}
            style={{
              padding: '12px 16px',
              borderRadius: 999,
              border: `1px solid rgba(67,67,43,0.10)`,
              background: 'rgba(255,255,255,0.6)',
              color: reportPalette.olive,
              fontFamily: fonts.body,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Back to Collections
          </button>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 16px',
              borderRadius: 999,
              border: 'none',
              background: reportPalette.olive,
              color: '#F8F4EC',
              fontFamily: fonts.body,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Refresh Report
          </button>
        </div>
      </div>

      {loading ? <LoadingState /> : null}
      {!loading && report ? <CollectionReportView report={report} /> : null}
      {!loading && !report && error ? <ErrorState message={error} /> : null}
      {!loading && !report && !error ? <EmptyState /> : null}
    </main>
  );
}

export default function ReportPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ReportPageContent />
    </Suspense>
  );
}

function LoadingState() {
  return (
    <div
      style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '34px 20px 80px',
        display: 'grid',
        gap: 18,
      }}
    >
      {[220, 130, 210, 280].map((height, index) => (
        <div
          key={index}
          style={{
            ...sectionCard,
            height,
            background:
              'linear-gradient(90deg, rgba(255,255,255,0.55) 0%, rgba(248,244,236,0.9) 50%, rgba(255,255,255,0.55) 100%)',
            backgroundSize: '200% 100%',
            animation: 'skeleton-loading 1.4s ease-in-out infinite',
          }}
        />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        maxWidth: 860,
        margin: '48px auto 0',
        padding: '0 20px 80px',
      }}
    >
      <section style={{ ...sectionCard, padding: '30px' }}>
        <p style={sectionEyebrow}>No Report Context</p>
        <h2
          style={{
            margin: '12px 0 0',
            fontFamily: fonts.heading,
            fontSize: 32,
            letterSpacing: '-0.04em',
            color: reportPalette.olive,
          }}
        >
          Add pieces to a collection to generate the memo.
        </h2>
        <p
          style={{
            margin: '14px 0 0',
            fontFamily: fonts.body,
            fontSize: 15,
            lineHeight: 1.7,
            color: reportPalette.muted,
          }}
        >
          The report view needs either a saved collection snapshot or the current in-session concept and spec data.
        </p>
      </section>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div
      style={{
        maxWidth: 860,
        margin: '24px auto 0',
        padding: '0 20px 80px',
      }}
    >
      <section
        style={{
          ...sectionCard,
          padding: '18px 22px',
          border: '1px solid rgba(169,123,143,0.18)',
          background: 'rgba(255,255,255,0.72)',
        }}
      >
        <p
          style={{
            margin: 0,
            fontFamily: fonts.body,
            fontSize: 13,
            color: reportPalette.rose,
          }}
        >
          {message}
        </p>
      </section>
    </div>
  );
}
