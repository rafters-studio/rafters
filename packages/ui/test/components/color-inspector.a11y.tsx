import type { ColorValue } from '@rafters/shared';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import {
  ColorCharacter,
  ColorFamily,
  ColorInspector,
  ColorScale,
  ColorStory,
  ColorWeight,
  ContrastMatrix,
  ContrastPreview,
  CVDSimulation,
  TokenIntelligence,
} from '../../src/components/ui/color-inspector';
import type { OklchColor } from '../../src/primitives/types';

const SCALE: OklchColor[] = [
  { l: 0.97, c: 0.01, h: 230 },
  { l: 0.93, c: 0.02, h: 230 },
  { l: 0.85, c: 0.05, h: 230 },
  { l: 0.76, c: 0.08, h: 230 },
  { l: 0.65, c: 0.11, h: 230 },
  { l: 0.55, c: 0.14, h: 230 },
  { l: 0.46, c: 0.12, h: 230 },
  { l: 0.38, c: 0.1, h: 230 },
  { l: 0.3, c: 0.08, h: 230 },
  { l: 0.22, c: 0.06, h: 230 },
  { l: 0.16, c: 0.04, h: 230 },
];

const ACCESSIBILITY = {
  onWhite: { wcagAA: true, wcagAAA: false, contrastRatio: 5.2 },
  onBlack: { wcagAA: true, wcagAAA: true, contrastRatio: 12.1 },
  wcagAA: {
    normal: [
      [0, 6],
      [0, 7],
      [1, 7],
      [2, 8],
    ],
    large: [
      [0, 5],
      [0, 6],
      [1, 6],
      [2, 7],
    ],
  },
  wcagAAA: {
    normal: [
      [0, 8],
      [0, 9],
    ],
    large: [
      [0, 7],
      [0, 8],
    ],
  },
  apca: { onWhite: 62.3, onBlack: -89.1, minFontSize: 14 },
  cvd: {
    deuteranopia: { l: 0.53, c: 0.08, h: 260 },
    protanopia: { l: 0.53, c: 0.06, h: 270 },
    tritanopia: { l: 0.53, c: 0.12, h: 200 },
  },
};

const PERCEPTUAL_WEIGHT = {
  weight: 0.6,
  density: 'medium' as const,
  balancingRecommendation: 'Pair with lighter elements',
};

const ATMOSPHERIC_WEIGHT = {
  distanceWeight: 0.7,
  temperature: 'cool' as const,
  atmosphericRole: 'foreground' as const,
};

function makeTestColorValue(): ColorValue {
  return {
    name: 'ocean-blue',
    scale: SCALE,
    token: 'primary',
    accessibility: ACCESSIBILITY,
    analysis: { temperature: 'cool', isLight: false, name: 'ocean-blue' },
    perceptualWeight: PERCEPTUAL_WEIGHT,
    atmosphericWeight: ATMOSPHERIC_WEIGHT,
    intelligence: {
      reasoning: 'Derived from primary brand color',
      emotionalImpact: 'Trust and stability',
      culturalContext: 'Corporate blue',
      accessibilityNotes: 'Passes WCAG AA for normal text',
      usageGuidance: 'Primary interactive elements',
    },
  };
}

describe('ColorInspector - Accessibility', () => {
  it('has no axe violations in resting state', async () => {
    const colors = [makeTestColorValue()];
    const { container } = render(<ColorInspector colors={colors} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('ColorScale - Accessibility', () => {
  it('has no axe violations', async () => {
    const { container } = render(<ColorScale scale={SCALE} name="ocean-blue" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('ContrastMatrix - Accessibility', () => {
  it('has no axe violations', async () => {
    const { container } = render(
      <ContrastMatrix accessibility={ACCESSIBILITY} scaleName="ocean-blue" />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('ColorFamily - Accessibility', () => {
  it('has no axe violations when selected', async () => {
    const color = makeTestColorValue();
    const { container } = render(
      <section aria-label="Color families">
        <ColorFamily color={color} selected />
      </section>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('CVDSimulation - Accessibility', () => {
  it('has no axe violations', async () => {
    const { container } = render(
      <CVDSimulation
        scale={SCALE}
        name="ocean-blue"
        cvd={ACCESSIBILITY.cvd}
        baseColor={{ l: 0.55, c: 0.14, h: 230 }}
        showOriginal
      />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('ColorWeight - Accessibility', () => {
  it('has no axe violations', async () => {
    const { container } = render(
      <ColorWeight perceptualWeight={PERCEPTUAL_WEIGHT} atmosphericWeight={ATMOSPHERIC_WEIGHT} />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('TokenIntelligence - Accessibility', () => {
  it('has no axe violations with all sections populated', async () => {
    const { container } = render(
      <TokenIntelligence
        usagePatterns={{
          dos: ['Use for primary actions', 'Use for interactive elements'],
          nevers: ['Never use for backgrounds', 'Never use for decorative elements'],
        }}
        usageContext={['Primary interactive elements']}
        trustLevel="high"
        consequence="Passes WCAG AA for normal text"
        dependsOn={['brand-base', 'contrast-system']}
        generationRule="Derived from primary brand color via OKLCH scale"
        userOverride={{
          previousValue: 'oklch(0.5 0.1 240)',
          reason: 'Brand refresh Q2 2025',
          context: 'Approved by design lead',
        }}
      />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('ColorStory - Accessibility', () => {
  it('has no axe violations with all sections', async () => {
    const { container } = render(
      <ColorStory
        intelligence={{
          reasoning: 'Balanced mid-tone lightness',
          emotionalImpact: 'Tranquility and growth',
          culturalContext: 'Green symbolizes nature',
          accessibilityNotes: 'Passes WCAG AA',
          usageGuidance: 'Suitable for backgrounds',
          metadata: {
            predictionId: 'test-123',
            confidence: 0.95,
            uncertaintyBounds: { lower: 0.85, upper: 1, confidenceInterval: 0.95 },
            qualityScore: 0.83,
            method: 'bootstrap',
          },
        }}
      />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('ColorCharacter - Accessibility', () => {
  it('has no axe violations with all tags', async () => {
    const { container } = render(
      <ColorCharacter
        analysis={{ temperature: 'cool', isLight: false, name: 'ocean-blue' }}
        atmosphericWeight={{
          distanceWeight: 0.2,
          temperature: 'cool',
          atmosphericRole: 'background',
        }}
        perceptualWeight={{ weight: 0.45, density: 'medium', balancingRecommendation: 'Balanced' }}
      />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('ContrastPreview - Accessibility', () => {
  it('has no axe violations', async () => {
    const { container } = render(<ContrastPreview scale={SCALE} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
