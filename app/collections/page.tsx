'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useSessionStore } from '@/lib/store/sessionStore';
import CollectionPage from '@/components/collections/CollectionPage';

const SIDEBAR_WIDTH = 272;
const OLIVE = '#43432B';
const inter = 'var(--font-inter), system-ui, sans-serif';
const sohne = 'var(--font-sohne-breit), system-ui, sans-serif';

interface CollectionGroup {
  name: string;
  season: string | null;
  pieceCount: number;
  lastUpdated: string;
}

export default function CollectionsHubPage() {
  const router = useRouter();
  const { activeCollection, setActiveCollection, setCurrentStep } = useSessionStore();
  const [userId, setUserId] = useState<string | null>(null);
  const [collections, setCollections] = useState<CollectionGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCollections = useCallback(async (uid: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from('analyses')
      .select('collection_name, season, created_at')
      .eq('user_id', uid)
      .not('collection_name', 'is', null)
      .order('created_at', { ascending: false });

    if (data) {
      const groups = new Map<string, CollectionGroup>();

      for (const row of data) {
        const name = row.collection_name as string;
        const existing = groups.get(name);

        if (existing) {
          existing.pieceCount += 1;
          if (row.created_at > existing.lastUpdated) existing.lastUpdated = row.created_at;
          if (!existing.season && row.season) existing.season = row.season;
          continue;
        }

        groups.set(name, {
          name,
          season: row.season ?? null,
          pieceCount: 1,
          lastUpdated: row.created_at,
        });
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
    setActiveCollection(null);
    useSessionStore.getState().setCollectionName('');
    try {
      localStorage.removeItem('muko_collectionName');
      localStorage.removeItem('muko_seasonLabel');
      localStorage.removeItem('muko_collection_aesthetic');
      localStorage.removeItem('muko_aesthetic_inflection');
      localStorage.removeItem('muko_intent');
    } catch {}
    router.push('/entry');
  }, [router, setActiveCollection]);

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
          background: 'rgba(250,249,246,0.98)',
          borderRight: '1px solid rgba(67,67,43,0.09)',
          padding: '40px 28px',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          zIndex: 10,
          height: '100vh',
          overflow: 'hidden',
          animation: 'fadeIn 400ms ease both',
        }}
      >
        <button
          onClick={() => router.push('/entry')}
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: OLIVE,
            marginBottom: 44,
            fontFamily: sohne,
            letterSpacing: '-0.02em',
            margin: '0 0 44px 0',
            padding: 0,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            width: 'fit-content',
          }}
        >
          muko
        </button>

        <NewCollectionButton onClick={handleStartCollection} />

        <div style={{ marginTop: 8, minHeight: 0, display: 'flex', flexDirection: 'column', flex: 1 }}>
          <h2
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: 'rgba(67,67,43,0.38)',
              marginBottom: 16,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              fontFamily: inter,
              margin: '0 0 16px 0',
            }}
          >
            Recents
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto', paddingRight: 4, flex: 1, minHeight: 0 }}>
            {loading ? (
              <div
                style={{
                  fontSize: 13,
                  color: '#A8A09A',
                  fontFamily: inter,
                  padding: '9px 12px',
                }}
              >
                Loading…
              </div>
            ) : collections.length === 0 ? (
              <div
                style={{
                  fontSize: 13,
                  color: '#A8A09A',
                  fontFamily: inter,
                  padding: '9px 12px',
                  lineHeight: 1.5,
                }}
              >
                No collections yet.
              </div>
            ) : (
              collections.map((collection) => {
                const isActive = activeCollection === collection.name;

                return (
                  <button
                    key={collection.name}
                    onClick={() => setActiveCollection(collection.name)}
                    style={{
                      textAlign: 'left',
                      fontSize: 13,
                      color: isActive ? '#191919' : '#A8A09A',
                      backgroundColor: 'transparent',
                      border: 'none',
                      borderLeft: isActive ? '3px solid #A8B475' : '3px solid transparent',
                      padding: '9px 12px',
                      cursor: 'pointer',
                      fontFamily: inter,
                      fontWeight: 500,
                      borderRadius: 8,
                      transition: 'all 160ms ease',
                    }}
                    onMouseEnter={(event) => {
                      if (isActive) return;
                      event.currentTarget.style.backgroundColor = 'rgba(67,67,43,0.04)';
                      event.currentTarget.style.color = OLIVE;
                    }}
                    onMouseLeave={(event) => {
                      if (isActive) return;
                      event.currentTarget.style.backgroundColor = 'transparent';
                      event.currentTarget.style.color = '#A8A09A';
                    }}
                  >
                    {collection.name}
                  </button>
                );
              })
            )}
          </div>
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
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 12,
        color: hovered ? OLIVE : 'rgba(67,67,43,0.62)',
        backgroundColor: hovered ? 'rgba(67,67,43,0.04)' : 'transparent',
        border: '1px solid rgba(67,67,43,0.14)',
        padding: '9px 16px',
        borderRadius: 999,
        marginBottom: 28,
        cursor: 'pointer',
        fontFamily: sohne,
        fontWeight: 600,
        letterSpacing: '0.01em',
        transition: 'all 200ms ease',
        width: 'fit-content',
      }}
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path
          d="M6 2.5V9.5M2.5 6H9.5"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>
      <span>New Collection</span>
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
