import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import Switch from '../../../src/components/switch/switch.astro';
import { bindSwitch } from '../../../src/components/switch/switch.behavior';

async function mount(props: Record<string, unknown>): Promise<Document> {
  const container = await AstroContainer.create();
  // The switch has no intrinsic text: every scene names it through aria-label,
  // the prop the astro conformance test supplies.
  const html = await container.renderToString(Switch, {
    props: { id: 's', 'aria-label': 'Enable notifications', ...props },
  });
  const window = new Window();
  const document = window.document as unknown as Document;
  document.body.innerHTML = `<main>${html}</main>`;
  // The page <script> does this per instance; the Container never runs it.
  bindSwitch(document.querySelector('button[data-part="root"]') as HTMLElement);
  return document;
}

const scenes: ReadonlyArray<[string, Record<string, unknown>]> = [
  ['unchecked default', {}],
  ['checked', { checked: true }],
  ['destructive lg checked', { variant: 'destructive', size: 'lg', checked: true }],
  ['small', { size: 'sm' }],
  ['required unchecked', { required: true }],
  ['disabled', { disabled: true }],
];

for (const [name, props] of scenes) {
  test(`switch.astro ${name}`, async ({ task }) => {
    const document = await mount(props);
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
