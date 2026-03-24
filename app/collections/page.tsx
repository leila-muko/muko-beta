'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useSessionStore } from '@/lib/store/sessionStore';
import CollectionPage from '@/components/collections/CollectionPage';

const SIDEBAR_WIDTH = 220;
const OLIVE = '#43432B';
const inter = 'var(--font-inter), system-ui, sans-serif';
const sohne = 'var(--font-sohne-breit), system-ui, sans-serif';

interface CollectionGroup {
  name: string;
  season: string | null;
  pieceCount: number;
  lastUpdated: string;
  avgScore: number | null;
}

export default function CollectionsHubPage() {
  const router = useRouter();
  const { activeCollection, setActiveCollection, setCurrentStep } = useSessionStore();
  const [userId, setUserId] = useState<string | null>(null);
  const [collections, setCollections] = useState<CollectionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredCollection, setHoveredCollection] = useState<string | null>(null);
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);

  const loadCollections = useCallback(async (uid: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from('analyses')
      .select('collection_name, season, created_at, score')
      .eq('user_id', uid)
      .not('collection_name', 'is', null)
      .order('created_at', { ascending: false });

    if (data) {
      const groups = new Map<string, CollectionGroup & { scoreSum: number; scoreCount: number }>();

      for (const row of data) {
        const name = row.collection_name as string;
        const existing = groups.get(name);
        const rowScore = typeof row.score === 'number' && row.score > 0 ? row.score : null;

        if (existing) {
          existing.pieceCount += 1;
          if (row.created_at > existing.lastUpdated) existing.lastUpdated = row.created_at;
          if (!existing.season && row.season) existing.season = row.season;
          if (rowScore != null) { existing.scoreSum += rowScore; existing.scoreCount += 1; }
          continue;
        }

        groups.set(name, {
          name,
          season: row.season ?? null,
          pieceCount: 1,
          lastUpdated: row.created_at,
          avgScore: null,
          scoreSum: rowScore ?? 0,
          scoreCount: rowScore != null ? 1 : 0,
        });
      }

      // Resolve avgScore after aggregation
      for (const g of groups.values()) {
        g.avgScore = g.scoreCount > 0 ? Math.round(g.scoreSum / g.scoreCount) : null;
      }

      const nextCollections = Array.from(groups.values());
      setCollections(nextCollections);

      if (activeCollection && !nextCollections.some((collection) => collection.name === activeCollection)) {
        setActiveCollection(null);
      }
    }

    setLoading(false);
  }, [activeCollection, setActiveCollection]);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/auth/signin');
        return;
      }

      setUserId(user.id);
      loadCollections(user.id);
    });
  }, [loadCollections, router]);

  useEffect(() => {
    if (!activeCollection) return;
    const activeMeta = collections.find((collection) => collection.name === activeCollection);
    useSessionStore.getState().setCollectionName(activeCollection);
    try {
      localStorage.setItem('muko_collectionName', activeCollection);
      if (activeMeta?.season) {
        localStorage.setItem('muko_seasonLabel', activeMeta.season);
      }
    } catch {}
  }, [activeCollection, collections]);

  const handleStartCollection = useCallback(() => {
    const { assortmentInsightCache } = useSessionStore.getState();
    useSessionStore.getState().resetSession();
    useSessionStore.setState({ activeCollection: null, assortmentInsightCache });
    try {
      localStorage.removeItem('muko_collectionName');
      localStorage.removeItem('muko_seasonLabel');
      localStorage.removeItem('muko_collection_aesthetic');
      localStorage.removeItem('muko_aesthetic_inflection');
      localStorage.removeItem('muko_intent');
    } catch {}
    router.push('/entry');
  }, [router]);

  const handleNewPiece = useCallback(() => {
    if (activeCollection) {
      const activeMeta = collections.find((collection) => collection.name === activeCollection);

      useSessionStore.getState().setCollectionName(activeCollection);

      try {
        localStorage.setItem('muko_collectionName', activeCollection);
        if (activeMeta?.season) {
          localStorage.setItem('muko_seasonLabel', activeMeta.season);
        }
      } catch {}
    }

    setCurrentStep(2);
    router.push('/concept');
  }, [activeCollection, collections, router, setCurrentStep]);

  const handleDeleteCollection = useCallback(async (name: string) => {
    if (!userId) return;
    setMenuOpenFor(null);
    const supabase = createClient();
    await supabase.from('analyses').delete().eq('user_id', userId).eq('collection_name', name);
    setCollections((prev) => prev.filter((c) => c.name !== name));
    if (activeCollection === name) {
      setActiveCollection(null);
    }
  }, [userId, activeCollection, setActiveCollection]);

  const activeCollectionMeta = collections.find((collection) => collection.name === activeCollection) ?? null;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#FAF9F6',
        display: 'flex',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <aside
        style={{
          width: SIDEBAR_WIDTH,
          minWidth: SIDEBAR_WIDTH,
          background: '#F2EFE9',
          borderRight: '1px solid #E2DDD6',
          padding: '24px 18px',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          zIndex: 10,
          height: '100vh',
          overflow: 'hidden',
          animation: 'fadeIn 400ms ease both',
          boxSizing: 'border-box',
        }}
      >
        {/* Wordmark */}
        <button
          onClick={() => router.push('/entry')}
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: '#191919',
            fontFamily: sohne,
            letterSpacing: '-0.02em',
            margin: '0 0 32px 0',
            padding: 0,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            width: 'fit-content',
            flexShrink: 0,
          }}
        >
          muko
        </button>

        {/* COLLECTIONS label */}
        <div
          style={{
            fontFamily: inter,
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: '#888078',
            marginBottom: 10,
            flexShrink: 0,
          }}
        >
          Collections
        </div>

        {/* Collection list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto', flex: 1, minHeight: 0 }}>
          {loading ? (
            <div style={{ fontFamily: inter, fontSize: 12, color: '#888078', padding: '9px 12px' }}>
              Loading…
            </div>
          ) : collections.length === 0 ? (
            <div style={{ fontFamily: inter, fontSize: 12, color: '#888078', padding: '9px 12px', lineHeight: 1.5 }}>
              No collections yet.
            </div>
          ) : (
            collections.map((collection) => {
              const isActive = activeCollection === collection.name;
              const isHovered = hoveredCollection === collection.name;
              const isMenuOpen = menuOpenFor === collection.name;

              return (
                <div
                  key={collection.name}
                  style={{ position: 'relative' }}
                  onMouseEnter={() => setHoveredCollection(collection.name)}
                  onMouseLeave={() => { setHoveredCollection(null); if (!isMenuOpen) setMenuOpenFor(null); }}
                >
                  <button
                    onClick={() => { setMenuOpenFor(null); setActiveCollection(collection.name); }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      width: '100%',
                      textAlign: 'left',
                      background: isActive ? '#FFFFFF' : (isHovered ? 'rgba(0,0,0,0.03)' : 'transparent'),
                      border: 'none',
                      borderLeft: isActive ? '3px solid #A8B475' : '3px solid transparent',
                      borderRadius: 8,
                      padding: isActive ? '9px 12px 9px 9px' : '9px 12px',
                      paddingRight: (isHovered || isMenuOpen) ? 32 : 12,
                      cursor: 'pointer',
                      transition: 'all 100ms ease',
                      boxSizing: 'border-box',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontFamily: inter,
                          fontSize: 12,
                          fontWeight: isActive ? 600 : 400,
                          color: isActive ? '#191919' : '#888078',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {collection.name}
                      </div>
                      <div
                        style={{
                          fontFamily: inter,
                          fontSize: 10,
                          color: '#888078',
                          marginTop: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {[collection.season, `${collection.pieceCount} piece${collection.pieceCount !== 1 ? 's' : ''}`].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    {collection.avgScore != null && (
                      <span
                        style={{
                          fontFamily: sohne,
                          fontSize: 14,
                          color: '#A8B475',
                          marginLeft: 8,
                          flexShrink: 0,
                        }}
                      >
                        {collection.avgScore}
                      </span>
                    )}
                  </button>

                  {/* Ellipsis button — appears on hover */}
                  {(isHovered || isMenuOpen) && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setMenuOpenFor(isMenuOpen ? null : collection.name); }}
                      style={{
                        position: 'absolute',
                        right: 8,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 20,
                        height: 20,
                        borderRadius: 4,
                        background: 'rgba(255,255,255,0.9)',
                        border: '0.5px solid rgba(67,67,43,0.14)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        color: 'rgba(67,67,43,0.55)',
                        letterSpacing: '0.04em',
                        lineHeight: 1,
                        padding: 0,
                        zIndex: 2,
                      }}
                      title="More options"
                    >
                      ···
                    </button>
                  )}

                  {/* Delete popover */}
                  {isMenuOpen && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        background: '#FFFFFF',
                        border: '1px solid #E2DDD6',
                        borderRadius: 8,
                        boxShadow: '0 6px 20px rgba(25,25,25,0.1)',
                        zIndex: 30,
                        overflow: 'hidden',
                        minWidth: 160,
                        marginTop: 4,
                      }}
                    >
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteCollection(collection.name); }}
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
                        Delete collection
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Spacer + New Collection at bottom */}
        <div style={{ flexShrink: 0, marginTop: 12 }}>
          <NewCollectionButton onClick={handleStartCollection} />
        </div>
      </aside>

      <main
        style={{
          flex: 1,
          height: '100vh',
          position: 'relative',
          background: '#FAF9F6',
          overflowY: 'auto',
        }}
      >
        {activeCollection && userId ? (
          <CollectionPage
            collectionName={activeCollection}
            season={activeCollectionMeta?.season ?? null}
            userId={userId}
            onNewPiece={handleNewPiece}
            onPieceDeleted={() => loadCollections(userId)}
          />
        ) : (
          <EmptyState onStart={handleStartCollection} />
        )}
      </main>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function NewCollectionButton({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        padding: '9px 12px',
        border: `1px dashed ${hovered ? '#A8B475' : '#E2DDD6'}`,
        borderRadius: 8,
        background: 'transparent',
        cursor: 'pointer',
        transition: 'all 200ms ease',
        boxSizing: 'border-box',
      }}
    >
      <span
        style={{
          fontFamily: inter,
          fontSize: 16,
          color: hovered ? '#A8B475' : '#888078',
          lineHeight: 1,
        }}
      >
        +
      </span>
      <span
        style={{
          fontFamily: inter,
          fontSize: 12,
          color: hovered ? '#A8B475' : '#888078',
        }}
      >
        New Collection
      </span>
    </button>
  );
}

function EmptyState({ onStart }: { onStart: () => void }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 12,
        padding: 40,
      }}
    >
      <p
        style={{
          fontFamily: inter,
          fontSize: 14,
          color: '#A8A09A',
          margin: 0,
          textAlign: 'center',
        }}
      >
        Select a collection to view its pieces and insights.
      </p>

      <button
        onClick={onStart}
        style={{
          background: '#A8B475',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: 8,
          padding: '10px 18px',
          cursor: 'pointer',
          fontFamily: inter,
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        Start New Collection
      </button>
    </div>
  );
}
