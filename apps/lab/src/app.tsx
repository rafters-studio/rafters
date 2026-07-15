import * as React from 'react';
import { Button } from '../../../packages/ui/src/components/button/button';
import { Container } from '@rafters/ui/components/ui/container';
import { Grid } from '@rafters/ui/components/ui/grid';
import { H1, P, Small } from '@rafters/ui/components/ui/typography';
import { ButtonPage } from './pages/button';
import { DialogPage } from './pages/dialog';
import { NavigationMenuPage } from './pages/navigation-menu';

const PAGES = {
  button: { title: 'Button', render: ButtonPage },
  dialog: { title: 'Dialog', render: DialogPage },
  'navigation-menu': { title: 'Navigation Menu', render: NavigationMenuPage },
} as const;

type PageKey = keyof typeof PAGES;

function pageFromHash(): PageKey {
  const key = window.location.hash.replace('#', '');
  return key in PAGES ? (key as PageKey) : 'button';
}

function subscribeToHash(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

export function App() {
  const page = React.useSyncExternalStore(subscribeToHash, pageFromHash);
  const Page = PAGES[page].render;

  return (
    <Container as="main" size="5xl" padding="8">
      <Container as="header">
        <H1>Behavior Layer Lab</H1>
        <P>
          Test articles for the score pattern: the behavior file IS the component; framework files
          are performances. This page is a proving ground -- it never deploys.
        </P>
        <Grid columns={{ base: 1, md: 3 }}>
          {(Object.keys(PAGES) as PageKey[]).map((key) => (
            <Button
              key={key}
              variant={key === page ? 'accent' : 'ghost'}
              onClick={() => {
                window.location.hash = key;
              }}
            >
              {PAGES[key].title}
            </Button>
          ))}
        </Grid>
      </Container>
      <Page />
      <Container as="footer">
        <Small>Spec: packages/ui/docs/spec -- issue #1752</Small>
      </Container>
    </Container>
  );
}
