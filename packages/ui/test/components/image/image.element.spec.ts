import { expect, it } from 'vitest';
import { imageClasses } from '../../../src/components/image/image.classes';
import { RaftersImage } from '../../../src/components/image/image.element';

const SRC = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';

async function mount(attrs: string): Promise<HTMLElement> {
  document.body.innerHTML = `<main><rafters-image ${attrs}></rafters-image></main>`;
  await Promise.resolve(); // the deferred bind
  const host = document.querySelector('rafters-image');
  if (!(host instanceof RaftersImage)) throw new Error('rafters-image did not mount');
  const figure = (host.shadowRoot ?? host).querySelector('figure[data-part="root"]');
  if (!(figure instanceof HTMLElement)) throw new Error('no figure root');
  return figure;
}

function part(figure: HTMLElement, name: string): HTMLElement | null {
  return figure.querySelector<HTMLElement>(`[data-part="${name}"]`);
}

it('renders figure, frame and img with no status or caption', async () => {
  const figure = await mount(`src="${SRC}" alt="A sunset"`);
  const classes = imageClasses({}, {});
  expect(figure.tagName).toBe('FIGURE');
  expect(figure.className).toBe(classes.root);
  const frame = part(figure, 'frame');
  expect(frame?.tagName).toBe('DIV');
  expect(frame?.className).toBe(classes.frame);
  const img = part(figure, 'img');
  expect(img?.parentElement).toBe(frame);
  expect(img?.getAttribute('src')).toBe(SRC);
  expect(img?.getAttribute('alt')).toBe('A sunset');
  expect(img?.className).toBe(classes.img);
  expect(part(figure, 'status')).toBeNull();
  expect(part(figure, 'caption')).toBeNull();
});

it('carries data-* config onto the figure and its classes', async () => {
  const figure = await mount(
    `src="${SRC}" alt="x" data-size="md" data-alignment="left" data-radius="xl"`,
  );
  expect(figure.dataset['size']).toBe('md');
  expect(figure.dataset['alignment']).toBe('left');
  expect(figure.dataset['radius']).toBe('xl');
  const classes = imageClasses({ size: 'md', alignment: 'left', radius: 'xl' }, {});
  expect(figure.className).toBe(classes.root);
  expect(part(figure, 'frame')?.className).toBe(classes.frame);
  expect(part(figure, 'img')?.className).toBe(classes.img);
});

it('projects loading', async () => {
  const figure = await mount(`src="${SRC}" alt="Loading" data-status="loading" data-radius="xl"`);
  expect(figure.className).toBe(imageClasses({ status: 'loading', radius: 'xl' }, {}).root);
  expect(part(figure, 'img')?.getAttribute('aria-busy')).toBe('true');
  const status = part(figure, 'status');
  expect(status?.getAttribute('role')).toBe('status');
  expect(status?.textContent).toBe('Loading image');
  expect(status?.className).toBe(imageClasses({ status: 'loading', radius: 'xl' }, {}).status);
});

it('projects error with a custom message', async () => {
  const figure = await mount(`src="${SRC}" alt="x" data-status="error" data-error-message="Nope"`);
  const status = part(figure, 'status');
  expect(status?.getAttribute('role')).toBe('alert');
  expect(status?.textContent).toBe('Nope');
  expect(part(figure, 'img')?.hasAttribute('aria-busy')).toBe(false);
});

it('defaults to loaded: no overlay, no aria-busy', async () => {
  const figure = await mount(`src="${SRC}" alt="x"`);
  expect(part(figure, 'status')).toBeNull();
  expect(part(figure, 'img')?.hasAttribute('aria-busy')).toBe(false);
});

it('renders a caption', async () => {
  const figure = await mount(`src="${SRC}" alt="x" caption="Photo by John"`);
  const caption = part(figure, 'caption');
  expect(caption?.tagName).toBe('FIGCAPTION');
  expect(caption?.textContent).toBe('Photo by John');
  expect(caption?.className).toBe(imageClasses({}, {}).caption);
});

it('defaults alt to empty when absent', async () => {
  const figure = await mount(`src="${SRC}"`);
  expect(part(figure, 'img')?.getAttribute('alt')).toBe('');
});

it('treats unknown config values as absent', async () => {
  const figure = await mount(`src="${SRC}" data-size="huge" data-status="weird"`);
  expect(figure.className).toBe(imageClasses({}, {}).root);
  expect(part(figure, 'status')).toBeNull();
});

it('does not flip status on img error', async () => {
  const figure = await mount('src="/missing-file.jpg" alt="x"');
  const img = part(figure, 'img');
  img?.dispatchEvent(new Event('error'));
  await Promise.resolve();
  expect(part(figure, 'status')).toBeNull();
  expect(img?.hasAttribute('aria-busy')).toBe(false);
});

it('rebinds after disconnect and reconnect', async () => {
  await mount(`src="${SRC}" alt="x" data-status="loading"`);
  const host = document.querySelector('rafters-image');
  if (!(host instanceof RaftersImage)) throw new Error('no host');
  host.remove();
  document.body.appendChild(host);
  await Promise.resolve();
  const again = host.querySelector<HTMLElement>('figure[data-part="root"]');
  expect(again).not.toBeNull();
  expect(again?.querySelector('[data-part="img"]')?.getAttribute('aria-busy')).toBe('true');
});
