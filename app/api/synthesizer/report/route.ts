// app/api/synthesizer/report/route.ts
// Accepts a ReportBlackboard payload, calls generateReportNarrative server-side,
// and returns SynthesizerResult + resolved_redirects for the Key Redirect card.

import { NextRequest, NextResponse } from 'next/server';
import { generateReportNarrative } from '@/lib/synthesizer/reportNarrative';
import type { ReportBlackboard } from '@/lib/synthesizer/reportNarrative';

export async function POST(req: NextRequest) {
  try {
    const blackboard: ReportBlackboard = await req.json();

    if (!blackboard?.aesthetic_matched_id || !blackboard?.material_id) {
      return NextResponse.json(
        { error: 'Missing required blackboard fields' },
        { status: 400 }
      );
    }

    const result = await generateReportNarrative(blackboard);

    // Include resolved_redirects so client can conditionally render
    // the Key Redirect card without needing to re-resolve them.
    return NextResponse.json({
      data: result.data,
      computed: result.computed,
      meta: result.meta,
      resolved_redirects: blackboard.resolved_redirects,
    });
  } catch {
    return NextResponse.json(
      { error: 'Synthesis failed' },
      { status: 500 }
    );
  }
}
