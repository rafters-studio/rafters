/**
 * React performance of the collapsible score, driven end to end. The content
 * renders inline inside the root, so part queries run against the RTL container.
 */
import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../../../src/components/collapsible/collapsible';
import { collapsible } from '../../../src/components/collapsible/collapsible.behavior';

interface SetupProps {
  open?: boolean;
  defaultOpen?: boolean;
  disabled?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function TestCollapsible(props: SetupProps) {
  return (
    <Collapsible {...props}>
      <CollapsibleTrigger>Toggle section</CollapsibleTrigger>
      <CollapsibleContent>
        <p>Revealed content</p>
      </CollapsibleContent>
    </Collapsible>
  );
}

/** The element carrying data-part="<part>", following the same convention as
 *  the DOM-native and Astro bindings. */
function partElement(root: ParentNode, part: string): HTMLElement | null {
  if (root instanceof HTMLElement && root.getAttribute('data-part') === part) return root;
  return root.querySelector<HTMLElement>(`[data-part="${part}"]`);
}

/** Ids the binding actually rendered, so the score's projection can be
 *  compared against real DOM (behaviors never generate ids). */
function domPartIds(root: ParentNode, parts: readonly string[]): Record<string, string> {
  const ids: Record<string, string> = {};
  for (const part of parts) ids[part] = partElement(root, part)?.id ?? '';
  return ids;
}

afterEach(() => {
  cleanup();
});

describe('collapsible [react]', () => {
  it('closed: trigger renders collapsed, content absent', async () => {
    const { container } = render(<TestCollapsible />);
    const trigger = partElement(container, 'trigger');
    expect(trigger).not.toBeNull();
    expect(partElement(container, 'content')).toBeNull();
    expect(trigger?.getAttribute('aria-expanded')).toBe('false');
    expect(trigger?.hasAttribute('aria-controls')).toBe(false);
    expect(partElement(container, 'root')?.getAttribute('data-state')).toBe('closed');
  });

  it('open: every declared part renders and ARIA equals the projection', async () => {
    const user = userEvent.setup();
    const { container } = render(<TestCollapsible />);
    await user.click(partElement(container, 'trigger') as HTMLElement);

    const config = { defaultOpen: false, disabled: false };
    const state = { open: true };
    const expectedParts = ['root', 'trigger', 'content'] as const;
    const allParts = Object.keys(collapsible.parts) as (keyof typeof collapsible.parts)[];
    const ids = domPartIds(container, allParts);
    const projection = collapsible.aria(state, config, ids);

    for (const part of expectedParts) {
      const element = partElement(container, part);
      expect(element, `declared part "${part}" must be rendered`).not.toBeNull();
      const decl = collapsible.parts[part];
      if (decl.role) {
        expect(element?.getAttribute('role'), `part "${part}" role`).toBe(decl.role);
      }
    }
    for (const part of allParts) {
      const attrs = projection[part];
      if (!attrs || !expectedParts.includes(part as (typeof expectedParts)[number])) continue;
      const element = partElement(container, part);
      for (const [attr, value] of Object.entries(attrs)) {
        if (value === undefined) {
          expect(element?.hasAttribute(attr), `part "${part}" must NOT render ${attr}`).toBe(false);
        } else {
          expect(element?.getAttribute(attr), `part "${part}" ${attr}`).toBe(String(value));
        }
      }
    }
  });

  it('trigger and content are wired by real DOM ids', async () => {
    const user = userEvent.setup();
    const { container } = render(<TestCollapsible />);
    await user.click(partElement(container, 'trigger') as HTMLElement);
    const ids = domPartIds(container, ['trigger', 'content']);
    expect(partElement(container, 'trigger')?.getAttribute('aria-controls')).toBe(ids['content']);
    expect(ids['content']).toBeTruthy();
  });

  it('Enter and Space on the native button toggle the region', async () => {
    const user = userEvent.setup();
    const { container } = render(<TestCollapsible />);
    const trigger = partElement(container, 'trigger') as HTMLElement;
    trigger.focus();
    await user.keyboard('{Enter}');
    expect(partElement(container, 'content')).not.toBeNull();
    await user.keyboard(' ');
    expect(partElement(container, 'content')).toBeNull();
  });

  it('click toggles open then closed', async () => {
    const user = userEvent.setup();
    const { container } = render(<TestCollapsible />);
    const trigger = partElement(container, 'trigger') as HTMLElement;
    await user.click(trigger);
    expect(partElement(container, 'content')).not.toBeNull();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    await user.click(trigger);
    expect(partElement(container, 'content')).toBeNull();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('disabled: the trigger is inert and never opens', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const { container } = render(<TestCollapsible disabled onOpenChange={onOpenChange} />);
    const trigger = partElement(container, 'trigger') as HTMLButtonElement;
    expect(trigger.disabled).toBe(true);
    expect(trigger.hasAttribute('data-disabled')).toBe(true);
    await user.click(trigger);
    expect(partElement(container, 'content')).toBeNull();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('defaultOpen mounts open', async () => {
    const { container } = render(<TestCollapsible defaultOpen />);
    expect(partElement(container, 'content')).not.toBeNull();
    expect(partElement(container, 'trigger')?.getAttribute('aria-expanded')).toBe('true');
  });

  it('forceMount keeps the content in the DOM, hidden, while closed', () => {
    const { container } = render(
      <Collapsible>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent forceMount>
          <p>Always mounted</p>
        </CollapsibleContent>
      </Collapsible>,
    );
    const content = partElement(container, 'content');
    expect(content).not.toBeNull();
    expect(content?.getAttribute('data-state')).toBe('closed');
    expect(content?.hasAttribute('hidden')).toBe(true);
  });

  it('uncontrolled callback fires once per real transition', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const { container } = render(<TestCollapsible onOpenChange={onOpenChange} />);
    const trigger = partElement(container, 'trigger') as HTMLElement;
    await user.click(trigger);
    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    await user.click(trigger);
    expect(onOpenChange).toHaveBeenCalledTimes(2);
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it('controlled: callbacks fire, state follows the prop, never the gesture', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const { container, rerender } = render(
      <TestCollapsible open={false} onOpenChange={onOpenChange} />,
    );
    await user.click(partElement(container, 'trigger') as HTMLElement);
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    expect(partElement(container, 'content')).toBeNull();

    rerender(<TestCollapsible open onOpenChange={onOpenChange} />);
    expect(partElement(container, 'content')).not.toBeNull();
  });
});
