/**
 * Cognitive Load Scoring and Composition Budget Evaluation
 *
 * Implements the 5-dimensional scoring model from docs/COGNITIVE_LOAD_SCORING.md.
 * Each component is scored across Decision Demand, Information Density,
 * Interaction Complexity, Context Disruption, and Learning Curve (0-2 each).
 *
 * The evaluateComposition() function synthesizes component scores with
 * runtime intelligence (attention economics, trust building, token overrides,
 * design patterns) to produce a holistic composition review.
 */

import type { ComponentMetadata, Token } from '@rafters/shared';

// ==================== Types ====================

export interface CognitiveDimensions {
  decisionDemand: 0 | 1 | 2;
  informationDensity: 0 | 1 | 2;
  interactionComplexity: 0 | 1 | 2;
  contextDisruption: 0 | 1 | 2;
  learningCurve: 0 | 1 | 2;
}

export interface ComponentCognitiveProfile {
  dimensions: CognitiveDimensions;
  primaryCostDriver: string;
}

export type BudgetTier = 'focused' | 'page' | 'app';

export interface CompositionReview {
  budget: {
    tier: string;
    budget: number;
    total: number;
    status: 'within-budget' | 'over-budget';
    headroom?: number;
    overage?: number;
    overagePercent?: number;
  };
  components: Array<{
    name: string;
    score: number;
    count: number;
    dimensions: CognitiveDimensions;
    primaryCostDriver: string;
  }>;
  attention: {
    conflicts: string[];
    notes: string[];
  };
  trust: string[];
  patterns: Array<{
    name: string;
    matched: string[];
    suggestion: string;
  }>;
  designerNotes: Array<{
    token: string;
    reason: string;
    relevantTo: string[];
  }>;
  hotspots: Array<{
    name: string;
    score: number;
    highestDimension: string;
    suggestion: string;
  }>;
  violations: string[];
}

// ==================== Budget Constants ====================

export const BUDGET_TIERS: Record<BudgetTier, number> = {
  focused: 15,
  page: 30,
  app: 45,
};

// ==================== 5-Dimensional Scoring Table ====================

// Every component scored across 5 dimensions (0-2 each).
// 7 components have detailed walkthroughs in COGNITIVE_LOAD_SCORING.md.
// Remaining components derived from dimension descriptions,
// constrained to match the reference table totals.

export const COMPONENT_SCORES: Record<string, ComponentCognitiveProfile> = {
  // Score 0 -- Structural only, no cognitive demand
  separator: {
    dimensions: {
      decisionDemand: 0,
      informationDensity: 0,
      interactionComplexity: 0,
      contextDisruption: 0,
      learningCurve: 0,
    },
    primaryCostDriver: 'Structural only, no cognitive demand',
  },
  container: {
    dimensions: {
      decisionDemand: 0,
      informationDensity: 0,
      interactionComplexity: 0,
      contextDisruption: 0,
      learningCurve: 0,
    },
    primaryCostDriver: 'Structural only, no cognitive demand',
  },
  'aspect-ratio': {
    dimensions: {
      decisionDemand: 0,
      informationDensity: 0,
      interactionComplexity: 0,
      contextDisruption: 0,
      learningCurve: 0,
    },
    primaryCostDriver: 'Structural only, no cognitive demand',
  },

  // Score 1 -- Display only, minimal information
  skeleton: {
    dimensions: {
      decisionDemand: 0,
      informationDensity: 1,
      interactionComplexity: 0,
      contextDisruption: 0,
      learningCurve: 0,
    },
    primaryCostDriver: 'Display only, minimal information',
  },
  kbd: {
    dimensions: {
      decisionDemand: 0,
      informationDensity: 1,
      interactionComplexity: 0,
      contextDisruption: 0,
      learningCurve: 0,
    },
    primaryCostDriver: 'Display only, minimal information',
  },

  // Score 2 -- Simple state or single information piece
  badge: {
    dimensions: {
      decisionDemand: 0,
      informationDensity: 1,
      interactionComplexity: 0,
      contextDisruption: 0,
      learningCurve: 1,
    },
    primaryCostDriver: 'Simple state or single information piece',
  },
  breadcrumb: {
    dimensions: {
      decisionDemand: 0,
      informationDensity: 1,
      interactionComplexity: 1,
      contextDisruption: 0,
      learningCurve: 0,
    },
    primaryCostDriver: 'Simple state or single information piece',
  },
  label: {
    dimensions: {
      decisionDemand: 0,
      informationDensity: 1,
      interactionComplexity: 0,
      contextDisruption: 0,
      learningCurve: 1,
    },
    primaryCostDriver: 'Simple state or single information piece',
  },
  checkbox: {
    dimensions: {
      decisionDemand: 1,
      informationDensity: 0,
      interactionComplexity: 1,
      contextDisruption: 0,
      learningCurve: 0,
    },
    primaryCostDriver: 'Simple state or single information piece',
  },
  switch: {
    dimensions: {
      decisionDemand: 1,
      informationDensity: 0,
      interactionComplexity: 1,
      contextDisruption: 0,
      learningCurve: 0,
    },
    primaryCostDriver: 'Simple state or single information piece',
  },
  toggle: {
    dimensions: {
      decisionDemand: 1,
      informationDensity: 0,
      interactionComplexity: 1,
      contextDisruption: 0,
      learningCurve: 0,
    },
    primaryCostDriver: 'Simple state or single information piece',
  },
  'button-group': {
    dimensions: {
      decisionDemand: 1,
      informationDensity: 1,
      interactionComplexity: 0,
      contextDisruption: 0,
      learningCurve: 0,
    },
    primaryCostDriver: 'Simple state or single information piece',
  },
  card: {
    dimensions: {
      decisionDemand: 0,
      informationDensity: 1,
      interactionComplexity: 0,
      contextDisruption: 0,
      learningCurve: 1,
    },
    primaryCostDriver: 'Simple state or single information piece',
  },
  collapsible: {
    dimensions: {
      decisionDemand: 1,
      informationDensity: 0,
      interactionComplexity: 1,
      contextDisruption: 0,
      learningCurve: 0,
    },
    primaryCostDriver: 'Simple state or single information piece',
  },
  avatar: {
    dimensions: {
      decisionDemand: 0,
      informationDensity: 1,
      interactionComplexity: 0,
      contextDisruption: 0,
      learningCurve: 1,
    },
    primaryCostDriver: 'Simple state or single information piece',
  },
  'scroll-area': {
    dimensions: {
      decisionDemand: 0,
      informationDensity: 1,
      interactionComplexity: 1,
      contextDisruption: 0,
      learningCurve: 0,
    },
    primaryCostDriver: 'Simple state or single information piece',
  },
  tooltip: {
    dimensions: {
      decisionDemand: 0,
      informationDensity: 1,
      interactionComplexity: 0,
      contextDisruption: 0,
      learningCurve: 1,
    },
    primaryCostDriver: 'Simple state or single information piece',
  },
  typography: {
    dimensions: {
      decisionDemand: 0,
      informationDensity: 1,
      interactionComplexity: 0,
      contextDisruption: 0,
      learningCurve: 1,
    },
    primaryCostDriver: 'Simple state or single information piece',
  },
  spinner: {
    dimensions: {
      decisionDemand: 0,
      informationDensity: 1,
      interactionComplexity: 0,
      contextDisruption: 0,
      learningCurve: 1,
    },
    primaryCostDriver: 'Simple state or single information piece',
  },
  empty: {
    dimensions: {
      decisionDemand: 1,
      informationDensity: 1,
      interactionComplexity: 0,
      contextDisruption: 0,
      learningCurve: 0,
    },
    primaryCostDriver: 'Simple state or single information piece',
  },
  'toggle-group': {
    dimensions: {
      decisionDemand: 1,
      informationDensity: 1,
      interactionComplexity: 0,
      contextDisruption: 0,
      learningCurve: 0,
    },
    primaryCostDriver: 'Simple state or single information piece',
  },

  // Score 3 -- One decision + one interaction mode
  button: {
    dimensions: {
      decisionDemand: 1,
      informationDensity: 1,
      interactionComplexity: 1,
      contextDisruption: 0,
      learningCurve: 0,
    },
    primaryCostDriver: 'One decision + one interaction mode',
  },
  alert: {
    dimensions: {
      decisionDemand: 0,
      informationDensity: 1,
      interactionComplexity: 1,
      contextDisruption: 0,
      learningCurve: 1,
    },
    primaryCostDriver: 'One decision + one interaction mode',
  },
  sidebar: {
    dimensions: {
      decisionDemand: 1,
      informationDensity: 1,
      interactionComplexity: 1,
      contextDisruption: 0,
      learningCurve: 0,
    },
    primaryCostDriver: 'One decision + one interaction mode',
  },
  accordion: {
    dimensions: {
      decisionDemand: 1,
      informationDensity: 1,
      interactionComplexity: 0,
      contextDisruption: 0,
      learningCurve: 1,
    },
    primaryCostDriver: 'One decision + one interaction mode',
  },
  slider: {
    dimensions: {
      decisionDemand: 1,
      informationDensity: 0,
      interactionComplexity: 1,
      contextDisruption: 0,
      learningCurve: 1,
    },
    primaryCostDriver: 'One decision + one interaction mode',
  },
  'radio-group': {
    dimensions: {
      decisionDemand: 1,
      informationDensity: 1,
      interactionComplexity: 1,
      contextDisruption: 0,
      learningCurve: 0,
    },
    primaryCostDriver: 'One decision + one interaction mode',
  },
  table: {
    dimensions: {
      decisionDemand: 0,
      informationDensity: 2,
      interactionComplexity: 0,
      contextDisruption: 0,
      learningCurve: 1,
    },
    primaryCostDriver: 'One decision + one interaction mode',
  },
  resizable: {
    dimensions: {
      decisionDemand: 1,
      informationDensity: 0,
      interactionComplexity: 1,
      contextDisruption: 0,
      learningCurve: 1,
    },
    primaryCostDriver: 'One decision + one interaction mode',
  },
  field: {
    dimensions: {
      decisionDemand: 1,
      informationDensity: 1,
      interactionComplexity: 1,
      contextDisruption: 0,
      learningCurve: 0,
    },
    primaryCostDriver: 'One decision + one interaction mode',
  },
  'hover-card': {
    dimensions: {
      decisionDemand: 0,
      informationDensity: 1,
      interactionComplexity: 0,
      contextDisruption: 1,
      learningCurve: 1,
    },
    primaryCostDriver: 'One decision + one interaction mode',
  },
  image: {
    dimensions: {
      decisionDemand: 0,
      informationDensity: 2,
      interactionComplexity: 0,
      contextDisruption: 0,
      learningCurve: 1,
    },
    primaryCostDriver: 'One decision + one interaction mode',
  },
  embed: {
    dimensions: {
      decisionDemand: 0,
      informationDensity: 2,
      interactionComplexity: 0,
      contextDisruption: 0,
      learningCurve: 1,
    },
    primaryCostDriver: 'One decision + one interaction mode',
  },
  item: {
    dimensions: {
      decisionDemand: 1,
      informationDensity: 1,
      interactionComplexity: 1,
      contextDisruption: 0,
      learningCurve: 0,
    },
    primaryCostDriver: 'One decision + one interaction mode',
  },

  // Score 4 -- Data entry or menu scanning
  input: {
    dimensions: {
      decisionDemand: 1,
      informationDensity: 1,
      interactionComplexity: 1,
      contextDisruption: 0,
      learningCurve: 1,
    },
    primaryCostDriver: 'Data entry or menu scanning',
  },
  textarea: {
    dimensions: {
      decisionDemand: 1,
      informationDensity: 1,
      interactionComplexity: 1,
      contextDisruption: 0,
      learningCurve: 1,
    },
    primaryCostDriver: 'Data entry or menu scanning',
  },
  'input-group': {
    dimensions: {
      decisionDemand: 1,
      informationDensity: 1,
      interactionComplexity: 1,
      contextDisruption: 0,
      learningCurve: 1,
    },
    primaryCostDriver: 'Data entry or menu scanning',
  },
  'input-otp': {
    dimensions: {
      decisionDemand: 1,
      informationDensity: 1,
      interactionComplexity: 1,
      contextDisruption: 0,
      learningCurve: 1,
    },
    primaryCostDriver: 'Data entry or menu scanning',
  },
  carousel: {
    dimensions: {
      decisionDemand: 1,
      informationDensity: 1,
      interactionComplexity: 1,
      contextDisruption: 0,
      learningCurve: 1,
    },
    primaryCostDriver: 'Data entry or menu scanning',
  },
  tabs: {
    dimensions: {
      decisionDemand: 1,
      informationDensity: 1,
      interactionComplexity: 1,
      contextDisruption: 0,
      learningCurve: 1,
    },
    primaryCostDriver: 'Data entry or menu scanning',
  },
  'context-menu': {
    dimensions: {
      decisionDemand: 1,
      informationDensity: 1,
      interactionComplexity: 1,
      contextDisruption: 0,
      learningCurve: 1,
    },
    primaryCostDriver: 'Data entry or menu scanning',
  },
  'dropdown-menu': {
    dimensions: {
      decisionDemand: 1,
      informationDensity: 1,
      interactionComplexity: 1,
      contextDisruption: 0,
      learningCurve: 1,
    },
    primaryCostDriver: 'Data entry or menu scanning',
  },
  popover: {
    dimensions: {
      decisionDemand: 0,
      informationDensity: 1,
      interactionComplexity: 1,
      contextDisruption: 1,
      learningCurve: 1,
    },
    primaryCostDriver: 'Data entry or menu scanning',
  },
  progress: {
    dimensions: {
      decisionDemand: 0,
      informationDensity: 2,
      interactionComplexity: 0,
      contextDisruption: 1,
      learningCurve: 1,
    },
    primaryCostDriver: 'Data entry or menu scanning',
  },
  drawer: {
    dimensions: {
      decisionDemand: 1,
      informationDensity: 1,
      interactionComplexity: 1,
      contextDisruption: 1,
      learningCurve: 0,
    },
    primaryCostDriver: 'Data entry or menu scanning',
  },
  grid: {
    dimensions: {
      decisionDemand: 0,
      informationDensity: 2,
      interactionComplexity: 0,
      contextDisruption: 0,
      learningCurve: 2,
    },
    primaryCostDriver: 'Data entry or menu scanning',
  },
  'block-wrapper': {
    dimensions: {
      decisionDemand: 1,
      informationDensity: 1,
      interactionComplexity: 1,
      contextDisruption: 0,
      learningCurve: 1,
    },
    primaryCostDriver: 'Data entry or menu scanning',
  },
  'inline-toolbar': {
    dimensions: {
      decisionDemand: 1,
      informationDensity: 1,
      interactionComplexity: 1,
      contextDisruption: 0,
      learningCurve: 1,
    },
    primaryCostDriver: 'Data entry or menu scanning',
  },
  'editor-toolbar': {
    dimensions: {
      decisionDemand: 1,
      informationDensity: 1,
      interactionComplexity: 1,
      contextDisruption: 0,
      learningCurve: 1,
    },
    primaryCostDriver: 'Data entry or menu scanning',
  },
  pagination: {
    dimensions: {
      decisionDemand: 1,
      informationDensity: 1,
      interactionComplexity: 1,
      contextDisruption: 0,
      learningCurve: 1,
    },
    primaryCostDriver: 'Data entry or menu scanning',
  },

  // Score 5 -- Multi-step interaction or spatial reasoning
  sheet: {
    dimensions: {
      decisionDemand: 1,
      informationDensity: 1,
      interactionComplexity: 1,
      contextDisruption: 1,
      learningCurve: 1,
    },
    primaryCostDriver: 'Multi-step interaction or spatial reasoning',
  },
  'date-picker': {
    dimensions: {
      decisionDemand: 1,
      informationDensity: 1,
      interactionComplexity: 2,
      contextDisruption: 0,
      learningCurve: 1,
    },
    primaryCostDriver: 'Multi-step interaction or spatial reasoning',
  },
  calendar: {
    dimensions: {
      decisionDemand: 1,
      informationDensity: 2,
      interactionComplexity: 1,
      contextDisruption: 0,
      learningCurve: 1,
    },
    primaryCostDriver: 'Multi-step interaction or spatial reasoning',
  },
  select: {
    dimensions: {
      decisionDemand: 2,
      informationDensity: 1,
      interactionComplexity: 1,
      contextDisruption: 0,
      learningCurve: 1,
    },
    primaryCostDriver: 'Multi-step interaction or spatial reasoning',
  },
  'navigation-menu': {
    dimensions: {
      decisionDemand: 1,
      informationDensity: 2,
      interactionComplexity: 1,
      contextDisruption: 0,
      learningCurve: 1,
    },
    primaryCostDriver: 'Multi-step interaction or spatial reasoning',
  },
  menubar: {
    dimensions: {
      decisionDemand: 1,
      informationDensity: 2,
      interactionComplexity: 1,
      contextDisruption: 0,
      learningCurve: 1,
    },
    primaryCostDriver: 'Multi-step interaction or spatial reasoning',
  },
  'color-picker': {
    dimensions: {
      decisionDemand: 1,
      informationDensity: 1,
      interactionComplexity: 2,
      contextDisruption: 0,
      learningCurve: 1,
    },
    primaryCostDriver: 'Multi-step interaction or spatial reasoning',
  },
  'block-canvas': {
    dimensions: {
      decisionDemand: 1,
      informationDensity: 1,
      interactionComplexity: 1,
      contextDisruption: 1,
      learningCurve: 1,
    },
    primaryCostDriver: 'Multi-step interaction or spatial reasoning',
  },

  // Score 6 -- Compound interaction modes or learning curve
  dialog: {
    dimensions: {
      decisionDemand: 1,
      informationDensity: 1,
      interactionComplexity: 1,
      contextDisruption: 2,
      learningCurve: 1,
    },
    primaryCostDriver: 'Compound interaction modes or learning curve',
  },
  command: {
    dimensions: {
      decisionDemand: 1,
      informationDensity: 2,
      interactionComplexity: 1,
      contextDisruption: 0,
      learningCurve: 2,
    },
    primaryCostDriver: 'Compound interaction modes or learning curve',
  },
  combobox: {
    dimensions: {
      decisionDemand: 2,
      informationDensity: 2,
      interactionComplexity: 2,
      contextDisruption: 0,
      learningCurve: 0,
    },
    primaryCostDriver: 'Compound interaction modes or learning curve',
  },

  // Score 7 -- Full context disruption + consequential decision
  'alert-dialog': {
    dimensions: {
      decisionDemand: 2,
      informationDensity: 1,
      interactionComplexity: 1,
      contextDisruption: 2,
      learningCurve: 1,
    },
    primaryCostDriver: 'Full context disruption + consequential decision',
  },
};

// ==================== Dimension Metadata ====================

const DIMENSION_NAMES: Record<keyof CognitiveDimensions, string> = {
  decisionDemand: 'Decision Demand',
  informationDensity: 'Information Density',
  interactionComplexity: 'Interaction Complexity',
  contextDisruption: 'Context Disruption',
  learningCurve: 'Learning Curve',
};

const HOTSPOT_SUGGESTIONS: Record<keyof CognitiveDimensions, string> = {
  contextDisruption: 'Consider non-modal alternative if the decision is not consequential',
  informationDensity: 'Consider progressive disclosure to reduce simultaneous information',
  interactionComplexity: 'Consider a simpler single-mode alternative',
  decisionDemand: 'Can choices be pre-selected or split across steps?',
  learningCurve: 'Ensure discoverability with inline guidance',
};

// ==================== Evaluation Logic ====================

function scoreOf(dimensions: CognitiveDimensions): number {
  return (
    dimensions.decisionDemand +
    dimensions.informationDensity +
    dimensions.interactionComplexity +
    dimensions.contextDisruption +
    dimensions.learningCurve
  );
}

function highestDimension(dimensions: CognitiveDimensions): keyof CognitiveDimensions {
  let max = -1;
  let maxKey: keyof CognitiveDimensions = 'decisionDemand';

  for (const key of Object.keys(dimensions) as Array<keyof CognitiveDimensions>) {
    if (dimensions[key] > max) {
      max = dimensions[key];
      maxKey = key;
    }
  }

  return maxKey;
}

interface DesignPatternRef {
  name: string;
  components: string[];
}

interface EnrichmentData {
  componentIntelligence: Map<string, ComponentMetadata>;
  tokenOverrides: Array<{
    token: Token;
    namespace: string;
  }>;
  patterns: Record<string, DesignPatternRef>;
}

export function evaluateComposition(
  components: string[],
  tier: BudgetTier,
  enrichment: EnrichmentData,
): CompositionReview {
  const budget = BUDGET_TIERS[tier];

  // Count occurrences of each component
  const componentCounts = new Map<string, number>();
  for (const name of components) {
    componentCounts.set(name, (componentCounts.get(name) ?? 0) + 1);
  }

  // Step 1: Score each unique component and sum total
  let total = 0;
  const componentResults: CompositionReview['components'] = [];
  const unknownComponents: string[] = [];

  for (const [name, count] of componentCounts) {
    const profile = COMPONENT_SCORES[name];
    if (!profile) {
      unknownComponents.push(name);
      continue;
    }
    const score = scoreOf(profile.dimensions);
    total += score * count;
    componentResults.push({
      name,
      score,
      count,
      dimensions: profile.dimensions,
      primaryCostDriver: profile.primaryCostDriver,
    });
  }

  // Sort by score descending for readability
  componentResults.sort((a, b) => b.score - a.score);

  // Step 2: Budget assessment
  const withinBudget = total <= budget;
  const budgetResult: CompositionReview['budget'] = {
    tier,
    budget,
    total,
    status: withinBudget ? 'within-budget' : 'over-budget',
  };
  if (withinBudget) {
    budgetResult.headroom = budget - total;
  } else {
    budgetResult.overage = total - budget;
    budgetResult.overagePercent = Math.round(((total - budget) / budget) * 100);
  }

  // Step 3: Detect attention conflicts from @attention-economics
  const attentionConflicts: string[] = [];
  const attentionNotes: string[] = [];
  const fullAttentionCaptures: string[] = [];
  const primaryElements: string[] = [];

  for (const [name] of componentCounts) {
    const metadata = enrichment.componentIntelligence.get(name);
    if (!metadata?.intelligence?.attentionEconomics) continue;

    const attn = metadata.intelligence.attentionEconomics.toLowerCase();

    if (attn.includes('full attention capture') || attn.includes('blocks all other')) {
      fullAttentionCaptures.push(name);
    }
    if (attn.includes('primary') && attn.includes('maximum 1')) {
      const count = componentCounts.get(name) ?? 0;
      if (count > 1) {
        primaryElements.push(name);
      }
    }
  }

  if (fullAttentionCaptures.length > 1) {
    attentionConflicts.push(`${fullAttentionCaptures.join(' and ')} both capture full attention`);
  }

  // Check for multiple buttons which could include primaries
  const buttonCount = componentCounts.get('button') ?? 0;
  if (buttonCount > 1) {
    const buttonMeta = enrichment.componentIntelligence.get('button');
    if (
      buttonMeta?.intelligence?.attentionEconomics?.toLowerCase().includes('maximum 1 per section')
    ) {
      attentionNotes.push(`${buttonCount} buttons present -- ensure maximum 1 primary per section`);
    }
  }

  if (primaryElements.length > 0) {
    for (const name of primaryElements) {
      attentionNotes.push(`Multiple ${name} instances -- check attention hierarchy`);
    }
  }

  // Step 4: Surface trust considerations from @trust-building
  const trustConsiderations: string[] = [];
  for (const [name] of componentCounts) {
    const metadata = enrichment.componentIntelligence.get(name);
    if (!metadata?.intelligence?.trustBuilding) continue;

    const trust = metadata.intelligence.trustBuilding;
    // Surface trust patterns for components with consequence/confirmation themes
    if (
      trust.toLowerCase().includes('confirmation') ||
      trust.toLowerCase().includes('destructive') ||
      trust.toLowerCase().includes('consequence') ||
      trust.toLowerCase().includes('cancel')
    ) {
      trustConsiderations.push(`${name}: ${trust}`);
    }
  }

  // Step 5: Match design patterns
  const patternMatches: CompositionReview['patterns'] = [];
  const compositionSet = new Set(componentCounts.keys());

  for (const [patternKey, pattern] of Object.entries(enrichment.patterns)) {
    const matched = pattern.components.filter((c) => compositionSet.has(c));
    // Require at least 2 matching components or all pattern components present
    if (matched.length >= 2 || matched.length === pattern.components.length) {
      patternMatches.push({
        name: pattern.name,
        matched,
        suggestion: `Call rafters_pattern('${patternKey}') for full guidance`,
      });
    }
  }

  // Step 6: Find relevant token overrides
  const designerNotes: CompositionReview['designerNotes'] = [];
  const compositionNames = [...compositionSet];

  for (const { token } of enrichment.tokenOverrides) {
    if (!token.userOverride) continue;

    // Check if token is relevant to any composition component
    const relevantTo: string[] = [];

    if (token.applicableComponents) {
      for (const comp of token.applicableComponents) {
        if (compositionSet.has(comp)) {
          relevantTo.push(comp);
        }
      }
    }

    // Namespace-based relevance: spacing tokens for form components, etc.
    if (relevantTo.length === 0) {
      if (token.namespace === 'spacing') {
        const formComponents = compositionNames.filter((n) =>
          [
            'input',
            'textarea',
            'field',
            'label',
            'button',
            'select',
            'checkbox',
            'radio-group',
            'switch',
            'slider',
            'combobox',
          ].includes(n),
        );
        if (formComponents.length > 0) {
          relevantTo.push(...formComponents);
        }
      } else if (token.namespace === 'color') {
        // Color tokens with semantic names may be relevant to components with variant emphasis
        const variantComponents = compositionNames.filter((n) =>
          ['button', 'badge', 'alert', 'alert-dialog', 'progress'].includes(n),
        );
        if (
          variantComponents.length > 0 &&
          (token.name.includes('destructive') || token.name.includes('primary'))
        ) {
          relevantTo.push(...variantComponents);
        }
      }
    }

    if (relevantTo.length > 0) {
      designerNotes.push({
        token: token.name,
        reason: token.userOverride.reason,
        relevantTo,
      });
    }
  }

  // Step 7: Check do/never violations at composition level
  const violations: string[] = [];
  for (const [name] of componentCounts) {
    const metadata = enrichment.componentIntelligence.get(name);
    if (!metadata?.intelligence?.usagePatterns?.nevers) continue;

    for (const never of metadata.intelligence.usagePatterns.nevers) {
      const neverLower = never.toLowerCase();

      // Check composition-level violations
      if (neverLower.includes('nest') && neverLower.includes('card') && name === 'card') {
        const cardCount = componentCounts.get('card') ?? 0;
        if (cardCount > 1) {
          violations.push(
            `${name}: "${never}" -- ${cardCount} cards in composition, verify none are nested`,
          );
        }
      }

      if (neverLower.includes('multiple primary') && name === 'button') {
        if (buttonCount > 1) {
          violations.push(`${name}: "${never}"`);
        }
      }

      if (neverLower.includes('stack') && neverLower.includes('dialog')) {
        if (
          compositionSet.has('dialog') &&
          (compositionSet.has('alert-dialog') || (componentCounts.get('dialog') ?? 0) > 1)
        ) {
          violations.push(`${name}: "${never}"`);
        }
      }
    }
  }

  // Step 8: Generate hotspot suggestions for components scoring 4+
  const hotspots: CompositionReview['hotspots'] = [];
  for (const comp of componentResults) {
    if (comp.score >= 4) {
      const highest = highestDimension(comp.dimensions);
      hotspots.push({
        name: comp.name,
        score: comp.score,
        highestDimension: DIMENSION_NAMES[highest],
        suggestion: HOTSPOT_SUGGESTIONS[highest],
      });
    }
  }

  // Add notes for unknown components
  if (unknownComponents.length > 0) {
    attentionNotes.push(
      `Unknown components not scored: ${unknownComponents.join(', ')}. Totals may be understated.`,
    );
  }

  return {
    budget: budgetResult,
    components: componentResults,
    attention: {
      conflicts: attentionConflicts,
      notes: attentionNotes,
    },
    trust: trustConsiderations,
    patterns: patternMatches,
    designerNotes,
    hotspots,
    violations,
  };
}
