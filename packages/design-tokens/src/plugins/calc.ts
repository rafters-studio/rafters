/**
 * Calc Plugin
 *
 * Executes mathematical expressions with token value substitution.
 * The expression and resolved token values are provided by resolveInput
 * (which also handles inferExpressionFromTokenName).
 */

import { evaluateExpression } from '@rafters/math-utils';
import { z } from 'zod';
import { definePlugin } from '../plugins';

const CalcInputSchema = z.object({
  expression: z.string(),
  tokenValues: z.record(z.string(), z.string()),
});

type CalcInput = z.infer<typeof CalcInputSchema>;

export default definePlugin({
  id: 'calc',
  input: CalcInputSchema,
  output: z.string(),
  transform(input: CalcInput): string {
    let expression = input.expression;
    let detectedUnit = '';

    const numericValues: Record<string, number> = {};

    for (const [tokenName, tokenValue] of Object.entries(input.tokenValues)) {
      const numericValue = parseFloat(tokenValue);
      if (Number.isNaN(numericValue)) {
        throw new Error(`Token ${tokenName} value "${tokenValue}" is not numeric`);
      }

      if (!detectedUnit) {
        const unitMatch = tokenValue.match(/([a-z%]+)$/i);
        if (unitMatch?.[1]) {
          detectedUnit = unitMatch[1];
        }
      }

      numericValues[tokenName] = numericValue;
      expression = expression.replace(new RegExp(`\\{${tokenName}\\}`, 'g'), String(numericValue));
    }

    // Extract units from literal values in the expression if not yet detected
    if (!detectedUnit) {
      const literalUnitMatch = expression.match(/\d+([a-z%]+)/i);
      if (literalUnitMatch?.[1]) {
        detectedUnit = literalUnitMatch[1];
      }
    }

    const result = evaluateExpression(expression);
    return detectedUnit ? `${result}${detectedUnit}` : String(result);
  },
});
