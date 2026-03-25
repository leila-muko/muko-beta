import { describe, expect, test } from 'vitest';

import { buildProgressiveStrategySummary, buildStrategySummary } from '@/lib/strategy-summary';

describe('buildStrategySummary', () => {
  test('builds a progressive editorial read once frame, priorities, and tensions are set', () => {
    const summary = buildStrategySummary({
      priorities: ['Lead with a distinct point of view', 'Prioritize sell-through confidence'],
      trendLabel: 'Timeless',
      creativeLabel: 'Commercially safe',
      elevatedLabel: 'Balanced Value',
      noveltyLabel: 'Continuity-first',
      targetMargin: 62,
      targetMsrp: 180,
      sliderTrendValue: 76,
      sliderCreativeValue: 82,
      sliderElevatedValue: 58,
      sliderNoveltyValue: 74,
    });

    expect(summary).toContain('commercially grounded');
    expect(summary).toContain('continuity-led');
    expect(summary).toContain('restrained expression');
    expect(summary).toContain('balancing brand expression with commercial clarity');
    expect(summary).toContain('62%');
  });

  test('returns the placeholder before the frame is defined', () => {
    const summary = buildProgressiveStrategySummary({
      priorities: [],
      trendLabel: 'Balanced Horizon',
      creativeLabel: 'Balanced Creativity',
      elevatedLabel: 'Balanced Value',
      noveltyLabel: 'Continuity-aware',
      targetMargin: 0,
      targetMsrp: 0,
    });

    expect(summary.stage).toBe(0);
    expect(summary.text).toBe('Define your collection stance');
  });
});
