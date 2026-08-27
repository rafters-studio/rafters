import { describe, expect, it } from 'vitest';
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
   * candidates the stylesheet is compiled from; `test/motion/hover-reveal.e2e.ts`
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
    // The generated semantic utilities carry the tier, the curve, AND the
    // reduced-motion zeroing, so nothing here has to restate any of the three.
    expect(classes.trigger).toContain('motion-hover');
    expect(classes.link).toContain('motion-hover');
    expect(classes.triggerChevron).toContain('motion-toggle');
    expect(classes.indicator).toContain('motion-toggle');
  });
});
