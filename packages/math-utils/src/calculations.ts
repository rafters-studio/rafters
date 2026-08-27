/**
 * Mathematical Calculation Engine
 *
 * Expression evaluation with ratio-name substitution and unit-aware arithmetic.
 * Powers the calc() rule system in design-tokens. All ratio operations take
 * `Ratio` instances; expression evaluation accepts a ratio registry whose
 * names are matched verbatim in the expression text.
 */

import { DEFAULT_RATIOS, type Ratio, ratioValue } from './ratios.js';

/**
 * Tokenize an expression into numbers and operators
 */
function tokenize(expr: string): Array<string | number> {
  const tokens: Array<string | number> = [];
  let current = '';

  for (let i = 0; i < expr.length; i++) {
    const char = expr[i];
    if (!char) continue;

    if (char === ' ') {
      continue;
    }

    if ('+-*/()'.includes(char)) {
      if (current) {
        const num = parseFloat(current);
        if (!Number.isNaN(num)) {
          tokens.push(num);
        }
        current = '';
      }
      tokens.push(char);
    } else if (char) {
      current += char;
    }
  }

  if (current) {
    const num = parseFloat(current);
    if (!Number.isNaN(num)) {
      tokens.push(num);
    }
  }

  return tokens;
}

/**
 * Recursive descent parser for mathematical expressions.
 * Grammar:
 *   expression := term (('+' | '-') term)*
 *   term       := factor (('*' | '/') factor)*
 *   factor     := number | '(' expression ')' | '-' factor
 */
class ExpressionParser {
  private tokens: Array<string | number>;
  private position: number;

  constructor(tokens: Array<string | number>) {
    this.tokens = tokens;
    this.position = 0;
  }

  private current(): string | number | undefined {
    return this.tokens[this.position];
  }

  private consume(): string | number | undefined {
    return this.tokens[this.position++];
  }

  parse(): number {
    const result = this.expression();
    if (this.position < this.tokens.length) {
      throw new Error('Unexpected token after expression');
    }
    return result;
  }

  private expression(): number {
    let left = this.term();

    while (this.current() === '+' || this.current() === '-') {
      const op = this.consume();
      const right = this.term();

      if (op === '+') {
        left = left + right;
      } else {
        left = left - right;
      }
    }

    return left;
  }

  private term(): number {
    let left = this.factor();

    while (this.current() === '*' || this.current() === '/') {
      const op = this.consume();
      const right = this.factor();

      if (op === '*') {
        left = left * right;
      } else {
        if (right === 0) {
          throw new Error('Division by zero');
        }
        left = left / right;
      }
    }

    return left;
  }

  private factor(): number {
    const token = this.current();

    if (typeof token === 'number') {
      this.consume();
      return token;
    }

    if (token === '(') {
      this.consume();
      const result = this.expression();
      if (this.current() !== ')') {
        throw new Error('Missing closing parenthesis');
      }
      this.consume();
      return result;
    }

    if (token === '-') {
      this.consume();
      return -this.factor();
    }

    throw new Error(`Unexpected token: ${token}`);
  }
}

export interface EvaluateExpressionOptions {
  /** Variable substitutions, e.g. `{ base: 16, spacing: 4 }`. */
  variables?: Record<string, number>;
  /** Ratio registry whose names are substituted. Defaults to DEFAULT_RATIOS. */
  ratios?: readonly Ratio[];
}

/**
 * Safely evaluate a mathematical expression. Substitutes named variables
 * (with or without `{...}` braces) and named ratios from the supplied
 * registry, then evaluates the resulting numeric expression.
 */
export function evaluateExpression(
  expression: string,
  options: EvaluateExpressionOptions = {},
): number {
  const { variables = {}, ratios = DEFAULT_RATIOS } = options;
  let processed = expression.trim();

  // Braced variables: {name} -> value
  for (const [name, value] of Object.entries(variables)) {
    const re = new RegExp(`\\{${name.replace('-', '\\-')}\\}`, 'g');
    processed = processed.replace(re, String(value));
  }

  // Named ratios: name -> a / b
  for (const r of ratios) {
    const re = new RegExp(`\\b${r.name.replace('-', '\\-')}\\b`, 'g');
    processed = processed.replace(re, String(ratioValue(r)));
  }

  // Bare variables (back-compat with calc plugin's pre-substitution flow).
  for (const [name, value] of Object.entries(variables)) {
    const re = new RegExp(`\\b${name.replace('-', '\\-')}\\b`, 'g');
    processed = processed.replace(re, String(value));
  }

  try {
    const tokens = tokenize(processed);
    const parser = new ExpressionParser(tokens);
    const result = parser.parse();
    if (typeof result !== 'number' || !Number.isFinite(result)) {
      throw new Error(`Invalid calculation result: ${result}`);
    }
    return result;
  } catch (error) {
    throw new Error(`Cannot evaluate expression: ${expression} - ${error}`);
  }
}
