// The rules and makers the feature and unit tests share, beside rafters' own rules.
import { rules as fileRules } from '../rules/index.ts';
import {
  type Ctx,
  type Maker,
  Refused,
  type Registry,
  type Rule,
  type Seed,
} from '../src/registry.ts';

const rem = (v: unknown): number => Number.parseFloat(String(v));
export const runs = { add: 0 };
export const rules = new Map<string, Rule>([
  ...fileRules,
  [
    'add',
    (args: unknown, ctx: Ctx) => {
      runs.add++;
      return `${+(args as { of: string[] }).of.reduce((s, n) => s + rem(ctx.get(n)), 0).toFixed(4)}rem`;
    },
  ],
  [
    'nonzero',
    (args: unknown, ctx: Ctx) => {
      const v = rem(ctx.get((args as { of: string }).of));
      if (v === 0) throw new Error('a zero base makes no scale');
      return `${v * 4}rem`;
    },
  ],
  ['copy', (args: unknown, ctx: Ctx) => ctx.get((args as { of: string }).of)],
  [
    'tone',
    (args: unknown, ctx: Ctx) =>
      `${String(ctx.get((args as { of: string }).of))} at ${(args as { position: string }).position}`,
  ],
  [
    'when-dense',
    (_args: unknown, ctx: Ctx) => (ctx.get('dense') === 'yes' ? ctx.get('spacing-4') : '0rem'),
  ],
]);

const STEPS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];
export const makers = new Map<string, Maker>([
  [
    'font',
    (name, value) =>
      name.startsWith('font-') && typeof value === 'string' ? [{ name, value }] : undefined,
  ],
  [
    'fill',
    (name, value) =>
      name.startsWith('fill-') && typeof value === 'object' && value !== null && 'of' in value
        ? [{ name, rule: 'copy', args: value }]
        : undefined,
  ],
  [
    'colour',
    (name, value) =>
      typeof value === 'string' && value.startsWith('oklch(')
        ? [
            { name, value },
            ...STEPS.map((p) => ({
              name: `${name}-${p}`,
              rule: 'tone',
              args: { of: name, position: p },
            })),
          ]
        : undefined,
  ],
]);

export const made = (name: string, rule: string, args: unknown): Seed => ({ name, rule, args });
export const state = (r: Registry) =>
  r.names().flatMap((n) => r.modesOf(n).map((m) => [n, m, r.get(n, m)]));
export const refused = (code: Refused['code'], text?: string) => (e: unknown) =>
  e instanceof Refused && e.code === code && (!text || e.message.includes(text));
