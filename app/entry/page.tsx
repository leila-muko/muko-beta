'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSessionStore } from '@/lib/store/sessionStore';
import { createClient } from '@/lib/supabase/client';
import { BRAND } from '@/lib/concept-studio/constants';
import { resetCollectionScopedSession } from '@/lib/collections/resetCollectionScopedSession';
import { MukoWordmark } from '@/components/MukoWordmark';

/* ─── Design tokens — match Intent / Concept / Spec / Report ─────────────── */
const FLOW_BG = '#F8F3EE';
const ESPRESSO = '#4E2F2E';
const BORDER = 'rgba(78,47,46,0.12)';
const BORDER_STRONG = 'rgba(78,47,46,0.22)';
const inter = 'var(--font-inter), system-ui, sans-serif';
const sohne = 'var(--font-sohne-breit), system-ui, sans-serif';
interface RecentCollectionItem {
  id: string;
  name: string;
}

function EntryScreenContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const store = useSessionStore();
  const isFreshEntry = searchParams.get('fresh') === '1';

  const allSeasons = useMemo(
    () => [
      { id: 'fw26', label: 'FW 2026' },
      { id: 'ss27', label: 'SS 2027' },
    ],
    []
  );

  const [collectionName, setCollectionName] = useState(() => (isFreshEntry ? '' : store.collectionName || ''));
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
    if (isFreshEntry) {
      resetForNewCollection();
      router.replace('/entry');
      return;
    }

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
    if (store.collectionName.trim()) {
      setCollectionName(store.collectionName);
    }

    if (store.season) {
      const match = allSeasons.find((season) => season.label === store.season);
      if (match) {
        setSelectedSeason(match.id);
      }
    }
  }, [allSeasons, isFreshEntry, router, setSeason, setStoreCollectionName, store.collectionName, store.season]);

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
    router.push(`/collections?collection=${encodeURIComponent(name)}`);
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
        height: '100dvh',
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
          background: 'rgba(248,243,238,0.82)',
          borderRight: `1px solid ${BORDER}`,
          padding: '38px 28px 32px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          zIndex: 10,
          height: '100%',
          overflow: 'hidden',
          animation: 'fadeIn 400ms ease both',
          backdropFilter: 'blur(14px)',
        }}
      >
        {/* Logo */}
        <MukoWordmark
          onClick={() => router.push('/entry')}
          color="#4D302F"
          marginBottom={44}
          style={{ margin: '0 0 44px 0' }}
        />

        {/* New Collection button */}
        <NewCollectionButton
          onClick={() => {
            resetForNewCollection();
            router.replace('/entry?fresh=1');
          }}
        />

        {/* Recents */}
        <div style={{ marginTop: 8 }}>
          <h2
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: 'rgba(78,47,46,0.42)',
              marginBottom: 18,
              letterSpacing: '0.16em',
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
                        color: isHovered ? ESPRESSO : 'rgba(78,47,46,0.58)',
                        backgroundColor: isHovered ? 'rgba(255,255,255,0.46)' : 'transparent',
                        border: 'none',
                        padding: '10px 12px',
                        paddingRight: 36,
                        cursor: 'pointer',
                        fontFamily: inter,
                        fontWeight: 500,
                        borderRadius: 16,
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
                          borderRadius: 999,
                          background: 'rgba(255,255,255,0.78)',
                          border: `0.5px solid ${BORDER}`,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 12,
                          color: 'rgba(78,47,46,0.52)',
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
                          border: `1px solid ${BORDER}`,
                          borderRadius: 12,
                          boxShadow: '0 10px 28px rgba(78,47,46,0.08)',
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
                  color: 'rgba(78,47,46,0.42)',
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
        className="entry-main"
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          padding: '72px clamp(36px, 7vw, 112px)',
          boxSizing: 'border-box',
          height: '100%',
          position: 'relative',
          zIndex: 5,
          overflow: 'hidden',
        }}
      >
        <div
          aria-hidden="true"
          className="entry-atmosphere"
          style={{
            position: 'absolute',
            right: '-6%',
            top: '10%',
            width: 'min(54vw, 820px)',
            height: 'min(70vh, 760px)',
            pointerEvents: 'none',
            opacity: 1,
          }}
        />
        <div
          className="entry-shell"
          style={{
            width: '100%',
            maxWidth: 1240,
            display: 'flex',
            justifyContent: 'flex-start',
            position: 'relative',
            zIndex: 1,
            minHeight: '100%',
            alignItems: 'center',
          }}
        >
          <div
            className="entry-content"
            style={{
              width: '100%',
              maxWidth: 760,
              position: 'relative',
            }}
          >
            <div style={{ animation: 'fadeIn 450ms ease both' }}>
              <h1
                className="entry-headline-blur-line"
                style={{
                  fontSize: 'clamp(2.9rem, 5.2vw, 5rem)',
                  fontWeight: 300,
                  color: ESPRESSO,
                  lineHeight: 0.94,
                  letterSpacing: '-0.04em',
                  fontFamily: '"Söhne Breit", var(--font-sohne-breit), Georgia, serif',
                  margin: 0,
                  maxWidth: '10.5ch',
                  whiteSpace: 'normal',
                }}
              >
                the intentional collection.
              </h1>
            </div>

            {/* Form */}
            <div
              className="entry-form-stack"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 42,
                marginTop: 54,
              }}
            >
              <div className="entry-input-fade">
                <label
                  style={{
                    display: 'block',
                    marginBottom: 18,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.22em',
                    textTransform: 'uppercase',
                    color: 'rgba(117,94,89,0.68)',
                    fontFamily: inter,
                  }}
                >
                  What are you building?
                </label>
                <div
                  className="entry-name-row"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 20,
                    width: '100%',
                    maxWidth: '680px',
                  }}
                >
                  <Image
                    src="/mlogo.svg"
                    alt="Muko logo"
                    width={46}
                    height={46}
                    style={{
                      width: 46,
                      height: 46,
                      opacity: 0.14,
                      flexShrink: 0,
                      pointerEvents: 'none',
                    }}
                  />
                  <input
                    type="text"
                    value={collectionName}
                    onChange={(e) => setCollectionName(e.target.value)}
                    placeholder="e.g. Spring Requiem"
                    style={{
                      flex: 1,
                      minWidth: 0,
                      boxSizing: 'border-box' as const,
                      padding: '0 0 16px 0',
                      fontSize: 'clamp(2.1rem, 4.2vw, 3.4rem)',
                      fontWeight: 500,
                      color: ESPRESSO,
                      backgroundColor: 'transparent',
                      border: 'none',
                      borderBottom: `1px solid ${BORDER}`,
                      borderRadius: 0,
                      outline: 'none',
                      boxShadow: 'none',
                      WebkitAppearance: 'none' as const,
                      appearance: 'none' as const,
                      fontFamily: sohne,
                      letterSpacing: '-0.04em',
                      transition: 'border-color 200ms ease',
                      caretColor: ESPRESSO,
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderBottom = `1px solid ${BORDER_STRONG}`;
                    }}
                    onBlur={(e) => {
                      setTouchedName(true);
                      e.currentTarget.style.borderBottom = `1px solid ${BORDER}`;
                    }}
                  />
                </div>

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

              <div className="entry-bottom-fade" style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
                {/* Season Selection */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 10,
                      fontWeight: 700,
                      color: 'rgba(117,94,89,0.68)',
                      marginBottom: 18,
                      letterSpacing: '0.22em',
                      textTransform: 'uppercase',
                      fontFamily: inter,
                    }}
                  >
                    Select a season
                  </label>

                  <div
                    className="entry-season-row"
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 28,
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
                  <span
                    style={{
                      display: seasonError ? 'block' : 'none',
                      marginTop: 10,
                      fontSize: 12,
                      fontWeight: 600,
                      color: BRAND.rose,
                      fontFamily: inter,
                    }}
                  >
                    {seasonError}
                  </span>
                </div>

                {/* CTA */}
                <div
                  className="entry-cta-row"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 18,
                    flexWrap: 'wrap',
                  }}
                >
                  <button
                    onClick={handleContinue}
                    disabled={!canContinue}
                    style={{
                      padding: '13px 24px 13px 26px',
                      fontSize: 12,
                      fontWeight: 700,
                      color: canContinue ? ESPRESSO : 'rgba(78,47,46,0.34)',
                      background: canContinue ? 'rgba(255,255,255,0.52)' : 'rgba(255,255,255,0.34)',
                      border: canContinue
                        ? `1px solid ${BORDER_STRONG}`
                        : `1px solid ${BORDER}`,
                      borderRadius: 999,
                      cursor: canContinue ? 'pointer' : 'not-allowed',
                      fontFamily: inter,
                      letterSpacing: '0.16em',
                      textTransform: 'uppercase',
                      transition: 'all 220ms ease',
                      opacity: canContinue ? 1 : 0.65,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      boxShadow: canContinue ? '0 10px 24px rgba(111,76,73,0.05)' : 'none',
                      backdropFilter: 'blur(10px)',
                    }}
                    onMouseEnter={(e) => {
                      if (!canContinue) return;
                      e.currentTarget.style.background = 'rgba(255,255,255,0.66)';
                      e.currentTarget.style.borderColor = 'rgba(78,47,46,0.30)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      if (!canContinue) return;
                      e.currentTarget.style.background = 'rgba(255,255,255,0.52)';
                      e.currentTarget.style.borderColor = BORDER_STRONG;
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <span>Enter Studio</span>
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
                      fontSize: 11,
                      color: 'rgba(117,94,89,0.50)',
                      fontFamily: inter,
                      letterSpacing: '0.02em',
                    }}
                  >
                    Press{' '}
                    <span
                      style={{
                        fontFamily: sohne,
                        color: 'rgba(78,47,46,0.62)',
                      }}
                    >
                      Enter
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div
              className="entry-microcopy"
              style={{
                position: 'absolute',
                right: 'clamp(-440px, -26vw, -280px)',
                bottom: 'clamp(4px, 1.4vh, 16px)',
                fontFamily: inter,
                fontSize: 12,
                letterSpacing: '0.06em',
                color: 'rgba(94,64,58,0.4)',
                pointerEvents: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              A collection is a system of decisions.
              <span>Nothing is neutral. Everything is intentional.</span>
            </div>
          </div>

        </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @keyframes entryHeadlineBlurLine {
          0% {
            opacity: 0;
            filter: blur(10px);
            transform: translateY(8px);
          }
          100% {
            opacity: 1;
            filter: blur(0);
            transform: translateY(0);
          }
        }

        .entry-headline-blur-line {
          opacity: 0;
          will-change: transform, filter, opacity;
          animation: entryHeadlineBlurLine 900ms cubic-bezier(0.22, 1, 0.36, 1) 0.08s forwards;
        }

        @keyframes entryAtmosphereDrift {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(-1.5%, 1.2%, 0) scale(1.02); }
        }

        .entry-atmosphere::before,
        .entry-atmosphere::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 999px;
          animation: entryAtmosphereDrift 16s ease-in-out infinite;
        }

        .entry-atmosphere::before {
          background:
            radial-gradient(42% 42% at 62% 34%, rgba(236, 201, 207, 0.54) 0%, rgba(236, 201, 207, 0.24) 38%, rgba(236, 201, 207, 0.08) 58%, rgba(236, 201, 207, 0) 82%),
            radial-gradient(38% 38% at 74% 62%, rgba(226, 181, 188, 0.26) 0%, rgba(226, 181, 188, 0.09) 46%, rgba(226, 181, 188, 0) 78%);
          filter: blur(28px);
          opacity: 0.92;
        }

        .entry-atmosphere::after {
          inset: 8% 0 -2% 18%;
          background:
            radial-gradient(48% 44% at 56% 42%, rgba(244, 223, 226, 0.52) 0%, rgba(244, 223, 226, 0.24) 34%, rgba(244, 223, 226, 0.08) 58%, rgba(244, 223, 226, 0) 82%);
          filter: blur(52px);
          opacity: 0.78;
          animation-duration: 20s;
        }

        .entry-shell::before {
          content: '';
          position: absolute;
          inset: 7% auto 6% 0;
          width: min(62vw, 760px);
          background: linear-gradient(180deg, rgba(255,255,255,0.24), rgba(255,255,255,0.08));
          border-radius: 36px;
          opacity: 0.42;
          pointer-events: none;
        }

        .entry-name-row input::placeholder {
          color: rgba(117,94,89,0.34);
        }

        .entry-season-tab {
          position: relative;
        }

        .entry-season-tab::after {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          height: 1px;
          border-radius: 999px;
          background: rgba(78,47,46,0.12);
          transform-origin: center;
        }

        @media (max-width: 1180px) {
          .entry-main {
            padding: 56px clamp(28px, 5vw, 72px) !important;
          }

          .entry-atmosphere {
            right: -12% !important;
            width: min(58vw, 680px) !important;
            height: min(60vh, 620px) !important;
            opacity: 0.88 !important;
          }
        }

        @media (max-width: 1100px) {
          .entry-shell::before {
            width: min(72vw, 640px);
            inset: 6% auto 10% 0;
          }
        }

        @media (max-width: 900px) {
          .entry-main {
            padding: 44px 26px !important;
          }

          .entry-shell {
            align-items: flex-start !important;
          }

          .entry-content {
            padding-top: 36px;
          }

          .entry-form-stack {
            gap: 34px !important;
            margin-top: 42px !important;
          }

          .entry-season-row {
            gap: 22px !important;
          }
        }

        @media (max-width: 820px) {
          .entry-atmosphere {
            display: none !important;
          }

          .entry-shell::before {
            display: none;
          }
        }

        @media (max-width: 760px) {
          aside {
            width: 224px !important;
            min-width: 224px !important;
            padding: 28px 18px 22px !important;
          }

          .entry-name-row {
            gap: 14px !important;
          }

          .entry-name-row img {
            width: 38px !important;
            height: 38px !important;
          }

          .entry-cta-row {
            gap: 12px !important;
          }

          .entry-microcopy {
            display: none !important;
          }
        }

        @media (max-width: 640px) {
          aside {
            display: none !important;
          }

          .entry-main {
            padding: 36px 22px !important;
          }

          .entry-content {
            max-width: 100% !important;
            padding-top: 18px;
          }

          .entry-form-stack {
            gap: 28px !important;
            margin-top: 34px !important;
          }

          .entry-season-row {
            gap: 18px !important;
          }
        }
      `}</style>
      </main>
    </div>
  );
}

export default function EntryScreen() {
  return (
    <Suspense fallback={null}>
      <EntryScreenContent />
    </Suspense>
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
        color: hovered ? ESPRESSO : 'rgba(78,47,46,0.62)',
        backgroundColor: hovered ? 'rgba(255,255,255,0.54)' : 'transparent',
        border: `1px solid ${BORDER}`,
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
      className="entry-season-tab"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '0 0 10px 0',
        fontSize: 14,
        fontWeight: 600,
        color: active ? ESPRESSO : hovered ? 'rgba(78,47,46,0.74)' : 'rgba(117,94,89,0.72)',
        backgroundColor: 'transparent',
        border: 'none',
        borderRadius: 0,
        cursor: 'pointer',
        fontFamily: sohne,
        letterSpacing: '0.01em',
        transition: 'color 180ms ease, opacity 180ms ease',
        boxShadow: 'none',
        transform: 'translateY(0)',
        whiteSpace: 'nowrap',
        outline: 'none',
        opacity: active ? 1 : hovered ? 0.9 : 0.78,
        borderBottom: active ? `1px solid ${ESPRESSO}` : '1px solid transparent',
      }}
    >
      {label}
    </button>
  );
}
