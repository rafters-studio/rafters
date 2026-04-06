import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import {
  Abbr,
  Blockquote,
  Code,
  CodeBlock,
  H1,
  H2,
  H3,
  H4,
  H5,
  H6,
  List,
  Mark,
  P,
  Small,
} from '../../src/components/ui/typography';

describe('H1 - Accessibility', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<H1>Page Title</H1>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with token overrides', async () => {
    const { container } = render(
      <H1 size="3xl" weight="light">
        Styled Heading
      </H1>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('H2 - Accessibility', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<H2>Section Title</H2>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('H3 - Accessibility', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<H3>Subsection Title</H3>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('H4 - Accessibility', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<H4>Minor Heading</H4>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('P - Accessibility', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<P>This is a paragraph of text.</P>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with links inside', async () => {
    const { container } = render(
      <P>
        Read more at <a href="#docs">documentation</a>.
      </P>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('H5 - Accessibility', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<H5>Minor Heading</H5>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('H6 - Accessibility', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<H6>Lowest Heading</H6>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('Small - Accessibility', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<Small>Fine print text</Small>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('P with muted token - Accessibility', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(
      <P size="sm" color="muted">
        Secondary information
      </P>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('Code - Accessibility', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<Code>const x = 1</Code>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations inside paragraph', async () => {
    const { container } = render(
      <P>
        Use the <Code>useState</Code> hook for local state.
      </P>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('Blockquote - Accessibility', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(
      <Blockquote>Design is not just what it looks like. Design is how it works.</Blockquote>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with citation', async () => {
    const { container } = render(
      <figure>
        <Blockquote>Design is not just what it looks like. Design is how it works.</Blockquote>
        <figcaption>
          <cite>Steve Jobs</cite>
        </figcaption>
      </figure>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('Typography - Heading hierarchy', () => {
  it('has no violations with proper heading hierarchy', async () => {
    const { container } = render(
      <article>
        <H1>Page Title</H1>
        <P size="xl" color="muted">
          Introduction paragraph.
        </P>
        <H2>Section 1</H2>
        <P>Content for section 1.</P>
        <H3>Subsection 1.1</H3>
        <P>Content for subsection 1.1.</P>
        <H2>Section 2</H2>
        <P>Content for section 2.</P>
      </article>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with all heading levels', async () => {
    const { container } = render(
      <main>
        <H1>Main Title</H1>
        <H2>Section</H2>
        <H3>Subsection</H3>
        <H4>Minor Heading</H4>
        <P>Paragraph content.</P>
      </main>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('Typography - Complete page structure', () => {
  it('has no violations in a complete page structure', async () => {
    const { container } = render(
      <main>
        <article>
          <header>
            <H1>Article Title</H1>
            <P size="xl" color="muted">
              This is an introduction to the article content.
            </P>
            <P size="sm" color="muted">
              Published: January 2025
            </P>
          </header>

          <section>
            <H2>First Section</H2>
            <P>
              This is a body paragraph with standard styling. It includes <Code>inline code</Code>{' '}
              for technical terms.
            </P>

            <H3>Subsection</H3>
            <P>More content here with detailed information.</P>

            <Blockquote>A quote that emphasizes an important point from the article.</Blockquote>
          </section>

          <section>
            <H2>Second Section</H2>
            <P size="lg" weight="semibold">
              An emphasized statement
            </P>
            <P>Regular paragraph following the emphasis.</P>
            <Small>A note in smaller text.</Small>
          </section>

          <footer>
            <P size="sm" color="muted">
              Last updated: January 2025
            </P>
          </footer>
        </article>
      </main>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('Typography - With interactive elements', () => {
  it('has no violations with links and buttons', async () => {
    const { container } = render(
      <article>
        <H1>Interactive Content</H1>
        <P>
          Visit our <a href="#docs">documentation</a> for more information.
        </P>
        <P>
          <button type="button">Click here</button> to learn more.
        </P>
      </article>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('Typography - With ARIA attributes', () => {
  it('has no violations with aria-labelledby', async () => {
    const { container } = render(
      <section aria-labelledby="section-title">
        <H2 id="section-title">Section with ARIA</H2>
        <P>Content describing the section.</P>
      </section>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with aria-describedby', async () => {
    const { container } = render(
      <div>
        <H3 id="feature-title">Feature Name</H3>
        <P id="feature-desc">Description of the feature.</P>
        <button type="button" aria-labelledby="feature-title" aria-describedby="feature-desc">
          Enable Feature
        </button>
      </div>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

// ============================================================================
// List - Accessibility (R-200c)
// ============================================================================

describe('List - Accessibility', () => {
  it('has no violations for unordered list', async () => {
    const { container } = render(
      <List
        items={[
          { id: '1', content: 'First item' },
          { id: '2', content: 'Second item' },
          { id: '3', content: 'Third item' },
        ]}
      />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations for ordered list', async () => {
    const { container } = render(
      <List
        ordered
        items={[
          { id: '1', content: 'Step one' },
          { id: '2', content: 'Step two' },
          { id: '3', content: 'Step three' },
        ]}
      />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with nested items', async () => {
    const { container } = render(
      <List
        items={[
          { id: '1', content: 'Parent item' },
          { id: '2', content: 'Nested item', indent: 1 },
          { id: '3', content: 'Deeply nested', indent: 2 },
        ]}
      />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with InlineContent formatting', async () => {
    const { container } = render(
      <List
        items={[
          {
            id: '1',
            content: [{ text: 'Bold ', marks: ['bold'] }, { text: 'and normal text' }],
          },
          {
            id: '2',
            content: [{ text: 'Link text', marks: ['link'], href: 'https://example.com' }],
          },
        ]}
      />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations in article context', async () => {
    const { container } = render(
      <article>
        <H2>Requirements</H2>
        <List
          items={[
            { id: '1', content: 'Node.js 18+' },
            { id: '2', content: 'pnpm 8+' },
          ]}
        />
      </article>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

// ============================================================================
// CodeBlock - Accessibility (R-200e)
// ============================================================================

describe('CodeBlock - Accessibility', () => {
  it('has no violations for basic code block', async () => {
    const { container } = render(<CodeBlock>const x = 1;</CodeBlock>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with language attribute', async () => {
    const { container } = render(
      <CodeBlock language="typescript">{'const greeting: string = "Hello";'}</CodeBlock>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with line numbers', async () => {
    const { container } = render(
      <CodeBlock showLineNumbers>{'const a = 1;\nconst b = 2;\nconst c = a + b;'}</CodeBlock>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with multi-line code', async () => {
    const code = `function greet(name) {
  return \`Hello, \${name}!\`;
}

greet('World');`;
    const { container } = render(<CodeBlock language="javascript">{code}</CodeBlock>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations in article context', async () => {
    const { container } = render(
      <article>
        <H2>Example Code</H2>
        <P>Here is an example:</P>
        <CodeBlock language="python">{'print("Hello, World!")'}</CodeBlock>
      </article>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

// ============================================================================
// Mark - Accessibility
// ============================================================================

describe('Mark - Accessibility', () => {
  it('has no violations for basic mark', async () => {
    const { container } = render(<Mark>Highlighted text</Mark>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations inside paragraph', async () => {
    const { container } = render(
      <P>
        The <Mark>important</Mark> part of this sentence.
      </P>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations for search result highlighting', async () => {
    const { container } = render(
      <article>
        <H2>Search Results</H2>
        <P>
          Found 3 matches for <Mark>keyword</Mark> in this document.
        </P>
        <P>
          The <Mark>keyword</Mark> appears multiple times with <Mark>keyword</Mark> variations.
        </P>
      </article>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

// ============================================================================
// Abbr - Accessibility
// ============================================================================

describe('Abbr - Accessibility', () => {
  it('has no violations for basic abbreviation', async () => {
    const { container } = render(<Abbr title="Application Programming Interface">API</Abbr>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations inside paragraph', async () => {
    const { container } = render(
      <P>
        The <Abbr title="Application Programming Interface">API</Abbr> provides access to all
        features.
      </P>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with multiple abbreviations', async () => {
    const { container } = render(
      <P>
        Use the <Abbr title="Command Line Interface">CLI</Abbr> to interact with the{' '}
        <Abbr title="Application Programming Interface">API</Abbr> via{' '}
        <Abbr title="HyperText Transfer Protocol">HTTP</Abbr>.
      </P>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations in technical documentation', async () => {
    const { container } = render(
      <article>
        <H2>Technical Overview</H2>
        <P>
          The <Abbr title="Single Page Application">SPA</Abbr> communicates with the backend via{' '}
          <Abbr title="Representational State Transfer">REST</Abbr>{' '}
          <Abbr title="Application Programming Interface">API</Abbr> calls using{' '}
          <Abbr title="JavaScript Object Notation">JSON</Abbr> format.
        </P>
      </article>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
