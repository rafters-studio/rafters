import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { runAxe } from '../../a11y/run-axe';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  type PaginationLinkSize,
} from '../../../src/components/pagination/pagination';

interface SceneProps {
  /** The current page of a ten-page range. */
  current: number;
  /** Render buttons with onClick instead of anchors with hrefs. */
  buttons?: boolean;
  size?: PaginationLinkSize;
}

const LAST = 10;

/** Page 1, the current page's neighbours, and the last page, with an
 *  ellipsis wherever the range is truncated. */
function pages(current: number): Array<number | 'gap'> {
  const shown = new Set<number>([1, LAST]);
  for (let page = current - 1; page <= current + 1; page += 1) {
    if (page >= 1 && page <= LAST) shown.add(page);
  }
  const out: Array<number | 'gap'> = [];
  let previous = 0;
  for (const page of [...shown].sort((a, b) => a - b)) {
    if (page - previous > 1) out.push('gap');
    out.push(page);
    previous = page;
  }
  return out;
}

function Scene({ current, buttons = false, size }: SceneProps) {
  const noop = () => {};
  const link = (page: number) => (buttons ? { onClick: noop } : { href: `/page/${page}` });
  // Spread the size only when given: the link props are exact-optional.
  const sized = size === undefined ? {} : { size };
  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            {...link(Math.max(1, current - 1))}
            disabled={current === 1}
            {...sized}
          />
        </PaginationItem>
        {pages(current).map((page, index) =>
          page === 'gap' ? (
            <PaginationItem key={`gap-${index}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={page}>
              <PaginationLink {...link(page)} isActive={page === current} {...sized}>
                {page}
              </PaginationLink>
            </PaginationItem>
          ),
        )}
        <PaginationItem>
          <PaginationNext
            {...link(Math.min(LAST, current + 1))}
            disabled={current === LAST}
            {...sized}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

const scenes: ReadonlyArray<[string, SceneProps]> = [
  ['first page, previous disabled', { current: 1 }],
  ['middle page, both boundaries live', { current: 5 }],
  ['last page, next disabled', { current: LAST }],
  ['button-style at the first page', { current: 1, buttons: true }],
  ['button-style at a middle page', { current: 5, buttons: true }],
  ['size=sm', { current: 5, size: 'sm' }],
  ['size=lg', { current: 5, size: 'lg' }],
];

for (const [name, props] of scenes) {
  test(`pagination ${name}`, async ({ task }) => {
    const { container } = await render(<Scene {...props} />);
    const results = await runAxe(container);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
