import { describe, expect, it } from 'vitest';
import {
  imageAlignmentClasses,
  imageBaseClasses,
  imageClasses,
  imageErrorClasses,
  imageFrameClasses,
  imageImgClasses,
  imageLoadingClasses,
  imageRadiusClasses,
  imageSizeClasses,
} from '../../../src/components/image/image.classes';

describe('image classes', () => {
  it('root composes the base, the size preset, and the alignment', () => {
    const { root } = imageClasses({ size: 'lg', alignment: 'left' }, {});
    expect(root).toContain(imageBaseClasses);
    expect(root).toContain(imageSizeClasses.lg);
    expect(root).toContain(imageAlignmentClasses.left);
  });

  it('root defaults to centre alignment and omits size when unspecified', () => {
    const { root } = imageClasses({}, {});
    expect(root).toContain(imageAlignmentClasses.center);
    for (const cls of Object.values(imageSizeClasses)) {
      expect(root.split(' ')).not.toContain(cls);
    }
  });

  it('frame composes the clipping base and the radius token, defaulting to rounded-lg', () => {
    expect(imageClasses({}, {}).frame).toContain(imageRadiusClasses.lg);
    const { frame } = imageClasses({ radius: 'full' }, {});
    expect(frame).toContain(imageFrameClasses);
    expect(frame).toContain(imageRadiusClasses.full);
  });

  it('fill resolves through fill-resolver onto the frame (fill, not background)', () => {
    const { frame } = imageClasses({ fill: 'muted' }, {});
    expect(frame).toContain('bg-muted');
    expect(frame).toContain('text-muted-foreground');
  });

  it('an absent or invalid fill adds no surface class', () => {
    expect(imageClasses({}, {}).frame).not.toContain('bg-');
    expect(imageClasses({ fill: 'not a fill' }, {}).frame).not.toContain('bg-');
  });

  it('the img fills the frame in block flow', () => {
    expect(imageClasses({}, {}).img).toBe(imageImgClasses);
  });

  it('the overlay carries the loading surface while loading', () => {
    const { status } = imageClasses({ status: 'loading' }, {});
    expect(status).toContain(imageLoadingClasses);
    expect(status).not.toContain(imageErrorClasses);
  });

  it('the overlay carries the error surface on error', () => {
    const { status } = imageClasses({ status: 'error' }, {});
    expect(status).toContain(imageErrorClasses);
    expect(status).not.toContain(imageLoadingClasses);
  });

  it('radius maps to the rounded-* token scale, never a raw value', () => {
    for (const cls of Object.values(imageRadiusClasses)) {
      expect(cls).toMatch(/^rounded(-[a-z0-9]+)?$/);
    }
  });
});
