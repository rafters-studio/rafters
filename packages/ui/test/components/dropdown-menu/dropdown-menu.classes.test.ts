import { describe, expect, it } from 'vitest';
import classy from '../../../src/primitives/classy';
import { dropdownMenu } from '../../../src/components/dropdown-menu/dropdown-menu.behavior';
import { dropdownMenuClasses } from '../../../src/components/dropdown-menu/dropdown-menu.classes';

const config = {};
const classes = dropdownMenuClasses(config, dropdownMenu.initialState(config));

describe('dropdown-menu classes', () => {
  it('the menu sits on the dropdown depth token and fills popover, not a raw color', () => {
    expect(classes.content).toContain('z-depth-dropdown');
    expect(classes.content).toContain('bg-popover');
    expect(classes.content).toContain('text-popover-foreground');
  });

  it('the active item look keys off :focus (roving-focus current item), not a data-highlighted axis', () => {
    expect(classes.item).toContain('focus:bg-accent');
    expect(classes.item).toContain('focus:text-accent-foreground');
    expect(classes.item).not.toContain('data-[highlighted]');
  });

  it('disabled looks key off the projected data-disabled', () => {
    expect(classes.item).toContain('data-[disabled]:pointer-events-none');
    expect(classes.item).toContain('data-[disabled]:opacity-50');
  });

  it('the separator fills muted, the label uses a semantic text token', () => {
    expect(classes.separator).toContain('bg-muted');
    expect(classes.label).toContain('ts-label-medium');
  });

  it('enter/exit are the dropdown-menu CELLS, keyed off data-state (#1996 / #2017)', () => {
    // motion.jsonl: dropdown-menu / content / closed -> open is moderate +
    // enter, open -> closed is fast + exit. The assignments match popover's
    // today and the cells stay SEPARATE anyway -- the matrix declares two
    // moments, and a shared name would drag one when the other is retuned.
    expect(classes.content).toContain('data-[state=open]:animate-scale-in-moderate-enter');
    expect(classes.content).toContain('data-[state=closed]:animate-scale-out-fast-exit');
    expect(classes.content.split(/[\s:]+/)).not.toContain('animate-scale-in');
    expect(classes.content.split(/[\s:]+/)).not.toContain('animate-scale-out');
  });

  it('motion respects reduced-motion, and does NOT do it with animate-none', () => {
    // Mechanism B (#2017): zeroed inside the generated utility. animate-none
    // would reset the shorthand, discard the zeroed duration, and leave the
    // element short of the keyframe's end state.
    expect(classes.content).not.toContain('motion-reduce:animate-none');
  });

  it('items carry the highlight-move row: color, micro, standard', () => {
    // motion.jsonl: dropdown-menu / items / highlight move -- duration-micro,
    // ease-standard, marked proposed and transcribed as written. The focus
    // colours above had no transition at all before this.
    expect(classes.item).toContain('transition-colors');
    expect(classes.item).toContain('duration-micro');
    expect(classes.item).toContain('ease-standard');
  });

  it('items carry the enter row: the stagger delay, no duration, no curve', () => {
    // motion.jsonl: dropdown-menu / items / enter assigns `delay-stagger-step`
    // and `duration: {"kind":"none"}` -- no DURATION, which is not the same as
    // no assignment. The delay generic is the whole row, so naming it is the
    // whole consumption; the fade itself belongs to the content keyframe.
    // It resolves to 0ms at the efficient intent, and that is the assignment
    // rather than a gap: a later retune needs a consumer here to reach.
    expect(classes.item).toContain('delay-stagger-step');
    expect(classes.checkboxItem).toContain('delay-stagger-step');
    expect(classes.radioItem).toContain('delay-stagger-step');
  });

  it('no hand-rolled animation vocabulary and no raw durations', () => {
    // The oracle's animate-in/zoom/fade/slide + duration-N string is the
    // prohibited hand-rolled form (05-authoring, MOTION.md). See the doc.
    for (const value of Object.values(classes)) {
      expect(value).not.toContain('animate-in');
      expect(value).not.toContain('animate-out');
      expect(value).not.toContain('zoom-in');
      expect(value).not.toContain('fade-in');
      expect(value).not.toContain('slide-in');
      expect(value).not.toMatch(/duration-\d/);
    }
  });

  it('the content, items, and groups are a grid on the menu-row track list', () => {
    const tokens = (value: string) => value.split(/\s+/);
    expect(tokens(classes.content)).toEqual(expect.arrayContaining(['grid', 'grid-cols-menu-row']));
    for (const key of ['item', 'checkboxItem', 'radioItem', 'group'] as const) {
      expect(tokens(classes[key])).toEqual(
        expect.arrayContaining(['grid', 'grid-cols-subgrid', 'col-span-full']),
      );
    }
  });

  it('no class in the set names a physical direction', () => {
    for (const value of Object.values(classes)) {
      expect(value).not.toMatch(/(^|[\s:])-?(p[lr]|m[lr]|left|right|float)-/);
    }
  });

  it('the icon wrapper places and hides, never sizes', () => {
    expect(classes.startIcon.split(/\s+/)).toEqual(
      expect.arrayContaining(['inline-grid', 'place-items-center']),
    );
    expect(classes.startIcon).not.toMatch(/(^|\s)(size|w|h)-/);
  });

  it('an item tightens its start padding only when an icon is present', () => {
    expect(classes.item).toContain('has-data-[icon=inline-start]:ps-1.5');
  });

  it('classy keeps every layout literal', () => {
    const layout = /grid|col-|row-start|place-items|has-data|(^|:)p[se]-|(^|:)m[se]-/;
    for (const key of [
      'content',
      'item',
      'checkboxItem',
      'radioItem',
      'group',
      'label',
      'separator',
      'shortcut',
      'itemIndicator',
      'startIcon',
      'itemLabel',
    ] as const) {
      const kept = classy(classes[key]).split(' ');
      for (const literal of classes[key].split(/\s+/).filter((c) => layout.test(c))) {
        expect(kept, `classy dropped ${literal} from ${key}`).toContain(literal);
      }
    }
  });
});
