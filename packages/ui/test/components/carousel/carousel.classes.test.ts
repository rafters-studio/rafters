import { describe, expect, it } from 'vitest';
import { carouselClasses } from '../../../src/components/carousel/carousel.classes';

describe('carousel classes', () => {
  it('lays the track along the orientation axis', () => {
    expect(carouselClasses({ orientation: 'horizontal' }).track).toContain('flex-row');
    expect(carouselClasses({ orientation: 'vertical' }).track).toContain('flex-col');
  });

  it('slides are full-basis and non-shrinking so one fills the viewport', () => {
    const classes = carouselClasses({});
    expect(classes.item).toContain('basis-full');
    expect(classes.item).toContain('shrink-0');
    expect(classes.content).toContain('overflow-hidden');
  });

  it('the active indicator keys its fill off the projected data-state', () => {
    expect(carouselClasses({}).indicator).toContain('data-[state=active]:bg-primary');
  });

  it('orientation only relocates the controls; the chrome is shared', () => {
    const horizontal = carouselClasses({ orientation: 'horizontal' });
    const vertical = carouselClasses({ orientation: 'vertical' });
    expect(horizontal.previous).toContain('left-2');
    expect(horizontal.next).toContain('right-2');
    expect(vertical.previous).toContain('rotate-90');
    expect(horizontal.previous).toContain('disabled:opacity-50');
  });

  it('declares no hardcoded slide-advance duration (no semantic token yet)', () => {
    const classes = carouselClasses({});
    for (const value of Object.values(classes)) {
      expect(value).not.toMatch(/duration-\d/);
    }
  });
});
