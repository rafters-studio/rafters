import * as React from 'react';
import { Button } from '../../../../packages/ui/src/components/button/button';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '../../../../packages/ui/src/components/navigation-menu/navigation-menu';
// Side-effect import registers <rafters-navigation-menu>. Same behavior file
// as the React component above -- this is the DOM-native performance.
import '../../../../packages/ui/src/components/navigation-menu/navigation-menu.element';
import {
  navigationMenuClasses,
  navigationMenuTriggerStyle,
} from '../../../../packages/ui/src/components/navigation-menu/navigation-menu.classes';
import { Container } from '@rafters/ui/components/ui/container';
import { Grid } from '@rafters/ui/components/ui/grid';
import { Code, H1, H2, P, Small } from '@rafters/ui/components/ui/typography';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'rafters-navigation-menu': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & { orientation?: string; 'delay-duration'?: string },
        HTMLElement
      >;
    }
  }
}

function DemoMenu(props: { value?: string; onValueChange?: (value: string) => void }) {
  return (
    <NavigationMenu {...props}>
      <NavigationMenuList>
        <NavigationMenuItem value="products">
          <NavigationMenuTrigger>Products</NavigationMenuTrigger>
          <NavigationMenuContent>
            <NavigationMenuLink href="#navigation-menu">Design tokens</NavigationMenuLink>
            <NavigationMenuLink href="#navigation-menu">Components</NavigationMenuLink>
            <NavigationMenuLink href="#navigation-menu" active>
              Behavior layer
            </NavigationMenuLink>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem value="docs">
          <NavigationMenuTrigger>Docs</NavigationMenuTrigger>
          <NavigationMenuContent>
            <NavigationMenuLink href="#navigation-menu">Getting started</NavigationMenuLink>
            <NavigationMenuLink href="#navigation-menu">Specs</NavigationMenuLink>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem value="company">
          <NavigationMenuTrigger>Company</NavigationMenuTrigger>
          <NavigationMenuContent>
            <NavigationMenuLink href="#navigation-menu">About</NavigationMenuLink>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}

function BasicSection() {
  return (
    <Container as="section">
      <H2>Hover, click, keyboard</H2>
      <P>
        Hover a trigger and wait -- delayed open. With one open, slide across -- immediate switch.
        The click that lands right after a hover-open does NOT close the menu (the score's{' '}
        <Code>pointerOpened</Code> bit absorbs it; the oracle got this wrong). Arrow keys rove
        focus, <Code>ArrowDown</Code> opens, Escape closes and hands focus back.
      </P>
      <DemoMenu />
      <P>
        Closed panels stay in the DOM with <Code>hidden</Code> -- view source: every link is
        crawlable.
      </P>
    </Container>
  );
}

function ControlledSection() {
  const [value, setValue] = React.useState('');
  return (
    <Container as="section">
      <H2>Controlled</H2>
      <P>
        The consumer owns <Code>value</Code>; <Code>onValueChange</Code> fires once per real
        transition -- hover switches, absorbed clicks, and rejected dispatches never double-fire.
      </P>
      <Grid columns={{ base: 1, md: 3 }}>
        <Button variant="outline" onClick={() => setValue(value === 'docs' ? '' : 'docs')}>
          Toggle Docs from outside
        </Button>
        <Container>
          <Small>
            value: <Code>{value === '' ? '(none)' : value}</Code>
          </Small>
        </Container>
      </Grid>
      <DemoMenu value={value} onValueChange={setValue} />
    </Container>
  );
}

const WC_ITEMS = [
  {
    value: 'products',
    label: 'Products',
    links: ['Design tokens', 'Components', 'Behavior layer'],
  },
  { value: 'docs', label: 'Docs', links: ['Getting started', 'Specs'] },
  { value: 'company', label: 'Company', links: ['About'] },
];

function WcMenu() {
  const cls = navigationMenuClasses({}, { active: null, pointerOpened: false });
  return (
    <rafters-navigation-menu orientation="horizontal" delay-duration="200" className={cls.root}>
      <ul data-part="list" className={cls.list}>
        {WC_ITEMS.map((item) => {
          const triggerId = `wc-trigger-${item.value}`;
          const contentId = `wc-content-${item.value}`;
          return (
            <li key={item.value} className={cls.item}>
              {/* Server/author-minted closed state, so it is correct before the
                  element upgrades (no flash of open panels). */}
              <button
                type="button"
                id={triggerId}
                data-part="trigger"
                data-value={item.value}
                data-roving-item
                className={navigationMenuTriggerStyle()}
                aria-expanded="false"
                aria-controls={contentId}
                data-state="closed"
              >
                {item.label}
              </button>
              <div
                id={contentId}
                data-part="content"
                data-value={item.value}
                className={cls.content}
                aria-labelledby={triggerId}
                data-state="closed"
                hidden
              >
                {item.links.map((link) => (
                  <a key={link} href="#navigation-menu" className={cls.link}>
                    {link}
                  </a>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
    </rafters-navigation-menu>
  );
}

function WebComponentSection() {
  return (
    <Container as="section">
      <H2>Same score, Web Component</H2>
      <P>
        No React below this line. <Code>&lt;rafters-navigation-menu&gt;</Code> enhances plain
        light-DOM markup and drives it through the <em>same</em>{' '}
        <Code>navigation-menu.behavior.ts</Code> the React menu above uses -- hover, click, roving,
        Escape, outside-dismiss all identical, because there is one behavior file. The markup ships
        its own closed state, so it is correct and crawlable before the element upgrades.
      </P>
      <WcMenu />
    </Container>
  );
}

export function NavigationMenuPage() {
  return (
    <Container as="article">
      <Container as="header">
        <H1>Navigation Menu</H1>
        <P>
          The third test article. The oracle's 250-line imperative controller is now three reducers,
          one keymap, and one effects function -- roving focus and hover intent are effects (
          <Code>roving-focus</Code>, <Code>hover-intent</Code>), not state.
        </P>
      </Container>
      <BasicSection />
      <ControlledSection />
      <WebComponentSection />
    </Container>
  );
}
