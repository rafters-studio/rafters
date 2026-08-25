/**
 * React performance of the navigation-menu score, driven end to end.
 * Replaces the oracle's imperative controller: state moves only through
 * dispatched actions; roving focus, hover intent, and outside dismissal are
 * declarative effects.
 */
import * as React from 'react';
import { cleanup, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installMotionDelaySheet } from '../../harness/motion-sheet';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuIndicator,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  NavigationMenuViewport,
  navigationMenuTriggerStyle,
} from '../../../src/components/navigation-menu/navigation-menu';
import { navigationMenu } from '../../../src/components/navigation-menu/navigation-menu.behavior';
import { navigationMenuClasses } from '../../../src/components/navigation-menu/navigation-menu.classes';
import {
  assertAxeClean,
  assertInstanceAriaFulfillment,
  partElement,
} from '../../harness/conformance';

interface SetupProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  orientation?: 'horizontal' | 'vertical';
  delayDuration?: number;
}

function TestMenu(props: SetupProps) {
  return (
    <NavigationMenu {...props}>
      <NavigationMenuList>
        <NavigationMenuItem value="products">
          <NavigationMenuTrigger>Products</NavigationMenuTrigger>
          <NavigationMenuContent>
            <NavigationMenuLink href="/one">One</NavigationMenuLink>
            <NavigationMenuLink href="/two">Two</NavigationMenuLink>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem value="docs">
          <NavigationMenuTrigger>Docs</NavigationMenuTrigger>
          <NavigationMenuContent>
            <NavigationMenuLink href="/docs">Docs home</NavigationMenuLink>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}

const body = () => document.body;

function triggerFor(value: string): HTMLElement {
  const element = body().querySelector<HTMLElement>(`[data-part="trigger"][data-value="${value}"]`);
  if (!element) throw new Error(`no trigger for ${value}`);
  return element;
}

function contentFor(value: string): HTMLElement {
  const element = body().querySelector<HTMLElement>(`[data-part="content"][data-value="${value}"]`);
  if (!element) throw new Error(`no content for ${value}`);
  return element;
}

// The emitted token sheet is what a real page loads; the menu reads its
// hover-intent delay off it at mount. Without it, the accessor fails loud on
// the missing sheet (#2132).
let uninstallMotionSheet: () => void = () => {};
beforeEach(() => {
  uninstallMotionSheet = installMotionDelaySheet();
});

afterEach(() => {
  cleanup();
  uninstallMotionSheet();
});

describe('navigation-menu conformance [react]', () => {
  it('closed: content stays in the DOM, hidden -- crawlable navigation', async () => {
    render(<TestMenu />);
    expect(contentFor('products').hidden).toBe(true);
    expect(contentFor('products').getAttribute('data-state')).toBe('closed');
    expect(triggerFor('products').getAttribute('aria-expanded')).toBe('false');
    expect(partElement(body(), 'root')?.getAttribute('aria-label')).toBe('Main navigation');
    await assertAxeClean(body());
  });

  it('trigger and content are wired by real ids', () => {
    render(<TestMenu />);
    const trigger = triggerFor('products');
    const content = contentFor('products');
    expect(trigger.getAttribute('aria-controls')).toBe(content.id);
    expect(content.getAttribute('aria-labelledby')).toBe(trigger.id);
  });

  it('per-instance ARIA equals the score projection, closed and open', async () => {
    const user = userEvent.setup();
    render(<TestMenu />);
    const root = partElement(body(), 'root') as HTMLElement;
    // The generic harness reads spec.instanceAria and every rendered instance.
    assertInstanceAriaFulfillment(navigationMenu, root, { active: null, pointerOpened: false }, {});
    await user.click(triggerFor('products'));
    assertInstanceAriaFulfillment(
      navigationMenu,
      root,
      { active: 'products', pointerOpened: false },
      {},
    );
  });

  it('click opens, click again closes, clicking another switches', async () => {
    const user = userEvent.setup();
    render(<TestMenu />);

    await user.click(triggerFor('products'));
    expect(contentFor('products').hidden).toBe(false);
    expect(triggerFor('products').getAttribute('aria-expanded')).toBe('true');
    await assertAxeClean(body());

    await user.click(triggerFor('docs'));
    expect(contentFor('products').hidden).toBe(true);
    expect(contentFor('docs').hidden).toBe(false);

    await user.click(triggerFor('docs'));
    expect(contentFor('docs').hidden).toBe(true);
  });

  it('arrow keys rove focus across triggers with wrap', async () => {
    const user = userEvent.setup();
    render(<TestMenu />);
    triggerFor('products').focus();
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(triggerFor('docs'));
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(triggerFor('products'));
    await user.keyboard('{End}');
    expect(document.activeElement).toBe(triggerFor('docs'));
    await user.keyboard('{Home}');
    expect(document.activeElement).toBe(triggerFor('products'));
  });

  it('ArrowDown opens the focused trigger on the horizontal axis', async () => {
    const user = userEvent.setup();
    render(<TestMenu />);
    triggerFor('products').focus();
    await user.keyboard('{ArrowDown}');
    expect(contentFor('products').hidden).toBe(false);
  });

  it('Escape closes and returns focus to the open trigger', async () => {
    const user = userEvent.setup();
    render(<TestMenu />);
    await user.click(triggerFor('products'));
    const link = contentFor('products').querySelector('a') as HTMLElement;
    link.focus();
    await user.keyboard('{Escape}');
    expect(contentFor('products').hidden).toBe(true);
    expect(document.activeElement).toBe(triggerFor('products'));
  });

  it('pointerdown outside closes', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <button type="button">Elsewhere</button>
        <TestMenu />
      </div>,
    );
    await user.click(triggerFor('products'));
    expect(contentFor('products').hidden).toBe(false);
    await user.click(document.querySelector('button') as HTMLElement);
    expect(contentFor('products').hidden).toBe(true);
  });

  it('hover opens after the delay and closes after leaving', async () => {
    const user = userEvent.setup();
    render(<TestMenu delayDuration={1} />);
    await user.hover(triggerFor('products'));
    await waitFor(() => expect(contentFor('products').hidden).toBe(false));
    await user.unhover(triggerFor('products'));
    await waitFor(() => expect(contentFor('products').hidden).toBe(true));
  });

  it('controlled: callbacks fire, state follows the prop', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { rerender } = render(<TestMenu value="" onValueChange={onValueChange} />);

    await user.click(triggerFor('products'));
    expect(onValueChange).toHaveBeenLastCalledWith('products');
    expect(contentFor('products').hidden).toBe(true);

    rerender(<TestMenu value="products" onValueChange={onValueChange} />);
    expect(contentFor('products').hidden).toBe(false);
    expect(triggerFor('products').getAttribute('aria-expanded')).toBe('true');

    await user.click(triggerFor('products'));
    expect(onValueChange).toHaveBeenLastCalledWith('');
  });

  it('uncontrolled callback fires once per real transition', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<TestMenu onValueChange={onValueChange} />);
    await user.click(triggerFor('products'));
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenLastCalledWith('products');
    await user.click(triggerFor('docs'));
    expect(onValueChange).toHaveBeenCalledTimes(2);
    expect(onValueChange).toHaveBeenLastCalledWith('docs');
    await user.keyboard('{Escape}');
    expect(onValueChange).toHaveBeenCalledTimes(3);
    expect(onValueChange).toHaveBeenLastCalledWith('');
  });

  it('viewport and indicator chrome appear while open, leave when closed', async () => {
    const user = userEvent.setup();
    render(
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem value="a">
            <NavigationMenuTrigger>A</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink href="/a">A home</NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
          <NavigationMenuIndicator />
        </NavigationMenuList>
        <NavigationMenuViewport />
      </NavigationMenu>,
    );
    expect(partElement(body(), 'viewport')).toBeNull();
    expect(partElement(body(), 'indicator')).toBeNull();

    await user.click(triggerFor('a'));
    const viewport = partElement(body(), 'viewport');
    const indicator = partElement(body(), 'indicator');
    expect(viewport?.getAttribute('data-state')).toBe('open');
    expect(viewport?.hasAttribute('aria-hidden')).toBe(false);
    expect(indicator?.getAttribute('data-state')).toBe('visible');
    expect(indicator?.getAttribute('aria-hidden')).toBe('true');

    await user.keyboard('{Escape}');
    expect(partElement(body(), 'viewport')).toBeNull();
    expect(partElement(body(), 'indicator')).toBeNull();
  });

  it('navigationMenuTriggerStyle matches the trigger projection', () => {
    render(<TestMenu />);
    expect(navigationMenuTriggerStyle()).toBe(
      navigationMenuClasses({}, { active: null, pointerOpened: false }).trigger,
    );
  });

  it('link renders with data-active driving the styling contract', () => {
    render(
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem value="a">
            <NavigationMenuTrigger>A</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink href="/here" active>
                Here
              </NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    );
    const link = body().querySelector('a[href="/here"]');
    expect(link?.hasAttribute('data-active')).toBe(true);
  });
});
