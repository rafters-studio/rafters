/**
 * Generation Rule Parser
 *
 * Parses token generation rule strings into structured ParsedRule objects.
 * Pure string -> struct, no registry access, no side effects.
 *
 * Supports calc, scale, scale-position, state, contrast, and invert rule types.
 */

import { SCALE_POSITION_MAP, VALID_SCALE_POSITIONS } from './scale-positions';

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
