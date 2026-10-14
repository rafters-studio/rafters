import { describe, expect, it } from 'vitest';
import classy from '../../../src/primitives/classy';
import { navigationMenu } from '../../../src/components/navigation-menu/navigation-menu.behavior';
import { navigationMenuClasses } from '../../../src/components/navigation-menu/navigation-menu.classes';

const config = {};
const classes = navigationMenuClasses(config, navigationMenu.initialState(config));

describe('navigation-menu classes', () => {
  it('trigger honors the touch floor and scales down via CQ', () => {
    expect(classes.trigger).toContain('h-11');
    expect(classes.trigger).toContain('@md:h-10');
  });

  it('state-dependent looks key off projected attributes', () => {
    expect(classes.trigger).toContain('data-[state=open]:bg-accent-subtle');
    expect(classes.triggerChevron).toContain('group-data-[state=open]:rotate-180');
    expect(classes.link).toContain('data-[active]:bg-accent-subtle');
  });

  /**
   * The CLASS-STRING half of the motion contract (#2148). This block pins the
   * candidates the stylesheet is compiled from; `test/motion/hover-reveal.spec.ts`
   * pins the DESUGARED rules those candidates produce, driven with JavaScript
   * disabled in a real browser. Neither half proves the other -- Tailwind emits
   * nothing at all for a malformed candidate, silently -- so both are pinned and
   * they meet at the utility names below.
   */
  it('the item is the panel-reveal scope', () => {
    // Trigger and content are siblings inside the item, and the item is what
    // `:hover` / `:focus-within` is read from -- so travelling from trigger to
    // panel never leaves the scope.
    expect(classes.item).toContain('group/navigation-item');
    expect(classes.content).toContain('absolute');
    expect(classes.content).toContain('top-full');
  });

  it('the panel closes on the fast/exit cell with NO delay reference', () => {
    // motion.jsonl gives navigation-menu / panel / "open -> closed" fast + exit
    // and an empty `delays` array. The old hover-intent timer reused its OPEN
    // delay for the close; that was drift, and closing is immediate now.
    expect(classes.content).toContain('opacity-0');
    expect(classes.content).toContain('pointer-events-none');
    expect(classes.content).toContain('duration-fast');
    expect(classes.content).toContain('ease-exit');
    expect(classes.content).not.toContain('delay-linger');
    expect(classes.content).not.toContain('delay-skip');
  });

  it('pointer-events rides the transition rather than the reveal rule', () => {
    // A reveal rule that owns both opacity and pointer-events makes the panel
    // click-through the instant `:hover` drops, while it is still most of the
    // way opaque. On the transition (discrete, so it flips at the fade's
    // halfway point) what is visible is what is clickable.
    expect(classes.content).toContain('transition-[opacity,pointer-events]');
    expect(classes.content).toContain('transition-discrete');
    // ...and every reveal path re-states the property so the flip back to
    // `auto` on OPEN is immediate rather than half a fade late.
    expect(classes.content).toContain('group-hover/navigation-item:transition-opacity');
    expect(classes.content).toContain('group-focus-within/navigation-item:transition-opacity');
    expect(classes.content).toContain('data-[state=open]:transition-opacity');
  });

  it('the panel opens on the moderate/enter cell with the hover-intent delay', () => {
    for (const utility of [
      'opacity-100',
      'pointer-events-auto',
      'duration-moderate',
      'ease-enter',
      'delay-hover-intent',
    ]) {
      expect(classes.content).toContain(`group-hover/navigation-item:${utility}`);
      expect(classes.content).toContain(`group-focus-within/navigation-item:${utility}`);
    }
  });

  it('the score-driven path opens on the same cell but WITHOUT the delay', () => {
    // Keyboard opening, a controlled `value`, and a tap on a device with no
    // hover all reach the panel through `data-state`. Hover-intent filters
    // accidental pointer transit, and there is no accidental ArrowDown -- so
    // that path carries the tier and the curve and no delay at all.
    for (const utility of ['opacity-100', 'pointer-events-auto', 'duration-moderate', 'ease-enter'])
      expect(classes.content).toContain(`data-[state=open]:${utility}`);
    expect(classes.content).not.toContain('data-[state=open]:delay-hover-intent');
  });

  it('the dismissal flag belongs to the PANEL, never to the whole bar', () => {
    // Root-scoped, the WCAG force-hide blanked every panel at once: after an
    // Escape, hovering a sibling trigger revealed nothing until the pointer
    // left the nav entirely. The flag belongs to the panel that was dismissed.
    expect(classes.content).toContain('data-[dismissed=true]:opacity-0!');
    expect(classes.content).toContain('data-[dismissed=true]:pointer-events-none!');
    expect(classes.content).not.toContain('[data-part=root][data-dismissed=true]');
  });

  it('states no timing as a literal and queries reduced motion nowhere', () => {
    for (const value of [
      classes.trigger,
      classes.triggerChevron,
      classes.content,
      classes.link,
      classes.indicator,
    ]) {
      expect(value).not.toMatch(/\b(duration|delay)-\d/);
      expect(value).not.toContain('motion-reduce');
    }
    // The 13 semantic motion tokens are deleted by ruling (2026-08-02); they
    // kept compiling by accident, which is what let them linger here.
    for (const value of Object.values(classes)) {
      expect(value).not.toContain('motion-hover');
      expect(value).not.toContain('motion-toggle');
    }
  });

  it('the trigger hover carries its row: color, fast, standard', () => {
    // motion.jsonl navigation-menu / trigger / "hover".
    for (const utility of ['transition-colors', 'duration-fast', 'ease-standard'])
      expect(classes.trigger).toContain(utility);
  });

  it('the link hover carries the same row, being the same kind of surface', () => {
    // The matrix has no separate `link` row; the link's hover is the trigger
    // row's movement, properties, tier and curve on a second element of the same
    // component, so it carries that row rather than an invented value.
    for (const utility of ['transition-colors', 'duration-fast', 'ease-standard'])
      expect(classes.link).toContain(utility);
  });

  it('the chevron and indicator move only if a row says so, and none does', () => {
    // The matrix gives navigation-menu no `chevron` row and no `indicator` row.
    // The chevron still flips (rotate-180 is mechanics) but is not timed, and
    // the indicator carries no motion at all. Reported on #2293.
    expect(classes.triggerChevron).toContain('group-data-[state=open]:rotate-180');
    expect(classes.triggerChevron).not.toContain('transition');
    expect(classes.triggerChevron).not.toMatch(/\b(duration|ease)-/);
    expect(classes.indicator).not.toContain('transition');
    expect(classes.indicator).not.toMatch(/\b(duration|ease)-/);
  });

  it('the item-change row is left unconsumed rather than doubled onto the viewport', () => {
    // #2148 replaced the shared morphing viewport with one panel per item, so
    // "open -> open (item change)" is panel-A close plus panel-B open -- both
    // already consumed on `content`. The viewport renders empty and has nothing
    // whose size could morph.
    expect(classes.viewport).not.toMatch(/\b(transition|duration|ease|animate)-/);
  });
});

describe('navigation-menu icon classes', () => {
  it('the trigger is a grid whose columns follow reading order', () => {
    const tokens = classes.trigger.split(' ');
    expect(tokens).toContain('grid-flow-col');
    expect(tokens).toContain('items-center');
    expect(tokens.some((t) => t.startsWith('gap-'))).toBe(true);
    expect(classes.trigger.split(' ')).toContain('inline-grid');
    expect(classes.trigger.split(' ')).not.toContain('inline-flex');
    expect(classes.triggerChevron).not.toMatch(/(^|\s)ml-/);
  });

  it('a link without an icon keeps its stacked layout', () => {
    const tokens = classes.link.split(' ');
    expect(tokens).toContain('block');
    expect(tokens).toContain('space-y-1');
    expect(tokens).not.toContain('grid');
    expect(tokens).not.toContain('grid-flow-col');
  });

  it('a link that holds an icon wrapper becomes a grid row', () => {
    const tokens = classes.link.split(' ');
    for (const literal of ['grid', 'grid-flow-col', 'items-center', 'gap-2', 'space-y-0']) {
      expect(tokens).toContain(`has-data-[icon]:${literal}`);
    }
  });

  it('the file has no physical direction class', () => {
    for (const set of Object.values(classes)) {
      expect(set).not.toMatch(/(^|\s)(left|right|ml|mr|pl|pr|float)-/);
    }
    expect(classes.content).toContain('start-0');
    expect(classes.viewportWrapper).toContain('start-0');
  });

  it('the icon wrapper only places and hides, never sizes', () => {
    expect(classes.startIcon).toBe('inline-grid place-items-center');
    expect(classes.endIcon).toBe('inline-grid place-items-center');
  });

  it('padding tightens per side with logical classes', () => {
    for (const row of [classes.trigger, classes.link]) {
      expect(row).toMatch(/has-data-\[icon=inline-start\]:ps-/);
      expect(row).toMatch(/has-data-\[icon=inline-end\]:pe-/);
    }
  });

  it('classy keeps every new literal', () => {
    for (const row of [classes.trigger, classes.link]) {
      const kept = classy(row).split(' ');
      const added = row
        .split(' ')
        .filter((t) => t.includes('has-data-') || t === 'grid-flow-col' || t === 'inline-grid');
      expect(added.length).toBeGreaterThan(2);
      for (const literal of added) expect(kept, `classy dropped ${literal}`).toContain(literal);
    }
    expect(classy(classes.startIcon)).toBe(classes.startIcon);
    expect(classy(classes.endIcon)).toBe(classes.endIcon);
    expect(classy(classes.content).split(' ')).toContain('start-0');
  });
});
