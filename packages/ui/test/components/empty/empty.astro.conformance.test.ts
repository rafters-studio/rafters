import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach, describe, expect, it } from 'vitest';
import Empty from '../../../src/components/empty/empty.astro';
import { assertAxeClean, partElement } from '../../harness/conformance';

afterEach(() => {
  document.body.innerHTML = '';
});

async function render(slots: Record<string, string>): Promise<HTMLElement> {
  const astroContainer = await AstroContainer.create();
  const html = await astroContainer.renderToString(Empty, { slots });
  // A lone <h3>/<p> outside a landmark trips axe's region rule, same as
  // grid.astro's conformance test -- content needs a containing landmark.
  document.body.innerHTML = `<main>${html}</main>`;
  return document.body;
}

describe('empty conformance [astro]', () => {
  it('all four parts render when all four slots are filled', async () => {
    const body = await render({
      media: '<svg></svg>',
      title: 'No results found',
      description: 'Try adjusting your search terms or filters.',
      actions: '<button type="button">Clear filters</button>',
    });
    const root = partElement(body, 'root');
    expect(root).not.toBeNull();
    expect(partElement(body, 'media')).not.toBeNull();
    const title = partElement(body, 'title');
    expect(title?.tagName.toLowerCase()).toBe('h3');
    expect(title?.textContent).toBe('No results found');
    const description = partElement(body, 'description');
    expect(description?.tagName.toLowerCase()).toBe('p');
    expect(partElement(body, 'actions')).not.toBeNull();
    await assertAxeClean(body);
  });

  it('an unfilled slot renders no element for that part -- no empty heading for axe to flag', async () => {
    const body = await render({
      title: 'All caught up!',
      description: 'No new notifications.',
    });
    expect(partElement(body, 'title')?.textContent).toBe('All caught up!');
    expect(partElement(body, 'description')).not.toBeNull();
    expect(partElement(body, 'media')).toBeNull();
    expect(partElement(body, 'actions')).toBeNull();
    await assertAxeClean(body);
  });

  it('informational-only: title with no description and no actions', async () => {
    const body = await render({ title: 'No projects yet' });
    expect(partElement(body, 'title')?.textContent).toBe('No projects yet');
    expect(partElement(body, 'description')).toBeNull();
    expect(partElement(body, 'actions')).toBeNull();
    await assertAxeClean(body);
  });

  it('consumer class merges with root via classy', async () => {
    const astroContainer = await AstroContainer.create();
    const html = await astroContainer.renderToString(Empty, {
      props: { class: 'min-h-64' },
      slots: { title: 'Nothing here' },
    });
    document.body.innerHTML = `<main>${html}</main>`;
    const root = partElement(document.body, 'root') as HTMLElement;
    expect(root.className).toContain('py-12');
    expect(root.className).toContain('min-h-64');
  });
});
