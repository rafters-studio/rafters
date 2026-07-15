/**
 * React render adapter + the shared button conformance suite.
 */
import * as React from 'react';
import { render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Button, type ButtonProps } from '../../../src/components/button/button';
import { clearAllAnnouncers, getAnnouncerCount } from '../../../src/primitives/sr-announcer';
import type { RenderResult } from '../../harness/conformance';
import {
  runButtonConformance,
  type ButtonAdapter,
  type ButtonScenarioProps,
} from './conformance-suite';

function toProps(props: ButtonScenarioProps): ButtonProps {
  const mapped: Record<string, unknown> = {
    variant: props.variant,
    size: props.size,
    disabled: props.disabled,
    softDisabled: props.softDisabled,
    loading: props.loading,
    toggle: props.toggle,
    defaultPressed: props.pressed,
  };
  if (props.ariaLabel !== undefined) mapped['aria-label'] = props.ariaLabel;
  return mapped as unknown as ButtonProps;
}

const reactAdapter: ButtonAdapter = {
  name: 'react',
  supportsIconLabel: true,
  render(props, label): RenderResult {
    const utils = render(<Button {...toProps(props)}>{label}</Button>);
    const root = utils.container.querySelector<HTMLElement>('[data-part="root"]');
    if (!root) throw new Error('react adapter: no [data-part="root"] rendered');
    return { host: utils.container, root, cleanup: () => utils.unmount() };
  },
};

runButtonConformance(reactAdapter);

/**
 * The announce effect is edge-triggered: it fires on a loading TRANSITION, not
 * on a mount that is already loading. This is the retained-mode surface --
 * React reruns effects across commits, so the runner (persisted in
 * useBehaviorEffects) sees loading appear after a non-loading baseline. The
 * DOM-native bind proves only baseline suppression (shared suite); the runtime
 * transition lives here.
 */
describe('button announce [react, edge-triggered]', () => {
  afterEach(() => {
    clearAllAnnouncers();
  });

  it('does NOT announce when it mounts already loading (baseline)', async () => {
    expect(getAnnouncerCount()).toBe(0);
    const { unmount } = render(<Button loading>Saving</Button>);
    // Give effects a tick to settle; a baseline loading state must stay silent.
    await Promise.resolve();
    expect(getAnnouncerCount()).toBe(0);
    unmount();
  });

  it('announces when loading transitions false -> true', async () => {
    expect(getAnnouncerCount()).toBe(0);
    const { rerender, unmount } = render(
      <Button loadingAnnouncement="Saving changes">Save</Button>,
    );
    expect(getAnnouncerCount()).toBe(0);
    rerender(
      <Button loading loadingAnnouncement="Saving changes">
        Save
      </Button>,
    );
    await waitFor(() => {
      const region = document.querySelector('[data-sr-announcer]');
      expect(region?.textContent).toBe('Saving changes');
    });
    expect(getAnnouncerCount()).toBe(1);
    unmount();
  });
});
