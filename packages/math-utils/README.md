# @rafters/math-utils

> Ratio and unit registries plus the math operations Rafters design tokens are built from.

This package ships two data registries -- named ratios (musical intervals,
mathematical constants) and named CSS units -- and the operations that work
on them: looking up a ratio or unit by name, computing a ratio's numeric
value, parsing a CSS value string, generating a modular type scale, and
evaluating an arithmetic expression with ratio and variable substitution.
Built-in and user-supplied registry entries are treated identically; nothing
in this package hard-codes a canonical list.

## Install

```bash
pnpm add @rafters/math-utils
```

This package publishes its TypeScript source directly (no compiled output),
so it needs a bundler or a TypeScript-aware runtime to import -- `tsx`,
`vite`, `tsup`, `esbuild`, or similar. Plain `node` cannot import it.

## API

### `resolveRatio(name, registry?)`

Look up a ratio by name. Throws if the name isn't in the registry. Defaults
to `DEFAULT_RATIOS`.

```ts
import { resolveRatio } from '@rafters/math-utils';

const golden = resolveRatio('golden'); // { name: 'golden', a: 1.618033988749, b: 1 }
```

### `ratioValue(ratio)`

Compute a ratio's numeric value: `a / b`.

```ts
import { ratioValue, resolveRatio } from '@rafters/math-utils';

ratioValue(resolveRatio('perfect-fifth')); // 1.5
```

### `tryParseUnit(cssValue, registry?)`

Parse a CSS value string like `"16px"` into `{ value, unit }`. Returns `null`
on invalid input instead of throwing. Defaults to `DEFAULT_UNITS`.

```ts
import { tryParseUnit } from '@rafters/math-utils';

tryParseUnit('16px'); // { value: 16, unit: { name: 'px', kind: 'length', toBase: 1 } }
tryParseUnit('not-a-value'); // null
```

### `generateModularScale(ratio, base, steps?)`

Build a typography-style modular scale from a ratio: `steps` sizes smaller
than `base` and `steps` sizes larger (default 5 each side).

```ts
import { generateModularScale, resolveRatio } from '@rafters/math-utils';

const scale = generateModularScale(resolveRatio('major-third'), 16, 3);
// { smaller: [8.192, 10.24, 12.8], base: 16, larger: [20, 25, 31.25] }
```

### `evaluateExpression(expression, options?)`

Evaluate an arithmetic expression, substituting `{name}`-braced variables and
bare named ratios from a registry before evaluating.

```ts
import { evaluateExpression } from '@rafters/math-utils';

evaluateExpression('{base} * golden', { variables: { base: 16 } }); // ~25.888
evaluateExpression('(2 + 3) * 4'); // 20
```

## Schemas and registries

`RatioSchema` and `UnitSchema` are Zod schemas for the `Ratio` and `Unit`
types; `DEFAULT_RATIOS` and `DEFAULT_UNITS` are the starter registries every
function above defaults to when no registry is supplied.

## Testing

Run tests from the monorepo root:

```bash
pnpm --filter @rafters/math-utils test
```
