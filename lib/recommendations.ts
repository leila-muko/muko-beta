// lib/recommendations.ts

/**
 * Generate aesthetic recommendations based on season and brand DNA
 * Uses static rules for Beta - can upgrade to Researcher agent in Phase 2
 */

interface RecommendationInput {
    season: string;
    brandKeywords: string[];
    limit?: number;
  }
  
  // Seasonal trend recommendations (updated weekly)
  const SEASONAL_RECOMMENDATIONS: Record<string, string[]> = {
    'SS26': ['Coastal Minimalism', 'Desert Minimalism', 'Sporty Luxe'],
    'SS25': ['Coastal Minimalism', 'Cottagecore Modern', 'Sporty Luxe'],
    'FW26': ['Dark Romantic', 'Neo-Western', 'Tech Utilitarian'],
    'FW25': ['Dark Romantic', '90s Grunge Revival', 'Neo-Western'],
    // Add more seasons as needed
  };
  
  // Brand keyword to aesthetic affinity mapping
  const BRAND_AFFINITIES: Record<string, string[]> = {
    'Minimalist': ['Desert Minimalism', 'Coastal Minimalism', 'Tech Utilitarian'],
    'Maximalist': ['Dark Romantic', 'Cottagecore Modern'],
    'Sustainable': ['Cottagecore Modern', 'Desert Minimalism', 'Coastal Minimalism'],
    'Luxe': ['Dark Romantic', 'Neo-Western', 'Coastal Minimalism'],
    'Edgy': ['Dark Romantic', '90s Grunge Revival', 'Neo-Western'],
    'Sporty': ['Sporty Luxe', 'Tech Utilitarian'],
    'Bohemian': ['Cottagecore Modern', 'Desert Minimalism'],
    'Romantic': ['Dark Romantic', 'Cottagecore Modern'],
    'Urban': ['Tech Utilitarian', '90s Grunge Revival', 'Neo-Western'],
    'Coastal': ['Coastal Minimalism', 'Sporty Luxe'],
    'Western': ['Neo-Western', 'Desert Minimalism'],
    'Gothic': ['Dark Romantic', '90s Grunge Revival'],
    'Preppy': ['Coastal Minimalism', 'Sporty Luxe'],
    'Grunge': ['90s Grunge Revival', 'Dark Romantic', 'Neo-Western'],
    'Feminine': ['Dark Romantic', 'Cottagecore Modern'],
    'Masculine': ['Neo-Western', 'Tech Utilitarian'],
    'Technical': ['Tech Utilitarian', 'Sporty Luxe'],
    'Artisanal': ['Cottagecore Modern', 'Desert Minimalism'],
    'Premium': ['Dark Romantic', 'Coastal Minimalism', 'Neo-Western'],
    'Accessible': ['Sporty Luxe', 'Coastal Minimalism'],
  };
  
  /**
   * Get aesthetic recommendations for a user
   * @param season - e.g., 'SS26', 'FW26'
   * @param brandKeywords - e.g., ['Minimalist', 'Sustainable']
   * @param limit - number of recommendations to return (default: 3)
   * @returns Array of aesthetic names
   */
  export function getRecommendations({
    season,
    brandKeywords,
    limit = 3
  }: RecommendationInput): string[] {
    // Get seasonal trends (fallback to SS26 if season not found)
    const seasonalTrends = SEASONAL_RECOMMENDATIONS[season] || SEASONAL_RECOMMENDATIONS['SS26'];
    
    // Get brand-aligned aesthetics
    const brandMatches = brandKeywords.flatMap(
      keyword => BRAND_AFFINITIES[keyword] || []
    );
    
    // Combine candidates and calculate scores
    const allCandidates = [...seasonalTrends, ...brandMatches];
    const candidateSet = new Set(allCandidates);
    
    const scored = Array.from(candidateSet).map(aesthetic => {
      let score = 0;
      
      // Seasonal trend boost: +2 points
      if (seasonalTrends.includes(aesthetic)) {
        score += 2;
      }
      
      // Brand alignment boost: +1 point per matching keyword
      const matchCount = brandMatches.filter(a => a === aesthetic).length;
      score += matchCount;
      
      return {
        name: aesthetic,
        score
      };
    });
    
    // Sort by score (descending) and return top N
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => s.name);
  }
  
  /**
   * Get fallback recommendations if no brand keywords provided
   * Returns seasonal trends for the given season
   */
  export function getSeasonalRecommendations(season: string, limit = 3): string[] {
    const trends = SEASONAL_RECOMMENDATIONS[season] || SEASONAL_RECOMMENDATIONS['SS26'];
    return trends.slice(0, limit);
  }