/**
 * Layout of the Astro calendar in real chromium (#2637). The astro tier runs in
 * node, which has no layout engine, so the SSR markup from the Container API is
 * handed to chromium (playwright) and measured there with the same geometry
 * assertion the React spec makes.
 */
import { chromium } from '@playwright/test';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import Calendar from '../../../src/components/calendar/calendar.astro';
import { dayLayoutCss, fullWeekGeometry, weekRowProblems, type WeekGeometry } from './layout';

describe('Astro Calendar day cell layout', () => {
  it('lays a full week row on one line, left to right', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Calendar, {
      props: { id: 'cal', today: '2026-07-20', defaultMonth: '2026-07-01' },
    });
    const dayClass = /<td[^>]*data-value[^>]*class="([^"]*)"/.exec(html)?.[1];
    if (!dayClass) throw new Error('no rendered day cell class');
    const browser = await chromium.launch();
    try {
      const page = await browser.newPage();
      await page.setContent(
        `<!doctype html><style>${dayLayoutCss(dayClass)}</style><main>${html}</main>`,
      );
      const geometry = await page.evaluate<WeekGeometry>(
        `(${fullWeekGeometry.toString()})(document)`,
      );
      expect(weekRowProblems(geometry)).toEqual([]);
    } finally {
      await browser.close();
    }
  }, 60_000);
});
