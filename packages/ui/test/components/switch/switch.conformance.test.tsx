/**
 * React render adapter + the shared switch conformance suite, plus the
 * retained-mode-only controlled-callback proof (gotcha #1).
 */
import * as React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Switch, type SwitchProps } from '../../../src/components/switch/switch';
import type { RenderResult } from '../../harness/conformance';
import {
  runSwitchConformance,
  type SwitchAdapter,
  type SwitchScenarioProps,
} from './conformance-suite';

function toProps(props: SwitchScenarioProps, label: string): SwitchProps {
  const mapped: Record<string, unknown> = {
    variant: props.variant,
    size: props.size,
    defaultChecked: props.checked,
    disabled: props.disabled,
    required: props.required,
    'aria-label': label,
  };
  return mapped as unknown as SwitchProps;
}

const reactAdapter: SwitchAdapter = {
  name: 'react',
  render(props, label): RenderResult {
    const utils = render(<Switch {...toProps(props, label)} />);
    const root = utils.container.querySelector<HTMLElement>('[data-part="root"]');
    if (!root) throw new Error('react adapter: no [data-part="root"] rendered');
    return { host: utils.container, root, cleanup: () => utils.unmount() };
  },
};

runSwitchConformance(reactAdapter);

describe('switch controlled callback [react]', () => {
  it('a controlled switch never moves its own aria-checked but reports every change', async () => {
    const changes: boolean[] = [];
    const { container } = render(
      <Switch checked={false} onCheckedChange={(next) => changes.push(next)} aria-label="Sync" />,
    );
    const root = container.querySelector<HTMLElement>('[data-part="root"]');
    if (!root) throw new Error('no root');
    const user = userEvent.setup();

    await user.click(root);
    // Effective value is pinned by the controlled prop -> stays false...
    expect(root.getAttribute('aria-checked')).toBe('false');
    // ...but the callback reports the value the consumer should adopt.
    expect(changes).toEqual([true]);

    await user.click(root);
    expect(root.getAttribute('aria-checked')).toBe('false');
    expect(changes).toEqual([true, true]);
  });

  it('an uncontrolled switch fires onCheckedChange with the intrinsic-after value', async () => {
    const changes: boolean[] = [];
    const { container } = render(
      <Switch onCheckedChange={(next) => changes.push(next)} aria-label="Save drafts" />,
    );
    const root = container.querySelector<HTMLElement>('[data-part="root"]');
    if (!root) throw new Error('no root');
    const user = userEvent.setup();

    await user.click(root);
    expect(root.getAttribute('aria-checked')).toBe('true');
    expect(changes).toEqual([true]);

    await user.click(root);
    expect(root.getAttribute('aria-checked')).toBe('false');
    expect(changes).toEqual([true, false]);
  });
});
