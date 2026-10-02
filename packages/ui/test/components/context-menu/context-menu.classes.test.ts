import { describe, expect, it } from 'vitest';
import { contextMenu } from '../../../src/components/context-menu/context-menu.behavior';
import { contextMenuClasses } from '../../../src/components/context-menu/context-menu.classes';

const config = {};
const classes = contextMenuClasses(config, contextMenu.initialState(config));

describe('context-menu classes', () => {
  it('content sits on the dropdown depth and popover surface tokens', () => {
    expect(classes.content).toContain('z-depth-dropdown');
    expect(classes.content).toContain('bg-popover');
    expect(classes.content).toContain('text-popover-foreground');
  });

  it('content runs the two anchored-popup CELLS, keyed off data-state', () => {
    // motion.jsonl: context-menu / content / closed -> open (moderate, enter,
    // extent pop) and open -> closed (fast, exit, extent pop). The retired
    // `motion-dropdown-in` semantic class, and the hand-rolled `opacity-0
    // scale-95` reveal that stood in for the exit, are both gone.
    expect(classes.content).toContain('data-[state=open]:animate-scale-in-moderate-enter');
    expect(classes.content).toContain('data-[state=closed]:animate-scale-out-fast-exit');
    expect(classes.content).not.toContain('motion-dropdown-in');
    expect(classes.content).not.toContain('scale-95');
    // The reduced-motion law lives on the token leaves. `animate-none` would
    // reset the animation shorthand and discard the zeroed duration with it.
    expect(classes.content).not.toContain('motion-reduce:animate-none');
  });

  it('items highlight on the row generics: color, micro, standard', () => {
    // motion.jsonl: context-menu / items / highlight move -- duration-micro,
    // ease-standard, marked proposed. Replaces the retired `motion-focus`.
    expect(classes.item).toContain('transition-colors');
    expect(classes.item).toContain('duration-micro');
    expect(classes.item).toContain('ease-standard');
    expect(classes.item).not.toContain('motion-focus');
    expect(classes.item).toContain('focus:bg-accent');
    expect(classes.item).toContain('data-[disabled]:pointer-events-none');
    expect(classes.item).toContain('data-[disabled]:opacity-50');
  });

  it('items carry the enter row: the stagger delay, no duration, no curve', () => {
    // motion.jsonl: context-menu / items / enter assigns `delay-stagger-step`
    // with `duration: {"kind":"none"}` -- no DURATION assigned, not no
    // assignment. The delay generic is the whole row. It resolves to 0ms at the
    // efficient intent, and that zero is the assignment rather than a gap.
    expect(classes.item).toContain('delay-stagger-step');
    expect(classes.subTrigger).toContain('delay-stagger-step');
  });

  it('checkbox and radio items reserve the indicator gutter', () => {
    expect(classes.checkboxItem).toContain('pl-8');
    expect(classes.radioItem).toContain('pl-8');
    expect(classes.itemIndicator).toContain('absolute');
    expect(classes.radioDot).toContain('rounded-full');
  });

  it('the sub-trigger highlights while its submenu is open', () => {
    // Built from itemBase, so it carries the same highlight-move generics.
    expect(classes.subTrigger).toContain('duration-micro');
    expect(classes.subTrigger).toContain('ease-standard');
    expect(classes.subTrigger).not.toContain('motion-focus');
    expect(classes.subTrigger).toContain('data-[state=open]:bg-accent');
    expect(classes.subTriggerChevron).toContain('ml-auto');
  });

  /**
   * subContent's motion is CSS/tokens only (#2152): no `setTimeout`, no ms
   * literal, and the reveal works with JavaScript disabled. This file pins the
   * CLASS-STRING half of that contract, the same split #2148 uses for tooltip.
   */
  it('subcontent sits on the dropdown depth and popover surface tokens', () => {
    expect(classes.subContent).toContain('z-depth-dropdown');
    expect(classes.subContent).toContain('bg-popover');
    expect(classes.subContent).toContain('text-popover-foreground');
  });

  it('subcontent closes on the fast/exit cell with no delay reference, resting at the extent-pop scale', () => {
    // The base (unqualified) rule IS the open -> closed cell: motion.jsonl
    // gives subcontent's close `fast` + `exit` and an empty `delays` array.
    expect(classes.subContent).toContain('opacity-0');
    expect(classes.subContent).toContain('pointer-events-none');
    expect(classes.subContent).toContain('duration-fast');
    expect(classes.subContent).toContain('ease-exit');
    // The zoom half of "fade + zoom": extent-pop picks the member, the
    // parens-shorthand scale utility reads the alias back -- never a raw
    // scale-95 literal, and never a `var(--rafters-...)` call in source.
    expect(classes.subContent).toContain('extent-pop');
    expect(classes.subContent).toContain('scale-(--rafters-consumed-extent)');
    expect(classes.subContent).not.toContain('scale-95');
    expect(classes.subContent).not.toContain('var(--rafters');
  });

  it('pointer-events and scale ride the transition, so an inert panel cannot latch a click', () => {
    expect(classes.subContent).toContain('transition-[opacity,scale,pointer-events]');
    expect(classes.subContent).toContain('transition-discrete');
  });

  it('subcontent opens via :hover/:focus-within over the real sub-trigger/sub-content siblings, on the moderate/enter cell with the hover-intent delay', () => {
    const revealSelector =
      '[:is([data-part=sub]:has(>[data-part=sub-trigger]:is(:hover,:focus-within)),' +
      '[data-part=sub]:has(>[data-part=sub-content]:is(:hover,:focus-within)))>&]';
    for (const utility of [
      'opacity-100',
      'scale-100',
      'pointer-events-auto',
      'duration-moderate',
      'ease-enter',
      'delay-hover-intent',
    ]) {
      expect(classes.subContent).toContain(`${revealSelector}:${utility}`);
    }
  });

  it('a keyboard/click open reveals on the same cell but with NO reveal delay (data-state is the only reachable path once portalled, but click/keyboard have already declared intent)', () => {
    for (const utility of [
      'opacity-100',
      'scale-100',
      'pointer-events-auto',
      'duration-moderate',
      'ease-enter',
    ]) {
      expect(classes.subContent).toContain(`data-[state=open]:${utility}`);
    }
    // The bare (unscoped) delay candidate must be gone -- it would apply to
    // EVERY data-state=open, keyboard/click included, which is exactly the
    // regression this PR fixes (acceptance criterion 6: keyboard navigation
    // unchanged). `delay-hover-intent` is the string's last candidate, so
    // `endsWith` is the precise check -- a plain `.toContain` would also match
    // as a substring of the scoped `data-[open-source=pointer]:` candidate.
    expect(classes.subContent.endsWith('data-[state=open]:delay-hover-intent')).toBe(false);
  });

  it('a genuine pointer-sourced data-state open (the portalled hover/recovery path) still carries the hover-intent delay, scoped by data-open-source', () => {
    // `data-open-source="pointer"` is stamped only by a pointerenter handler
    // (context-menu.behavior.ts's `bindContextSubMenu`, React's
    // `ContextMenuSub`) -- an input-source MARK, not a timing decision. The
    // delay stays scoped to it so a click or keyboard open (marked
    // 'discrete', or carrying no mark at all) never inherits it.
    expect(classes.subContent).toContain(
      'data-[state=open]:data-[open-source=pointer]:delay-hover-intent',
    );
  });

  it('states no timing as a literal and queries reduced motion nowhere', () => {
    expect(classes.subContent).not.toMatch(/\b(duration|delay)-\d/);
    expect(classes.subContent).not.toContain('motion-reduce');
    expect(classes.subContent).not.toMatch(/\bsetTimeout\b/);
  });

  it('separator, label, and shortcut carry their chrome', () => {
    expect(classes.separator).toContain('bg-muted');
    expect(classes.label).toContain('ts-label-medium');
    expect(classes.shortcut).toContain('ml-auto');
  });

  it('declares no raw numeric durations or animate utilities (motion tokens only)', () => {
    for (const value of [
      classes.content,
      classes.subContent,
      classes.item,
      classes.checkboxItem,
      classes.radioItem,
    ]) {
      expect(value).not.toMatch(/duration-\d/);
      expect(value).not.toContain('animate-in');
      expect(value).not.toContain('zoom-in');
    }
  });
});
