// /app/api/agents/critic/route.ts
// API Route: POST /api/agents/critic
// Called by Concept Studio whenever aesthetic input changes.
// Returns Identity Pulse data (score, status, message).

import { NextRequest, NextResponse } from 'next/server';
import { checkBrandAlignment, CriticInput } from '@/lib/agents/critic';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs'; // NOT edge — needs full Node.js for Anthropic SDK

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // ── INPUT VALIDATION ──
    const { aesthetic_keywords, aesthetic_name, brand_profile_id } = body;

    if (!aesthetic_keywords || !Array.isArray(aesthetic_keywords) || aesthetic_keywords.length === 0) {
      return NextResponse.json(
        { error: 'aesthetic_keywords must be a non-empty array' },
        { status: 400 }
      );
    }

    if (!aesthetic_name || typeof aesthetic_name !== 'string') {
      return NextResponse.json(
        { error: 'aesthetic_name is required' },
        { status: 400 }
      );
    }

    if (!brand_profile_id) {
      return NextResponse.json(
        { error: 'brand_profile_id is required' },
        { status: 400 }
      );
    }

    // ── AUTH CHECK ──
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── FETCH BRAND PROFILE ──
    const { data: brand, error: brandError } = await supabase
      .from('brand_profiles')
      .select('id, keywords, tension_context, accepts_conflicts, price_tier, target_margin, reference_brands, excluded_brands, brand_description')
      .eq('id', brand_profile_id)
      .eq('user_id', user.id)
      .single();

    if (brandError || !brand) {
      return NextResponse.json(
        { error: 'Brand profile not found — complete onboarding first' },
        { status: 404 }
      );
    }

    // ── RUN CRITIC AGENT ──
    const criticInput: CriticInput = {
      aesthetic_keywords,
      aesthetic_name,
      brand: {
        id: brand.id,
        keywords: brand.keywords || [],
        tension_context: brand.tension_context || null,
        accepts_conflicts: brand.accepts_conflicts || false,
        price_tier: brand.price_tier || 'Contemporary',
        target_margin: brand.target_margin || 0.6,
        reference_brands: brand.reference_brands ?? [],
        excluded_brands: brand.excluded_brands ?? [],
        brand_description: brand.brand_description ?? null,
      },
    };

    const result = await checkBrandAlignment(criticInput);

    // ── RESPONSE ──
    // Return everything the Identity Pulse needs to render
    return NextResponse.json({
      success: true,
      pulse: {
        status: result.status,           // 'green' | 'yellow' | 'red'
        score: result.alignment_score,   // 0-100
        message: result.message,         // Display text for pill
      },
      meta: {
        overlap_count: result.overlap_count,
        conflict_detected: result.conflict_detected,
        conflict_ids: result.conflict_ids,
        llm_used: result.llm_used,
        agent_version: result.agent_version,
      }
    });

  } catch (error) {
    console.error('[POST /api/agents/critic] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
