import { describe, expect, it } from 'vitest';
import {
  switchBehavior,
  type SwitchConfig,
  type SwitchSize,
} from '../../../src/components/switch/switch.behavior';
import { switchClasses, switchVariants } from '../../../src/components/switch/switch.classes';

const base: SwitchConfig = { variant: 'default', size: 'default' };

function classesFor(config: SwitchConfig) {
  return switchClasses(config, switchBehavior.initialState(config));
}

describe('switch classes', () => {
  it('track carries the shape, transition, and unchecked fill baseline', () => {
    const { root } = classesFor(base);
    expect(root).toContain('rounded-full');
    expect(root).toContain('bg-input');
    expect(root).toContain('transition-[color,background-color,border-color,scale]');
  });

  it('the track consumes its colour row and the root press row (#2305)', () => {
    const { root } = classesFor(base);
    // track / off <-> on -- color -- duration-moderate, ease-standard
    expect(root).toContain('duration-moderate');
    expect(root).toContain('ease-standard');
    // root / press -- zoom + color -- duration-micro, ease-spring-snappy, extent-press
    expect(root).toContain('active:extent-press');
    expect(root).toContain('active:scale-(--rafters-consumed-extent)');
    expect(root).toContain('active:duration-micro');
    expect(root).toContain('active:ease-spring-snappy');
    // The law lives on the token leaves; a component-level escape fights it.
    expect(root).not.toContain('motion-reduce:');
  });

  it('the thumb travels as a TRANSITION, never a keyframe (#2305)', () => {
    const { thumb } = classesFor(base);
    // thumb / off <-> on -- travel (x) -- duration-moderate, ease-standard.
    // A keyframe would restart from its own `from` and snap a half-thrown switch.
    expect(thumb).toContain('duration-moderate');
    expect(thumb).toContain('ease-standard');
    expect(thumb).not.toContain('animate-');
    expect(thumb).not.toContain('motion-reduce:');
  });

  it('checked fill and focus ring track the variant, via data-state', () => {
    const { root } = classesFor({ ...base, variant: 'destructive' });
    expect(root).toContain('data-[state=checked]:bg-destructive');
    expect(root).toContain('focus-visible:ring-destructive-ring');
  });

  const trackSizes: Array<[SwitchSize, string]> = [
    ['sm', 'h-5 w-9'],
    ['default', 'h-6 w-11'],
    ['lg', 'h-7 w-14'],
  ];
  for (const [size, track] of trackSizes) {
    it(`${size}: track dimensions ${track}`, () => {
      expect(classesFor({ ...base, size }).root).toContain(track);
    });
  }

  const thumbTravel: Array<[SwitchSize, string, string]> = [
    ['sm', 'h-4 w-4', 'data-[state=checked]:translate-x-4'],
    ['default', 'h-5 w-5', 'data-[state=checked]:translate-x-5'],
    ['lg', 'h-6 w-6', 'data-[state=checked]:translate-x-7'],
  ];
  for (const [size, dims, travel] of thumbTravel) {
    it(`${size}: thumb ${dims} travels ${travel}`, () => {
      const { thumb } = classesFor({ ...base, size });
      expect(thumb).toContain(dims);
      expect(thumb).toContain(travel);
      expect(thumb).toContain('transition-transform');
    });
  }

  it('switchVariants matches the root projection', () => {
    expect(switchVariants({ variant: 'destructive', size: 'lg' })).toBe(
      classesFor({ variant: 'destructive', size: 'lg' }).root,
    );
    expect(switchVariants()).toBe(classesFor(base).root);
  });
});
