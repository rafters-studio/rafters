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
