/**
 * React reveal motion in real chromium (#2195). tooltip, hover-card,
 * navigation-menu and context-menu write `transition-[opacity,pointer-events]`
 * (context-menu adds `scale`) in their classes files. classy used to drop that
 * bracket class in React, leaving no transition-property for the duration, ease
 * and delay classes to act on: the surface revealed instantly, with no
 * hover-intent delay. These tests render the React performance against the
 * compiled sheet and read the computed transition.
 */
import * as React from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { cleanup, render } from 'vitest-browser-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '../../src/components/context-menu/context-menu';
import { contextMenuClasses } from '../../src/components/context-menu/context-menu.classes';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '../../src/components/hover-card/hover-card';
import { hoverCardClasses } from '../../src/components/hover-card/hover-card.classes';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '../../src/components/navigation-menu/navigation-menu';
import { navigationMenuClasses } from '../../src/components/navigation-menu/navigation-menu.classes';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../src/components/tooltip/tooltip';
import { tooltipClasses } from '../../src/components/tooltip/tooltip.classes';

declare module 'vitest/browser' {
  interface BrowserCommands {
    compileCss: (classes: string) => Promise<string>;
  }
}

const joined = (classes: object): string => Object.values(classes).join(' ');
const warn = vi.spyOn(console, 'warn');
let sheet: HTMLStyleElement | undefined;

beforeAll(async () => {
  const css = await commands.compileCss(
    [
      joined(tooltipClasses({}, { open: false })),
      joined(hoverCardClasses({}, { open: false })),
      joined(navigationMenuClasses({}, { active: null, pointerOpened: false })),
      joined(contextMenuClasses({}, { open: false })),
    ].join(' '),
  );
  sheet = document.createElement('style');
  sheet.textContent = css;
  document.head.append(sheet);
}, 120000);

afterAll(() => sheet?.remove());

afterEach(async () => {
  await cleanup();
  warn.mockClear();
});

// The reveal reads the real pointer; browser mode keeps it across files, so park
// it clear of the rendered component before each test.
async function parkPointer() {
  const spot = document.createElement('div');
  spot.style.cssText = 'position:fixed;right:0;bottom:0;width:16px;height:16px';
  document.body.append(spot);
  await userEvent.hover(spot);
  spot.remove();
}

function part(name: string): HTMLElement {
  const element = document.body.querySelector<HTMLElement>(`[data-part="${name}"]`);
  if (!element) throw new Error(`no ${name} part`);
  return element;
}

function transitionOf(element: HTMLElement) {
  const style = getComputedStyle(element);
  return {
    properties: style.transitionProperty.split(',').map((p) => p.trim()),
    duration: Number.parseFloat(style.transitionDuration),
    delay: Number.parseFloat(style.transitionDelay),
    ease: style.transitionTimingFunction,
    behavior: style.transitionBehavior,
  };
}

/** Closed rests on hide timing; hovered rests on reveal timing. */
async function expectHoverIntentReveal(trigger: HTMLElement, content: HTMLElement) {
  const closed = transitionOf(content);
  expect(closed.properties).toContain('opacity');
  expect(closed.properties).toContain('pointer-events');
  expect(closed.behavior).toBe('allow-discrete');

  await userEvent.hover(trigger);
  const revealing = transitionOf(content);
  expect(revealing.properties).toContain('opacity');
  expect(revealing.delay).toBeGreaterThan(0);
  expect(revealing.duration).toBeGreaterThan(closed.duration);
  expect(revealing.ease).not.toBe(closed.ease);
  expect(getComputedStyle(content).pointerEvents).toBe('auto');
}

describe('react reveal motion', () => {
  it('tooltip carries a transition-property and the hover-intent timing', async () => {
    await parkPointer();
    await render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>trigger</TooltipTrigger>
          <TooltipContent>tip</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );
    const content = part('content');
    expect(content.className).toContain('transition-[opacity,pointer-events]');
    await expectHoverIntentReveal(part('trigger'), content);
    expect(warn).not.toHaveBeenCalled();
  }, 30000);

  it('hover-card carries a transition-property and the hover-intent timing', async () => {
    await parkPointer();
    await render(
      <HoverCard>
        <HoverCardTrigger href="#">trigger</HoverCardTrigger>
        <HoverCardContent>card</HoverCardContent>
      </HoverCard>,
    );
    const content = part('content');
    expect(content.className).toContain('transition-[opacity,pointer-events]');
    await expectHoverIntentReveal(part('trigger'), content);
    expect(warn).not.toHaveBeenCalled();
  }, 30000);

  it('navigation-menu carries a transition-property and the hover-intent timing', async () => {
    await parkPointer();
    await render(
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem value="products">
            <NavigationMenuTrigger>Products</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink href="/a">A</NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    );
    const content = part('content');
    expect(content.className).toContain('transition-[opacity,pointer-events]');
    await expectHoverIntentReveal(part('trigger'), content);
    expect(warn).not.toHaveBeenCalled();
  }, 30000);

  it('context-menu submenu carries a transition-property that includes opacity and pointer-events', async () => {
    await parkPointer();
    await render(
      <ContextMenu>
        <ContextMenuTrigger>area</ContextMenuTrigger>
        <ContextMenuContent forceMount>
          <ContextMenuSub>
            <ContextMenuSubTrigger>more</ContextMenuSubTrigger>
            <ContextMenuSubContent forceMount>item</ContextMenuSubContent>
          </ContextMenuSub>
        </ContextMenuContent>
      </ContextMenu>,
    );
    const content = part('sub-content');
    expect(content.className).toContain('transition-[opacity,scale,pointer-events]');
    const { properties, behavior } = transitionOf(content);
    expect(properties).toContain('opacity');
    expect(properties).toContain('pointer-events');
    expect(behavior).toBe('allow-discrete');
    expect(warn).not.toHaveBeenCalled();
  }, 30000);
});
