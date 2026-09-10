import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/hover-card/hover-card.element';

interface Scene {
  open?: boolean;
  disableHoverableContent?: boolean;
}

async function mount({
  open = false,
  disableHoverableContent = false,
}: Scene): Promise<HTMLElement> {
  const state = open ? 'open' : 'closed';
  const config = `${open ? ' data-default-open="true"' : ''}${
    disableHoverableContent ? ' data-disable-hoverable-content="true"' : ''
  }`;
  document.body.innerHTML = `
    <main>
      <rafters-hover-card data-part="root"${config}>
        <a href="#" data-part="trigger" id="hc-trigger" data-state="${state}">@john</a>
        <div data-part="content" id="hc-content" role="dialog" aria-label="John Doe" data-state="${state}">
          Software Engineer
        </div>
      </rafters-hover-card>
    </main>`;
  await Promise.resolve(); // the element binds one microtask after connecting
  return document.body.querySelector('main') as HTMLElement;
}

const scenes: ReadonlyArray<[string, Scene]> = [
  ['closed', {}],
  ['default open', { open: true }],
  ['un-hoverable content closed', { disableHoverableContent: true }],
  ['un-hoverable content open', { open: true, disableHoverableContent: true }],
];

for (const [name, scene] of scenes) {
  test(`rafters-hover-card ${name}`, async ({ task }) => {
    const host = await mount(scene);
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
