import { describe, expect, it } from 'vitest';
import { menubar } from '../../../src/components/menubar/menubar.behavior';
import { menubarClasses } from '../../../src/components/menubar/menubar.classes';

const config = {};
const classes = menubarClasses(config, menubar.initialState(config));

describe('menubar classes', () => {
  it('the bar fills background, not a raw color', () => {
    expect(classes.root).toContain('bg-background');
  });

  it('each menu sits on the dropdown depth token and fills popover, not a raw color', () => {
    expect(classes.content).toContain('z-depth-dropdown');
    expect(classes.content).toContain('bg-popover');
    expect(classes.content).toContain('text-popover-foreground');
  });

  it("the open menu's trigger keys its look off the projected data-state", () => {
    expect(classes.trigger).toContain('data-[state=open]:bg-accent');
    expect(classes.trigger).toContain('data-[state=open]:text-accent-foreground');
  });

  it('the active item look keys off :focus (roving-focus current item), not a data-highlighted axis', () => {
    expect(classes.item).toContain('focus:bg-accent');
    expect(classes.item).toContain('focus:text-accent-foreground');
    expect(classes.item).not.toContain('data-[highlighted]');
  });

  it('disabled looks key off the projected data-disabled', () => {
    for (const item of [classes.item, classes.checkboxItem, classes.radioItem]) {
      expect(item).toContain('data-[disabled]:pointer-events-none');
      expect(item).toContain('data-[disabled]:opacity-50');
    }
  });

  it('the separator fills muted, labels and shortcuts use semantic text tokens', () => {
    expect(classes.separator).toContain('bg-muted');
    expect(classes.label).toContain('ts-label-medium');
    expect(classes.shortcut).toContain('ts-shortcut');
  });

  describe('motion: the generics each matrix row assigns (#2292)', () => {
    const tokens = (value: string) => value.split(/\s+/).filter(Boolean);

    it('content closed -> open: the open pose names moderate, enter, full size', () => {
      expect(tokens(classes.content)).toEqual(
        expect.arrayContaining([
          'data-[state=open]:opacity-100',
          'data-[state=open]:scale-100',
          'data-[state=open]:pointer-events-auto',
          'data-[state=open]:duration-moderate',
          'data-[state=open]:ease-enter',
        ]),
      );
    });

    it('content open -> closed: the closed pose names fast, exit, the pop extent', () => {
      expect(tokens(classes.content)).toEqual(
        expect.arrayContaining([
          'opacity-0',
          'pointer-events-none',
          'extent-pop',
          'scale-(--rafters-consumed-extent)',
          'transition',
          'duration-fast',
          'ease-exit',
        ]),
      );
    });

    it('content stays out of flow while present and closed', () => {
      expect(tokens(classes.content)).toContain('fixed');
    });

    it('items: highlight move (micro, standard), never stagger-delayed (#2415)', () => {
      for (const item of [classes.item, classes.checkboxItem, classes.radioItem]) {
        expect(tokens(item)).toEqual(
          expect.arrayContaining(['transition-colors', 'duration-micro', 'ease-standard']),
        );
        expect(item).not.toContain('delay-stagger-step');
      }
    });

    it('the items enter row is selected on their container (stagger-items)', () => {
      expect(tokens(classes.content)).toContain('stagger-items');
    });

    it('selects the ladder, never constructs it (00-boundaries.md Sec 6)', () => {
      for (const value of Object.values(classes)) {
        expect(value).not.toContain('calc(');
        expect(value).not.toContain('nth-child');
        expect(value).not.toContain('[animation-delay');
      }
    });

    it('trigger hover: color (fast, standard)', () => {
      expect(tokens(classes.trigger)).toEqual(
        expect.arrayContaining(['transition-colors', 'duration-fast', 'ease-standard']),
      );
    });

    it('names only generics: no literal, no transition list, no keyframe, no motion-reduce', () => {
      for (const value of Object.values(classes)) {
        for (const token of tokens(value)) {
          const utility = token.split(':').pop() ?? '';
          expect(token, token).not.toMatch(/(^|:)motion-reduce:/);
          expect(utility, token).not.toMatch(/^(animate-|motion-)/);
          expect(utility, token).not.toMatch(/^transition-\[/);
          expect(utility, token).not.toMatch(/^(duration|delay|ease)-(\d|\[)/);
        }
      }
    });
  });

  it('no arbitrary values (classy drops them)', () => {
    for (const value of Object.values(classes)) {
      expect(value).not.toMatch(/-\[[^\]]*\](\s|$)/);
    }
  });
});
