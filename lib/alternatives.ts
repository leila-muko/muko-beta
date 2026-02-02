// lib/alternatives.ts

/**
 * Find alternative aesthetics similar to current choice but with better scores
 * Used for "Try These..." suggestions in Concept Studio
 */

interface Alternative {
    name: string;
    identityDelta: number;
    resonanceDelta: number;
    reason: string;
  }
  
  interface AlternativesInput {
    currentAesthetic: string;
    currentScores: {
      identity: number;
      resonance: number;
    };
    limit?: number;
  }
  
  // Manual similarity mapping for Beta (expand with data in Phase 2)
  const AESTHETIC_SIMILARITIES: Record<string, Array<{ name: string; reason: string }>> = {
    'Neo-Western': [
      { name: 'Desert Minimalism', reason: 'Captures Western landscapes in minimalist voice' },
      { name: 'Tech Utilitarian', reason: 'Rugged functionality with modern edge' }
    ],
    'Dark Romantic': [
      { name: '90s Grunge Revival', reason: 'Similar moody aesthetic with nostalgic edge' },
      { name: 'Cottagecore Modern', reason: 'Romantic feel with softer expression' }
    ],
    'Coastal Minimalism': [
      { name: 'Desert Minimalism', reason: 'Shared minimalist principles, different landscape' },
      { name: 'Sporty Luxe', reason: 'Clean, effortless aesthetic' }
    ],
    'Desert Minimalism': [
      { name: 'Coastal Minimalism', reason: 'Similar minimalist approach, different setting' },
      { name: 'Tech Utilitarian', reason: 'Functional minimalism with modern feel' }
    ],
    'Sporty Luxe': [
      { name: 'Tech Utilitarian', reason: 'Performance-driven with elevated finish' },
      { name: 'Coastal Minimalism', reason: 'Effortless, refined aesthetic' }
    ],
    '90s Grunge Revival': [
      { name: 'Dark Romantic', reason: 'Edgy aesthetic with similar mood' },
      { name: 'Neo-Western', reason: 'Rugged, rebellious spirit' }
    ],
    'Cottagecore Modern': [
      { name: 'Dark Romantic', reason: 'Romantic aesthetic with more edge' },
      { name: 'Coastal Minimalism', reason: 'Natural, serene approach' }
    ],
    'Tech Utilitarian': [
      { name: 'Sporty Luxe', reason: 'Performance-focused with refined execution' },
      { name: 'Desert Minimalism', reason: 'Functional minimalism with natural palette' }
    ]
  };
  
  // Mock saturation scores for Beta (will use real data from aesthetics.json in Phase 2)
  const MOCK_SATURATION_SCORES: Record<string, number> = {
    'Neo-Western': 65,
    'Dark Romantic': 70,
    'Coastal Minimalism': 55,
    'Desert Minimalism': 25,
    'Sporty Luxe': 45,
    '90s Grunge Revival': 72,
    'Cottagecore Modern': 60,
    'Tech Utilitarian': 18
  };
  
  /**
   * Find alternative aesthetics with better market opportunity
   * @param currentAesthetic - The aesthetic user entered
   * @param currentScores - Current identity and resonance scores
   * @param limit - Number of alternatives to return (default: 2)
   * @returns Array of alternatives with delta scores
   */
  export function findAlternatives({
    currentAesthetic,
    currentScores,
    limit = 2
  }: AlternativesInput): Alternative[] {
    // Get similar aesthetics
    const similars = AESTHETIC_SIMILARITIES[currentAesthetic] || [];
    
    if (similars.length === 0) {
      return [];
    }
    
    // Calculate deltas for each alternative
    const alternatives = similars.map(similar => {
      // For Beta: Use mock saturation scores
      // Phase 2: Call Critic agent for real identity scores
      const altSaturation = MOCK_SATURATION_SCORES[similar.name] || 50;
      const altResonance = 100 - altSaturation;
      
      // Calculate deltas
      const identityDelta = Math.floor(Math.random() * 7) - 3; // -3 to +3 range for Beta
      const resonanceDelta = altResonance - currentScores.resonance;
      
      return {
        name: similar.name,
        identityDelta,
        resonanceDelta,
        reason: similar.reason
      };
    });
    
    // Filter to only show alternatives with improvement
    // Either better resonance OR similar identity with much better resonance
    const improvements = alternatives.filter(alt => {
      // Show if resonance improves by at least 10 points
      if (alt.resonanceDelta >= 10) return true;
      
      // Or if identity stays strong (within 5 points) and resonance improves
      if (alt.identityDelta >= -5 && alt.resonanceDelta >= 5) return true;
      
      return false;
    });
    
    // Sort by resonance improvement (primary) and identity delta (secondary)
    return improvements
      .sort((a, b) => {
        if (b.resonanceDelta !== a.resonanceDelta) {
          return b.resonanceDelta - a.resonanceDelta;
        }
        return b.identityDelta - a.identityDelta;
      })
      .slice(0, limit);
  }
  
  /**
   * Check if we should show alternatives based on current scores
   * @param scores - Current identity and resonance scores
   * @returns true if should show alternatives
   */
  export function shouldShowAlternatives(scores: { identity: number; resonance: number }): boolean {
    // Show alternatives if:
    // 1. Resonance is below 70 (yellow/red territory)
    // OR
    // 2. Identity is below 70 (brand misalignment)
    return scores.resonance < 70 || scores.identity < 70;
  }