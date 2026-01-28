import { createClient } from '@/lib/supabase/client';
import type { BrandProfile, Analysis } from '@/lib/types/database';

const supabase = createClient();

// ============================================
// BRAND PROFILES
// ============================================

export async function getBrandProfile(userId: string) {
  const { data, error } = await supabase
    .from('brand_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (error) throw error;
  return data as BrandProfile; 
}

export async function createBrandProfile(profile: Omit<BrandProfile, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('brand_profiles')
    .insert(profile)
    .select()
    .single();
  
  if (error) throw error;
  return data as BrandProfile;
}

export async function updateBrandProfile(id: string, updates: Partial<BrandProfile>) {
  const { data, error } = await supabase
    .from('brand_profiles')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data as BrandProfile;
}

// ============================================
// ANALYSES
// ============================================

export async function getAnalyses(userId: string, limit = 50) {
  const { data, error } = await supabase
    .from('analyses')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return data as Analysis[];
}

export async function getAnalysis(id: string) {
  const { data, error } = await supabase
    .from('analyses')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data as Analysis;
}

export async function createAnalysis(analysis: Omit<Analysis, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('analyses')
    .insert(analysis)
    .select()
    .single();
  
  if (error) throw error;
  return data as Analysis;
}

export async function updateAnalysis(id: string, updates: Partial<Analysis>) {
  const { data, error } = await supabase
    .from('analyses')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data as Analysis;
}

export async function getChildAnalyses(parentId: string) {
  const { data, error } = await supabase
    .from('analyses')
    .select('*')
    .eq('parent_analysis_id', parentId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data as Analysis[];
}