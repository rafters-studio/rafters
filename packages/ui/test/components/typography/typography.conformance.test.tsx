import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  Blockquote,
  Code,
  CodeBlock,
  H1,
  H5,
  Li,
  Small,
  Typography,
  Ul,
  P,
} from '../../../src/components/typography/typography';
import { assertAxeClean } from '../../harness/conformance';

const body = () => document.body;

afterEach(() => {
  cleanup();
});

describe('typography conformance [react]', () => {
  it('the semantic element IS the contract: each variant renders its tag with data-part root', () => {
    render(
      <main>
        <H1>Title</H1>
        <P>Body prose.</P>
        <Blockquote>Quoted.</Blockquote>
        <P>
          Inline <Code>useState</Code> and <Small>small print</Small>.
        </P>
        <Ul>
          <Li>one</Li>
          <Li>two</Li>
        </Ul>
      </main>,
    );
    const h1 = body().querySelector('h1');
    expect(h1).not.toBeNull();
    expect(h1?.getAttribute('data-part')).toBe('root');
    expect(h1?.className).toContain('text-4xl');
    expect(body().querySelector('blockquote')).not.toBeNull();
    expect(body().querySelector('code')?.className).toContain('font-mono');
    expect(body().querySelector('small')).not.toBeNull();
    expect(body().querySelectorAll('ul > li').length).toBe(2);
  });

  it('codeblock nests a code element inside the pre root', () => {
    render(
      <main>
        <CodeBlock>const x = 1;</CodeBlock>
      </main>,
    );
    const pre = body().querySelector('pre');
    expect(pre?.getAttribute('data-part')).toBe('root');
    expect(pre?.querySelector('code')?.textContent).toBe('const x = 1;');
  });

  it('h5/h6 render their own tag but borrow h4 scale', () => {
    render(
      <main>
        <H5>Sub</H5>
      </main>,
    );
    const h5 = body().querySelector('h5');
    expect(h5).not.toBeNull();
    expect(h5?.className).toContain('text-xl');
  });

  it('token props override the variant default at the tag', () => {
    render(
      <main>
        <P size="xl" data-testid="lead">
          intro
        </P>
      </main>,
    );
    const p = body().querySelector('[data-testid="lead"]') as HTMLElement;
    expect(p.className).toContain('text-xl');
    // P's leading-7 default survives -- size is a different dimension.
    expect(p.className).toContain('leading-7');
  });

  it('the generic wrapper derives the variant from as, variant overrides it', () => {
    render(
      <main>
        <Typography as="h2" data-testid="a">
          heading
        </Typography>
        <Typography as="span" data-testid="b">
          body
        </Typography>
        <Typography as="h5" data-testid="c">
          borrowed
        </Typography>
        <Typography as="p" variant="lead" data-testid="d">
          override
        </Typography>
      </main>,
    );
    const a = body().querySelector('[data-testid="a"]') as HTMLElement;
    const b = body().querySelector('[data-testid="b"]') as HTMLElement;
    const c = body().querySelector('[data-testid="c"]') as HTMLElement;
    const d = body().querySelector('[data-testid="d"]') as HTMLElement;
    expect(a.tagName.toLowerCase()).toBe('h2');
    expect(a.className).toContain('text-3xl');
    expect(b.tagName.toLowerCase()).toBe('span');
    expect(b.className).toContain('leading-7');
    expect(c.tagName.toLowerCase()).toBe('h5');
    expect(c.className).toContain('text-xl');
    expect(d.tagName.toLowerCase()).toBe('p');
    expect(d.className).toContain('text-xl');
  });

  it('consumer className merges via classy', () => {
    render(
      <main>
        <P className="max-w-prose">x</P>
      </main>,
    );
    const p = body().querySelector('p') as HTMLElement;
    expect(p.className).toContain('leading-7');
    expect(p.className).toContain('max-w-prose');
  });

  it('a heading + prose set is axe-clean inside a landmark', async () => {
    render(
      <main>
        <H1>Doc title</H1>
        <P>First paragraph.</P>
      </main>,
    );
    await assertAxeClean(body());
  });
});
