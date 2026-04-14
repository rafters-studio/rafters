/**
 * Generation Rule Parser and Executor
 *
 * Parses and executes token generation rules for automatic token transformation.
 * Supports calc, scale, scale-position, state, contrast, and invert rule types.
 *
 * Plugin contract (issue #1232):
 *   Plugins receive typed input objects (familyColorValue, basePosition, stateType, etc.)
 *   resolved by the executor BEFORE the plugin is called. No plugin reads from the registry
 *   or parses token names with regex.
 *
 * "Rule does not apply" detection:
 *   The executor checks whether the token's dependency[0] resolves to a ColorValue before
 *   calling any color plugin. If dependency[0] is missing or its value is not a ColorValue
 *   (i.e., not an object with a `scale` array), the executor throws:
 *     "Rule '<type>' does not apply to token '<name>': dependency '<dep>' is not a ColorValue"
 *   Additionally, for scale-position rules, if the token's OWN value is a ColorValue
 *   (i.e., it is a family token, not a position token), the executor throws before calling
 *   the plugin to prevent overwriting the ColorValue with a CSS string.
 *   This surfaces the #1223 silent-throw case before the plugin is ever invoked.
 */

import type { ColorReference, ColorValue, OKLCH } from '@rafters/shared';
import contrastPlugin from './plugins/contrast';
import invertPlugin from './plugins/invert';
import scalePlugin from './plugins/scale';
import statePlugin from './plugins/state';
import type { TokenRegistry } from './registry';
import {
  POSITION_TO_INDEX,
  SCALE_POSITION_MAP,
  SCALE_POSITION_MAP_REVERSE,
  VALID_SCALE_POSITIONS,
} from './scale-positions';

/** Type guard: true when `v` is a ColorValue (has a non-empty `scale` array). */
function isColorValue(v: unknown): v is ColorValue {
  return (
    v !== null &&
    typeof v === 'object' &&
    'scale' in v &&
    Array.isArray((v as { scale: unknown }).scale)
  );
}

export type CssResult = { readonly kind: 'css'; readonly value: string };
export type RefResult = { readonly kind: 'ref'; readonly ref: ColorReference };
export type RuleResult = CssResult | RefResult;

export function cssResult(value: string): CssResult {
  return { kind: 'css', value };
}

export function refResult(family: string, position: string): RefResult {
  return { kind: 'ref', ref: { family, position } };
}

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

  private executeCalcRule(rule: ParsedRule): CssResult {
    if (!rule.expression) {
      throw new Error('Calc rule missing expression');
    }

    let expression = rule.expression;

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

    return cssResult(`calc(${expression})`);
  }

  private executeScaleRule(rule: ParsedRule): CssResult {
    if (!rule.baseToken) {
      throw new Error('Scale rule missing base token');
    }

    const baseToken = this.registry.get(rule.baseToken);
    if (!baseToken) {
      throw new Error(`Base token not found: ${rule.baseToken}`);
    }

    const baseValue = String(baseToken.value);
    const ratio = rule.ratio || 1.5;

    const numericMatch = baseValue.match(/^([0-9.]+)(.*)$/);
    if (numericMatch?.[1]) {
      const value = parseFloat(numericMatch[1]);
      const unit = numericMatch[2] || '';
      return cssResult(`${value * ratio}${unit}`);
    }

    return cssResult(`calc(${baseValue} * ${ratio})`);
  }

  /**
   * Execute a scale-position rule.
   *
   * Three token shapes and their handling:
   *
   * 1. Semantic token (value is ColorReference: has `family` + `position`):
   *    Return a RefResult using the family from dependencies and position from the parsed rule.
   *
   * 2. Position token (value is a CSS string or placeholder -- the normal case):
   *    Resolve typed inputs and call the scale plugin, then convert to CSS string.
   *
   * 3. Family token (value is a ColorValue: has `scale` array):
   *    "Rule does not apply" -- throw before the plugin is invoked.
   *    This covers the #1223 case: a family-level token (e.g., "primary" whose value
   *    was replaced with a ColorValue by the caller) has a scale-position generationRule
   *    that was written for a position token. The token's own value being a ColorValue
   *    signals that regenerating it as a position token would overwrite the ColorValue --
   *    which is not the intent. Throw clearly so the caller can use continueOnCascadeErrors
   *    or fix the wiring.
   */
  private executeScalePositionRule(rule: ParsedRule, tokenName: string): RuleResult {
    const existingToken = this.registry.get(tokenName);
    const existingValue = existingToken?.value;

    // Shape 1: Semantic token -- value is a ColorReference
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

      return refResult(familyName, String(position));
    }

    // Shape 3: Family token -- value is a ColorValue (has a `scale` array).
    // The scale-position rule was designed for position tokens, not family tokens.
    // Applying it would overwrite the ColorValue with a CSS string -- wrong shape.
    if (isColorValue(existingValue)) {
      throw new Error(
        `Rule 'scale-position' does not apply to token '${tokenName}': ` +
          `token value is a ColorValue (family token shape), not a position token or semantic reference. ` +
          `The generationRule was written for a position token. ` +
          `If this token was recently replaced with a ColorValue, the generationRule wiring needs updating.`,
      );
    }

    // Shape 2: Position token -- value is a CSS string or placeholder.
    // Resolve typed inputs (validates dependency[0] is a ColorValue), then call the plugin.
    const { familyName, familyColorValue } = this.resolvePluginInputs('scale-position', tokenName);

    if (rule.scalePosition === undefined) {
      throw new Error(`Scale-position rule on "${tokenName}" has no scalePosition`);
    }

    const reference = scalePlugin({
      familyColorValue,
      familyName,
      scalePosition: rule.scalePosition,
    });
    return cssResult(this.resolveColorReference(reference));
  }

  /**
   * Resolve familyName, familyColorValue, and basePosition from the token's registry state.
   *
   * Single registry pass: reads getDependencies once, then fetches the family token.
   *
   * "Rule does not apply" detection:
   *   If dependency[0] is missing, or the token it names has no value, or its value
   *   is not a ColorValue (no `scale` array), this method throws before any plugin is called:
   *     "Rule '<ruleType>' does not apply to token '<tokenName>':
   *      dependency '<dep>' is not a ColorValue (got: <shape>)"
   *
   *   This catches the #1223 silent-throw case where a scale/state/contrast/invert rule
   *   is wired to a family-level ColorValue token (e.g. token named "accent" with no numeric
   *   suffix), which previously caused plugins to fail inside their own regex logic.
   *
   * basePosition lookup order:
   *   1. Token's current value if it is a ColorReference (has `position` field)
   *   2. Second dependency (dependencies[1]) if it encodes a position token name
   *      with a numeric suffix (e.g., "primary-600" -> index 6)
   *   3. Default: 5 (midpoint, position 500)
   */
  private resolvePluginInputs(
    ruleType: string,
    tokenName: string,
  ): { familyName: string; familyColorValue: ColorValue; basePosition: number } {
    const dependencies = this.registry.getDependencies(tokenName);

    if (dependencies.length === 0) {
      throw new Error(`No dependencies found for ${ruleType} rule on token: ${tokenName}`);
    }

    const familyName = dependencies[0];
    if (!familyName) {
      throw new Error(`No dependency token name for ${ruleType} rule on token: ${tokenName}`);
    }

    const familyToken = this.registry.get(familyName);
    if (!familyToken) {
      throw new Error(
        `Rule '${ruleType}' does not apply to token '${tokenName}': ` +
          `dependency '${familyName}' not found in registry`,
      );
    }

    const value = familyToken.value;
    if (!isColorValue(value)) {
      const shape =
        value === null
          ? 'null'
          : typeof value === 'object'
            ? JSON.stringify(Object.keys(value as object))
            : typeof value;
      throw new Error(
        `Rule '${ruleType}' does not apply to token '${tokenName}': ` +
          `dependency '${familyName}' is not a ColorValue (got: ${shape})`,
      );
    }

    const basePosition = this.resolveBasePositionFromDeps(tokenName, dependencies);

    return { familyName, familyColorValue: value, basePosition };
  }

  /**
   * Derive basePosition (scale array index 0-10) from already-resolved registry state.
   * Called by resolvePluginInputs with the dependencies list already in hand.
   */
  private resolveBasePositionFromDeps(tokenName: string, dependencies: string[]): number {
    const existingValue = this.registry.get(tokenName)?.value;

    if (existingValue && typeof existingValue === 'object' && 'position' in existingValue) {
      const pos = (existingValue as ColorReference).position;
      const idx = POSITION_TO_INDEX[String(pos)];
      if (idx !== undefined) return idx;
    }

    const depOne = dependencies[1];
    if (depOne) {
      const posMatch = depOne.match(/-(\d+)$/);
      if (posMatch?.[1]) {
        const idx = POSITION_TO_INDEX[posMatch[1]];
        if (idx !== undefined) return idx;
      }
    }

    return 5;
  }

  /**
   * Resolve a color reference {family, position} to a CSS value.
   * This is the bridge between lazy plugin references and immediate CSS values.
   */
  resolveColorReference(reference: { family: string; position: string }): string {
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

  private executeStateRule(rule: ParsedRule, tokenName: string): RefResult {
    const { familyName, familyColorValue, basePosition } = this.resolvePluginInputs(
      'state',
      tokenName,
    );

    const stateType = rule.stateType;
    const validStates = ['hover', 'active', 'focus', 'disabled'] as const;
    if (!stateType || !(validStates as readonly string[]).includes(stateType)) {
      throw new Error(
        `State rule on "${tokenName}" has invalid or missing stateType: ${stateType}`,
      );
    }

    const ref = statePlugin({
      familyColorValue,
      familyName,
      basePosition,
      stateType: stateType as 'hover' | 'active' | 'focus' | 'disabled',
    });
    return refResult(ref.family, ref.position);
  }

  private executeContrastRule(_rule: ParsedRule, tokenName: string): RefResult {
    const { familyName, familyColorValue, basePosition } = this.resolvePluginInputs(
      'contrast',
      tokenName,
    );
    const ref = contrastPlugin({ familyColorValue, familyName, basePosition });
    return refResult(ref.family, ref.position);
  }

  private executeInvertRule(_rule: ParsedRule, tokenName: string): RefResult {
    const { familyName, familyColorValue, basePosition } = this.resolvePluginInputs(
      'invert',
      tokenName,
    );
    const ref = invertPlugin({ familyColorValue, familyName, basePosition });
    return refResult(ref.family, ref.position);
  }
}
