import { describe, expect, it } from 'vitest';
import {
  type ContainerStylesheetOptions,
  containerBackgroundStyles,
  containerHostBase,
  containerSizeGapScale,
  containerStylesheet,
  isContainerBackground,
  isContainerSize,
  isContainerSpacing,
  resolveDerivedGap,
} from './container.styles';

function compose(options: ContainerStylesheetOptions = {}): string {
  return containerStylesheet(options);
}

describe('containerStylesheet', () => {
  describe(':host base', () => {
    it('always emits display: block', () => {
      expect(compose()).toMatch(/:host\s*\{[^}]*display:\s*block/);
    });

    it('always emits container-type: inline-size', () => {
      expect(compose()).toMatch(/:host\s*\{[^}]*container-type:\s*inline-size/);
    });

    it('always emits width: 100%', () => {
      expect(compose()).toMatch(/:host\s*\{[^}]*width:\s*100%/);
    });

    it('exposes containerHostBase as a CSSProperties map', () => {
      expect(containerHostBase).toMatchObject({
        display: 'block',
        'container-type': 'inline-size',
        width: '100%',
      });
    });
  });

  describe('size', () => {
    it('emits max-width via size-container token for sized variants', () => {
      const css = compose({ size: '6xl' });
      expect(css).toContain('var(--size-container-6xl)');
      expect(css).toMatch(/margin-inline:\s*auto/);
    });

    it('does not emit a size-container-full token for full', () => {
      const css = compose({ size: 'full' });
      expect(css).not.toContain('var(--size-container-full)');
      expect(css).toMatch(/width:\s*100%/);
    });

    it('handles every documented size without throwing', () => {
      for (const size of [
        'sm',
        'md',
        'lg',
        'xl',
        '2xl',
        '3xl',
        '4xl',
        '5xl',
        '6xl',
        '7xl',
        'full',
      ] as const) {
        expect(() => compose({ size })).not.toThrow();
      }
    });
  });

  describe('padding', () => {
    it('emits spacing token for padding', () => {
      expect(compose({ padding: '6' })).toContain('var(--spacing-6)');
    });

    it('handles every documented spacing without throwing', () => {
      for (const padding of [
        '0',
        '1',
        '2',
        '3',
        '4',
        '5',
        '6',
        '8',
        '10',
        '12',
        '16',
        '20',
        '24',
      ] as const) {
        expect(() => compose({ padding })).not.toThrow();
      }
    });
  });

  describe('gap', () => {
    it('emits flex column with token spacing for explicit gap', () => {
      const css = compose({ gap: '8' });
      expect(css).toContain('var(--spacing-8)');
      expect(css).toMatch(/display:\s*flex/);
      expect(css).toMatch(/flex-direction:\s*column/);
    });

    it('derives gap from size when gap is true', () => {
      // 3xl -> 8 per containerSizeGapScale
      expect(compose({ size: '3xl', gap: true })).toContain('var(--spacing-8)');
    });

    it('falls back to spacing-6 when gap is true and no size set', () => {
      expect(compose({ gap: true })).toContain('var(--spacing-6)');
    });

    it('omits flex layout when gap is undefined', () => {
      const css = compose();
      expect(css).not.toMatch(/flex-direction:\s*column/);
    });
  });

  describe('background', () => {
    it('emits background tokens for known names', () => {
      const css = compose({ background: 'muted' });
      expect(css).toContain('var(--color-muted)');
      expect(css).toContain('var(--color-muted-foreground)');
    });

    it('omits background-color rule when background is none', () => {
      const css = compose({ background: 'none' });
      expect(css).not.toMatch(/background-color:\s*var\(--color-/);
    });

    it('omits background-color rule when background is undefined', () => {
      const css = compose();
      expect(css).not.toMatch(/background-color:\s*var\(--color-/);
    });

    it('exposes background style maps for every variant', () => {
      const variants: ReadonlyArray<keyof typeof containerBackgroundStyles> = [
        'none',
        'muted',
        'accent',
        'card',
        'primary',
        'secondary',
      ];
      for (const v of variants) {
        expect(containerBackgroundStyles[v]).toBeDefined();
      }
    });
  });

  describe('article', () => {
    it('emits typography rules for descendant selectors', () => {
      const css = compose({ article: true });
      expect(css).toMatch(/p\s*\{/);
      expect(css).toMatch(/h1\s*\{/);
      expect(css).toMatch(/h2\s*\{/);
      expect(css).toMatch(/h3\s*\{/);
      expect(css).toMatch(/h4\s*\{/);
      expect(css).toMatch(/blockquote\s*\{/);
      expect(css).toMatch(/code\s*\{/);
      expect(css).toMatch(/pre\s*\{/);
      expect(css).toMatch(/ul\s*\{/);
      expect(css).toMatch(/ol\s*\{/);
      expect(css).toMatch(/li\s*\{/);
      expect(css).toMatch(/a\s*\{/);
      expect(css).toMatch(/hr\s*\{/);
      expect(css).toMatch(/img\s*\{/);
      expect(css).toMatch(/table\s*\{/);
      expect(css).toMatch(/th\s*\{/);
      expect(css).toMatch(/td\s*\{/);
    });

    it('uses tokens only -- no raw hex or rgb literals', () => {
      const css = compose({ article: true });
      expect(css).not.toMatch(/#[0-9a-f]{3,8}/i);
      expect(css).not.toMatch(/rgb\(/);
    });

    it('clamps width to size-prose when article and size unset', () => {
      const css = compose({ article: true });
      expect(css).toContain('var(--size-prose, 65ch)');
    });

    it('does not clamp width to size-prose when size is explicitly set', () => {
      const css = compose({ article: true, size: '4xl' });
      expect(css).not.toContain('var(--size-prose');
      expect(css).toContain('var(--size-container-4xl)');
    });

    it('omits article rules when article is false', () => {
      const css = compose();
      expect(css).not.toMatch(/blockquote\s*\{/);
    });
  });

  describe('editable', () => {
    it('emits dashed outline with color-mix muted-foreground 30%', () => {
      const css = compose({ editable: true });
      expect(css).toMatch(/outline-style:\s*dashed/);
      expect(css).toContain('color-mix(in oklch, var(--color-muted-foreground) 30%, transparent)');
      expect(css).toMatch(/outline-offset:\s*2px/);
      expect(css).toMatch(/outline-width:\s*2px/);
    });

    it('omits outline when editable is false', () => {
      const css = compose();
      expect(css).not.toMatch(/outline-style:\s*dashed/);
    });
  });

  describe('motion safety', () => {
    it('never references --duration- or --ease- vars (only --motion-* allowed)', () => {
      const css = compose({
        size: '4xl',
        padding: '6',
        gap: '8',
        background: 'muted',
        article: true,
        editable: true,
      });
      expect(css).not.toMatch(/var\(--duration-/);
      expect(css).not.toMatch(/var\(--ease-/);
    });

    it('emits a prefers-reduced-motion media block', () => {
      const css = compose();
      expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
    });
  });

  describe('parsers / type guards', () => {
    it('isContainerSize accepts valid sizes and rejects others', () => {
      expect(isContainerSize('sm')).toBe(true);
      expect(isContainerSize('full')).toBe(true);
      expect(isContainerSize('massive')).toBe(false);
      expect(isContainerSize(null)).toBe(false);
      expect(isContainerSize(42)).toBe(false);
    });

    it('isContainerSpacing accepts valid scale and rejects others', () => {
      expect(isContainerSpacing('0')).toBe(true);
      expect(isContainerSpacing('24')).toBe(true);
      expect(isContainerSpacing('7')).toBe(false);
      expect(isContainerSpacing('px')).toBe(false);
    });

    it('isContainerBackground accepts the documented union', () => {
      for (const bg of ['none', 'muted', 'accent', 'card', 'primary', 'secondary']) {
        expect(isContainerBackground(bg)).toBe(true);
      }
      expect(isContainerBackground('rainbow')).toBe(false);
    });
  });

  describe('size-gap derivation', () => {
    it('contains the documented size-gap mapping', () => {
      expect(containerSizeGapScale.sm).toBe('3');
      expect(containerSizeGapScale['3xl']).toBe('8');
      expect(containerSizeGapScale['7xl']).toBe('12');
    });

    it('resolveDerivedGap returns the size-mapped value or falls back to 6', () => {
      expect(resolveDerivedGap('sm')).toBe('3');
      expect(resolveDerivedGap('3xl')).toBe('8');
      expect(resolveDerivedGap('full')).toBe('6');
      expect(resolveDerivedGap(undefined)).toBe('6');
    });
  });
});
