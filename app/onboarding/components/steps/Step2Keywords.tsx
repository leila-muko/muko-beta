'use client';

import { useState } from 'react';
import keywordsData from '@/data/keywords.json';
import { BRAND } from '@/lib/concept-studio/constants';

const OLIVE = BRAND.oliveInk;
const STEEL = BRAND.steelBlue;
const CHARTREUSE = '#A8B475';
const inter = 'var(--font-inter), system-ui, sans-serif';
const sohne = 'var(--font-sohne-breit), system-ui, sans-serif';

const MAX_KEYWORDS = 6;

const CHIP_GROUPS = [
  { key: 'silhouette_form', label: 'SILHOUETTE & FORM',  keywords: keywordsData.silhouette_form },
  { key: 'mood_attitude',   label: 'MOOD & ATTITUDE',    keywords: keywordsData.mood_attitude },
  { key: 'surface_material',label: 'SURFACE & MATERIAL', keywords: keywordsData.surface_material },
];

interface StepProps {
  brandDescription: string;
  onBrandDescriptionChange: (value: string) => void;
  value: string[];
  onChange: (value: string[]) => void;
  onTensionContextChange: (context: string | null) => void;
}

export default function Step2Keywords({
  brandDescription,
  onBrandDescriptionChange,
  value,
  onChange,
  onTensionContextChange,
}: StepProps) {
  const [descFocused, setDescFocused] = useState(false);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [detectedConflict, setDetectedConflict] = useState<string[] | null>(null);
  const [resolvedConflicts, setResolvedConflicts] = useState<Set<string>>(new Set());

  const getConflictKey = (word1: string, word2: string) =>
    [word1, word2].sort().join('|');

  const checkForConflicts = (keyword: string, currentKeywords: string[]) => {
    const allKeywords = [...currentKeywords, keyword];
    for (const conflict of keywordsData.conflicts) {
      const [word1, word2] = conflict;
      if (allKeywords.includes(word1) && allKeywords.includes(word2)) {
        const conflictKey = getConflictKey(word1, word2);
        if (!resolvedConflicts.has(conflictKey)) {
          return [word1, word2];
        }
      }
    }
    return null;
  };

  const handleKeywordToggle = (keyword: string) => {
    if (value.includes(keyword)) {
      onChange(value.filter((k) => k !== keyword));
    } else {
      if (value.length >= MAX_KEYWORDS) return; // cap at 6
      const conflict = checkForConflicts(keyword, value);
      if (conflict) {
        setDetectedConflict(conflict);
        setShowConflictModal(true);
        onChange([...value, keyword]);
      } else {
        onChange([...value, keyword]);
      }
    }
  };

  const handleConflictResolved = (tensionContext: string) => {
    if (detectedConflict) {
      const conflictKey = getConflictKey(detectedConflict[0], detectedConflict[1]);
      setResolvedConflicts((prev) => new Set(prev).add(conflictKey));
    }
    onTensionContextChange(tensionContext);
    setShowConflictModal(false);
  };

  const descCharCount = brandDescription.length;
  const approxSentences = (brandDescription.match(/[.!?]+/g) || []).length;

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
        {/* ── Q3: Brand description ─────────────────────────────────────── */}
        <div>
          <div
            style={{
              fontFamily: sohne,
              fontSize: 15,
              fontWeight: 500,
              color: OLIVE,
              marginBottom: 6,
            }}
          >
            Describe your brand&apos;s aesthetic in 2–3 sentences.
          </div>
          <div
            style={{
              fontFamily: inter,
              fontSize: 12,
              fontStyle: 'italic',
              color: 'rgba(67,67,43,0.44)',
              marginBottom: 14,
            }}
          >
            What does it look like, feel like, stand for?
          </div>

          <textarea
            value={brandDescription}
            onChange={(e) => onBrandDescriptionChange(e.target.value)}
            onFocus={() => setDescFocused(true)}
            onBlur={() => setDescFocused(false)}
            placeholder={`Clean, body-conscious silhouettes in sustainable fabrics. The woman who buys us cares about how she looks and where her clothes come from — in that order.`}
            rows={4}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '16px 18px',
              fontSize: 14,
              fontWeight: 400,
              color: OLIVE,
              backgroundColor: 'rgba(255,255,255,0.75)',
              border: descFocused
                ? `1.5px solid ${STEEL}`
                : '1.5px solid rgba(67,67,43,0.10)',
              borderRadius: 10,
              outline: 'none',
              fontFamily: inter,
              lineHeight: 1.65,
              resize: 'vertical',
              transition: 'all 200ms ease',
              boxShadow: descFocused
                ? '0 4px 20px rgba(125,150,172,0.10)'
                : '0 2px 8px rgba(0,0,0,0.04)',
            }}
          />

          {brandDescription && (
            <div
              style={{
                marginTop: 8,
                fontSize: 12,
                color:
                  approxSentences > 3
                    ? 'rgba(169,123,143,0.80)'
                    : 'rgba(67,67,43,0.42)',
                fontFamily: inter,
              }}
            >
              {descCharCount} chars
              {approxSentences > 3 && ' · aim for 2–3 sentences'}
            </div>
          )}
        </div>

        {/* ── Q4: Aesthetic keywords ────────────────────────────────────── */}
        <div>
          <div
            style={{
              fontFamily: sohne,
              fontSize: 15,
              fontWeight: 500,
              color: OLIVE,
              marginBottom: 6,
            }}
          >
            Select up to 6 keywords that define your aesthetic.
          </div>
          <div
            style={{
              fontFamily: inter,
              fontSize: 12,
              fontStyle: 'italic',
              color: 'rgba(67,67,43,0.44)',
              marginBottom: 22,
            }}
          >
            Choose across categories — not just one.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            {CHIP_GROUPS.map((group) => (
              <div key={group.key}>
                <div
                  style={{
                    fontFamily: inter,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: 'rgba(67,67,43,0.38)',
                    marginBottom: 12,
                  }}
                >
                  {group.label}
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {group.keywords.map((keyword) => {
                    const selected = value.includes(keyword);
                    const disabled = !selected && value.length >= MAX_KEYWORDS;
                    return (
                      <KeywordChip
                        key={keyword}
                        label={keyword}
                        selected={selected}
                        disabled={disabled}
                        onClick={() => handleKeywordToggle(keyword)}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Running count */}
          <div
            style={{
              marginTop: 20,
              fontSize: 12.5,
              color:
                value.length >= MAX_KEYWORDS
                  ? OLIVE
                  : 'rgba(67,67,43,0.52)',
              fontFamily: inter,
              lineHeight: 1.6,
              fontWeight: value.length >= MAX_KEYWORDS ? 600 : 400,
            }}
          >
            {value.length} of {MAX_KEYWORDS} selected
          </div>
        </div>
      </div>

      {/* Conflict Modal — unchanged pattern */}
      {showConflictModal && detectedConflict && (
        <ConflictModal
          conflict={detectedConflict}
          onClose={() => setShowConflictModal(false)}
          onConfirm={handleConflictResolved}
        />
      )}
    </>
  );
}

/* ─── KeywordChip ────────────────────────────────────────────────────────── */
function KeywordChip({
  label,
  selected,
  disabled,
  onClick,
}: {
  label: string;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      disabled={disabled}
      style={{
        padding: '9px 18px',
        fontSize: 13,
        fontWeight: selected ? 600 : 500,
        color: disabled
          ? 'rgba(67,67,43,0.28)'
          : selected
          ? OLIVE
          : hovered
          ? 'rgba(67,67,43,0.72)'
          : 'rgba(67,67,43,0.58)',
        backgroundColor: selected
          ? 'rgba(168,180,117,0.12)'
          : hovered && !disabled
          ? 'rgba(255,255,255,0.90)'
          : 'rgba(255,255,255,0.75)',
        border: selected
          ? `1.5px solid ${CHARTREUSE}`
          : hovered && !disabled
          ? '1.5px solid rgba(67,67,43,0.18)'
          : '1.5px solid rgba(67,67,43,0.10)',
        borderRadius: 999,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: sohne,
        letterSpacing: '0.01em',
        transition: 'all 200ms ease',
        boxShadow: selected
          ? '0 2px 8px rgba(168,180,117,0.12)'
          : '0 2px 8px rgba(0,0,0,0.04)',
        transform: selected ? 'translateY(-1px)' : 'translateY(0)',
        outline: 'none',
        opacity: disabled ? 0.45 : 1,
      }}
    >
      {label}
    </button>
  );
}

/* ─── ConflictModal ──────────────────────────────────────────────────────── */
interface ConflictModalProps {
  conflict: string[];
  onClose: () => void;
  onConfirm: (tensionContext: string) => void;
}

function ConflictModal({ conflict, onClose, onConfirm }: ConflictModalProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const resolutionOptions = [
    {
      id: 'trend-aware-classics',
      label: 'Trend-aware classics',
      description: 'Timeless silhouettes in current colors',
    },
    {
      id: 'fast-moving-capsules',
      label: 'Fast-moving capsules',
      description: 'Trendy styles in neutral palettes',
    },
    {
      id: 'intentionally-hybrid',
      label: 'Intentionally hybrid',
      description: 'High-low mix',
    },
  ];

  const handleConfirm = () => {
    if (selected) onConfirm(selected);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(250,249,246,0.80)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'rgba(255,255,255,0.98)',
          borderRadius: 10,
          padding: '32px 36px',
          maxWidth: 480,
          width: '100%',
          boxShadow: '0 12px 48px rgba(67,67,43,0.12)',
          border: '1px solid rgba(67,67,43,0.09)',
        }}
      >
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              fontFamily: inter,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: BRAND.rose,
              marginBottom: 10,
            }}
          >
            TENSION DETECTED
          </div>

          <h3
            style={{
              fontSize: 18,
              fontWeight: 500,
              color: OLIVE,
              fontFamily: sohne,
              margin: '0 0 8px 0',
              letterSpacing: '-0.01em',
            }}
          >
            Heads up
          </h3>

          <p
            style={{
              fontSize: 13,
              color: 'rgba(67,67,43,0.58)',
              fontFamily: inter,
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            <span style={{ fontWeight: 600, color: OLIVE }}>{conflict[0]}</span> and{' '}
            <span style={{ fontWeight: 600, color: OLIVE }}>{conflict[1]}</span> can create
            tension. How do you want to resolve it?
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
          {resolutionOptions.map((option) => (
            <ModalOption
              key={option.id}
              label={option.label}
              description={option.description}
              active={selected === option.id}
              onClick={() => setSelected(option.id)}
            />
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '11px 20px',
              fontSize: 12,
              fontWeight: 600,
              color: 'rgba(67,67,43,0.62)',
              backgroundColor: 'transparent',
              border: '1px solid rgba(67,67,43,0.14)',
              borderRadius: 999,
              cursor: 'pointer',
              fontFamily: sohne,
              letterSpacing: '0.01em',
              transition: 'all 200ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(67,67,43,0.04)';
              e.currentTarget.style.borderColor = 'rgba(67,67,43,0.22)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = 'rgba(67,67,43,0.14)';
            }}
          >
            Cancel
          </button>

          <button
            onClick={handleConfirm}
            disabled={!selected}
            style={{
              flex: 1,
              padding: '11px 20px',
              fontSize: 12,
              fontWeight: 700,
              fontFamily: sohne,
              letterSpacing: '0.02em',
              color: selected ? STEEL : 'rgba(67,67,43,0.30)',
              background: selected ? 'rgba(125,150,172,0.07)' : 'rgba(255,255,255,0.46)',
              border: selected ? `1.5px solid ${STEEL}` : '1.5px solid rgba(67,67,43,0.10)',
              borderRadius: 10,
              cursor: selected ? 'pointer' : 'not-allowed',
              transition: 'all 280ms ease',
              opacity: selected ? 1 : 0.6,
            }}
            onMouseEnter={(e) => {
              if (!selected) return;
              e.currentTarget.style.background = 'rgba(125,150,172,0.14)';
            }}
            onMouseLeave={(e) => {
              if (!selected) return;
              e.currentTarget.style.background = 'rgba(125,150,172,0.07)';
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── ModalOption — matches IntentCard pattern ───────────────────────────── */
function ModalOption({
  label,
  description,
  active,
  onClick,
}: {
  label: string;
  description: string;
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
        width: '100%',
        textAlign: 'left',
        borderRadius: 8,
        padding: '14px 16px',
        background: active ? 'rgba(168,180,117,0.08)' : 'rgba(255,255,255,0.75)',
        border: '1px solid rgba(67,67,43,0.09)',
        borderLeft: active
          ? `3px solid ${CHARTREUSE}`
          : hovered
          ? `3px solid ${STEEL}`
          : '3px solid transparent',
        cursor: 'pointer',
        outline: 'none',
        transition: 'all 180ms ease',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <span
        style={{
          width: 13,
          height: 13,
          borderRadius: 999,
          border: active ? `1.5px solid ${CHARTREUSE}` : '1.5px solid rgba(67,67,43,0.22)',
          background: active ? CHARTREUSE : 'transparent',
          flexShrink: 0,
          transition: 'all 150ms ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        aria-hidden
      >
        {active && (
          <svg width="7" height="6" viewBox="0 0 7 6" fill="none">
            <path
              d="M1 3L2.8 4.8L6 1.5"
              stroke="white"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: inter,
            fontSize: 13,
            fontWeight: 500,
            color: active ? OLIVE : 'rgba(67,67,43,0.78)',
          }}
        >
          {label}
        </div>
        <div
          style={{
            marginTop: 3,
            fontFamily: inter,
            fontSize: 12,
            color: 'rgba(67,67,43,0.52)',
            lineHeight: 1.4,
          }}
        >
          {description}
        </div>
      </div>
    </button>
  );
}
