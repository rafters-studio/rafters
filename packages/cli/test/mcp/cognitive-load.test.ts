import type { ComponentMetadata, Token } from '@rafters/shared';
import { describe, expect, it } from 'vitest';
import {
  BUDGET_TIERS,
  COMPONENT_SCORES,
  type CognitiveDimensions,
  evaluateComposition,
} from '../../src/mcp/cognitive-load.js';

// ==================== Helpers ====================

function emptyEnrichment() {
  return {
    componentIntelligence: new Map<string, ComponentMetadata>(),
    tokenOverrides: [] as Array<{ token: Token; namespace: string }>,
    patterns: {} as Record<string, { name: string; components: string[] }>,
  };
}

function scoreOf(d: CognitiveDimensions): number {
  return (
    d.decisionDemand +
    d.informationDensity +
    d.interactionComplexity +
    d.contextDisruption +
    d.learningCurve
  );
}

// ==================== Scoring Data Integrity ====================

describe('COMPONENT_SCORES', () => {
  it('should have entries for all reference table components', () => {
    // Key components from the scoring reference table
    const expected = [
      'separator',
      'container',
      'aspect-ratio',
      'skeleton',
      'kbd',
      'badge',
      'button',
      'input',
      'combobox',
      'command',
      'dialog',
      'alert-dialog',
      'sidebar',
      'tabs',
      'card',
      'label',
    ];
    for (const name of expected) {
      expect(COMPONENT_SCORES[name]).toBeDefined();
    }
  });

  it('should have dimension values of 0, 1, or 2 for every component', () => {
    for (const [name, profile] of Object.entries(COMPONENT_SCORES)) {
      const dims = profile.dimensions;
      for (const [dimName, value] of Object.entries(dims)) {
        expect(
          value === 0 || value === 1 || value === 2,
          `${name}.${dimName} = ${value}, expected 0, 1, or 2`,
        ).toBe(true);
      }
    }
  });

  it('should have dimensions that sum to the documented total for walkthroughed components', () => {
    // These 7 components have detailed walkthroughs in the doc
    const walkthroughs: Record<string, number> = {
      separator: 0,
      button: 3,
      'alert-dialog': 7,
      badge: 2,
      input: 4,
      combobox: 6,
      command: 6,
    };

    for (const [name, expectedTotal] of Object.entries(walkthroughs)) {
      const profile = COMPONENT_SCORES[name];
      expect(profile).toBeDefined();
      const total = scoreOf(profile.dimensions);
      expect(total, `${name} should score ${expectedTotal}, got ${total}`).toBe(expectedTotal);
    }
  });

  it('should have consistent score tiers from the reference table', () => {
    // Score 0 components
    for (const name of ['separator', 'container', 'aspect-ratio']) {
      expect(scoreOf(COMPONENT_SCORES[name].dimensions)).toBe(0);
    }
    // Score 1 components
    for (const name of ['skeleton', 'kbd']) {
      expect(scoreOf(COMPONENT_SCORES[name].dimensions)).toBe(1);
    }
    // Score 7 component
    expect(scoreOf(COMPONENT_SCORES['alert-dialog'].dimensions)).toBe(7);
  });

  it('should have a primaryCostDriver string for every component', () => {
    for (const [name, profile] of Object.entries(COMPONENT_SCORES)) {
      expect(profile.primaryCostDriver.length, `${name} missing primaryCostDriver`).toBeGreaterThan(
        0,
      );
    }
  });

  it('should not have any component scoring above 7', () => {
    for (const [name, profile] of Object.entries(COMPONENT_SCORES)) {
      const total = scoreOf(profile.dimensions);
      expect(total, `${name} scores ${total}, max is 7`).toBeLessThanOrEqual(7);
    }
  });
});

// ==================== Budget Tiers ====================

describe('BUDGET_TIERS', () => {
  it('should define focused=15, page=30, app=45', () => {
    expect(BUDGET_TIERS.focused).toBe(15);
    expect(BUDGET_TIERS.page).toBe(30);
    expect(BUDGET_TIERS.app).toBe(45);
  });
});

// ==================== evaluateComposition ====================

describe('evaluateComposition', () => {
  it('should return within-budget for a simple composition', () => {
    // button(3) + card(2) = 5, page budget is 30
    const review = evaluateComposition(['button', 'card'], 'page', emptyEnrichment());

    expect(review.budget.status).toBe('within-budget');
    expect(review.budget.total).toBe(5);
    expect(review.budget.budget).toBe(30);
    expect(review.budget.headroom).toBe(25);
    expect(review.budget.overage).toBeUndefined();
  });

  it('should return over-budget when composition exceeds tier', () => {
    // alert-dialog(7) + dialog(6) + command(6) = 19, focused budget is 15
    const review = evaluateComposition(
      ['alert-dialog', 'dialog', 'command'],
      'focused',
      emptyEnrichment(),
    );

    expect(review.budget.status).toBe('over-budget');
    expect(review.budget.total).toBe(19);
    expect(review.budget.overage).toBe(4);
    expect(review.budget.overagePercent).toBe(27); // 4/15 = 26.7 -> 27
    expect(review.budget.headroom).toBeUndefined();
  });

  it('should count duplicate components', () => {
    // 4x input(4) + 2x button(3) = 22
    const review = evaluateComposition(
      ['input', 'input', 'input', 'input', 'button', 'button'],
      'page',
      emptyEnrichment(),
    );

    expect(review.budget.total).toBe(22);
    const inputComp = review.components.find((c) => c.name === 'input');
    expect(inputComp?.count).toBe(4);
    const buttonComp = review.components.find((c) => c.name === 'button');
    expect(buttonComp?.count).toBe(2);
  });

  it('should identify hotspots for components scoring 4+', () => {
    const review = evaluateComposition(
      ['alert-dialog', 'combobox', 'separator'],
      'page',
      emptyEnrichment(),
    );

    expect(review.hotspots.length).toBe(2);
    const alertHotspot = review.hotspots.find((h) => h.name === 'alert-dialog');
    expect(alertHotspot).toBeDefined();
    expect(alertHotspot?.score).toBe(7);
    expect(alertHotspot?.suggestion.length).toBeGreaterThan(0);

    const comboHotspot = review.hotspots.find((h) => h.name === 'combobox');
    expect(comboHotspot).toBeDefined();
    expect(comboHotspot?.score).toBe(6);
  });

  it('should not include hotspots for components scoring below 4', () => {
    const review = evaluateComposition(['button', 'card', 'separator'], 'page', emptyEnrichment());

    expect(review.hotspots.length).toBe(0);
  });

  it('should handle unknown components gracefully', () => {
    const review = evaluateComposition(['button', 'my-custom-widget'], 'page', emptyEnrichment());

    // Only button is scored
    expect(review.budget.total).toBe(3);
    expect(review.components.length).toBe(1);
    expect(review.attention.notes.some((n) => n.includes('Unknown'))).toBe(true);
    expect(review.attention.notes.some((n) => n.includes('my-custom-widget'))).toBe(true);
  });

  it('should sort components by score descending', () => {
    const review = evaluateComposition(
      ['separator', 'alert-dialog', 'button', 'combobox'],
      'page',
      emptyEnrichment(),
    );

    const scores = review.components.map((c) => c.score);
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeLessThanOrEqual(scores[i - 1]);
    }
  });

  it('should include dimensional profile for each component', () => {
    const review = evaluateComposition(['button'], 'page', emptyEnrichment());

    const btn = review.components[0];
    expect(btn.dimensions).toBeDefined();
    expect(btn.dimensions.decisionDemand).toBe(1);
    expect(btn.dimensions.interactionComplexity).toBe(1);
    expect(btn.dimensions.informationDensity).toBe(1);
    expect(btn.dimensions.contextDisruption).toBe(0);
    expect(btn.dimensions.learningCurve).toBe(0);
  });

  it('should default tier to page', () => {
    const review = evaluateComposition(['button'], 'page', emptyEnrichment());
    expect(review.budget.tier).toBe('page');
    expect(review.budget.budget).toBe(30);
  });
});

// ==================== Attention Conflict Detection ====================

describe('attention conflict detection', () => {
  it('should detect full attention capture conflicts', () => {
    const enrichment = emptyEnrichment();

    // Simulate two components with "full attention capture"
    enrichment.componentIntelligence.set('alert-dialog', {
      name: 'alert-dialog',
      displayName: 'Alert Dialog',
      category: 'overlay',
      intelligence: {
        cognitiveLoad: 7,
        attentionEconomics: 'Full attention capture: blocks all other interactions until resolved',
      },
      variants: ['default'],
      sizes: ['default'],
      dependencies: [],
      primitives: [],
      filePath: '',
    });
    enrichment.componentIntelligence.set('dialog', {
      name: 'dialog',
      displayName: 'Dialog',
      category: 'overlay',
      intelligence: {
        cognitiveLoad: 6,
        attentionEconomics: 'Full attention capture: focus trap isolates interaction',
      },
      variants: ['default'],
      sizes: ['default'],
      dependencies: [],
      primitives: [],
      filePath: '',
    });

    const review = evaluateComposition(['alert-dialog', 'dialog'], 'page', enrichment);

    expect(review.attention.conflicts.length).toBeGreaterThan(0);
    expect(review.attention.conflicts[0]).toContain('alert-dialog');
    expect(review.attention.conflicts[0]).toContain('dialog');
  });

  it('should note multiple buttons for attention hierarchy', () => {
    const enrichment = emptyEnrichment();
    enrichment.componentIntelligence.set('button', {
      name: 'button',
      displayName: 'Button',
      category: 'form',
      intelligence: {
        cognitiveLoad: 3,
        attentionEconomics: 'Primary variant commands highest attention - maximum 1 per section',
      },
      variants: ['default'],
      sizes: ['default'],
      dependencies: [],
      primitives: [],
      filePath: '',
    });

    const review = evaluateComposition(['button', 'button', 'button'], 'page', enrichment);

    expect(review.attention.notes.some((n) => n.includes('3 buttons'))).toBe(true);
  });
});

// ==================== Trust Considerations ====================

describe('trust considerations', () => {
  it('should surface trust patterns for components with confirmation themes', () => {
    const enrichment = emptyEnrichment();
    enrichment.componentIntelligence.set('alert-dialog', {
      name: 'alert-dialog',
      displayName: 'Alert Dialog',
      category: 'overlay',
      intelligence: {
        cognitiveLoad: 7,
        trustBuilding: 'Focus defaults to Cancel (safer choice), clear action consequences',
      },
      variants: ['default'],
      sizes: ['default'],
      dependencies: [],
      primitives: [],
      filePath: '',
    });

    const review = evaluateComposition(['alert-dialog', 'button'], 'page', enrichment);

    expect(review.trust.length).toBeGreaterThan(0);
    expect(review.trust[0]).toContain('Cancel');
  });
});

// ==================== Pattern Matching ====================

describe('pattern matching', () => {
  it('should match design patterns from composition components', () => {
    const enrichment = emptyEnrichment();
    enrichment.patterns = {
      'form-validation': {
        name: 'Form Validation',
        components: ['field', 'input', 'label', 'button'],
      },
      'navigation-hierarchy': {
        name: 'Navigation Hierarchy',
        components: ['breadcrumb', 'tabs', 'navigation-menu', 'sidebar'],
      },
    };

    // Settings composition with sidebar + tabs + form fields
    const review = evaluateComposition(
      [
        'sidebar',
        'tabs',
        'input',
        'input',
        'input',
        'input',
        'button',
        'button',
        'card',
        'label',
        'label',
        'label',
        'label',
      ],
      'page',
      enrichment,
    );

    // Should match form-validation (input + label + button present)
    const formMatch = review.patterns.find((p) => p.name === 'Form Validation');
    expect(formMatch).toBeDefined();
    expect(formMatch?.matched).toContain('input');
    expect(formMatch?.matched).toContain('button');
    expect(formMatch?.suggestion).toContain("rafters_pattern('form-validation')");

    // Should match navigation-hierarchy (sidebar + tabs present)
    const navMatch = review.patterns.find((p) => p.name === 'Navigation Hierarchy');
    expect(navMatch).toBeDefined();
    expect(navMatch?.matched).toContain('sidebar');
    expect(navMatch?.matched).toContain('tabs');
  });

  it('should not match patterns with fewer than 2 overlapping components', () => {
    const enrichment = emptyEnrichment();
    enrichment.patterns = {
      'data-table': {
        name: 'Data Table',
        components: ['table', 'button', 'dropdown-menu', 'checkbox', 'pagination'],
      },
    };

    // Only button overlaps
    const review = evaluateComposition(['button', 'card'], 'page', enrichment);

    expect(review.patterns.length).toBe(0);
  });
});

// ==================== Designer Notes (Token Overrides) ====================

describe('designer notes', () => {
  it('should surface token overrides relevant to composition components', () => {
    const enrichment = emptyEnrichment();
    enrichment.tokenOverrides = [
      {
        token: {
          name: 'spacing-6',
          value: '2rem',
          category: 'spacing',
          namespace: 'spacing',
          userOverride: {
            previousValue: '1.5rem',
            reason: 'Design review wanted more spacing for forms',
          },
        } as Token,
        namespace: 'spacing',
      },
    ];

    const review = evaluateComposition(['input', 'button', 'label'], 'page', enrichment);

    expect(review.designerNotes.length).toBeGreaterThan(0);
    expect(review.designerNotes[0].token).toBe('spacing-6');
    expect(review.designerNotes[0].reason).toContain('spacing');
    expect(review.designerNotes[0].relevantTo.length).toBeGreaterThan(0);
  });

  it('should use applicableComponents when available on token', () => {
    const enrichment = emptyEnrichment();
    enrichment.tokenOverrides = [
      {
        token: {
          name: 'primary-500',
          value: '#0066cc',
          category: 'color',
          namespace: 'color',
          applicableComponents: ['button', 'badge'],
          userOverride: {
            previousValue: '#0055bb',
            reason: 'Brand refresh required brighter primary',
          },
        } as Token,
        namespace: 'color',
      },
    ];

    const review = evaluateComposition(['button', 'card', 'input'], 'page', enrichment);

    expect(review.designerNotes.length).toBe(1);
    expect(review.designerNotes[0].relevantTo).toEqual(['button']);
  });
});

// ==================== Violations ====================

describe('violations', () => {
  it('should flag potential card nesting violations', () => {
    const enrichment = emptyEnrichment();
    enrichment.componentIntelligence.set('card', {
      name: 'card',
      displayName: 'Card',
      category: 'layout',
      intelligence: {
        usagePatterns: {
          dos: ['Use consistent card sizes in grids'],
          nevers: ['Nest cards within cards'],
        },
      },
      variants: ['default'],
      sizes: ['default'],
      dependencies: [],
      primitives: [],
      filePath: '',
    });

    const review = evaluateComposition(['card', 'card', 'button'], 'page', enrichment);

    expect(review.violations.some((v) => v.includes('card') && v.includes('Nest'))).toBe(true);
  });

  it('should flag multiple primary button violations', () => {
    const enrichment = emptyEnrichment();
    enrichment.componentIntelligence.set('button', {
      name: 'button',
      displayName: 'Button',
      category: 'form',
      intelligence: {
        usagePatterns: {
          dos: ['Primary: Main user goal, maximum 1 per section'],
          nevers: ['Multiple primary buttons competing for attention'],
        },
      },
      variants: ['default'],
      sizes: ['default'],
      dependencies: [],
      primitives: [],
      filePath: '',
    });

    const review = evaluateComposition(['button', 'button', 'input'], 'page', enrichment);

    expect(review.violations.some((v) => v.includes('Multiple primary'))).toBe(true);
  });
});
