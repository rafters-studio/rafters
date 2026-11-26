// The one real registry every test uses: rafters' default system as intent data over the rules,
// made once per run. A test runs inside `transaction`, which takes back every choice it made,
// so each test starts from the same registry (RSpec's transactional fixtures).
import { SCALE_POSITIONS } from '../../../packages/color-utils/src/index.ts';
import { generateBaseSystem } from '../../../packages/design-tokens/src/index.ts';
import { rules } from '../rules/index.ts';
import { type Def, Registry, type Seed } from '../src/registry.ts';

export type RaftersToken = {
  name: string;
  namespace: string;
  value: unknown;
  binding?: { plugin: string; input: Record<string, unknown> };
};

/** rafters' own default tokens, one per name: what `rafters init` generates. */
export const raftersTokens: readonly RaftersToken[] = [
  ...new Map(
    (generateBaseSystem({}) as unknown as { allTokens: RaftersToken[] }).allTokens.map((t) => [
      t.name,
      t,
    ]),
  ).values(),
];
const byName = new Map(raftersTokens.map((t) => [t.name, t]));
const light = (n: string) => n.replace(/--dark$/, '');

/** A rafters binding as a rule def: names lose --dark, because a rule reads its own mode. */
function def(b: NonNullable<RaftersToken['binding']>): Def {
  const i = b.input;
  switch (b.plugin) {
    case 'scale':
      return {
        rule: 'at',
        args: { of: i.familyName, position: SCALE_POSITIONS[i.scalePosition as number] },
      };
    case 'state':
      return {
        rule: 'state',
        args: {
          from: light(String(i.from)),
          use: i.stateType,
          ...(i.surface ? { surface: light(String(i.surface)) } : {}),
        },
      };
    case 'contrast':
      return {
        rule: 'contrast',
        args: {
          against: light(String(i.against)),
          level: i.level,
          ...(i.fallback ? { fallback: light(String(i.fallback)) } : {}),
        },
      };
    case 'mirror':
      return { rule: 'mirror', args: { offset: i.offset } };
    default:
      throw new Error(`no rule for ${b.plugin}`);
  }
}

/** Colour families and semantic roles, on the scheme axis. */
export const colourIntent: readonly Seed[] = raftersTokens.flatMap((t): Seed[] => {
  if (
    t.namespace === 'color' &&
    typeof t.value === 'object' &&
    t.value !== null &&
    'scale' in t.value
  )
    return [{ name: t.name, value: t.value }];
  if (t.namespace !== 'semantic' || t.name.endsWith('--dark') || !t.binding) return [];
  const dark = byName.get(`${t.name}--dark`)?.binding;
  return [
    {
      name: t.name,
      ...(def(t.binding) as { rule: string; args: unknown }),
      ...(dark ? { modes: { dark: def(dark) } } : {}),
    },
  ];
});

const zeroed = (n: string) => /^rafters-(duration|delay)-/.test(n);
const VAR = /var\(--(rafters-[\w-]+)\)/;
/** Motion, on the motion axis; reduced motion is law. */
export const motionIntent: readonly Seed[] = raftersTokens
  .filter((t) => t.namespace === 'motion')
  .map((t): Seed => {
    const v = String(t.value);
    const base = { name: t.name, axis: 'motion' } as const;
    if (t.name.startsWith('motion-cell-')) return { ...base, rule: 'cell', args: JSON.parse(v) };
    if (t.name.startsWith('motion-semantic-')) {
      const { reducedMotion: rm, ...spec } = JSON.parse(v);
      return {
        ...base,
        rule: 'transition',
        args: spec,
        ...(rm
          ? {
              modes: {
                reduced: {
                  rule: 'transition',
                  args: {
                    ...spec,
                    properties: rm.properties,
                    ...(rm.ms !== undefined ? { ms: rm.ms } : {}),
                  },
                },
              },
            }
          : {}),
      };
    }
    if (VAR.test(v))
      return { ...base, rule: 'css', args: { template: v.replace(new RegExp(VAR, 'g'), '{$1}') } };
    return {
      ...base,
      value: t.value,
      ...(zeroed(t.name) ? { modes: { reduced: { value: '0ms' } } } : {}),
    };
  });

export const options = {
  axes: { scheme: ['light', 'dark'], motion: ['full', 'reduced'] },
  law: ['reduced'],
} as const;

let made: Registry | undefined;
/** The one registry, made on first use. */
export const defaultRegistry = (): Registry =>
  (made ??= new Registry([...colourIntent, ...motionIntent], rules, options));

/** Runs a test against the one registry, then takes back every choice and addition it made, newest first. */
export function transaction<T>(test: (r: Registry) => T): T {
  const r = defaultRegistry();
  const before = new Set(r.choices().map((c) => `${c.name}@${c.mode ?? ''}`));
  try {
    return test(r);
  } finally {
    for (const c of [...r.choices()].reverse()) {
      if (!before.has(`${c.name}@${c.mode ?? ''}`))
        r.set(c.name, undefined, c.mode ? { reason: '', mode: c.mode } : undefined);
    }
  }
}
