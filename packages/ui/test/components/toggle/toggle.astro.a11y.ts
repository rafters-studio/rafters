import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import Toggle from '../../../src/components/toggle/toggle.astro';
import { bindToggle } from '../../../src/components/toggle/toggle.behavior';

async function mount(props: Record<string, unknown>): Promise<Document> {
  const container = await AstroContainer.create();
  // Every scene carries an accessible name: the `label` prop the astro
  // conformance test supplies, or aria-label for the icon-only scene.
  const html = await container.renderToString(Toggle, {
    props: { id: 't', label: 'Bold', ...props },
  });
  const window = new Window();
  const document = window.document as unknown as Document;
  document.body.innerHTML = `<main>${html}</main>`;
  // The page <script> does this per instance; the Container never runs it.
  bindToggle(document.querySelector('button[data-part="root"]') as HTMLElement);
  return document;
}

const scenes: ReadonlyArray<[string, Record<string, unknown>]> = [
  ['off default', {}],
  ['on (pressed)', { defaultPressed: true }],
  ['outline variant', { variant: 'outline' }],
  ['large size on', { size: 'lg', defaultPressed: true }],
  ['hard disabled', { disabled: true }],
  ['icon-only with accessible name', { label: undefined, 'aria-label': 'Bold' }],
];

for (const [name, props] of scenes) {
  test(`toggle.astro ${name}`, async ({ task }) => {
    const document = await mount(props);
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
