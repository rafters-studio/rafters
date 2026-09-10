import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import Alert from '../../../src/components/alert/alert.astro';
import AlertTitle from '../../../src/components/alert/alert-title.astro';
import AlertDescription from '../../../src/components/alert/alert-description.astro';
import AlertAction from '../../../src/components/alert/alert-action.astro';
import { ALERT_VARIANTS } from '../../../src/components/alert/alert.behavior';

interface Scene {
  props: Record<string, unknown>;
  slots: Record<string, string>;
}

async function mount({ props, slots }: Scene): Promise<Document> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Alert, { props, slots });
  const window = new Window();
  const document = window.document as unknown as Document;
  document.body.innerHTML = `<main>${html}</main>`;
  // Alert is a pure static: no bindAlert exists, so nothing to hydrate.
  return document;
}

const titled = { title: 'Saved', description: 'Your changes were saved.' };

const scenes: ReadonlyArray<[string, Scene]> = [
  ...ALERT_VARIANTS.map((variant): [string, Scene] => [
    `variant=${variant}`,
    { props: { variant }, slots: titled },
  ]),
  ['text only', { props: {}, slots: { default: 'Saved.' } }],
  ['every region empty', { props: {}, slots: {} }],
  [
    'with title, description, and an action control',
    {
      props: { variant: 'success' },
      slots: { ...titled, action: '<button type="button">Undo</button>' },
    },
  ],
  [
    'with a decorative icon',
    {
      props: { variant: 'destructive' },
      slots: {
        ...titled,
        default:
          '<svg aria-hidden="true" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7"></circle></svg>',
      },
    },
  ],
];

/**
 * Alert composes two ways and they render DIFFERENT elements, so auditing one
 * does not audit the other. The named `title` slot renders a `div`
 * (alert.astro:126); the `AlertTitle` part file renders a real `h5`
 * (alert-title.astro:31). A heading is what brings axe's heading rules into
 * play at all, so the parity surface needs its own scene rather than riding on
 * the convenience wrapper's.
 */
async function partComposedScene(): Promise<Document> {
  const container = await AstroContainer.create();
  const title = await container.renderToString(AlertTitle, { slots: { default: 'Saved' } });
  const description = await container.renderToString(AlertDescription, {
    slots: { default: 'Your changes were saved.' },
  });
  const action = await container.renderToString(AlertAction, {
    slots: { default: '<button type="button">Undo</button>' },
  });
  const html = await container.renderToString(Alert, {
    props: { variant: 'success' },
    slots: { default: `${title}${description}${action}` },
  });
  const window = new Window();
  const document = window.document as unknown as Document;
  document.body.innerHTML = `<main>${html}</main>`;
  return document;
}

test('alert.astro composed from the AlertTitle, AlertDescription and AlertAction part files', async ({
  task,
}) => {
  const document = await partComposedScene();
  // The part file's real heading, not the convenience wrapper's div.
  expect(document.querySelector('h5[data-slot="alert-title"]')).not.toBeNull();
  const results = await runAxe(document.body);
  task.meta.axe = results;
  expect(results.violations).toEqual([]);
});

for (const [name, scene] of scenes) {
  test(`alert.astro ${name}`, async ({ task }) => {
    const document = await mount(scene);
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
