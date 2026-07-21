import { describe, expect, it } from 'vitest';
import {
  isLegalMotionComposition,
  MOTION_COMBINATION_CONSTRAINTS,
  MOTION_GOVERNING_RULE,
  type MotionComposition,
  validateMotionComposition,
} from '../src/index.js';

/**
 * A composition that answers a question and engages no prohibited combination.
 * Reused as the baseline the negative cases mutate.
 */
const LEGAL_BASE: MotionComposition = {
  translate: ['vertical'],
  opacity: true,
  answers: ['what-happened'],
};

describe('motion combination constraints (metadata)', () => {
  it('exposes all five constraints as queryable data', () => {
    const ids = MOTION_COMBINATION_CONSTRAINTS.map((c) => c.id);
    expect(ids).toEqual(['direction', 'scaling', 'opacity', 'rotation', 'timing']);
  });

  it('marks Scaling and Opacity as permissions, the rest as prohibitions', () => {
    const byId = Object.fromEntries(MOTION_COMBINATION_CONSTRAINTS.map((c) => [c.id, c.kind]));
    expect(byId.scaling).toBe('permission');
    expect(byId.opacity).toBe('permission');
    expect(byId.direction).toBe('prohibition');
    expect(byId.rotation).toBe('prohibition');
    expect(byId.timing).toBe('prohibition');
  });

  it('records the governing rule with an explicit mechanical/advisory split', () => {
    expect(MOTION_GOVERNING_RULE.statement).toMatch(/answers no question/i);
    expect(MOTION_GOVERNING_RULE.enforcement).toBe('mechanical-presence-advisory-truth');
    expect(MOTION_GOVERNING_RULE.questions).toEqual(['what-happened', 'where-am-i', 'what-next']);
  });
});

describe('validateMotionComposition (mechanical enforcement)', () => {
  it('accepts a legal single-axis fade+slide', () => {
    expect(validateMotionComposition(LEGAL_BASE)).toEqual([]);
    expect(isLegalMotionComposition(LEGAL_BASE)).toBe(true);
  });

  // Permission cases: multi-parameter combinations that MUST pass. These guard
  // against an over-eager validator that rejects "any two parameters combined".
  it('allows scale to combine with movement (permission)', () => {
    expect(
      isLegalMotionComposition({
        translate: ['vertical'],
        scale: true,
        answers: ['where-am-i'],
      }),
    ).toBe(true);
  });

  it('allows scale + opacity + movement together (permission)', () => {
    expect(
      isLegalMotionComposition({
        translate: ['horizontal'],
        scale: true,
        opacity: true,
        answers: ['what-next'],
      }),
    ).toBe(true);
  });

  // Prohibition cases: illegal combinations that MUST be rejected.
  it('rejects diagonal movement (both axes at once)', () => {
    const violations = validateMotionComposition({
      ...LEGAL_BASE,
      translate: ['horizontal', 'vertical'],
    });
    expect(violations.map((v) => v.constraint)).toContain('direction');
    expect(isLegalMotionComposition({ ...LEGAL_BASE, translate: ['horizontal', 'vertical'] })).toBe(
      false,
    );
  });

  it('rejects rotation combined with translation', () => {
    const violations = validateMotionComposition({
      translate: ['vertical'],
      rotate: true,
      elementSize: 'small',
      answers: ['what-happened'],
    });
    expect(violations.map((v) => v.constraint)).toContain('rotation');
  });

  it('rejects rotation on a large element', () => {
    const violations = validateMotionComposition({
      rotate: true,
      elementSize: 'large',
      answers: ['what-happened'],
    });
    expect(violations.map((v) => v.constraint)).toContain('rotation');
  });

  it('allows isolated rotation on a small element', () => {
    expect(
      isLegalMotionComposition({
        rotate: true,
        elementSize: 'small',
        answers: ['what-next'],
      }),
    ).toBe(true);
  });

  it('rejects simultaneous timing', () => {
    const violations = validateMotionComposition({
      ...LEGAL_BASE,
      timing: 'simultaneous',
    });
    expect(violations.map((v) => v.constraint)).toContain('timing');
  });

  it('accepts sequential timing', () => {
    expect(isLegalMotionComposition({ ...LEGAL_BASE, timing: 'sequential' })).toBe(true);
  });

  // Governing rule: presence is mechanical.
  it('rejects motion that declares no answered question', () => {
    const violations = validateMotionComposition({ translate: ['vertical'] });
    const governing = violations.find((v) => v.constraint === 'governing-rule');
    expect(governing).toBeDefined();
    expect(governing?.enforcement).toBe('mechanical');
  });

  it('reports every violation of a maximally-illegal composition', () => {
    const violations = validateMotionComposition({
      translate: ['horizontal', 'vertical'],
      rotate: true,
      elementSize: 'large',
      timing: 'simultaneous',
      // no answers
    });
    const constraints = new Set(violations.map((v) => v.constraint));
    expect(constraints).toContain('direction');
    expect(constraints).toContain('rotation');
    expect(constraints).toContain('timing');
    expect(constraints).toContain('governing-rule');
  });
});
