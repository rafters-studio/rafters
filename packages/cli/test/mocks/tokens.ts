/**
 * Token mocks using zocker
 *
 * Generates valid mock data from Zod schemas in @rafters/shared
 */

import {
  type DTCGColorToken,
  DTCGColorTokenSchema,
  type DTCGColorValue,
  DTCGColorValueSchema,
  type DTCGTokenBase,
  DTCGTokenBaseSchema,
  type OKLCH,
  OKLCHSchema,
} from '@rafters/shared';
import { zocker } from 'zocker';

// Base generators with deterministic seeds
const oklchGenerator = zocker(OKLCHSchema).setSeed(42);
const colorValueGenerator = zocker(DTCGColorValueSchema).setSeed(42);
const tokenBaseGenerator = zocker(DTCGTokenBaseSchema).setSeed(42);
const colorTokenGenerator = zocker(DTCGColorTokenSchema).setSeed(42);

/**
 * Generate a single OKLCH color
 */
export function mockOKLCH(): OKLCH {
  return oklchGenerator.generate();
}

/**
 * Generate multiple OKLCH colors
 */
export function mockOKLCHColors(count: number): OKLCH[] {
  return Array.from({ length: count }, () => oklchGenerator.generate());
}

/**
 * Generate a DTCG color value
 */
export function mockColorValue(): DTCGColorValue {
  return colorValueGenerator.generate();
}

/**
 * Generate a base token
 */
export function mockTokenBase(): DTCGTokenBase {
  return tokenBaseGenerator.generate();
}

/**
 * Generate a color token
 */
export function mockColorToken(): DTCGColorToken {
  return colorTokenGenerator.generate();
}

/**
 * Generate multiple color tokens
 */
export function mockColorTokens(count: number): DTCGColorToken[] {
  return Array.from({ length: count }, () => colorTokenGenerator.generate());
}

/**
 * Generate a named color token with specific properties
 */
export function mockNamedColorToken(
  name: string,
  overrides?: Partial<DTCGColorToken>,
): DTCGColorToken & { name: string } {
  const base = colorTokenGenerator.generate();
  return {
    name,
    ...base,
    ...overrides,
  };
}

/**
 * Generate a semantic color scale (50-950)
 */
export function mockColorScale(baseName: string): Array<{ name: string; token: DTCGColorToken }> {
  const steps = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];

  return steps.map((step, index) => {
    // Create a token with decreasing lightness for each step
    const lightness = 1 - index * 0.09;
    return {
      name: `${baseName}-${step}`,
      token: {
        $type: 'color' as const,
        $value: {
          colorSpace: 'oklch' as const,
          channels: [Math.max(0, Math.min(1, lightness)), 0.15, 240] as [number, number, number],
          alpha: 1,
        },
      },
    };
  });
}

/**
 * Generate a namespace of tokens (simulates a token file)
 */
export function mockNamespace(namespace: string): Record<string, DTCGColorToken> {
  const tokens: Record<string, DTCGColorToken> = {};
  const count = 5 + Math.floor(Math.random() * 10); // 5-15 tokens

  for (let i = 0; i < count; i++) {
    const name = `${namespace}-token-${i}`;
    tokens[name] = colorTokenGenerator.generate();
  }

  return tokens;
}

/**
 * Generate standard semantic color namespaces
 */
export function mockSemanticColors(): Record<string, Record<string, DTCGColorToken>> {
  const namespaces = ['primary', 'secondary', 'accent', 'destructive', 'muted'];

  const result: Record<string, Record<string, DTCGColorToken>> = {};

  for (const ns of namespaces) {
    result[ns] = {};
    const scale = mockColorScale(ns);
    for (const { name, token } of scale) {
      result[ns][name] = token;
    }
  }

  return result;
}

/**
 * Mock a complete rafters config structure
 */
export function mockRaftersConfig(): {
  version: string;
  framework: string;
  source: string;
  tailwindVersion: string;
  outputDir: string;
} {
  return {
    version: '1.0.0',
    framework: 'next',
    source: 'shadcn',
    tailwindVersion: '4.0.0',
    outputDir: '.rafters/output',
  };
}
