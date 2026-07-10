/**
 * React render adapter + the shared container conformance suite, plus the
 * React-idiomatic scenarios the shared suite cannot express in a
 * framework-portable way (grid-mode children, className merge -- see
 * conformance-suite.ts's ContainerAdapter for why these stay local).
 */
import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Container } from '../../../src/components/container/container';
import type { RenderResult } from '../../harness/conformance';
import {
  runContainerConformance,
  type ContainerAdapter,
  type ContainerScenarioProps,
} from './conformance-suite';

afterEach(() => {
  cleanup();
});

const reactAdapter: ContainerAdapter = {
  name: 'react',
  supportsAriaLabelForward: true,
  render(props: ContainerScenarioProps, content: string): RenderResult {
    const utils = render(
      <Container
        as={props.as}
        size={props.size}
        query={props.query}
        queryName={props.queryName}
        aria-label={props.ariaLabel}
      >
        {content}
      </Container>,
    );
    const root = utils.container.querySelector<HTMLElement>('[data-part="root"]');
    if (!root) throw new Error('react adapter: no [data-part="root"] rendered');
    return { host: utils.container, root, cleanup: () => utils.unmount() };
  },
};

runContainerConformance(reactAdapter);

describe('container conformance [react] framework-specific', () => {
  it('one tag, container and grid: columns puts children on the grid', () => {
    render(
      <Container as="section" size="6xl" columns={3} gap="6" data-testid="combo">
        <Container colSpan={2}>main</Container>
        <Container colSpan={1}>rail</Container>
      </Container>,
    );
    const combo = document.body.querySelector('[data-testid="combo"]') as HTMLElement;
    expect(combo.className).toContain('grid grid-cols-3');
    expect(combo.className).toContain('max-w-6xl');
    const children = Array.from(combo.children) as HTMLElement[];
    expect(children[0]?.className).toContain('col-span-2');
    expect(children[1]?.className).toContain('col-span-1');
  });

  it('consumer className merges via classy', () => {
    render(<Container className="min-h-screen">x</Container>);
    const element = document.body.querySelector('[data-part="root"]') as HTMLElement;
    expect(element.className).toContain('@container');
    expect(element.className).toContain('min-h-screen');
  });
});
