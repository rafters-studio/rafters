import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import Card from '../../../src/components/card/card.astro';
import CardAction from '../../../src/components/card/card-action.astro';
import CardContent from '../../../src/components/card/card-content.astro';
import CardFooter from '../../../src/components/card/card-footer.astro';
import CardHeader from '../../../src/components/card/card-header.astro';
import CardTitle from '../../../src/components/card/card-title.astro';

function parse(html: string): Document {
  const window = new Window();
  const document = window.document as unknown as Document;
  // A card is a surface, not a landmark; the page around it supplies the region.
  document.body.innerHTML = `<main>${html}</main>`;
  // Card is a pure static: no bindCard exists, so nothing to hydrate.
  return document;
}

/** The named-slot convenience: everything through card.astro alone. */
async function mountNamedSlots(
  props: Record<string, unknown>,
  slots: Record<string, string>,
): Promise<Document> {
  const container = await AstroContainer.create();
  return parse(await container.renderToString(Card, { props, slots }));
}

interface ComposedScene {
  as?: string;
  fill?: string;
  titleAs?: string;
  withAction?: boolean;
  withFooter?: boolean;
}

/** The parity surface: the sub-component files composed inside Card's default slot. */
async function mountComposed({
  as,
  fill,
  titleAs,
  withAction = true,
  withFooter = true,
}: ComposedScene): Promise<Document> {
  const container = await AstroContainer.create();
  const title = await container.renderToString(CardTitle, {
    props: titleAs ? { as: titleAs } : {},
    slots: { default: 'Quarterly report' },
  });
  const action = withAction
    ? await container.renderToString(CardAction, {
        slots: { default: '<button type="button">Menu</button>' },
      })
    : '';
  const header = await container.renderToString(CardHeader, {
    slots: { default: title + action },
  });
  const content = await container.renderToString(CardContent, {
    slots: { default: 'Revenue is up.' },
  });
  const footer = withFooter
    ? await container.renderToString(CardFooter, {
        slots: { default: '<button type="button">Read more</button>' },
      })
    : '';
  const html = await container.renderToString(Card, {
    props: { ...(as ? { as } : {}), ...(fill ? { fill } : {}) },
    slots: { default: header + content + footer },
  });
  return parse(html);
}

const namedSlotScenes: ReadonlyArray<[string, Record<string, unknown>, Record<string, string>]> = [
  ['named slots: title and content', {}, { title: '<h3>Report</h3>', content: '<p>Body</p>' }],
  [
    'named slots: full family',
    {},
    {
      title: '<h3>Quarterly report</h3>',
      description: 'Published this week',
      action: '<button type="button">Menu</button>',
      content: '<p>Revenue is up.</p>',
      footer: '<button type="button">Read more</button>',
    },
  ],
  ['named slots: fill primary', { fill: 'primary' }, { title: '<h3>Report</h3>', content: 'Body' }],
  ['named slots: body only', {}, { default: '<p>Just a body</p>' }],
];

for (const [name, props, slots] of namedSlotScenes) {
  test(`card.astro ${name}`, async ({ task }) => {
    const document = await mountNamedSlots(props, slots);
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}

const composedScenes: ReadonlyArray<[string, ComposedScene]> = [
  ['composed in a div', {}],
  ['composed as article', { as: 'article' }],
  ['composed as section', { as: 'section' }],
  ['composed as aside', { as: 'aside' }],
  ['composed with fill muted/50', { fill: 'muted/50' }],
  ['composed with title at heading level 2', { titleAs: 'h2' }],
  ['composed without action or footer', { withAction: false, withFooter: false }],
];

for (const [name, scene] of composedScenes) {
  test(`card.astro ${name}`, async ({ task }) => {
    const document = await mountComposed(scene);
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
