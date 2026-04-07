'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionStore } from '@/lib/store/sessionStore';
import { createClient } from '@/lib/supabase/client';
import { BRAND } from '@/lib/concept-studio/constants';
import { resetCollectionScopedSession } from '@/lib/collections/resetCollectionScopedSession';

/* ─── Design tokens — match Intent / Concept / Spec / Report ─────────────── */
const OLIVE = BRAND.oliveInk; // #43432B
const CHARTREUSE = '#A8B475';
const STEEL = BRAND.steelBlue; // #7D96AC
const FLOW_BG = '#FAF9F6';
const inter = 'var(--font-inter), system-ui, sans-serif';
const sohne = 'var(--font-sohne-breit), system-ui, sans-serif';

interface RecentCollectionItem {
  id: string;
  name: string;
}

export default function EntryScreen() {
  const router = useRouter();
  const store = useSessionStore();

  const allSeasons = useMemo(
    () => [
      { id: 'fw26', label: 'FW 2026' },
      { id: 'ss27', label: 'SS 2027' },
    ],
    []
  );

  const [collectionName, setCollectionName] = useState(() => store.collectionName || 'Spring Requiem');
  const [selectedSeason, setSelectedSeason] = useState<string | null>(() => {
    const storeSeason = store.season;
    if (storeSeason) {
      const match = allSeasons.find((s) => s.label === storeSeason);
      if (match) return match.id;
    }
    return 'fw26';
  });
  const [touchedName, setTouchedName] = useState(false);
  const [touchedSeason, setTouchedSeason] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [savedCollections, setSavedCollections] = useState<RecentCollectionItem[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [hoveredCollection, setHoveredCollection] = useState<string | null>(null);
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);

  const recentCollections = useMemo(() => {
    const names = new Set<string>();

    if (collectionName.trim()) names.add(collectionName.trim());
    savedCollections.forEach((collection) => names.add(collection.name));

    return Array.from(names).map((name) => ({ id: name, name }));
  }, [collectionName, savedCollections]);

  const nameError = touchedName && !collectionName.trim() ? 'Please enter a collection name.' : '';
  const seasonError = touchedSeason && !selectedSeason ? 'Please select a season.' : '';
  const canContinue = !!collectionName.trim() && !!selectedSeason;

  const {
    setSeason,
    setCollectionName: setStoreCollectionName,
    setCurrentStep,
    setActiveCollection,
  } = store;

  const resetForNewCollection = () => {
    setCollectionName('');
    setSelectedSeason('fw26');
    setTouchedName(false);
    setTouchedSeason(false);
    const { assortmentInsightCache } = useSessionStore.getState();
    useSessionStore.getState().resetSession();
    useSessionStore.setState({ activeCollection: null, assortmentInsightCache });
    try {
      window.localStorage.removeItem('muko_collectionName');
      window.localStorage.removeItem('muko_seasonLabel');
      window.localStorage.removeItem('muko_collection_aesthetic');
      window.localStorage.removeItem('muko_aesthetic_inflection');
      window.localStorage.removeItem('muko_intent');
    } catch {}
  };

  useEffect(() => {
    try {
      const savedName = window.localStorage.getItem('muko_collectionName')?.trim();
      const savedSeason = window.localStorage.getItem('muko_seasonLabel')?.trim();

      if (savedName) {
        setCollectionName(savedName);
        setStoreCollectionName(savedName);
      }

      if (savedSeason) {
        const match = allSeasons.find((season) => season.label === savedSeason);
        if (match) {
          setSelectedSeason(match.id);
          setSeason(savedSeason);
        }
      }
    } catch {}
  }, [allSeasons, setActiveCollection, setSeason, setStoreCollectionName]);

  useEffect(() => {
    let cancelled = false;

    const loadSavedCollections = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      setUserId(user.id);

      const { data } = await supabase
        .from('analyses')
        .select('collection_name, created_at')
        .eq('user_id', user.id)
        .not('collection_name', 'is', null)
        .order('created_at', { ascending: false });

      if (!data || cancelled) return;

      const seen = new Set<string>();
      const nextCollections: RecentCollectionItem[] = [];

      for (const row of data) {
        const name = (row.collection_name as string | null)?.trim();
        if (!name || seen.has(name)) continue;
        seen.add(name);
        nextCollections.push({ id: name, name });
      }

      setSavedCollections(nextCollections);
    };

    loadSavedCollections();

    const refreshCollections = () => {
      loadSavedCollections();
    };

    window.addEventListener('focus', refreshCollections);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', refreshCollections);
    };
  }, []);

  const handleOpenCollection = (name: string) => {
    resetCollectionScopedSession(name, null);
    setCollectionName(name);
    setStoreCollectionName(name);
    setActiveCollection(name);
    try {
      window.localStorage.setItem('muko_collectionName', name);
    } catch {}
    router.push('/collections');
  };

  const handleDeleteCollection = async (name: string) => {
    if (!userId) return;
    setMenuOpenFor(null);
    const supabase = createClient();
    await supabase.from('analyses').delete().eq('user_id', userId).eq('collection_name', name);
    setSavedCollections((prev) => prev.filter((c) => c.name !== name));
    if (collectionName.trim() === name) {
      setCollectionName('');
    }
  };

  const handleContinue = () => {
    setTouchedName(true);
    setTouchedSeason(true);
    if (!canContinue) return;
    const nextCollectionName = collectionName.trim();
    window.localStorage.setItem('muko_collectionName', nextCollectionName);
    const seasonLabel = allSeasons.find((s) => s.id === selectedSeason)?.label ?? '';
    window.localStorage.setItem('muko_seasonLabel', seasonLabel);
    window.localStorage.removeItem('muko_collection_aesthetic');
    window.localStorage.removeItem('muko_aesthetic_inflection');
    window.localStorage.removeItem('muko_intent');
    useSessionStore.getState().resetSession();
    setStoreCollectionName(nextCollectionName);
    setActiveCollection(nextCollectionName);
    setSeason(seasonLabel);
    setCurrentStep(2);
    router.push('/intent');
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') handleContinue();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionName, selectedSeason]);

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
      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside
        style={{
          width: 272,
          minWidth: 272,
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

        {/* New Collection button */}
        <NewCollectionButton onClick={resetForNewCollection} />

        {/* Recents */}
        <div style={{ marginTop: 8 }}>
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {recentCollections.length > 0 ? (
              recentCollections.map((collection) => {
                const isHovered = hoveredCollection === collection.id;
                const isMenuOpen = menuOpenFor === collection.id;

                return (
                  <div
                    key={collection.id}
                    style={{ position: 'relative' }}
                    onMouseEnter={() => setHoveredCollection(collection.id)}
                    onMouseLeave={() => { setHoveredCollection(null); if (!isMenuOpen) setMenuOpenFor(null); }}
                  >
                    <button
                      onClick={() => { setMenuOpenFor(null); handleOpenCollection(collection.name); }}
                      style={{
                        textAlign: 'left',
                        fontSize: 13,
                        color: isHovered ? OLIVE : 'rgba(67,67,43,0.58)',
                        backgroundColor: isHovered ? 'rgba(67,67,43,0.04)' : 'transparent',
                        border: 'none',
                        padding: '9px 12px',
                        paddingRight: 36,
                        cursor: 'pointer',
                        fontFamily: inter,
                        fontWeight: 500,
                        borderRadius: 8,
                        transition: 'all 160ms ease',
                        width: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {collection.name}
                    </button>

                    {/* Ellipsis button — appears on hover */}
                    {(isHovered || isMenuOpen) && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setMenuOpenFor(isMenuOpen ? null : collection.id); }}
                        style={{
                          position: 'absolute',
                          right: 8,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: 22,
                          height: 22,
                          borderRadius: 5,
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
                          border: '1px solid rgba(67,67,43,0.1)',
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
            ) : (
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
            )}
          </div>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────────────────── */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '80px clamp(40px, 6vw, 100px)',
          minHeight: '100vh',
          position: 'relative',
          zIndex: 5,
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 720,
            display: 'flex',
            flexDirection: 'column',
            gap: 48,
          }}
        >
          {/* Hero */}
          <div style={{ animation: 'fadeIn 450ms ease both' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                marginBottom: 12,
              }}
            >
              <img
                src="/mlogo.svg"
                alt="Muko logo"
                style={{
                  width: 48,
                  height: 48,
                  flexShrink: 0,
                }}
              />
              <h1
                style={{
                  fontSize: 'clamp(32px, 4vw, 44px)',
                  fontWeight: 500,
                  color: '#4D302F',
                  lineHeight: 1.1,
                  letterSpacing: '-0.015em',
                  fontFamily: '"Söhne Breit", var(--font-sohne-breit), system-ui, sans-serif',
                  margin: 0,
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  display: 'inline-block',
                  width: '26ch',
                  maxWidth: '100%',
                  borderRight: '1.5px solid rgba(67,67,43,0.55)',
                  animation: 'typeLoop 5.2s steps(26, end) infinite, caretBlink 850ms step-end infinite',
                }}
              >
                Let&apos;s shape your next drop.
              </h1>
            </div>
          </div>

          {/* Form */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 36,
              animation: 'fadeIn 500ms ease 120ms both',
            }}
          >
            {/* Collection Name */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 10,
                  fontWeight: 700,
                  color: 'rgba(67,67,43,0.38)',
                  marginBottom: 12,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  fontFamily: inter,
                }}
              >
                Collection name
              </label>

              <input
                type="text"
                value={collectionName}
                onChange={(e) => setCollectionName(e.target.value)}
                onBlur={() => setTouchedName(true)}
                onFocus={() => setInputFocused(true)}
                onBlurCapture={() => setInputFocused(false)}
                placeholder="e.g. Spring Requiem"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '18px 22px',
                  fontSize: 'clamp(20px, 2.5vw, 26px)',
                  fontWeight: 500,
                  color: OLIVE,
                  backgroundColor: 'rgba(255,255,255,0.75)',
                  border: inputFocused
                    ? `1.5px solid ${STEEL}`
                    : '1.5px solid rgba(67,67,43,0.10)',
                  borderRadius: 999,
                  outline: 'none',
                  fontFamily: sohne,
                  letterSpacing: '-0.01em',
                  transition: 'all 200ms ease',
                  boxShadow: inputFocused
                    ? '0 4px 20px rgba(125,150,172,0.10)'
                    : '0 2px 8px rgba(0,0,0,0.04)',
                }}
              />

              {nameError && (
                <div
                  style={{
                    marginTop: 10,
                    fontSize: 12,
                    fontWeight: 600,
                    color: BRAND.rose,
                    fontFamily: inter,
                  }}
                >
                  {nameError}
                </div>
              )}
            </div>

            {/* Season Selection */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 10,
                  fontWeight: 700,
                  color: 'rgba(67,67,43,0.38)',
                  marginBottom: 14,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  fontFamily: inter,
                }}
              >
                Select a season
              </label>

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 10,
                }}
              >
                {allSeasons.map((season) => {
                  const active = selectedSeason === season.id;
                  return (
                    <SeasonChip
                      key={season.id}
                      label={season.label}
                      active={active}
                      onClick={() => {
                        setSelectedSeason(season.id);
                        setTouchedSeason(true);
                      }}
                    />
                  );
                })}
              </div>

              {seasonError && (
                <div
                  style={{
                    marginTop: 10,
                    fontSize: 12,
                    fontWeight: 600,
                    color: BRAND.rose,
                    fontFamily: inter,
                  }}
                >
                  {seasonError}
                </div>
              )}
            </div>

            {/* CTA */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                animation: 'fadeIn 500ms ease 220ms both',
              }}
            >
              <button
                onClick={handleContinue}
                disabled={!canContinue}
                style={{
                  padding: '14px 40px',
                  fontSize: 12,
                  fontWeight: 700,
                  color: canContinue ? STEEL : 'rgba(67,67,43,0.30)',
                  background: canContinue ? 'rgba(125,150,172,0.07)' : 'rgba(255,255,255,0.46)',
                  border: canContinue
                    ? `1.5px solid ${STEEL}`
                    : '1.5px solid rgba(67,67,43,0.10)',
                  borderRadius: 10,
                  cursor: canContinue ? 'pointer' : 'not-allowed',
                  fontFamily: sohne,
                  letterSpacing: '0.02em',
                  transition: 'all 280ms ease',
                  opacity: canContinue ? 1 : 0.65,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
                onMouseEnter={(e) => {
                  if (!canContinue) return;
                  e.currentTarget.style.background = 'rgba(125,150,172,0.14)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  if (!canContinue) return;
                  e.currentTarget.style.background = 'rgba(125,150,172,0.07)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <span>Continue</span>
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 16 16"
                  fill="none"
                  style={{ opacity: canContinue ? 1 : 0.4 }}
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

              <div
                style={{
                  fontSize: 12,
                  color: 'rgba(67,67,43,0.45)',
                  fontFamily: inter,
                }}
              >
                Press{' '}
                <span
                  style={{
                    fontFamily: sohne,
                    color: 'rgba(67,67,43,0.70)',
                  }}
                >
                  Enter
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @keyframes typeLoop {
          0%,
          12% { width: 0; }
          52%,
          82% { width: 26ch; }
          100% { width: 0; }
        }

        @keyframes caretBlink {
          0%, 100% { border-right-color: rgba(67,67,43,0.55); }
          50% { border-right-color: transparent; }
        }
      `}</style>
    </div>
  );
}

/* ─── NewCollectionButton — matches workspace ghost button pattern ────────── */
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

/* ─── SeasonChip — pill-shaped, matches workspace color system ────────────── */
function SeasonChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '11px 20px',
        fontSize: 13,
        fontWeight: 600,
        color: active ? OLIVE : hovered ? 'rgba(67,67,43,0.72)' : 'rgba(67,67,43,0.55)',
        backgroundColor: active
          ? 'rgba(168,180,117,0.12)'
          : hovered
          ? 'rgba(255,255,255,0.90)'
          : 'rgba(255,255,255,0.75)',
        border: active
          ? `1.5px solid ${CHARTREUSE}`
          : hovered
          ? '1.5px solid rgba(67,67,43,0.18)'
          : '1.5px solid rgba(67,67,43,0.10)',
        borderRadius: 999,
        cursor: 'pointer',
        fontFamily: sohne,
        letterSpacing: '0.01em',
        transition: 'all 200ms ease',
        boxShadow: active
          ? '0 2px 8px rgba(168,180,117,0.12)'
          : '0 2px 8px rgba(0,0,0,0.04)',
        transform: active ? 'translateY(-1px)' : 'translateY(0)',
        whiteSpace: 'nowrap',
        outline: 'none',
      }}
    >
      {label}
    </button>
  );
}
