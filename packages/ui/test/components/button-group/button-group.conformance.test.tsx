import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  ButtonGroup,
  useButtonGroupContext,
} from '../../../src/components/button-group/button-group';
import { buttonGroup } from '../../../src/components/button-group/button-group.behavior';
import { assertAxeClean, assertContractFulfillment, partElement } from '../../harness/conformance';

const body = () => document.body;

afterEach(() => {
  cleanup();
});

describe('button-group conformance [react]', () => {
  it('fulfills the contract: root renders and carries role=group', () => {
    const { container } = render(
      <ButtonGroup aria-label="Text style">
        <button type="button">Bold</button>
        <button type="button">Italic</button>
      </ButtonGroup>,
    );
    const root = partElement(container, 'root') as HTMLElement;
    assertContractFulfillment(buttonGroup, root, {}, { orientation: 'horizontal' }, ['root']);
  });

  it('projects role=group regardless of orientation', () => {
    const { container } = render(
      <ButtonGroup orientation="vertical" aria-label="View">
        <button type="button">Grid</button>
        <button type="button">List</button>
      </ButtonGroup>,
    );
    const root = partElement(container, 'root') as HTMLElement;
    expect(root.getAttribute('role')).toBe('group');
    expect(root.getAttribute('data-orientation')).toBe('vertical');
  });

  it('aria-label is a consumer passthrough, not a score projection', () => {
    const { container } = render(<ButtonGroup aria-label="Document actions">x</ButtonGroup>);
    const root = partElement(container, 'root') as HTMLElement;
    expect(root.getAttribute('aria-label')).toBe('Document actions');
  });

  it('orientation drives the connected-border layout classes', () => {
    const { container, rerender } = render(<ButtonGroup>x</ButtonGroup>);
    let root = partElement(container, 'root') as HTMLElement;
    expect(root.className).toContain('flex-row');
    expect(root.className).toContain('[&>*:not(:first-child)]:-ml-px');
    rerender(<ButtonGroup orientation="vertical">x</ButtonGroup>);
    root = partElement(container, 'root') as HTMLElement;
    expect(root.className).toContain('flex-col');
    expect(root.className).toContain('[&>*:not(:first-child)]:-mt-px');
  });

  it('consumer className merges via classy', () => {
    render(<ButtonGroup className="mt-4">x</ButtonGroup>);
    const element = body().querySelector('[data-part="root"]') as HTMLElement;
    expect(element.className).toContain('inline-flex');
    expect(element.className).toContain('mt-4');
  });

  it('publishes size and orientation to child buttons via context', () => {
    let seen: { size: string; orientation: string } | null = null;
    function Probe(): React.ReactElement {
      const ctx = useButtonGroupContext();
      seen = ctx ? { size: ctx.size, orientation: ctx.orientation } : null;
      return <span>probe</span>;
    }
    render(
      <ButtonGroup size="sm" orientation="vertical" aria-label="Zoom">
        <Probe />
      </ButtonGroup>,
    );
    expect(seen).toEqual({ size: 'sm', orientation: 'vertical' });
  });

  it('returns null outside a group so a Button works standalone', () => {
    let seen: unknown = 'unset';
    function Probe(): React.ReactElement {
      seen = useButtonGroupContext();
      return <span>probe</span>;
    }
    render(<Probe />);
    expect(seen).toBeNull();
  });

  it('is axe-clean with a labelled group of buttons', async () => {
    // A real group lives inside a landmark; wrap in <main> so axe's region
    // rule (all content contained by a landmark) has one -- role=group is not
    // itself a landmark.
    render(
      <main>
        <ButtonGroup aria-label="Document actions">
          <button type="button">Cancel</button>
          <button type="button">Save</button>
        </ButtonGroup>
      </main>,
    );
    await assertAxeClean(body());
  });
});
