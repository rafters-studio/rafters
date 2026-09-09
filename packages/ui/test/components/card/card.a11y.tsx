import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { runAxe } from '../../a11y/run-axe';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../../../src/components/card/card';
import type { CardElement } from '../../../src/components/card/card.behavior';

interface SceneProps {
  as?: CardElement;
  fill?: string;
  titleAs?: 'h2' | 'h3';
  withAction?: boolean;
  withDescription?: boolean;
  withFooter?: boolean;
}

function Scene({
  as,
  fill,
  titleAs = 'h3',
  withAction = true,
  withDescription = true,
  withFooter = true,
}: SceneProps) {
  return (
    <Card {...(as ? { as } : {})} {...(fill ? { fill } : {})}>
      <CardHeader>
        <CardTitle as={titleAs}>Quarterly report</CardTitle>
        {withDescription && <CardDescription>Published this week</CardDescription>}
        {withAction && (
          <CardAction>
            <button type="button">Menu</button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>Revenue is up.</CardContent>
      {withFooter && (
        <CardFooter>
          <button type="button">Read more</button>
        </CardFooter>
      )}
    </Card>
  );
}

const scenes: ReadonlyArray<[string, SceneProps]> = [
  ['full family in a div', {}],
  ['as article', { as: 'article' }],
  ['as section', { as: 'section' }],
  ['as aside', { as: 'aside' }],
  ['fill primary', { fill: 'primary' }],
  ['fill muted/50', { fill: 'muted/50' }],
  ['title at heading level 2', { titleAs: 'h2' }],
  ['header without action or description', { withAction: false, withDescription: false }],
  ['without footer', { withFooter: false }],
];

for (const [name, props] of scenes) {
  test(`card ${name}`, async ({ task }) => {
    // A card is a surface, not a landmark; the page around it supplies the region.
    const { container } = await render(
      <main>
        <Scene {...props} />
      </main>,
    );
    const results = await runAxe(container);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}

test('card body only', async ({ task }) => {
  const { container } = await render(
    <main>
      <Card>Just a body</Card>
    </main>,
  );
  const results = await runAxe(container);
  task.meta.axe = results;
  expect(results.violations).toEqual([]);
});
