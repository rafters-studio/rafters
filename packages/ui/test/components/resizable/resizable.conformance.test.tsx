/**
 * React render adapter + the shared resizable conformance suite, plus the
 * compound-only onLayout proof.
 */
import * as React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '../../../src/components/resizable/resizable';
import type { RenderResult } from '../../harness/conformance';
import {
  runResizableConformance,
  type ResizableAdapter,
  type ResizableScenarioProps,
} from './conformance-suite';

function tree(props: ResizableScenarioProps, label: string): React.ReactElement {
  const children: React.ReactNode[] = [];
  for (const [index, panel] of props.panels.entries()) {
    children.push(
      <ResizablePanel
        key={`panel-${index}`}
        defaultSize={panel.defaultSize}
        minSize={panel.minSize}
        maxSize={panel.maxSize}
      />,
    );
    if (index < props.panels.length - 1) {
      children.push(
        <ResizableHandle
          key={`handle-${index}`}
          withHandle={props.withHandle}
          aria-label={label}
        />,
      );
    }
  }
  return (
    <ResizablePanelGroup direction={props.direction} disabled={props.disabled}>
      {children}
    </ResizablePanelGroup>
  );
}

const reactAdapter: ResizableAdapter = {
  name: 'react',
  render(props, label): RenderResult {
    const utils = render(tree(props, label));
    const root = utils.container.querySelector<HTMLElement>('[data-part="root"]');
    if (!root) throw new Error('react adapter: no [data-part="root"] rendered');
    return { host: utils.container, root, cleanup: () => utils.unmount() };
  },
};

runResizableConformance(reactAdapter);

describe('resizable onLayout [react]', () => {
  it('reports the new sizes on every committed resize', async () => {
    const layouts: number[][] = [];
    const { container } = render(
      <ResizablePanelGroup onLayout={(sizes) => layouts.push(sizes)}>
        <ResizablePanel defaultSize={50} minSize={10} maxSize={90} />
        <ResizableHandle aria-label="Resize" />
        <ResizablePanel defaultSize={50} minSize={10} maxSize={90} />
      </ResizablePanelGroup>,
    );
    const handle = container.querySelector<HTMLElement>('[data-part="handle"]');
    if (!handle) throw new Error('no handle');
    const user = userEvent.setup();
    handle.focus();
    await user.keyboard('{ArrowRight}');
    expect(layouts.at(-1)).toEqual([51, 49]);
    await user.keyboard('{Shift>}{ArrowRight}{/Shift}');
    expect(layouts.at(-1)).toEqual([61, 39]);
  });

  it('does not fire onLayout while disabled', async () => {
    const layouts: number[][] = [];
    const { container } = render(
      <ResizablePanelGroup disabled onLayout={(sizes) => layouts.push(sizes)}>
        <ResizablePanel defaultSize={50} />
        <ResizableHandle aria-label="Resize" />
        <ResizablePanel defaultSize={50} />
      </ResizablePanelGroup>,
    );
    const handle = container.querySelector<HTMLElement>('[data-part="handle"]');
    const user = userEvent.setup();
    handle?.focus();
    await user.keyboard('{ArrowRight}');
    expect(layouts).toEqual([]);
  });
});
