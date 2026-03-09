import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Container } from '../../src/components/ui/container';

function getGapValue(el: Element): string | null {
  const match = el.className.match(/gap-(\d+)/);
  return match?.[1] ?? null;
}

function firstChild(container: HTMLElement): Element {
  const el = container.firstElementChild;
  expect(el).not.toBeNull();
  return el as Element;
}

describe('Container', () => {
  describe('gap prop', () => {
    it('does not apply flex or gap classes when gap is not set', () => {
      const { container } = render(<Container>content</Container>);
      const el = firstChild(container);
      expect(el.className).not.toContain('flex-col');
      expect(el.className).not.toContain('gap-');
    });

    describe('gap={true} derives from spacing scale position for size', () => {
      it('sm uses component-padding tier (spacing-3)', () => {
        const { container } = render(
          <Container size="sm" gap>
            content
          </Container>,
        );
        expect(getGapValue(firstChild(container))).toBe('3');
      });

      it('xl uses section-padding tier (spacing-6)', () => {
        const { container } = render(
          <Container size="xl" gap>
            content
          </Container>,
        );
        expect(getGapValue(firstChild(container))).toBe('6');
      });

      it('7xl uses upper section-padding tier (spacing-12)', () => {
        const { container } = render(
          <Container size="7xl" gap>
            content
          </Container>,
        );
        expect(getGapValue(firstChild(container))).toBe('12');
      });

      it('smaller sizes get smaller gaps than larger sizes', () => {
        const { container: smC } = render(
          <Container size="sm" gap>
            sm
          </Container>,
        );
        const { container: xlC } = render(
          <Container size="7xl" gap>
            7xl
          </Container>,
        );
        expect(Number(getGapValue(firstChild(smC)))).toBeLessThan(
          Number(getGapValue(firstChild(xlC))),
        );
      });

      it('falls back to spacing-6 when no size is set', () => {
        const { container } = render(<Container gap>content</Container>);
        expect(getGapValue(firstChild(container))).toBe('6');
      });

      it('full falls back to spacing-6', () => {
        const { container } = render(
          <Container size="full" gap>
            content
          </Container>,
        );
        expect(getGapValue(firstChild(container))).toBe('6');
      });
    });

    describe('explicit gap overrides size default', () => {
      it('gap="8" overrides sm default', () => {
        const { container } = render(
          <Container size="sm" gap="8">
            content
          </Container>,
        );
        expect(getGapValue(firstChild(container))).toBe('8');
      });

      it('gap="0" applies gap-0 regardless of size', () => {
        const { container } = render(
          <Container size="6xl" gap="0">
            content
          </Container>,
        );
        expect(getGapValue(firstChild(container))).toBe('0');
      });
    });

    it('always applies flex flex-col with gap', () => {
      const { container } = render(
        <Container size="lg" gap>
          content
        </Container>,
      );
      const el = firstChild(container);
      expect(el.className).toContain('flex');
      expect(el.className).toContain('flex-col');
    });

    it('combines with padding and className', () => {
      const { container } = render(
        <Container padding="4" gap="6" className="custom">
          content
        </Container>,
      );
      const el = firstChild(container);
      expect(el.className).toContain('p-4');
      expect(el.className).toContain('gap-6');
      expect(el.className).toContain('custom');
    });
  });
});
