'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { createClient } from '@/lib/supabase/client';
import { useSessionStore } from '@/lib/store/sessionStore';
import CollectionPage from '@/components/collections/CollectionPage';
import { BRAND } from '@/lib/concept-studio/constants';
import {
  hydrateCollectionContextFromAnalysis,
  restoreCollectionContextFromCache,
} from '@/lib/collections/hydrateCollectionContext';
import { resetCollectionScopedSession } from '@/lib/collections/resetCollectionScopedSession';
import { getLatestCollectionContextRow } from '@/lib/collections/getLatestCollectionContextRow';

const SIDEBAR_WIDTH = 272;
const OLIVE = BRAND.oliveInk;
const FLOW_BG = '#FAF9F6';
const inter = 'var(--font-inter), system-ui, sans-serif';
const sohne = 'var(--font-sohne-breit), system-ui, sans-serif';
const menuItemStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '10px 14px',
  textAlign: 'left',
  fontFamily: inter,
  fontSize: 13,
  fontWeight: 500,
  color: OLIVE,
  background: 'transparent',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  outline: 'none',
};

interface CollectionGroup {
  name: string;
  season: string | null;
}

function getNextDuplicateName(name: string, existingNames: string[]) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^${escaped}(?:\\s(\\d+))?$`);
  let highestSuffix = 1;

  for (const existingName of existingNames) {
    const match = existingName.match(pattern);
    if (!match) continue;

    const suffix = match[1] ? parseInt(match[1], 10) : 1;
    highestSuffix = Math.max(highestSuffix, suffix);
  }

  return `${name} ${highestSuffix + 1}`;
}

export default function CollectionsHubPage() {
  const router = useRouter();
  const { activeCollection, setActiveCollection, setCurrentStep } = useSessionStore();
  const [userId, setUserId] = useState<string | null>(null);
  const [collections, setCollections] = useState<CollectionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredCollection, setHoveredCollection] = useState<string | null>(null);
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);
  const [renamingCollection, setRenamingCollection] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameLoading, setRenameLoading] = useState(false);
  const [duplicatingCollection, setDuplicatingCollection] = useState<string | null>(null);

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
          if (!existing.season && row.season) existing.season = row.season;
          continue;
        }

        groups.set(name, {
          name,
          season: row.season ?? null,
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
    const run = async () => {
      if (activeCollection) {
        const activeMeta = collections.find((collection) => collection.name === activeCollection);
        resetCollectionScopedSession(activeCollection, activeMeta?.season ?? null);
        restoreCollectionContextFromCache(activeCollection);
        const data = userId
          ? await getLatestCollectionContextRow(userId, activeCollection)
          : null;

        hydrateCollectionContextFromAnalysis(activeCollection, data);

        try {
          localStorage.setItem('muko_collectionName', activeCollection);
          if (activeMeta?.season ?? data?.season) {
            localStorage.setItem('muko_seasonLabel', activeMeta?.season ?? data?.season ?? '');
          }
        } catch {}
      }

      setCurrentStep(2);
      router.push('/pieces');
    };

    void run();
  }, [activeCollection, collections, router, setCurrentStep, userId]);

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

  const handleRenameCollection = useCallback(async () => {
    if (!userId || !renamingCollection || !renameValue.trim()) return;

    setRenameLoading(true);
    const supabase = createClient();

    await supabase
      .from('analyses')
      .update({ collection_name: renameValue.trim(), updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('collection_name', renamingCollection);

    await loadCollections(userId);
    setRenamingCollection(null);
    setRenameValue('');
    setRenameLoading(false);
  }, [loadCollections, renameValue, renamingCollection, userId]);

  const handleDuplicateCollection = useCallback(async (name: string, season: string | null) => {
    if (!userId) return;

    const supabase = createClient();
    const newName = getNextDuplicateName(
      name,
      collections.map((collection) => collection.name)
    );

    const { data: rows, error } = await supabase
      .from('analyses')
      .select('*')
      .eq('user_id', userId)
      .eq('collection_name', name);

    if (error || !rows?.length) {
      console.error('Failed to load collection rows for duplication.', error);
      return;
    }

    const now = new Date().toISOString();
    const duplicated = rows.map((row) => {
      const rest = { ...row };
      delete rest.id;
      delete rest.created_at;
      delete rest.updated_at;

      return {
        ...rest,
        season: row.season ?? season,
        collection_name: newName,
        created_at: now,
        updated_at: now,
      };
    });

    const { error: insertError } = await supabase.from('analyses').insert(duplicated);
    if (insertError) {
      console.error('Failed to duplicate collection.', insertError);
      return;
    }

    await loadCollections(userId);
    resetCollectionScopedSession(newName, season);
    setActiveCollection(newName);
  }, [collections, loadCollections, setActiveCollection, userId]);

  const activeCollectionMeta = collections.find((collection) => collection.name === activeCollection) ?? null;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: FLOW_BG,
        display: 'flex',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <aside
        style={{
          width: SIDEBAR_WIDTH,
          minWidth: SIDEBAR_WIDTH,
          background: FLOW_BG,
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
        {/* Logo */}
        <button
          type="button"
          onClick={() => router.push('/entry')}
          aria-label="Go to entry page"
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: '#4D302F',
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

        <div
          style={{
            marginTop: 8,
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
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

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              overflowY: 'auto',
              flex: 1,
              minHeight: 0,
              paddingRight: 6,
            }}
          >
            {loading ? (
              <div
                style={{
                  textAlign: 'left',
                  fontSize: 13,
                  color: 'rgba(67,67,43,0.40)',
                  padding: '9px 12px',
                  fontFamily: inter,
                }}
              >
                Loading…
              </div>
            ) : collections.length === 0 ? (
              <div
                style={{
                  textAlign: 'left',
                  fontSize: 13,
                  color: 'rgba(67,67,43,0.40)',
                  padding: '9px 12px',
                  fontFamily: inter,
                }}
              >
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
                    onMouseLeave={() => {
                      setHoveredCollection(null);
                      if (!isMenuOpen) setMenuOpenFor(null);
                    }}
                  >
                    <button
                      onClick={() => {
                        setMenuOpenFor(null);
                        resetCollectionScopedSession(collection.name, collection.season);
                        setActiveCollection(collection.name);
                      }}
                      style={{
                        textAlign: 'left',
                        fontSize: 13,
                        color: isActive || isHovered ? OLIVE : 'rgba(67,67,43,0.58)',
                        backgroundColor: isActive || isHovered ? 'rgba(67,67,43,0.04)' : 'transparent',
                        border: 'none',
                        padding: '9px 12px',
                        paddingRight: 36,
                        cursor: 'pointer',
                        fontFamily: inter,
                        fontWeight: isActive ? 600 : 500,
                        borderRadius: 999,
                        transition: 'all 160ms ease',
                        width: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {collection.name}
                    </button>

                    {(isHovered || isMenuOpen) && (
                      <DropdownMenu.Root
                        open={isMenuOpen}
                        onOpenChange={(open) => {
                          setMenuOpenFor(open ? collection.name : null);
                        }}
                      >
                        <DropdownMenu.Trigger asChild>
                          <button
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              position: 'absolute',
                              right: 8,
                              top: '50%',
                              transform: 'translateY(-50%)',
                              width: 22,
                              height: 22,
                              borderRadius: 999,
                              background: 'rgba(255,255,255,0.9)',
                              border: '0.5px solid rgba(67,67,43,0.14)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 12,
                              color: 'rgba(67,67,43,0.55)',
                              letterSpacing: '0.04em',
                              lineHeight: 1,
                              padding: 0,
                              zIndex: 2,
                            }}
                            title="More options"
                            aria-label={`More options for ${collection.name}`}
                          >
                            ···
                          </button>
                        </DropdownMenu.Trigger>

                        <DropdownMenu.Portal>
                          <DropdownMenu.Content
                            side="bottom"
                            align="end"
                            sideOffset={6}
                            collisionPadding={12}
                            style={{
                              background: '#FFFFFF',
                              border: '1px solid rgba(67,67,43,0.1)',
                              borderRadius: 8,
                              boxShadow: '0 6px 20px rgba(25,25,25,0.1)',
                              zIndex: 80,
                              overflow: 'hidden',
                              minWidth: 188,
                              padding: 4,
                            }}
                          >
                            <DropdownMenu.Item
                              onSelect={() => {
                                setMenuOpenFor(null);
                                setRenameValue(collection.name);
                                setRenamingCollection(collection.name);
                              }}
                              style={menuItemStyle}
                            >
                              Rename collection
                            </DropdownMenu.Item>
                            <DropdownMenu.Item
                              disabled={duplicatingCollection === collection.name}
                              onSelect={async () => {
                                setMenuOpenFor(null);
                                setDuplicatingCollection(collection.name);
                                await handleDuplicateCollection(collection.name, collection.season);
                                setDuplicatingCollection(null);
                              }}
                              style={{
                                ...menuItemStyle,
                                opacity: duplicatingCollection === collection.name ? 0.5 : 1,
                                cursor: duplicatingCollection === collection.name ? 'default' : 'pointer',
                              }}
                            >
                              {duplicatingCollection === collection.name ? 'Duplicating…' : 'Duplicate collection'}
                            </DropdownMenu.Item>
                            <DropdownMenu.Item
                              onSelect={() => { handleDeleteCollection(collection.name); }}
                              style={{
                                ...menuItemStyle,
                                color: '#C47B6B',
                              }}
                            >
                              Delete collection
                            </DropdownMenu.Item>
                          </DropdownMenu.Content>
                        </DropdownMenu.Portal>
                      </DropdownMenu.Root>
                    )}
                  </div>
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
            onPieceDeleted={() => loadCollections(userId)}
          />
        ) : (
          <EmptyState onStart={handleStartCollection} />
        )}
      </main>

      {renamingCollection && (
        <div
          onClick={() => {
            if (renameLoading) return;
            setRenamingCollection(null);
            setRenameValue('');
          }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(25,25,25,0.28)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            zIndex: 60,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 420,
              boxSizing: 'border-box',
              background: '#FFFFFF',
              borderRadius: 14,
              boxShadow: '0 18px 48px rgba(25,25,25,0.16)',
              border: '1px solid rgba(25,25,25,0.08)',
              padding: 20,
            }}
          >
            <h2
              style={{
                margin: 0,
                fontFamily: inter,
                fontSize: 14,
                fontWeight: 600,
                color: '#191919',
              }}
            >
              Rename collection
            </h2>

            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleRenameCollection();
                }

                if (e.key === 'Escape') {
                  e.preventDefault();
                  if (renameLoading) return;
                  setRenamingCollection(null);
                  setRenameValue('');
                }
              }}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                marginTop: 14,
                borderRadius: 10,
                border: '1px solid rgba(25,25,25,0.12)',
                padding: '11px 12px',
                fontFamily: inter,
                fontSize: 13,
                color: '#191919',
                outline: 'none',
              }}
            />

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
                marginTop: 16,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  if (renameLoading) return;
                  setRenamingCollection(null);
                  setRenameValue('');
                }}
                style={{
                  border: '1px solid rgba(25,25,25,0.12)',
                  background: 'transparent',
                  color: '#191919',
                  borderRadius: 10,
                  padding: '10px 14px',
                  fontFamily: inter,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: renameLoading ? 'default' : 'pointer',
                  opacity: renameLoading ? 0.6 : 1,
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={renameLoading}
                onClick={() => { void handleRenameCollection(); }}
                style={{
                  border: 'none',
                  background: '#191919',
                  color: '#FFFFFF',
                  borderRadius: 10,
                  padding: '10px 14px',
                  fontFamily: inter,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: renameLoading ? 'default' : 'pointer',
                  opacity: renameLoading ? 0.7 : 1,
                }}
              >
                {renameLoading ? 'Renaming…' : 'Rename'}
              </button>
            </div>
          </div>
        </div>
      )}

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
        transition: 'all 200ms ease',
        fontFamily: sohne,
        fontWeight: 600,
        letterSpacing: '0.01em',
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
