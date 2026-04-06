/**
 * Typography Generator
 *
 * Generates typography tokens using mathematical progressions.
 * Uses minor-third (1.2) ratio for a harmonious type scale.
 *
 * This generator is a pure function - it receives typography definitions as input.
 * Default typography values are provided by the orchestrator from defaults.ts.
 */

import { generateModularScale, getRatio } from '@rafters/math-utils';
import type { Token } from '@rafters/shared';
import type { FontWeightDef, TypographyScaleDef } from './defaults.js';
import type { GeneratorResult, ResolvedSystemConfig } from './types.js';
import { TYPOGRAPHY_SCALE } from './types.js';

/**
 * Generate typography tokens from provided definitions
 */
export function generateTypographyTokens(
  config: ResolvedSystemConfig,
  typographyScale: Record<string, TypographyScaleDef>,
  fontWeights: Record<string, FontWeightDef>,
): GeneratorResult {
  const tokens: Token[] = [];
  const timestamp = new Date().toISOString();
  const { baseFontSize, fontFamily, monoFontFamily, progressionRatio } = config;

  const ratioValue = getRatio(progressionRatio);

  // Generate modular scale for font sizes
  const modularScale = generateModularScale(progressionRatio as 'minor-third', baseFontSize, 6);

  // Map scale positions to computed sizes using the typography scale definitions
  const fontSizes: Record<string, number> = {};
  for (const [scale, def] of Object.entries(typographyScale)) {
    // Calculate size based on step from base
    const step = def.step;
    if (step === 0) {
      fontSizes[scale] = modularScale.base;
    } else if (step < 0) {
      // Smaller sizes
      const idx = modularScale.smaller.length - Math.abs(step);
      fontSizes[scale] = modularScale.smaller[idx] ?? baseFontSize * ratioValue ** step;
    } else {
      // Larger sizes
      const idx = step - 1;
      fontSizes[scale] = modularScale.larger[idx] ?? baseFontSize * ratioValue ** step;
    }
  }

  // Font family tokens
  tokens.push({
    name: 'font-sans',
    value: fontFamily,
    category: 'typography',
    namespace: 'typography',
    semanticMeaning: 'Primary font family for UI text',
    usageContext: ['body-text', 'ui-elements', 'buttons', 'forms'],
    description:
      'Sans-serif font family. Noto Sans Variable provides excellent language support and all weight variations.',
    generatedAt: timestamp,
    containerQueryAware: false,
    localeAware: true,
    usagePatterns: {
      do: ['Use for all UI text', 'Rely on variable font for weight variations'],
      never: ['Mix with other sans-serif fonts', 'Use fixed font files when variable is available'],
    },
  });

  tokens.push({
    name: 'font-mono',
    value: monoFontFamily,
    category: 'typography',
    namespace: 'typography',
    semanticMeaning: 'Monospace font family for code',
    usageContext: ['code-blocks', 'inline-code', 'technical-data', 'tabular-numbers'],
    description: 'System monospace stack for code and technical content.',
    generatedAt: timestamp,
    containerQueryAware: false,
    usagePatterns: {
      do: ['Use for all code content', 'Use for tabular number displays'],
      never: ['Use for body text', 'Use for UI elements'],
    },
  });

  // Font-family role tokens -- semantic assignments that designers can override
  tokens.push({
    name: 'font-heading',
    value: `var(--font-sans)`,
    category: 'typography',
    namespace: 'typography',
    semanticMeaning: 'Font family for headings and display text',
    usageContext: ['headings', 'display-text', 'titles'],
    dependsOn: ['font-sans'],
    description:
      'Heading font family. Defaults to sans-serif. Override to change all headings to serif or another family.',
    generatedAt: timestamp,
    containerQueryAware: false,
    usagePatterns: {
      do: ['Override to set all headings to a different typeface'],
      never: ['Reference directly in components -- use typography role utilities instead'],
    },
  });

  tokens.push({
    name: 'font-body',
    value: `var(--font-sans)`,
    category: 'typography',
    namespace: 'typography',
    semanticMeaning: 'Font family for body text and UI elements',
    usageContext: ['body-text', 'labels', 'descriptions', 'ui-elements'],
    dependsOn: ['font-sans'],
    description:
      'Body font family. Defaults to sans-serif. Override to change all body and UI text.',
    generatedAt: timestamp,
    containerQueryAware: false,
    usagePatterns: {
      do: ['Override to set all body text to a different typeface'],
      never: ['Reference directly in components -- use typography role utilities instead'],
    },
  });

  tokens.push({
    name: 'font-code',
    value: `var(--font-mono)`,
    category: 'typography',
    namespace: 'typography',
    semanticMeaning: 'Font family for code, keyboard shortcuts, and technical content',
    usageContext: ['code-blocks', 'inline-code', 'kbd', 'shortcuts'],
    dependsOn: ['font-mono'],
    description: 'Code font family. Defaults to monospace. Override for a custom code typeface.',
    generatedAt: timestamp,
    containerQueryAware: false,
    usagePatterns: {
      do: ['Override to set all code content to a custom monospace font'],
      never: ['Reference directly in components -- use typography role utilities instead'],
    },
  });

  // Base font size token - use rem (1rem = 16px)
  const baseFontSizeRem = baseFontSize / 16;

  tokens.push({
    name: 'font-size-base',
    value: `${baseFontSizeRem}rem`,
    category: 'typography',
    namespace: 'typography',
    semanticMeaning: 'Base font size - all other sizes derive from this',
    usageContext: ['body-text', 'calculation-reference'],
    progressionSystem: progressionRatio as 'minor-third',
    description: `Base font size (${baseFontSizeRem}rem). Typography scale uses ${progressionRatio} ratio (${ratioValue}).`,
    generatedAt: timestamp,
    containerQueryAware: true,
    usagePatterns: {
      do: ['Reference as the root calculation base'],
      never: ['Change without understanding full scale impact'],
    },
  });

  // Generate font size tokens
  for (const scale of TYPOGRAPHY_SCALE) {
    const scaleDef = typographyScale[scale];
    const size = fontSizes[scale];
    if (!scaleDef || size === undefined) continue;
    const roundedSize = Math.round(size * 100) / 100;
    const remSize = Math.round((size / baseFontSize) * 1000) / 1000;
    const scaleIndex = TYPOGRAPHY_SCALE.indexOf(scale);
    const lineHeight = String(scaleDef.lineHeight);
    const letterSpacing = scaleDef.letterSpacing;

    let meaning: string;
    let usageContext: string[];

    if (scaleIndex <= 1) {
      meaning = 'Small text for captions, labels, and secondary information';
      usageContext = ['captions', 'labels', 'helper-text', 'metadata'];
    } else if (scaleIndex <= 3) {
      meaning = 'Body text range for primary content';
      usageContext = ['body-text', 'paragraphs', 'ui-text'];
    } else if (scaleIndex <= 6) {
      meaning = 'Heading text for section titles';
      usageContext = ['headings', 'section-titles', 'emphasis'];
    } else {
      meaning = 'Display text for hero sections and major headings';
      usageContext = ['hero-text', 'display-headings', 'marketing'];
    }

    tokens.push({
      name: `font-size-${scale}`,
      value: `${remSize}rem`,
      category: 'typography',
      namespace: 'typography',
      lineHeight,
      semanticMeaning: meaning,
      usageContext,
      scalePosition: scaleIndex,
      progressionSystem: progressionRatio as 'minor-third',
      mathRelationship: scaleIndex === 2 ? 'base' : `base × ${ratioValue}^${scaleIndex - 2}`,
      dependsOn: ['font-size-base'],
      description: `Font size ${scale} = ${roundedSize}px (${remSize}rem). Line height: ${lineHeight}, letter spacing: ${letterSpacing}`,
      generatedAt: timestamp,
      containerQueryAware: true,
    });

    // Also create line-height tokens
    tokens.push({
      name: `line-height-${scale}`,
      value: lineHeight,
      category: 'typography',
      namespace: 'typography',
      semanticMeaning: `Line height for ${scale} text size`,
      dependsOn: [`font-size-${scale}`],
      description: `Line height ${lineHeight} for ${scale} text. Tighter for large text, looser for small.`,
      generatedAt: timestamp,
      containerQueryAware: false,
    });

    // And letter-spacing tokens
    tokens.push({
      name: `letter-spacing-${scale}`,
      value: letterSpacing,
      category: 'typography',
      namespace: 'typography',
      semanticMeaning: `Letter spacing for ${scale} text size`,
      dependsOn: [`font-size-${scale}`],
      description: `Letter spacing ${letterSpacing} for ${scale} text. Negative for large text improves readability.`,
      generatedAt: timestamp,
      containerQueryAware: false,
    });
  }

  // Generate font weight tokens
  for (const [name, def] of Object.entries(fontWeights)) {
    tokens.push({
      name: `font-weight-${name}`,
      value: String(def.value),
      category: 'typography',
      namespace: 'typography',
      semanticMeaning: def.meaning,
      usageContext: def.contexts,
      description: `Font weight ${def.value} (${name})`,
      generatedAt: timestamp,
      containerQueryAware: false,
    });
  }

  // Typography scale metadata
  tokens.push({
    name: 'typography-progression',
    value: JSON.stringify({
      ratio: progressionRatio,
      ratioValue,
      baseFontSize,
      scale: Object.fromEntries(
        Object.entries(fontSizes).map(([k, v]) => [k, Math.round(v * 100) / 100]),
      ),
    }),
    category: 'typography',
    namespace: 'typography',
    semanticMeaning: 'Metadata about the typography progression system',
    description: `Typography uses ${progressionRatio} progression (ratio ${ratioValue}) from base ${baseFontSize}px.`,
    generatedAt: timestamp,
    containerQueryAware: false,
  });

  return {
    namespace: 'typography',
    tokens,
  };
}
