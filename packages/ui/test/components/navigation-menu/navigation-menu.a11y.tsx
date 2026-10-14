import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { runAxe } from '../../a11y/run-axe';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuIndicator,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  NavigationMenuViewport,
} from '../../../src/components/navigation-menu/navigation-menu';

interface SceneProps {
  defaultValue?: string;
  orientation?: 'horizontal' | 'vertical';
  chrome?: boolean;
}

function Scene({ chrome = false, ...props }: SceneProps) {
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
            <NavigationMenuLink href="/docs" active>
              Docs home
            </NavigationMenuLink>
          </NavigationMenuContent>
        </NavigationMenuItem>
        {chrome ? <NavigationMenuIndicator /> : null}
      </NavigationMenuList>
      {chrome ? <NavigationMenuViewport /> : null}
    </NavigationMenu>
  );
}

const scenes: ReadonlyArray<[string, SceneProps]> = [
  ['closed', {}],
  ['first item open', { defaultValue: 'products' }],
  ['item with an active link open', { defaultValue: 'docs' }],
  ['vertical closed', { orientation: 'vertical' }],
  ['vertical open', { orientation: 'vertical', defaultValue: 'products' }],
  ['open with viewport and indicator chrome', { defaultValue: 'products', chrome: true }],
];

for (const [name, props] of scenes) {
  test(`navigation-menu ${name}`, async ({ task }) => {
    const { container } = await render(<Scene {...props} />);
    const results = await runAxe(container);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}

test('navigation-menu with start and end icons, svg title does not leak into the name', async ({
  task,
}) => {
  const icon = (
    <svg viewBox="0 0 24 24" width="16" height="16">
      <title>Mail</title>
      <path d="M2 4h20v16H2z" stroke="currentColor" />
    </svg>
  );
  const { container } = await render(
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem value="a">
          <NavigationMenuTrigger startIcon={icon} endIcon={icon}>
            Products
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <NavigationMenuLink href="/one" startIcon={icon}>
              One
            </NavigationMenuLink>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>,
  );
  const results = await runAxe(container);
  task.meta.axe = results;
  expect(results.violations).toEqual([]);
  expect(container.querySelectorAll('[data-icon][aria-hidden="true"]').length).toBe(3);
});
