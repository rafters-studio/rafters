import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { runAxe } from '../../a11y/run-axe';
import {
  Carousel,
  CarouselContent,
  CarouselIndicators,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '../../../src/components/carousel/carousel';

interface SceneProps {
  orientation?: 'horizontal' | 'vertical';
  loop?: boolean;
  value?: number;
  defaultValue?: number;
  label?: string;
  indicators?: boolean;
}

function Scene({ indicators = true, ...props }: SceneProps) {
  return (
    <Carousel {...props}>
      <CarouselPrevious />
      <CarouselContent>
        <CarouselItem>Slide one</CarouselItem>
        <CarouselItem>Slide two</CarouselItem>
        <CarouselItem>Slide three</CarouselItem>
      </CarouselContent>
      <CarouselNext />
      {indicators && <CarouselIndicators />}
    </Carousel>
  );
}

const scenes: ReadonlyArray<[string, SceneProps]> = [
  ['first slide, horizontal', {}],
  ['vertical', { orientation: 'vertical' }],
  ['loop', { loop: true }],
  ['middle slide', { defaultValue: 1 }],
  ['last slide, controlled', { value: 2 }],
  ['custom label', { label: 'Product gallery' }],
  ['without indicators', { indicators: false }],
];

for (const [name, props] of scenes) {
  test(`carousel ${name}`, async ({ task }) => {
    const { container } = await render(<Scene {...props} />);
    const results = await runAxe(container);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
