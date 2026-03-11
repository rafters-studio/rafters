import type { ColorValue } from '@rafters/shared';
import {
  ColorInspector,
  ColorScale,
  ContrastMatrix,
  TokenIntelligence,
} from '@rafters/ui/components/ui/color-inspector';
import { Container } from '@rafters/ui/components/ui/container';

// ---------------------------------------------------------------------------
// Realistic ColorValue data representing a design system palette
// ---------------------------------------------------------------------------

const primaryColor: ColorValue = {
  name: 'ocean-blue',
  token: 'primary',
  tokenId: 'color-primary-ocean-blue',
  value: '500',
  use: 'Main brand color. Selected for accessibility on both light and dark backgrounds.',
  scale: [
    { l: 0.98, c: 0.02, h: 240 },
    { l: 0.93, c: 0.04, h: 240 },
    { l: 0.85, c: 0.07, h: 240 },
    { l: 0.75, c: 0.1, h: 240 },
    { l: 0.65, c: 0.13, h: 240 },
    { l: 0.53, c: 0.15, h: 240 },
    { l: 0.42, c: 0.14, h: 240 },
    { l: 0.32, c: 0.12, h: 240 },
    { l: 0.22, c: 0.1, h: 240 },
    { l: 0.12, c: 0.08, h: 240 },
    { l: 0.04, c: 0.06, h: 240 },
  ],
  accessibility: {
    onWhite: { wcagAA: true, wcagAAA: false, contrastRatio: 5.2 },
    onBlack: { wcagAA: true, wcagAAA: true, contrastRatio: 12.1 },
    wcagAA: {
      normal: [
        [0, 6],
        [0, 7],
        [1, 7],
        [2, 8],
        [3, 9],
      ],
      large: [
        [0, 5],
        [0, 6],
        [1, 6],
      ],
    },
    wcagAAA: {
      normal: [
        [0, 8],
        [0, 9],
      ],
      large: [[0, 7]],
    },
    apca: { onWhite: 62, onBlack: -89, minFontSize: 14 },
    cvd: {
      deuteranopia: { l: 0.53, c: 0.08, h: 260 },
      protanopia: { l: 0.53, c: 0.06, h: 270 },
      tritanopia: { l: 0.53, c: 0.12, h: 200 },
    },
  },
  analysis: { temperature: 'cool', isLight: false, name: 'ocean-blue' },
  perceptualWeight: {
    weight: 0.6,
    density: 'medium',
    balancingRecommendation: 'Pair with lighter elements for visual balance',
  },
  atmosphericWeight: {
    distanceWeight: 0.7,
    temperature: 'cool',
    atmosphericRole: 'foreground',
  },
};

const secondaryColor: ColorValue = {
  name: 'warm-coral',
  token: 'secondary',
  tokenId: 'color-secondary-warm-coral',
  value: '500',
  use: 'Secondary accent for calls-to-action. Warm complement to the cool primary.',
  scale: [
    { l: 0.97, c: 0.02, h: 15 },
    { l: 0.92, c: 0.04, h: 15 },
    { l: 0.84, c: 0.08, h: 15 },
    { l: 0.74, c: 0.12, h: 15 },
    { l: 0.64, c: 0.16, h: 15 },
    { l: 0.52, c: 0.18, h: 15 },
    { l: 0.41, c: 0.16, h: 15 },
    { l: 0.31, c: 0.13, h: 15 },
    { l: 0.21, c: 0.1, h: 15 },
    { l: 0.11, c: 0.07, h: 15 },
    { l: 0.05, c: 0.04, h: 15 },
  ],
  accessibility: {
    onWhite: { wcagAA: true, wcagAAA: false, contrastRatio: 4.8 },
    onBlack: { wcagAA: true, wcagAAA: true, contrastRatio: 11.5 },
    wcagAA: {
      normal: [
        [0, 5],
        [0, 6],
        [1, 6],
        [1, 7],
        [2, 7],
        [2, 8],
        [3, 8],
        [3, 9],
      ],
      large: [
        [0, 4],
        [0, 5],
        [1, 5],
        [1, 6],
      ],
    },
    wcagAAA: {
      normal: [
        [0, 7],
        [0, 8],
        [0, 9],
        [1, 8],
      ],
      large: [
        [0, 6],
        [0, 7],
        [1, 7],
      ],
    },
    apca: { onWhite: 58, onBlack: -85, minFontSize: 16 },
    cvd: {
      deuteranopia: { l: 0.52, c: 0.1, h: 40 },
      protanopia: { l: 0.52, c: 0.05, h: 80 },
      tritanopia: { l: 0.52, c: 0.16, h: 10 },
    },
  },
  analysis: { temperature: 'warm', isLight: false, name: 'warm-coral' },
  perceptualWeight: {
    weight: 0.7,
    density: 'heavy',
    balancingRecommendation: 'Use sparingly; high visual weight demands counterbalance',
  },
  atmosphericWeight: {
    distanceWeight: 0.8,
    temperature: 'warm',
    atmosphericRole: 'foreground',
  },
};

const accentColor: ColorValue = {
  name: 'spring-green',
  token: 'accent',
  tokenId: 'color-accent-spring-green',
  value: '500',
  use: 'Success states, positive feedback, and nature-themed elements.',
  scale: [
    { l: 0.97, c: 0.02, h: 145 },
    { l: 0.93, c: 0.04, h: 145 },
    { l: 0.87, c: 0.06, h: 145 },
    { l: 0.78, c: 0.08, h: 145 },
    { l: 0.69, c: 0.1, h: 145 },
    { l: 0.58, c: 0.11, h: 145 },
    { l: 0.47, c: 0.1, h: 145 },
    { l: 0.37, c: 0.08, h: 145 },
    { l: 0.27, c: 0.06, h: 145 },
    { l: 0.16, c: 0.04, h: 145 },
    { l: 0.06, c: 0.02, h: 145 },
  ],
  accessibility: {
    onWhite: { wcagAA: true, wcagAAA: false, contrastRatio: 3.8 },
    onBlack: { wcagAA: true, wcagAAA: true, contrastRatio: 13.2 },
    wcagAA: {
      normal: [
        [0, 6],
        [0, 7],
        [1, 7],
        [2, 8],
        [3, 9],
        [4, 10],
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
        [0, 10],
        [1, 9],
      ],
      large: [
        [0, 7],
        [0, 8],
      ],
    },
    apca: { onWhite: 48, onBlack: -92, minFontSize: 18 },
    cvd: {
      deuteranopia: { l: 0.58, c: 0.04, h: 90 },
      protanopia: { l: 0.58, c: 0.05, h: 95 },
      tritanopia: { l: 0.58, c: 0.09, h: 180 },
    },
  },
  analysis: { temperature: 'cool', isLight: true, name: 'spring-green' },
  perceptualWeight: {
    weight: 0.3,
    density: 'light',
    balancingRecommendation: 'Can be used more liberally due to low visual weight',
  },
  atmosphericWeight: {
    distanceWeight: 0.4,
    temperature: 'cool',
    atmosphericRole: 'midground',
  },
};

const neutralColor: ColorValue = {
  name: 'slate-gray',
  token: 'neutral',
  tokenId: 'color-neutral-slate-gray',
  value: '500',
  use: 'Text, borders, and structural elements. Near-achromatic with a cool tint.',
  scale: [
    { l: 0.98, c: 0.005, h: 240 },
    { l: 0.93, c: 0.008, h: 240 },
    { l: 0.86, c: 0.01, h: 240 },
    { l: 0.76, c: 0.012, h: 240 },
    { l: 0.65, c: 0.015, h: 240 },
    { l: 0.5, c: 0.016, h: 240 },
    { l: 0.4, c: 0.015, h: 240 },
    { l: 0.3, c: 0.013, h: 240 },
    { l: 0.2, c: 0.01, h: 240 },
    { l: 0.1, c: 0.008, h: 240 },
    { l: 0.04, c: 0.005, h: 240 },
  ],
  accessibility: {
    onWhite: { wcagAA: true, wcagAAA: true, contrastRatio: 7.1 },
    onBlack: { wcagAA: true, wcagAAA: true, contrastRatio: 10.8 },
    wcagAA: {
      normal: [
        [0, 5],
        [0, 6],
        [0, 7],
        [1, 6],
        [1, 7],
        [2, 7],
        [2, 8],
        [3, 8],
        [3, 9],
        [4, 9],
        [4, 10],
      ],
      large: [
        [0, 4],
        [0, 5],
        [1, 5],
        [1, 6],
        [2, 6],
        [3, 7],
      ],
    },
    wcagAAA: {
      normal: [
        [0, 7],
        [0, 8],
        [0, 9],
        [0, 10],
        [1, 8],
        [1, 9],
        [2, 9],
      ],
      large: [
        [0, 6],
        [0, 7],
        [1, 7],
        [1, 8],
      ],
    },
    apca: { onWhite: 72, onBlack: -78, minFontSize: 12 },
    cvd: {
      deuteranopia: { l: 0.5, c: 0.01, h: 250 },
      protanopia: { l: 0.5, c: 0.01, h: 255 },
      tritanopia: { l: 0.5, c: 0.01, h: 220 },
    },
  },
  analysis: { temperature: 'neutral', isLight: false, name: 'slate-gray' },
  perceptualWeight: {
    weight: 0.4,
    density: 'medium',
    balancingRecommendation: 'Ideal for text and borders',
  },
  atmosphericWeight: {
    distanceWeight: 0.5,
    temperature: 'neutral',
    atmosphericRole: 'midground',
  },
};

const colors: ColorValue[] = [primaryColor, secondaryColor, accentColor, neutralColor];

// ---------------------------------------------------------------------------
// Default demo: full ColorInspector with all four families
// ---------------------------------------------------------------------------

export default function ColorInspectorDemo() {
  return <ColorInspector colors={colors} />;
}

// ---------------------------------------------------------------------------
// Variants demo: individual sub-components shown standalone
// ---------------------------------------------------------------------------

export function ColorInspectorVariants() {
  return (
    <Container as="div" gap="12">
      {/* Standalone ColorScale */}
      <section>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          ColorScale (primary)
        </h3>
        <ColorScale scale={primaryColor.scale} name="ocean-blue" />
      </section>

      {/* Standalone ContrastMatrix */}
      {primaryColor.accessibility ? (
        <section>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            ContrastMatrix (primary)
          </h3>
          <ContrastMatrix accessibility={primaryColor.accessibility} scaleName="ocean-blue" />
        </section>
      ) : null}

      {/* Standalone TokenIntelligence */}
      <section>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          TokenIntelligence
        </h3>
        <TokenIntelligence
          usagePatterns={{
            dos: [
              'Use primary for main interactive elements and key actions',
              'Pair with neutral for text-heavy layouts',
              'Use the 500 step as the base; 50-200 for backgrounds, 700-950 for text',
            ],
            nevers: [
              'Never use primary on primary backgrounds without checking contrast',
              'Never combine primary and secondary at equal visual weight',
              'Never use scale positions below 600 for body text on white',
            ],
          }}
          usageContext={[
            'Brand identity anchor across all product surfaces',
            'Interactive element default (buttons, links, focus rings)',
          ]}
          trustLevel="high"
          consequence="Misuse breaks brand consistency and WCAG compliance simultaneously"
          dependsOn={['--color-primary-base', '--color-primary-scale']}
          generationRule="Scale generated from OKLCH base via contrast-targeted lightness curve"
          userOverride={{
            previousValue: 'oklch(0.55 0.14 235)',
            reason: 'Shifted hue from 235 to 240 for better CVD differentiation from secondary',
            context: 'Design review 2026-02-18',
          }}
        />
      </section>
    </Container>
  );
}
