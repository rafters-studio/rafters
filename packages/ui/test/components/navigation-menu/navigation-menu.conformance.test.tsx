/**
 * React performance of the navigation-menu score, driven end to end.
 * Replaces the oracle's imperative controller: state moves only through
 * dispatched actions; roving focus, hover/focus tracking, and outside dismissal
 * are declarative effects.
 *
 * WHAT CHANGED AT #2148: the panel is never `hidden` any more, and there is no
 * hover-intent timer to wait on. Visibility is opacity + pointer-events keyed
 * off the item's `:hover` / `:focus-within` and off `data-state` -- so the
 * assertions here read data-state, and the visual half is pinned by
 * navigation-menu.classes.test.ts and test/motion/hover-reveal.e2e.ts.
 */
import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
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

/** The panel's open axis is `data-state` now; `hidden` is gone for good. */
const stateFor = (value: string): string | null => contentFor(value).getAttribute('data-state');

/** The WCAG dismissal flag lives on the dismissed PANEL, not on the root. */
const dismissedFor = (value: string): string | undefined => contentFor(value).dataset['dismissed'];

afterEach(() => {
  cleanup();
});

describe('navigation-menu conformance [react]', () => {
  it('closed: content stays in the DOM and is NEVER hidden -- crawlable navigation', async () => {
    render(<TestMenu />);
    // `hidden` is UA display:none: out of the a11y tree, out of rendering, and
    // out of reach of the :hover / :focus-within reveal.
    expect(contentFor('products').hasAttribute('hidden')).toBe(false);
    expect(stateFor('products')).toBe('closed');
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
    expect(stateFor('products')).toBe('open');
    expect(triggerFor('products').getAttribute('aria-expanded')).toBe('true');
    await assertAxeClean(body());

    await user.click(triggerFor('docs'));
    expect(stateFor('products')).toBe('closed');
    expect(stateFor('docs')).toBe('open');

    await user.click(triggerFor('docs'));
    expect(stateFor('docs')).toBe('closed');
  });

  it('a click that CLOSES raises the dismissal; a click that opens clears it', async () => {
    // Enter/Space reach the same handler (a native button fulfils them as a
    // click), so this is the keyboard close path as well. Focus stays on the
    // trigger after the click, so the item still matches `:focus-within` -- only
    // the flag can put the panel back down.
    const user = userEvent.setup();
    render(<TestMenu />);

    await user.click(triggerFor('products'));
    expect(stateFor('products')).toBe('open');
    expect(dismissedFor('products')).toBeUndefined();

    await user.click(triggerFor('products'));
    expect(stateFor('products')).toBe('closed');
    expect(dismissedFor('products')).toBe('true');

    await user.click(triggerFor('products'));
    expect(stateFor('products')).toBe('open');
    expect(dismissedFor('products')).toBeUndefined();
  });

  it('Escape raises the dismissal, and a deliberate reopen clears it', async () => {
    const user = userEvent.setup();
    render(<TestMenu />);
    await user.click(triggerFor('products'));
    triggerFor('products').focus();
    await user.keyboard('{Escape}');
    expect(stateFor('products')).toBe('closed');
    expect(dismissedFor('products')).toBe('true');
    await user.keyboard('{ArrowDown}');
    expect(stateFor('products')).toBe('open');
    expect(dismissedFor('products')).toBeUndefined();
  });

  it('a dismissal is ONE panel: the sibling item still opens on hover', async () => {
    // Raised on the root, the flag made the whole bar inert -- the CSS
    // force-hide was a descendant rule over every panel, and the hover guard
    // refused every trigger -- until the pointer left the nav entirely. After a
    // dismissal the OTHER items must still answer the pointer.
    const user = userEvent.setup();
    render(<TestMenu />);
    await user.click(triggerFor('products'));
    triggerFor('products').focus();
    await user.keyboard('{Escape}');
    expect(dismissedFor('products')).toBe('true');

    await user.hover(triggerFor('docs'));
    expect(stateFor('docs')).toBe('open');
    // ...and reaching the sibling is a fresh intent, so nothing is left flagged.
    expect(dismissedFor('products')).toBeUndefined();
    expect(dismissedFor('docs')).toBeUndefined();
  });

  it('the dismissed item stays dismissed while the pointer sits on it', async () => {
    // The other half of the same property: scoping the flag must not weaken it.
    // Escape returns focus to the trigger, so `:focus-within` still matches --
    // re-entering THAT item may not undo the dismissal the user just asked for.
    const user = userEvent.setup();
    render(<TestMenu />);
    await user.click(triggerFor('products'));
    triggerFor('products').focus();
    await user.keyboard('{Escape}');

    await user.hover(triggerFor('products'));
    expect(stateFor('products')).toBe('closed');
    expect(dismissedFor('products')).toBe('true');
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
    expect(stateFor('products')).toBe('open');
  });

  it('Escape closes and returns focus to the open trigger', async () => {
    const user = userEvent.setup();
    render(<TestMenu />);
    await user.click(triggerFor('products'));
    const link = contentFor('products').querySelector('a') as HTMLElement;
    link.focus();
    await user.keyboard('{Escape}');
    expect(stateFor('products')).toBe('closed');
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
    expect(stateFor('products')).toBe('open');
    await user.click(document.querySelector('button') as HTMLElement);
    expect(stateFor('products')).toBe('closed');
  });

  it('hover opens IMMEDIATELY; leaving the menu closes, with no timer either way', async () => {
    const user = userEvent.setup();
    render(<TestMenu />);
    // The hover-intent wait is the panel's transition-delay now, so the score
    // moves on the event itself and assistive tech is never behind the gesture.
    await user.hover(triggerFor('products'));
    expect(stateFor('products')).toBe('open');
    // Leaving the ROOT closes -- travelling from trigger to its own panel does
    // not, and there is no linger on this component's close to forgive it.
    await user.unhover(partElement(body(), 'root') as HTMLElement);
    expect(stateFor('products')).toBe('closed');
  });

  it('controlled: callbacks fire, state follows the prop', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { rerender } = render(<TestMenu value="" onValueChange={onValueChange} />);

    await user.click(triggerFor('products'));
    expect(onValueChange).toHaveBeenLastCalledWith('products');
    expect(stateFor('products')).toBe('closed');

    rerender(<TestMenu value="products" onValueChange={onValueChange} />);
    expect(stateFor('products')).toBe('open');
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
