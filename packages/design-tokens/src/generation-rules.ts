/**
 * Generation Rule Parser and Executor
 *
 * Parses and executes token generation rules for automatic token transformation.
 * Supports calc, scale, scale-position, state, contrast, and invert rule types.
 */

import type { ColorReference, ColorValue, OKLCH } from '@rafters/shared';
import contrastPlugin from './plugins/contrast';
import invertPlugin from './plugins/invert';
import scalePlugin from './plugins/scale';
import statePlugin from './plugins/state';
import type { TokenRegistry } from './registry';
import {
  SCALE_POSITION_MAP,
  SCALE_POSITION_MAP_REVERSE,
  VALID_SCALE_POSITIONS,
} from './scale-positions';

export type RuleResult = string | ColorReference;

export interface ParsedRule {
  type: string;
  tokens?: string[];
  expression?: string | undefined;
  operation?: string | undefined;
  baseToken?: string | undefined;
  stateType?: string | undefined;
  contrast?: 'high' | 'medium' | 'low' | 'auto' | undefined;
  ratio?: number | undefined;
  scalePosition?: number | undefined;
}

export class GenerationRuleParser {
  /**
   * Parse a generation rule string into a structured rule object
   */
  parse(rule: string): ParsedRule {
    const trimmed = rule.trim();

    // Parse calc rules: calc({token1} + {token2})
    if (trimmed.startsWith('calc(')) {
      return this.parseCalcRule(trimmed);
    }

    // Parse colon-based rules: type:value
    if (trimmed.includes(':')) {
      const [type, value] = trimmed.split(':', 2);
      if (!type || !value) {
        throw new Error(`Invalid rule format: ${rule}`);
      }
      return this.parseColonRule(type.trim(), value.trim());
    }

    // Parse single-word rules: invert
    if (trimmed === 'invert') {
      return { type: 'invert' };
    }

    // Parse function-style rules (legacy support)
    if (trimmed.startsWith('scale(')) {
      return this.parseScaleRule(trimmed);
    }
    if (trimmed.startsWith('state(')) {
      return this.parseStateRule(trimmed);
    }
    if (trimmed.startsWith('contrast(')) {
      return this.parseContrastRule(trimmed);
    }
    if (trimmed.startsWith('invert(')) {
      return this.parseInvertRule(trimmed);
    }

    throw new Error(`Unknown rule type: ${rule}`);
  }

  private parseColonRule(type: string, value: string): ParsedRule {
    switch (type) {
      case 'state': {
        // Validate state types
        const validStates = ['hover', 'focus', 'active', 'disabled'];
        if (!validStates.includes(value)) {
          throw new Error(`Invalid state type: ${value}`);
        }
        return {
          type: 'state',
          stateType: value,
        };
      }
      case 'scale': {
        // Strict validation: only accept clean integers or decimals
        // Reject trailing chars (500foo), scientific notation (1e2), etc.
        if (!/^\d+(\.\d+)?$/.test(value)) {
          throw new Error(`Invalid scale value: ${value}`);
        }

        const numValue = parseFloat(value);
        if (Number.isNaN(numValue) || numValue <= 0) {
          throw new Error(`Invalid scale value: ${value}`);
        }

        // Check if this is a Tailwind-style scale position (50, 100, 200, etc.)
        // Must be an integer for scale positions
        if (Number.isInteger(numValue) && VALID_SCALE_POSITIONS.includes(numValue)) {
          return {
            type: 'scale-position',
            scalePosition: SCALE_POSITION_MAP[numValue],
          };
        }

        // Otherwise treat as a ratio for numeric scaling
        return {
          type: 'scale',
          ratio: numValue,
        };
      }
      case 'contrast': {
        const validContrasts = ['high', 'medium', 'low', 'auto'];
        if (!validContrasts.includes(value)) {
          throw new Error(`Invalid contrast level: ${value}`);
        }
        return {
          type: 'contrast',
          contrast: value as 'high' | 'medium' | 'low' | 'auto',
        };
      }
      default:
        throw new Error(`Unknown rule type: ${type}`);
    }
  }

  private parseCalcRule(rule: string): ParsedRule {
    const match = rule.match(/^calc\((.+)\)$/);
    if (!match) {
      throw new Error(`Invalid calc rule: ${rule}`);
    }

    const expression = match[1];
    const tokens: string[] = [];

    // Check for unclosed brackets
    if (expression?.includes('{') && !expression.includes('}')) {
      throw new Error(`Unclosed bracket in calc expression: ${expression}`);
    }

    // Check for empty braces {} which are invalid
    if (expression?.includes('{}')) {
      throw new Error(`Empty token reference in calc expression: ${expression}`);
    }

    // Extract tokens wrapped in {}
    const tokenMatches = expression?.match(/\{([^}]+)\}/g);
    if (tokenMatches) {
      for (const tokenMatch of tokenMatches) {
        const tokenName = tokenMatch.slice(1, -1); // Remove { and }
        if (!tokenName.trim()) {
          throw new Error(`Empty token reference in calc expression: ${expression}`);
        }
        tokens.push(tokenName);
      }
    }

    // Check for incomplete expressions (ending with operator)
    if (expression?.trim().match(/[+\-*/]$/)) {
      throw new Error(`Incomplete calc expression: ${expression}`);
    }

    return {
      type: 'calc',
      expression,
      tokens,
    };
  }

  private parseScaleRule(rule: string): ParsedRule {
    const match = rule.match(/^scale\(([^,]+),?\s*([^)]*)\)$/);
    if (!match || !match[1]) {
      throw new Error(`Invalid scale rule: ${rule}`);
    }

    return {
      type: 'scale',
      baseToken: match[1].trim(),
      ratio: match[2] ? parseFloat(match[2].trim()) : 1.5,
    };
  }

  private parseStateRule(rule: string): ParsedRule {
    const match = rule.match(/^state\(([^,]+),?\s*([^)]*)\)$/);
    if (!match || !match[1]) {
      throw new Error(`Invalid state rule: ${rule}`);
    }

    return {
      type: 'state',
      baseToken: match[1].trim(),
      stateType: match[2] ? match[2].trim() : 'hover',
    };
  }

  private parseContrastRule(rule: string): ParsedRule {
    const match = rule.match(/^contrast\(([^,]+),?\s*([^)]*)\)$/);
    if (!match || !match[1]) {
      throw new Error(`Invalid contrast rule: ${rule}`);
    }

    const contrastLevel = match[2] ? match[2].trim() : 'high';
    if (!['high', 'medium', 'low'].includes(contrastLevel)) {
      throw new Error(`Invalid contrast level: ${contrastLevel}`);
    }

    return {
      type: 'contrast',
      baseToken: match[1].trim(),
      contrast: contrastLevel as 'high' | 'medium' | 'low',
    };
  }

  private parseInvertRule(rule: string): ParsedRule {
    const match = rule.match(/^invert\(([^)]+)\)$/);
    if (!match || !match[1]) {
      throw new Error(`Invalid invert rule: ${rule}`);
    }

    return {
      type: 'invert',
      baseToken: match[1].trim(),
    };
  }
}

export class GenerationRuleExecutor {
  constructor(private registry: TokenRegistry) {}

  /**
   * Execute a parsed rule and return the computed value.
   * Returns a string for CSS-value rules (calc, scale, scale-position)
   * or a ColorReference for semantic rules (state, contrast, invert).
   */
  execute(rule: ParsedRule, tokenName: string): RuleResult {
    switch (rule.type) {
      case 'calc':
        return this.executeCalcRule(rule);
      case 'scale':
        return this.executeScaleRule(rule);
      case 'scale-position':
        return this.executeScalePositionRule(rule, tokenName);
      case 'state':
        return this.executeStateRule(rule, tokenName);
      case 'contrast':
        return this.executeContrastRule(rule, tokenName);
      case 'invert':
        return this.executeInvertRule(rule, tokenName);
      default:
        throw new Error(`Unknown rule type: ${rule.type}`);
    }
  }

  private executeCalcRule(rule: ParsedRule): string {
    if (!rule.expression) {
      throw new Error('Calc rule missing expression');
    }

    let expression = rule.expression;

    // Replace token references with actual values
    if (rule.tokens) {
      for (const tokenName of rule.tokens) {
        const token = this.registry.get(tokenName);
        if (!token) {
          throw new Error(`Token not found: ${tokenName}`);
        }

        const tokenValue = String(token.value);
        expression = expression.replace(new RegExp(`\\{${tokenName}\\}`, 'g'), tokenValue);
      }
    }

    // Return the CSS calc expression
    return `calc(${expression})`;
  }

  private executeScaleRule(rule: ParsedRule): string {
    if (!rule.baseToken) {
      throw new Error('Scale rule missing base token');
    }

    const baseToken = this.registry.get(rule.baseToken);
    if (!baseToken) {
      throw new Error(`Base token not found: ${rule.baseToken}`);
    }

    const baseValue = String(baseToken.value);
    const ratio = rule.ratio || 1.5;

    // For numeric values, multiply by ratio
    const numericMatch = baseValue.match(/^([0-9.]+)(.*)$/);
    if (numericMatch?.[1]) {
      const value = parseFloat(numericMatch[1]);
      const unit = numericMatch[2] || '';
      return `${value * ratio}${unit}`;
    }

    // For non-numeric values, return calc expression
    return `calc(${baseValue} * ${ratio})`;
  }

  /**
   * Execute a scale-position rule.
   *
   * For position tokens (e.g., primary-600): extracts from ColorValue scale, returns CSS string.
   * For semantic tokens (e.g., background): returns a ColorReference to family + position.
   *
   * Detection: if the token's current value is a ColorReference, return a ColorReference.
   * Otherwise, resolve to CSS string via the scale plugin.
   */
  private executeScalePositionRule(rule: ParsedRule, tokenName: string): RuleResult {
    const existingToken = this.registry.get(tokenName);
    const existingValue = existingToken?.value;

    // Semantic token path: value is a ColorReference, return a ColorReference
    if (existingValue && typeof existingValue === 'object' && 'family' in existingValue) {
      const dependencies = this.registry.getDependencies(tokenName);
      const familyName = dependencies[0];
      if (!familyName) {
        throw new Error(`No family dependency for semantic scale rule on token: ${tokenName}`);
      }

      const position =
        rule.scalePosition !== undefined
          ? SCALE_POSITION_MAP_REVERSE[rule.scalePosition]
          : (existingValue as ColorReference).position;

      if (!position) {
        throw new Error(`Cannot resolve scale position for token: ${tokenName}`);
      }

      return { family: familyName, position: String(position) } as ColorReference;
    }

    // Position token path: resolve to CSS string
    const dependencies = this.registry.getDependencies(tokenName);
    const reference = scalePlugin(this.registry, tokenName, dependencies);
    return this.resolveColorReference(reference);
  }

  /**
   * Resolve a color reference {family, position} to a CSS value.
   * This is the bridge between lazy plugin references and immediate CSS values.
   */
  resolveColorReference(reference: { family: string; position: string | number }): string {
    const familyToken = this.registry.get(reference.family);
    if (!familyToken) {
      throw new Error(`Family token not found: ${reference.family}`);
    }

    const colorValue = familyToken.value as ColorValue;
    if (!colorValue || !Array.isArray(colorValue.scale)) {
      throw new Error(`Token ${reference.family} is not a ColorValue with a scale array`);
    }

    // Convert position to array index
    const positionNum =
      typeof reference.position === 'string'
        ? parseInt(reference.position, 10)
        : reference.position;

    const index = SCALE_POSITION_MAP[positionNum];
    if (index === undefined) {
      throw new Error(`Invalid scale position: ${reference.position}`);
    }

    if (index < 0 || index >= colorValue.scale.length) {
      throw new Error(
        `Scale position ${reference.position} out of bounds (0-${colorValue.scale.length - 1})`,
      );
    }

    const oklch = colorValue.scale[index];
    if (!oklch) {
      throw new Error(`No color value at scale position ${reference.position}`);
    }

    return this.oklchToCSS(oklch);
  }

  /**
   * Convert an OKLCH color to CSS string format
   */
  private oklchToCSS(oklch: OKLCH): string {
    const l = oklch.l.toFixed(3);
    const c = oklch.c.toFixed(3);
    const h = Math.round(oklch.h);
    const alpha = oklch.alpha ?? 1;

    if (alpha < 1) {
      return `oklch(${l} ${c} ${h} / ${alpha.toFixed(2)})`;
    }
    return `oklch(${l} ${c} ${h})`;
  }

  private executeStateRule(_rule: ParsedRule, tokenName: string): ColorReference {
    const dependencies = this.registry.getDependencies(tokenName);
    const ref = statePlugin(this.registry, tokenName, dependencies);
    return { family: ref.family, position: String(ref.position) };
  }

  private executeContrastRule(_rule: ParsedRule, tokenName: string): ColorReference {
    const dependencies = this.registry.getDependencies(tokenName);
    const ref = contrastPlugin(this.registry, tokenName, dependencies);
    return { family: ref.family, position: String(ref.position) };
  }

  private executeInvertRule(_rule: ParsedRule, tokenName: string): ColorReference {
    const dependencies = this.registry.getDependencies(tokenName);
    const ref = invertPlugin(this.registry, tokenName, dependencies);
    return { family: ref.family, position: String(ref.position) };
  }
}
