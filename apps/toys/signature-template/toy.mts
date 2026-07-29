/**
 * TOY 6 -- does `emit` need to be a TEMPLATE rather than an ordered join?
 *
 * Toy 2 had `emit: string[]` plus a per-kind assembler. That put CSS knowledge in
 * the assembler, keyed on `kind`, which I logged as open. The decoration cases in
 * huttspawn's globals.css say it is worse than untidy: a clip-path polygon has
 * slot references EMBEDDED IN a value, not concatenated from parts.
 *
 * Test: can ONE template-based emit express motion, shadow, and a real decoration
 * (swtor-notch, including its ::after triangle) without a per-kind assembler?
 */
import { z } from 'zod';

const SlotSchema = z.union([
  z.object({ ref: z.string() }),
  z.object({ literal: z.union([z.string(), z.number()]) }),
  z.object({ param: z.string(), default: z.string().optional() }), // bound at USE SITE
]);
type Slot = z.infer<typeof SlotSchema>;

const SignatureSchema = z.object({
  kind: z.string(),
  target: z.enum(['&', '::before', '::after']).default('&'),
  slots: z.record(z.string(), SlotSchema),
  /** css property -> template with {slot} holes. Replaces emit: string[]. */
  emit: z.record(z.string(), z.string()),
});
type Signature = z.infer<typeof SignatureSchema>;

const refsOf = (s: Signature) => Object.values(s.slots).flatMap((x) => ('ref' in x ? [x.ref] : []));

/** Resolve a slot to the CSS text it contributes. No per-kind branch anywhere. */
function slotText(name: string, slot: Slot, get: (n: string) => string | undefined): string {
  if ('literal' in slot) return String(slot.literal);
  if ('param' in slot) return `var(--${slot.param}${slot.default ? `, ${slot.default}` : ''})`;
  const v = get(slot.ref);
  if (v === undefined) throw new Error(`slot "${name}" -> "${slot.ref}" missing`);
  return v;
}

function render(sig: Signature, get: (n: string) => string | undefined): string {
  const lines: string[] = [];
  for (const [prop, tpl] of Object.entries(sig.emit)) {
    const value = tpl.replace(/\{(\w+)\}/g, (_, k: string) => {
      const slot = sig.slots[k];
      if (!slot) throw new Error(`template names {${k}} with no slot`);
      return slotText(k, slot, get);
    });
    lines.push(`  ${prop}: ${value};`);
  }
  const sel = sig.target === '&' ? '' : sig.target;
  return `${sel ? `${sel} {\n` : ''}${lines.join('\n')}${sel ? '\n}' : ''}`;
}

const TOKENS: Record<string, string> = {
  'duration-moderate': '250ms',
  'ease-enter': 'cubic-bezier(0, 0, 0.2, 1)',
  'shadow-color': 'oklch(0 0 0 / 0.1)',
  'shadow-base-unit': '4px',
};
const get = (n: string) => TOKENS[n];

const cases: Signature[] = [
  SignatureSchema.parse({
    kind: 'motion',
    slots: { duration: { ref: 'duration-moderate' }, curve: { ref: 'ease-enter' } },
    emit: {
      'transition-property': 'opacity, transform',
      'transition-duration': '{duration}',
      'transition-timing-function': '{curve}',
    },
  }),
  SignatureSchema.parse({
    kind: 'shadow',
    slots: {
      x: { literal: '0' },
      y: { literal: '1px' },
      blur: { literal: '2px' },
      spread: { literal: '0' },
      color: { ref: 'shadow-color' },
    },
    emit: { 'box-shadow': '{x} {y} {blur} {spread} {color}' },
  }),
  // The real decoration: notch clip-path with calc'd vertices off a system unit.
  SignatureSchema.parse({
    kind: 'decoration',
    slots: { notch: { param: 'swtor-notch', default: 'calc(4px * 2)' } },
    emit: {
      'clip-path':
        'polygon(0 0, 100% 0, 100% calc(100% - {notch}), calc(100% - {notch}) 100%, 0 100%)',
    },
  }),
  // ...and its ::after triangle, same format, different target.
  SignatureSchema.parse({
    kind: 'decoration',
    target: '::after',
    slots: {
      notch: { param: 'swtor-notch', default: 'calc(4px * 2)' },
      tint: { param: 'swtor-notch-colour' },
    },
    emit: {
      content: '""',
      position: 'absolute',
      width: '{notch}',
      height: '{notch}',
      'background-color': '{tint}',
      'clip-path': 'polygon(100% 0, 100% 100%, 0 100%)',
    },
  }),
];

for (const sig of cases) {
  console.log(
    `\n=== ${sig.kind}${sig.target === '&' ? '' : ' ' + sig.target}   dependsOn=${JSON.stringify(refsOf(sig))}`,
  );
  console.log(render(sig, get));
}
