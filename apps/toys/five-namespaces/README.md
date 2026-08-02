# toy 9 -- five namespaces, zero registry change

Run: `pnpm exec tsx apps/toys/five-namespaces/toy.mts`

Tests whether the 2026-08-02 generics-only ruling (duration / ease / delay /
extent / period as `--rafters-*` system tokens, components bake generic
utilities, Studio writes values) rides the existing registry untouched.

## Result: ALL HOLD

- Q1: `delay-*`, `extent-*`, `period-*` tokens satisfy `TokenSchema` with no
  schema change. The three new namespaces are just tokens.
- Q2: toy-level emission produces `:root` vars carrying values and `@utility`
  blocks carrying `var()` NAMES only (the #1955 posture: we generate every
  utility ourselves).
- Q3: one fast everywhere, proven in bytes -- retuning the `duration-fast`
  leaf changes exactly ONE emitted line (the var). Every `@utility` block is
  byte-identical before and after. Utilities reference names, never values,
  so a Studio retune can never touch component-facing CSS.
- Q4: JSON roundtrip revalidates.

Extent/period values in the toy are mechanics placeholders, not tuned values.
