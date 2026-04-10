import type { CollectionReportPayload } from '@/lib/collection-report/types';
import { fonts, reportPalette, sectionCard, sectionEyebrow } from '@/components/report/reportStyles';

type SliderKey = 'trend_forward' | 'creative_expression' | 'elevated_design' | 'novelty';

interface TensionMetricConfig {
  key: SliderKey;
  label: string;
  low: string;
  mid: string;
  high: string;
  explanation: {
    low: string;
    mid: string;
    high: string;
  };
  tradeoff: string;
}

type TensionCard = Omit<TensionMetricConfig, 'explanation'> & {
  explanation: string;
  state: string;
  alignment: string;
};

const TENSION_METRICS: TensionMetricConfig[] = [
  {
    key: 'trend_forward',
    label: 'Trend Exposure',
    low: 'Restrained',
    mid: 'Calibrated',
    high: 'Forward',
    explanation: {
      low: 'The line is leaning toward longevity over seasonal statement.',
      mid: 'The assortment is absorbing trend signal without giving up control.',
      high: 'The collection is deliberately showing more fashion-facing movement.',
    },
    tradeoff: 'Pushes freshness against longevity.',
  },
  {
    key: 'creative_expression',
    label: 'Expression Level',
    low: 'Restrained',
    mid: 'Measured',
    high: 'Expressive',
    explanation: {
      low: 'Pieces are staying commercially legible before they get conceptually loud.',
      mid: 'The creative voice is present, but still contained inside a sellable frame.',
      high: 'The line is prioritizing point of view and stronger visual authorship.',
    },
    tradeoff: 'Pushes distinction against commercial clarity.',
  },
  {
    key: 'elevated_design',
    label: 'Value Position',
    low: 'Restrained',
    mid: 'Calibrated',
    high: 'Elevated',
    explanation: {
      low: 'The assortment is protecting accessibility over overt refinement cues.',
      mid: 'The line is balancing premium cues with practical price sensitivity.',
      high: 'The collection is asking for a more elevated read in material or finish.',
    },
    tradeoff: 'Pushes perceived value against accessibility.',
  },
  {
    key: 'novelty',
    label: 'Innovation Level',
    low: 'Restrained',
    mid: 'Measured',
    high: 'Forward',
    explanation: {
      low: 'The collection is holding close to continuity and familiarity.',
      mid: 'The line is introducing newness without over-rotating the system.',
      high: 'The assortment is leaning into novelty as a visible part of the proposition.',
    },
    tradeoff: 'Pushes newness against continuity.',
  },
];

function getBand(value: number) {
  if (value <= 34) return 'low' as const;
  if (value >= 66) return 'high' as const;
  return 'mid' as const;
}

function containsAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term));
}

function getAlignmentTag(metric: TensionMetricConfig, value: number, context: string) {
  const band = getBand(value);

  if (
    (metric.key === 'trend_forward' && band === 'high' && containsAny(context, ['timeless', 'core', 'continuity'])) ||
    (metric.key === 'novelty' && band === 'high' && containsAny(context, ['continuity', 'carryover'])) ||
    (metric.key === 'creative_expression' && band === 'high' && containsAny(context, ['commercial', 'merchant'])) ||
    (metric.key === 'elevated_design' && band === 'high' && containsAny(context, ['accessible', 'price', 'margin']))
  ) {
    return 'Watch';
  }

  if (band === 'high') return 'Push';
  if (band === 'mid') return 'Aligned';
  return 'Protect';
}

function normalizeGoals(goals: string[] | null | undefined) {
  return (goals ?? []).map((goal) => goal.trim()).filter(Boolean);
}

function getTensionPriorityBullets(intent?: CollectionReportPayload['intent']) {
  const sliders = intent?.tension_sliders;
  const goalsText = normalizeGoals(intent?.primary_goals).join(' ').toLowerCase();
  const tradeoffText = (intent?.tradeoff ?? '').toLowerCase();
  const context = `${goalsText} ${tradeoffText}`;
  const bullets: string[] = [];

  const pushBullet = (bullet: string) => {
    if (!bullets.includes(bullet)) bullets.push(bullet);
  };

  const trend = typeof sliders?.trend_forward === 'number' ? sliders.trend_forward : 50;
  const creative = typeof sliders?.creative_expression === 'number' ? sliders.creative_expression : 50;
  const elevated = typeof sliders?.elevated_design === 'number' ? sliders.elevated_design : 50;
  const novelty = typeof sliders?.novelty === 'number' ? sliders.novelty : 50;

  if (creative <= 34) pushBullet('Clarity over distinctiveness');
  if (creative >= 66) pushBullet('Distinctiveness over clarity');

  if (novelty <= 34) pushBullet('Stability over experimentation');
  if (novelty >= 66) pushBullet('Experimentation over continuity');

  if (trend <= 34) pushBullet('Control over trend exposure');
  if (trend >= 66) pushBullet('Trend exposure over restraint');

  if (elevated <= 34) pushBullet('Accessibility over elevation');
  if (elevated >= 66) pushBullet('Elevation over accessibility');

  if (context.includes('commercial') || context.includes('clarity')) pushBullet('Commercial clarity over excess expression');
  if (context.includes('timeless') || context.includes('continuity')) pushBullet('Continuity over seasonal swing');
  if (context.includes('distinct') || context.includes('expression')) pushBullet('Expression over safety');
  if (context.includes('accessible') || context.includes('price') || context.includes('margin')) {
    pushBullet('Price discipline over ornamental lift');
  }

  return bullets.slice(0, 4);
}

function truncateToTwoSentences(value: string) {
  const matches = value.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g);
  if (!matches) return value.trim();
  return matches
    .slice(0, 2)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getPPWDescription(
  role: 'protect' | 'push' | 'watch',
  dimensionName: string,
  cards: TensionCard[],
  ppwDescriptions?: CollectionReportPayload['ppw_descriptions']
): string {
  if (ppwDescriptions?.[role]) {
    return ppwDescriptions[role] as string;
  }

  const matched = cards.find((card) => card.label === dimensionName);
  const others = cards.filter((card) => card.label !== dimensionName);

  if (role === 'protect') {
    const otherAligned = others.filter((c) => c.alignment === 'Aligned').map((c) => c.label);

    if (otherAligned.length >= 2) {
      return truncateToTwoSentences(
        `${otherAligned[0]} and ${otherAligned[1]} are both reading as aligned — ${dimensionName} is the anchor that keeps the line from drifting during development.`
      );
    } else if (otherAligned.length === 1) {
      return truncateToTwoSentences(
        `${otherAligned[0]} is aligned alongside this — protecting ${dimensionName} keeps the commercial foundation stable as pieces are locked.`
      );
    } else {
      return truncateToTwoSentences(
        `${dimensionName} is under the most pressure in this collection — hold it as the line moves into sampling.`
      );
    }
  }

  if (role === 'push') {
    const alignedCount = cards.filter((c) => c.alignment === 'Aligned').length;

    if (alignedCount === 4) {
      return truncateToTwoSentences(
        `All four dimensions are reading as controlled — ${dimensionName} has the most room to move without disrupting the other three.`
      );
    } else if (alignedCount >= 2) {
      return truncateToTwoSentences(
        `${dimensionName} is the least constrained dimension in this collection — there is room to sharpen it without destabilizing the system.`
      );
    } else {
      return truncateToTwoSentences(
        `${dimensionName} has room to move relative to the other dimensions — pushing it would sharpen the line without creating new risk.`
      );
    }
  }

  const matchedAlignment = matched?.alignment ?? 'Aligned';

  if (matchedAlignment === 'Aligned') {
    return truncateToTwoSentences(
      `${dimensionName} is balanced now but sensitive to material and construction changes — monitor it as pieces move into sampling.`
    );
  } else if (matchedAlignment === 'Watch') {
    return truncateToTwoSentences(
      `${dimensionName} is already showing tension — any further change in development could push it toward misalignment.`
    );
  } else {
    return truncateToTwoSentences(
      `${dimensionName} needs active monitoring as the collection develops.`
    );
  }
}

function buildTensionHeadline(cards: TensionCard[]): string {
  const states = cards.map((card) => card.alignment);
  const alignedCount = states.filter((state) => state === 'Aligned').length;
  const watchCount = states.filter((state) => state === 'Watch').length;

  if (states.length === 4 && states.every((state) => state === 'Aligned')) {
    return 'Measured across the board';
  }

  if (alignedCount === 3 && watchCount === 1 && states.length === 4) {
    return 'Mostly held, one dimension watching';
  }

  if (states.includes('Redirect')) {
    const name = cards.find((card) => card.alignment === 'Redirect')?.label ?? 'a dimension';
    return `Tension breaking on ${name}`;
  }

  if (states.includes('Critical')) {
    const name = cards.find((card) => card.alignment === 'Critical')?.label ?? 'a dimension';
    return `Critical tension on ${name}`;
  }

  if (watchCount >= 2 && !states.includes('Redirect') && !states.includes('Critical')) {
    return 'Tension building across dimensions';
  }

  return 'Tension across dimensions';
}

function buildTensionNarrative(
  cards: TensionCard[],
  ppw: { protect?: string; push?: string; watch?: string },
  intent?: CollectionReportPayload['intent']
) {
  if (cards.length === 0 || !ppw.protect || !ppw.push || !ppw.watch) return '';

  const alignmentSummary = cards.map((card) => `${card.label} is ${card.state} and ${card.alignment}`);
  const tradeoffText = (intent?.tradeoff ?? '').trim();
  const nonAligned = cards.filter((card) => card.alignment !== 'Aligned');

  const sentenceOne =
    nonAligned.length === 0
      ? `All four dimensions are aligned, with ${alignmentSummary.join(', ')}; the posture is tightly controlled, and the risk is drift or loss of specificity rather than overreach.`
      : `Across the four sliders, ${alignmentSummary.join(', ')}, so the clearest tension sits in ${nonAligned.map((card) => card.label).join(' and ')}${tradeoffText ? ` as the collection balances ${tradeoffText.toLowerCase()}` : ` as ${nonAligned[0]?.tradeoff.toLowerCase()}`}.`;

  const sentenceTwo = `${ppw.push} has the most room to move; ${ppw.protect} is most vulnerable to change.`;

  return `${sentenceOne} ${sentenceTwo}`;
}

export function CollectionTensionSection({
  intent,
  brand,
  ppw_descriptions,
}: {
  intent?: CollectionReportPayload['intent'];
  brand?: CollectionReportPayload['brand'];
  ppw_descriptions?: CollectionReportPayload['ppw_descriptions'];
}) {
  const sliders = intent?.tension_sliders;
  const priorities = normalizeGoals(intent?.primary_goals);
  const context = `${intent?.tradeoff ?? ''} ${brand?.tension_context ?? ''}`.toLowerCase();
  const ppwDescriptions = ppw_descriptions ?? null;

  const cards = TENSION_METRICS.map((metric) => {
    const rawValue = sliders?.[metric.key];
    const value = typeof rawValue === 'number' ? rawValue : 50;
    const band = getBand(value);

    return {
      ...metric,
      state: metric[band],
      explanation: metric.explanation[band],
      alignment: getAlignmentTag(metric, value, context),
    };
  });

  const protect = cards.find((card) => card.alignment === 'Protect')?.label ?? 'Commercial clarity';
  const push = cards.find((card) => card.alignment === 'Push')?.label ?? 'Expression Level';
  const watch = cards.find((card) => card.alignment === 'Watch')?.label ?? 'Value Position';
  const tensionNarrative = buildTensionNarrative(cards, { protect, push, watch }, intent);

  return (
    <section style={{ ...sectionCard, padding: '28px 30px' }}>
      <p style={sectionEyebrow}>Tension</p>
      <div style={{ marginTop: 10 }}>
        <p
          style={{
            margin: 0,
            fontFamily: fonts.heading,
            fontSize: 28,
            fontWeight: 400,
            lineHeight: 1,
            letterSpacing: '-0.03em',
            color: reportPalette.olive,
          }}
        >
          {buildTensionHeadline(cards)}
        </p>
      </div>

      {tensionNarrative ? (
        <div
          style={{
            display: 'grid',
            marginTop: 20,
          }}
        >
          <div
            style={{
              paddingBottom: 0,
            }}
          >
            <p
              style={{
                margin: 0,
                fontFamily: fonts.body,
                fontSize: 13,
                lineHeight: 1.7,
                color: 'var(--color-text-primary)',
              }}
            >
              {tensionNarrative}
            </p>
          </div>
        </div>
      ) : null}

      {priorities.length > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 18 }}>
          {priorities.map((goal) => (
            <span
              key={goal}
              style={{
                padding: '8px 12px',
                borderRadius: 999,
                background: 'rgba(67,67,43,0.05)',
                fontFamily: fonts.body,
                fontSize: 12,
                fontWeight: 600,
                color: reportPalette.olive,
              }}
            >
              {goal}
            </span>
          ))}
        </div>
      ) : null}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginTop: 20,
        }}
      >
        {cards.map((card) => (
          <div
            key={card.key}
            style={{
              padding: '18px 20px',
              borderRadius: 20,
              border: `1px solid rgba(67,67,43,0.08)`,
              background: 'rgba(255,255,255,0.56)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start' }}>
              <div>
                <p style={sectionEyebrow}>{card.label}</p>
                <p
                  className="font-heading"
                  style={{
                    margin: '8px 0 0',
                    fontFamily: fonts.heading,
                    fontSize: 22,
                    fontWeight: 400,
                    lineHeight: 1.05,
                    letterSpacing: '-0.03em',
                    color: reportPalette.olive,
                  }}
                >
                  {card.state}
                </p>
              </div>
              <span
                style={{
                  padding: '5px 8px',
                  borderRadius: 999,
                  background: 'rgba(125,150,172,0.10)',
                  color: reportPalette.steel,
                  fontFamily: fonts.body,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.03em',
                  textTransform: 'uppercase',
                }}
              >
                {card.alignment}
              </span>
            </div>
            <p
              style={{
                margin: '14px 0 0',
                fontFamily: fonts.body,
                fontSize: 14,
                lineHeight: 1.7,
                color: reportPalette.muted,
              }}
            >
              {card.explanation}
            </p>
            <p
              style={{
                margin: '12px 0 0',
                fontFamily: fonts.body,
                fontSize: 12,
                lineHeight: 1.6,
                color: reportPalette.faint,
              }}
            >
              {card.tradeoff}
            </p>
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          marginTop: 28,
        }}
      >
        {protect && push && watch ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              border: `1px solid rgba(67,67,43,0.08)`,
              borderRadius: 20,
              overflow: 'hidden',
              background: 'rgba(255,255,255,0.56)',
            }}
          >
            {[
              ['Protect', protect],
              ['Push', push],
              ['Watch', watch],
            ].map(([label, value], index, array) => (
              <div
                key={label}
                style={{
                  padding: '22px 28px',
                }}
              >
                <p
                  style={{
                    margin: '0 0 8px',
                    fontFamily: fonts.body,
                    fontSize: 10,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color:
                      label === 'Protect'
                        ? reportPalette.camel
                        : label === 'Push'
                          ? reportPalette.steel
                          : reportPalette.rose,
                  }}
                >
                  {label}
                </p>
                <p
                  className="font-heading"
                  style={{
                    margin: '0 0 8px',
                    fontFamily: fonts.heading,
                    fontSize: 16,
                    fontWeight: 400,
                    letterSpacing: '-0.02em',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {value}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontFamily: fonts.body,
                    fontSize: 13,
                    lineHeight: 1.6,
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  {getPPWDescription(label.toLowerCase() as 'protect' | 'push' | 'watch', value, cards, ppwDescriptions)}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
