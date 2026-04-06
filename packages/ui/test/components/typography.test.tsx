import { fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
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
  htmlToInlineContent,
  inlineContentToHtml,
  List,
  Mark,
  P,
  Small,
  typographyClasses,
} from '../../src/components/ui/typography';
import type { InlineContent } from '../../src/primitives/types';

describe('H1', () => {
  it('renders as h1 by default', () => {
    render(<H1 data-testid="h1">Heading 1</H1>);
    const heading = screen.getByTestId('h1');
    expect(heading.tagName).toBe('H1');
  });

  it('applies correct styles', () => {
    const { container } = render(<H1>Heading</H1>);
    const h1 = container.firstChild;
    expect(h1).toHaveClass('text-4xl');
    expect(h1).toHaveClass('font-bold');
    expect(h1).toHaveClass('tracking-tight');
    expect(h1).toHaveClass('scroll-m-20');
    expect(h1).toHaveClass('@lg:text-5xl');
    expect(h1).toHaveClass('text-foreground');
  });

  it('merges custom className', () => {
    const { container } = render(<H1 className="custom-class">Heading</H1>);
    expect(container.firstChild).toHaveClass('custom-class');
    expect(container.firstChild).toHaveClass('text-4xl');
  });

  it('forwards ref', () => {
    const ref = createRef<HTMLHeadingElement>();
    render(<H1 ref={ref}>Heading</H1>);
    expect(ref.current).toBeInstanceOf(HTMLHeadingElement);
  });

  it('passes through HTML attributes', () => {
    render(
      <H1 data-testid="h1" id="main-title">
        Title
      </H1>,
    );
    expect(screen.getByTestId('h1')).toHaveAttribute('id', 'main-title');
  });
});

describe('H2', () => {
  it('renders as h2 by default', () => {
    render(<H2 data-testid="h2">Heading 2</H2>);
    const heading = screen.getByTestId('h2');
    expect(heading.tagName).toBe('H2');
  });

  it('applies correct styles', () => {
    const { container } = render(<H2>Heading</H2>);
    const h2 = container.firstChild;
    expect(h2).toHaveClass('text-3xl');
    expect(h2).toHaveClass('font-semibold');
    expect(h2).toHaveClass('tracking-tight');
    expect(h2).toHaveClass('scroll-m-20');
    expect(h2).toHaveClass('text-foreground');
  });

  it('merges custom className', () => {
    const { container } = render(<H2 className="custom-class">Heading</H2>);
    expect(container.firstChild).toHaveClass('custom-class');
    expect(container.firstChild).toHaveClass('text-3xl');
  });

  it('forwards ref', () => {
    const ref = createRef<HTMLHeadingElement>();
    render(<H2 ref={ref}>Heading</H2>);
    expect(ref.current).toBeInstanceOf(HTMLHeadingElement);
  });
});

describe('H3', () => {
  it('renders as h3 by default', () => {
    render(<H3 data-testid="h3">Heading 3</H3>);
    const heading = screen.getByTestId('h3');
    expect(heading.tagName).toBe('H3');
  });

  it('applies correct styles', () => {
    const { container } = render(<H3>Heading</H3>);
    const h3 = container.firstChild;
    expect(h3).toHaveClass('text-2xl');
    expect(h3).toHaveClass('font-semibold');
    expect(h3).toHaveClass('tracking-tight');
    expect(h3).toHaveClass('scroll-m-20');
    expect(h3).toHaveClass('text-foreground');
  });

  it('merges custom className', () => {
    const { container } = render(<H3 className="custom-class">Heading</H3>);
    expect(container.firstChild).toHaveClass('custom-class');
    expect(container.firstChild).toHaveClass('text-2xl');
  });

  it('forwards ref', () => {
    const ref = createRef<HTMLHeadingElement>();
    render(<H3 ref={ref}>Heading</H3>);
    expect(ref.current).toBeInstanceOf(HTMLHeadingElement);
  });
});

describe('H4', () => {
  it('renders as h4 by default', () => {
    render(<H4 data-testid="h4">Heading 4</H4>);
    const heading = screen.getByTestId('h4');
    expect(heading.tagName).toBe('H4');
  });

  it('applies correct styles', () => {
    const { container } = render(<H4>Heading</H4>);
    const h4 = container.firstChild;
    expect(h4).toHaveClass('text-xl');
    expect(h4).toHaveClass('font-semibold');
    expect(h4).toHaveClass('tracking-tight');
    expect(h4).toHaveClass('scroll-m-20');
    expect(h4).toHaveClass('text-foreground');
  });

  it('merges custom className', () => {
    const { container } = render(<H4 className="custom-class">Heading</H4>);
    expect(container.firstChild).toHaveClass('custom-class');
    expect(container.firstChild).toHaveClass('text-xl');
  });

  it('forwards ref', () => {
    const ref = createRef<HTMLHeadingElement>();
    render(<H4 ref={ref}>Heading</H4>);
    expect(ref.current).toBeInstanceOf(HTMLHeadingElement);
  });
});

describe('H5', () => {
  it('renders as h5', () => {
    render(<H5 data-testid="h5">Heading 5</H5>);
    const heading = screen.getByTestId('h5');
    expect(heading.tagName).toBe('H5');
  });

  it('applies h4 base styles', () => {
    const { container } = render(<H5>Heading</H5>);
    const h5 = container.firstChild;
    expect(h5).toHaveClass('text-xl');
  });

  it('merges custom className', () => {
    const { container } = render(<H5 className="custom-class">Heading</H5>);
    expect(container.firstChild).toHaveClass('custom-class');
    expect(container.firstChild).toHaveClass('text-xl');
  });

  it('forwards ref', () => {
    const ref = createRef<HTMLHeadingElement>();
    render(<H5 ref={ref}>Heading</H5>);
    expect(ref.current).toBeInstanceOf(HTMLHeadingElement);
  });

  it('applies token prop overrides', () => {
    const { container } = render(
      <H5 size="lg" weight="bold" color="muted">
        Heading
      </H5>,
    );
    const h5 = container.firstChild;
    expect(h5).toHaveClass('text-lg');
    expect(h5).toHaveClass('font-bold');
    expect(h5).toHaveClass('text-muted');
  });
});

describe('H6', () => {
  it('renders as h6', () => {
    render(<H6 data-testid="h6">Heading 6</H6>);
    const heading = screen.getByTestId('h6');
    expect(heading.tagName).toBe('H6');
  });

  it('applies h4 base styles', () => {
    const { container } = render(<H6>Heading</H6>);
    const h6 = container.firstChild;
    expect(h6).toHaveClass('text-xl');
  });

  it('merges custom className', () => {
    const { container } = render(<H6 className="custom-class">Heading</H6>);
    expect(container.firstChild).toHaveClass('custom-class');
    expect(container.firstChild).toHaveClass('text-xl');
  });

  it('forwards ref', () => {
    const ref = createRef<HTMLHeadingElement>();
    render(<H6 ref={ref}>Heading</H6>);
    expect(ref.current).toBeInstanceOf(HTMLHeadingElement);
  });

  it('applies token prop overrides', () => {
    const { container } = render(
      <H6 size="sm" tracking="wide">
        Heading
      </H6>,
    );
    const h6 = container.firstChild;
    expect(h6).toHaveClass('text-sm');
    expect(h6).toHaveClass('tracking-wide');
  });
});

describe('P', () => {
  it('renders as p by default', () => {
    render(<P data-testid="p">Paragraph text</P>);
    const para = screen.getByTestId('p');
    expect(para.tagName).toBe('P');
  });

  it('applies correct styles', () => {
    const { container } = render(<P>Paragraph</P>);
    const p = container.firstChild;
    expect(p).toHaveClass('leading-7');
    expect(p).toHaveClass('text-foreground');
  });

  it('merges custom className', () => {
    const { container } = render(<P className="custom-class">Paragraph</P>);
    expect(container.firstChild).toHaveClass('custom-class');
    expect(container.firstChild).toHaveClass('leading-7');
  });

  it('forwards ref', () => {
    const ref = createRef<HTMLParagraphElement>();
    render(<P ref={ref}>Paragraph</P>);
    expect(ref.current).toBeInstanceOf(HTMLParagraphElement);
  });
});

describe('Small', () => {
  it('renders as small by default', () => {
    render(<Small data-testid="small">Small text</Small>);
    const small = screen.getByTestId('small');
    expect(small.tagName).toBe('SMALL');
  });

  it('applies correct styles', () => {
    const { container } = render(<Small>Small</Small>);
    const small = container.firstChild;
    expect(small).toHaveClass('text-sm');
    expect(small).toHaveClass('font-medium');
    expect(small).toHaveClass('leading-none');
    expect(small).toHaveClass('text-foreground');
  });

  it('merges custom className', () => {
    const { container } = render(<Small className="custom-class">Small</Small>);
    expect(container.firstChild).toHaveClass('custom-class');
    expect(container.firstChild).toHaveClass('text-sm');
  });

  it('forwards ref', () => {
    const ref = createRef<HTMLElement>();
    render(<Small ref={ref}>Small</Small>);
    expect(ref.current).toBeInstanceOf(HTMLElement);
  });
});

describe('Code', () => {
  it('renders as code by default', () => {
    render(<Code data-testid="code">const x = 1</Code>);
    const code = screen.getByTestId('code');
    expect(code.tagName).toBe('CODE');
  });

  it('applies correct styles', () => {
    const { container } = render(<Code>code</Code>);
    const code = container.firstChild;
    expect(code).toHaveClass('rounded');
    expect(code).toHaveClass('bg-muted');
    expect(code).toHaveClass('px-1');
    expect(code).toHaveClass('py-0.5');
    expect(code).toHaveClass('font-mono');
    expect(code).toHaveClass('text-sm');
    expect(code).toHaveClass('text-foreground');
  });

  it('merges custom className', () => {
    const { container } = render(<Code className="custom-class">code</Code>);
    expect(container.firstChild).toHaveClass('custom-class');
    expect(container.firstChild).toHaveClass('font-mono');
  });

  it('forwards ref', () => {
    const ref = createRef<HTMLElement>();
    render(<Code ref={ref}>code</Code>);
    expect(ref.current).toBeInstanceOf(HTMLElement);
  });
});

describe('Blockquote', () => {
  it('renders as blockquote by default', () => {
    render(<Blockquote data-testid="quote">Quote text</Blockquote>);
    const quote = screen.getByTestId('quote');
    expect(quote.tagName).toBe('BLOCKQUOTE');
  });

  it('applies correct styles', () => {
    const { container } = render(<Blockquote>Quote</Blockquote>);
    const quote = container.firstChild;
    expect(quote).toHaveClass('mt-6');
    expect(quote).toHaveClass('border-l-2');
    expect(quote).toHaveClass('border-border');
    expect(quote).toHaveClass('pl-6');
    expect(quote).toHaveClass('italic');
    expect(quote).toHaveClass('text-foreground');
  });

  it('merges custom className', () => {
    const { container } = render(<Blockquote className="custom-class">Quote</Blockquote>);
    expect(container.firstChild).toHaveClass('custom-class');
    expect(container.firstChild).toHaveClass('italic');
  });

  it('forwards ref', () => {
    const ref = createRef<HTMLQuoteElement>();
    render(<Blockquote ref={ref}>Quote</Blockquote>);
    expect(ref.current).toBeInstanceOf(HTMLQuoteElement);
  });
});

describe('typographyClasses', () => {
  it('exports all typography class strings', () => {
    expect(typographyClasses).toHaveProperty('h1');
    expect(typographyClasses).toHaveProperty('h2');
    expect(typographyClasses).toHaveProperty('h3');
    expect(typographyClasses).toHaveProperty('h4');
    expect(typographyClasses).toHaveProperty('p');
    expect(typographyClasses).toHaveProperty('lead');
    expect(typographyClasses).toHaveProperty('large');
    expect(typographyClasses).toHaveProperty('small');
    expect(typographyClasses).toHaveProperty('muted');
    expect(typographyClasses).toHaveProperty('code');
    expect(typographyClasses).toHaveProperty('blockquote');
  });

  it('h1 class includes expected values', () => {
    expect(typographyClasses.h1).toContain('text-4xl');
    expect(typographyClasses.h1).toContain('font-bold');
  });

  it('code class includes font-mono', () => {
    expect(typographyClasses.code).toContain('font-mono');
  });
});

describe('TypographyTokenProps', () => {
  it('H1 applies size override', () => {
    const { container } = render(<H1 size="3xl">Title</H1>);
    expect(container.firstChild).toHaveClass('text-3xl');
  });

  it('H1 applies weight override', () => {
    const { container } = render(<H1 weight="light">Title</H1>);
    expect(container.firstChild).toHaveClass('font-light');
  });

  it('H1 applies color override as direct text class', () => {
    const { container } = render(<H1 color="muted">Title</H1>);
    expect(container.firstChild).toHaveClass('text-muted');
  });

  it('H1 applies color override for direct foreground values', () => {
    const { container } = render(<H1 color="foreground">Title</H1>);
    expect(container.firstChild).toHaveClass('text-foreground');
  });

  it('H1 applies color override for already-suffixed values', () => {
    const { container } = render(<H1 color="accent-foreground">Title</H1>);
    expect(container.firstChild).toHaveClass('text-accent-foreground');
  });

  it('H1 applies line height override', () => {
    const { container } = render(<H1 line="relaxed">Title</H1>);
    expect(container.firstChild).toHaveClass('leading-relaxed');
  });

  it('H1 applies tracking override', () => {
    const { container } = render(<H1 tracking="tight">Title</H1>);
    expect(container.firstChild).toHaveClass('tracking-tight');
  });

  it('H1 applies family override', () => {
    const { container } = render(<H1 family="code">Title</H1>);
    expect(container.firstChild).toHaveClass('font-code');
  });

  it('P applies multiple token overrides', () => {
    const { container } = render(
      <P size="xl" color="muted" line="loose">
        Lead text
      </P>,
    );
    const p = container.firstChild;
    expect(p).toHaveClass('text-xl');
    expect(p).toHaveClass('text-muted');
    expect(p).toHaveClass('leading-loose');
  });

  it('Blockquote applies token overrides', () => {
    const { container } = render(<Blockquote size="lg">Quote</Blockquote>);
    expect(container.firstChild).toHaveClass('text-lg');
  });

  it('Code applies token overrides', () => {
    const { container } = render(<Code size="xs">snippet</Code>);
    expect(container.firstChild).toHaveClass('text-xs');
  });

  it('Small applies token overrides', () => {
    const { container } = render(<Small weight="bold">Fine print</Small>);
    expect(container.firstChild).toHaveClass('font-bold');
  });

  it('Mark applies token overrides', () => {
    const { container } = render(<Mark color="accent">highlighted</Mark>);
    expect(container.firstChild).toHaveClass('text-accent-foreground');
  });

  it('token overrides appear after base classes and before className', () => {
    const { container } = render(
      <H1 size="xl" className="extra">
        Title
      </H1>,
    );
    const el = container.firstChild as HTMLElement;
    expect(el).toHaveClass('text-4xl');
    expect(el).toHaveClass('text-xl');
    expect(el).toHaveClass('extra');
  });
});

describe('Typography composition', () => {
  it('renders a complete page structure', () => {
    render(
      <article>
        <H1 data-testid="h1">Page Title</H1>
        <P size="xl" color="muted" data-testid="lead">
          Introduction paragraph.
        </P>
        <H2 data-testid="h2">Section Title</H2>
        <P data-testid="p">Body paragraph with standard styling.</P>
        <H3 data-testid="h3">Subsection</H3>
        <P>
          Use the <Code data-testid="code">useState</Code> hook.
        </P>
        <Blockquote data-testid="quote">Design is how it works.</Blockquote>
        <P size="sm" color="muted" data-testid="muted">
          Last updated: Jan 2025
        </P>
      </article>,
    );

    expect(screen.getByTestId('h1')).toHaveTextContent('Page Title');
    expect(screen.getByTestId('lead')).toHaveTextContent('Introduction paragraph.');
    expect(screen.getByTestId('h2')).toHaveTextContent('Section Title');
    expect(screen.getByTestId('p')).toHaveTextContent('Body paragraph with standard styling.');
    expect(screen.getByTestId('h3')).toHaveTextContent('Subsection');
    expect(screen.getByTestId('code')).toHaveTextContent('useState');
    expect(screen.getByTestId('quote')).toHaveTextContent('Design is how it works.');
    expect(screen.getByTestId('muted')).toHaveTextContent('Last updated: Jan 2025');
  });
});

// ============================================================================
// R-200a: Editable Heading Tests
// ============================================================================

describe('Editable Heading (R-200a)', () => {
  describe('H1 editable mode', () => {
    it('should enable contenteditable when editable is true', () => {
      render(
        <H1 editable data-testid="h1">
          Editable Title
        </H1>,
      );
      const heading = screen.getByTestId('h1');
      expect(heading).toHaveAttribute('contenteditable', 'true');
    });

    it('should not be contenteditable when editable is false', () => {
      render(<H1 data-testid="h1">Static Title</H1>);
      const heading = screen.getByTestId('h1');
      expect(heading).not.toHaveAttribute('contenteditable');
    });

    it('should call onChange on content change', () => {
      const onChange = vi.fn();
      render(
        <H1 editable onChange={onChange} data-testid="h1">
          Title
        </H1>,
      );
      const heading = screen.getByTestId('h1');

      // Simulate typing
      heading.textContent = 'New Title';
      fireEvent.input(heading);

      expect(onChange).toHaveBeenCalledWith('New Title');
    });

    it('should show placeholder via data attribute when empty', () => {
      render(
        <H1 editable placeholder="Enter title..." data-testid="h1">
          {''}
        </H1>,
      );
      const heading = screen.getByTestId('h1');
      expect(heading).toHaveAttribute('data-placeholder', 'Enter title...');
      expect(heading).toHaveAttribute('aria-placeholder', 'Enter title...');
    });

    it('should call onEnter when Enter key is pressed', () => {
      const onEnter = vi.fn();
      render(
        <H1 editable onEnter={onEnter} data-testid="h1">
          Title
        </H1>,
      );
      const heading = screen.getByTestId('h1');

      fireEvent.keyDown(heading, { key: 'Enter' });

      expect(onEnter).toHaveBeenCalled();
    });

    it('should prevent default on Enter key', () => {
      const onEnter = vi.fn();
      render(
        <H1 editable onEnter={onEnter} data-testid="h1">
          Title
        </H1>,
      );
      const heading = screen.getByTestId('h1');

      const event = fireEvent.keyDown(heading, { key: 'Enter' });

      // The event should be prevented
      expect(event).toBe(false);
    });

    it('should call onFocus when focused', () => {
      const onFocus = vi.fn();
      render(
        <H1 editable onFocus={onFocus} data-testid="h1">
          Title
        </H1>,
      );
      const heading = screen.getByTestId('h1');

      fireEvent.focus(heading);

      expect(onFocus).toHaveBeenCalled();
    });

    it('should call onBlur when blurred', () => {
      const onBlur = vi.fn();
      render(
        <H1 editable onBlur={onBlur} data-testid="h1">
          Title
        </H1>,
      );
      const heading = screen.getByTestId('h1');

      fireEvent.blur(heading);

      expect(onBlur).toHaveBeenCalled();
    });

    it('should add editable styling classes when editable', () => {
      render(
        <H1 editable data-testid="h1">
          Title
        </H1>,
      );
      const heading = screen.getByTestId('h1');
      expect(heading).toHaveClass('outline-none');
    });

    it('should set data-editable attribute when editable', () => {
      render(
        <H1 editable data-testid="h1">
          Title
        </H1>,
      );
      const heading = screen.getByTestId('h1');
      expect(heading).toHaveAttribute('data-editable', 'true');
    });

    it('should forward ref correctly in editable mode', () => {
      const ref = createRef<HTMLHeadingElement>();
      render(
        <H1 ref={ref} editable>
          Title
        </H1>,
      );
      expect(ref.current).toBeInstanceOf(HTMLHeadingElement);
      expect(ref.current).toHaveAttribute('contenteditable', 'true');
    });
  });

  describe('H2 editable mode', () => {
    it('should enable contenteditable when editable is true', () => {
      render(
        <H2 editable data-testid="h2">
          Editable Section
        </H2>,
      );
      const heading = screen.getByTestId('h2');
      expect(heading).toHaveAttribute('contenteditable', 'true');
    });

    it('should call onChange on content change', () => {
      const onChange = vi.fn();
      render(
        <H2 editable onChange={onChange} data-testid="h2">
          Section
        </H2>,
      );
      const heading = screen.getByTestId('h2');

      heading.textContent = 'New Section';
      fireEvent.input(heading);

      expect(onChange).toHaveBeenCalledWith('New Section');
    });
  });

  describe('H3 editable mode', () => {
    it('should enable contenteditable when editable is true', () => {
      render(
        <H3 editable data-testid="h3">
          Editable Subsection
        </H3>,
      );
      const heading = screen.getByTestId('h3');
      expect(heading).toHaveAttribute('contenteditable', 'true');
    });

    it('should call onChange on content change', () => {
      const onChange = vi.fn();
      render(
        <H3 editable onChange={onChange} data-testid="h3">
          Subsection
        </H3>,
      );
      const heading = screen.getByTestId('h3');

      heading.textContent = 'New Subsection';
      fireEvent.input(heading);

      expect(onChange).toHaveBeenCalledWith('New Subsection');
    });
  });

  describe('H4 editable mode', () => {
    it('should enable contenteditable when editable is true', () => {
      render(
        <H4 editable data-testid="h4">
          Editable Minor Heading
        </H4>,
      );
      const heading = screen.getByTestId('h4');
      expect(heading).toHaveAttribute('contenteditable', 'true');
    });

    it('should call onChange on content change', () => {
      const onChange = vi.fn();
      render(
        <H4 editable onChange={onChange} data-testid="h4">
          Minor Heading
        </H4>,
      );
      const heading = screen.getByTestId('h4');

      heading.textContent = 'New Minor Heading';
      fireEvent.input(heading);

      expect(onChange).toHaveBeenCalledWith('New Minor Heading');
    });
  });

  describe('Backward compatibility', () => {
    it('H1 works without editable props', () => {
      render(<H1 data-testid="h1">Static H1</H1>);
      const heading = screen.getByTestId('h1');
      expect(heading).not.toHaveAttribute('contenteditable');
      expect(heading).not.toHaveAttribute('data-editable');
      expect(heading).toHaveTextContent('Static H1');
    });

    it('H2 works without editable props', () => {
      render(<H2 data-testid="h2">Static H2</H2>);
      const heading = screen.getByTestId('h2');
      expect(heading).not.toHaveAttribute('contenteditable');
    });

    it('H3 works without editable props', () => {
      render(<H3 data-testid="h3">Static H3</H3>);
      const heading = screen.getByTestId('h3');
      expect(heading).not.toHaveAttribute('contenteditable');
    });

    it('H4 works without editable props', () => {
      render(<H4 data-testid="h4">Static H4</H4>);
      const heading = screen.getByTestId('h4');
      expect(heading).not.toHaveAttribute('contenteditable');
    });
  });
});

// ============================================================================
// R-200b: Editable Paragraph Tests
// ============================================================================

describe('Editable Paragraph (R-200b)', () => {
  describe('P editable mode', () => {
    it('should enable contenteditable when editable is true', () => {
      render(
        <P editable data-testid="p">
          Editable paragraph content
        </P>,
      );
      const paragraph = screen.getByTestId('p');
      expect(paragraph).toHaveAttribute('contenteditable', 'true');
    });

    it('should not enable contenteditable when editable is false', () => {
      render(<P data-testid="p">Static paragraph content</P>);
      const paragraph = screen.getByTestId('p');
      expect(paragraph).not.toHaveAttribute('contenteditable');
    });

    it('should add data-editable attribute when editable', () => {
      render(
        <P editable data-testid="p">
          Content
        </P>,
      );
      const paragraph = screen.getByTestId('p');
      expect(paragraph).toHaveAttribute('data-editable', 'true');
    });

    it('should add focus styling classes when editable', () => {
      render(
        <P editable data-testid="p">
          Content
        </P>,
      );
      const paragraph = screen.getByTestId('p');
      expect(paragraph.className).toContain('focus:ring-2');
    });

    it('should call onChange with InlineContent[] on content change', () => {
      const onChange = vi.fn();
      render(
        <P editable onChange={onChange} data-testid="p">
          Initial content
        </P>,
      );
      const paragraph = screen.getByTestId('p');

      // Simulate typing by setting textContent and triggering input
      paragraph.textContent = 'New content';
      fireEvent.input(paragraph);

      expect(onChange).toHaveBeenCalled();
      const content = onChange.mock.calls[0][0] as InlineContent[];
      expect(content).toHaveLength(1);
      expect(content[0].text).toBe('New content');
    });

    it('should call onFocus when paragraph receives focus', () => {
      const onFocus = vi.fn();
      render(
        <P editable onFocus={onFocus} data-testid="p">
          Content
        </P>,
      );
      const paragraph = screen.getByTestId('p');

      fireEvent.focus(paragraph);

      expect(onFocus).toHaveBeenCalledTimes(1);
    });

    it('should call onBlur when paragraph loses focus', () => {
      const onBlur = vi.fn();
      render(
        <P editable onBlur={onBlur} data-testid="p">
          Content
        </P>,
      );
      const paragraph = screen.getByTestId('p');

      fireEvent.blur(paragraph);

      expect(onBlur).toHaveBeenCalledTimes(1);
    });

    it('should set placeholder attributes when provided', () => {
      render(
        <P editable placeholder="Type something..." data-testid="p">
          {null}
        </P>,
      );
      const paragraph = screen.getByTestId('p');
      expect(paragraph).toHaveAttribute('data-placeholder', 'Type something...');
      expect(paragraph).toHaveAttribute('aria-placeholder', 'Type something...');
    });

    it('should call onEnter when Enter is pressed', () => {
      const onEnter = vi.fn();
      render(
        <P editable onEnter={onEnter} data-testid="p">
          Content
        </P>,
      );
      const paragraph = screen.getByTestId('p');

      fireEvent.keyDown(paragraph, { key: 'Enter' });

      expect(onEnter).toHaveBeenCalledTimes(1);
    });

    it('should not call onEnter when Shift+Enter is pressed', () => {
      const onEnter = vi.fn();
      render(
        <P editable onEnter={onEnter} data-testid="p">
          Content
        </P>,
      );
      const paragraph = screen.getByTestId('p');

      fireEvent.keyDown(paragraph, { key: 'Enter', shiftKey: true });

      expect(onEnter).not.toHaveBeenCalled();
    });

    it('should forward ref correctly', () => {
      const ref = createRef<HTMLParagraphElement>();
      render(
        <P editable ref={ref} data-testid="p">
          Content
        </P>,
      );
      expect(ref.current).toBeTruthy();
      expect(ref.current?.tagName).toBe('P');
    });

    it('should merge custom className with editable styles', () => {
      render(
        <P editable className="custom-class" data-testid="p">
          Content
        </P>,
      );
      const paragraph = screen.getByTestId('p');
      expect(paragraph.className).toContain('custom-class');
      expect(paragraph.className).toContain('focus:ring-2');
    });
  });

  describe('P backward compatibility', () => {
    it('works without editable props', () => {
      render(<P data-testid="p">Static paragraph</P>);
      const paragraph = screen.getByTestId('p');
      expect(paragraph).not.toHaveAttribute('contenteditable');
      expect(paragraph).not.toHaveAttribute('data-editable');
      expect(paragraph).toHaveTextContent('Static paragraph');
    });

    it('renders as p by default', () => {
      render(<P data-testid="p">Content</P>);
      const paragraph = screen.getByTestId('p');
      expect(paragraph.tagName).toBe('P');
    });
  });
});

// ============================================================================
// R-200b: InlineContent Conversion Tests
// ============================================================================

describe('InlineContent Conversion (R-200b)', () => {
  describe('inlineContentToHtml', () => {
    it('should convert plain text', () => {
      const content: InlineContent[] = [{ text: 'Hello world' }];
      const html = inlineContentToHtml(content);
      expect(html).toBe('Hello world');
    });

    it('should convert bold text', () => {
      const content: InlineContent[] = [{ text: 'Bold text', marks: ['bold'] }];
      const html = inlineContentToHtml(content);
      expect(html).toBe('<strong>Bold text</strong>');
    });

    it('should convert italic text', () => {
      const content: InlineContent[] = [{ text: 'Italic text', marks: ['italic'] }];
      const html = inlineContentToHtml(content);
      expect(html).toBe('<em>Italic text</em>');
    });

    it('should convert code text', () => {
      const content: InlineContent[] = [{ text: 'code snippet', marks: ['code'] }];
      const html = inlineContentToHtml(content);
      expect(html).toBe('<code>code snippet</code>');
    });

    it('should convert strikethrough text', () => {
      const content: InlineContent[] = [{ text: 'deleted', marks: ['strikethrough'] }];
      const html = inlineContentToHtml(content);
      expect(html).toBe('<s>deleted</s>');
    });

    it('should convert link text', () => {
      const content: InlineContent[] = [
        { text: 'Click here', marks: ['link'], href: 'https://example.com' },
      ];
      const html = inlineContentToHtml(content);
      expect(html).toBe('<a href="https://example.com">Click here</a>');
    });

    it('should convert multiple marks', () => {
      const content: InlineContent[] = [{ text: 'Bold and italic', marks: ['bold', 'italic'] }];
      const html = inlineContentToHtml(content);
      expect(html).toBe('<em><strong>Bold and italic</strong></em>');
    });

    it('should convert multiple segments', () => {
      const content: InlineContent[] = [
        { text: 'Normal ' },
        { text: 'bold', marks: ['bold'] },
        { text: ' text' },
      ];
      const html = inlineContentToHtml(content);
      expect(html).toBe('Normal <strong>bold</strong> text');
    });

    it('should escape HTML special characters', () => {
      const content: InlineContent[] = [{ text: '<script>alert("xss")</script>' }];
      const html = inlineContentToHtml(content);
      expect(html).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    });
  });

  describe('htmlToInlineContent', () => {
    it('should convert plain text', () => {
      const content = htmlToInlineContent('Hello world');
      expect(content).toHaveLength(1);
      expect(content[0].text).toBe('Hello world');
      expect(content[0].marks).toBeUndefined();
    });

    it('should convert strong tag to bold mark', () => {
      const content = htmlToInlineContent('<strong>Bold text</strong>');
      expect(content).toHaveLength(1);
      expect(content[0].text).toBe('Bold text');
      expect(content[0].marks).toContain('bold');
    });

    it('should convert b tag to bold mark', () => {
      const content = htmlToInlineContent('<b>Bold text</b>');
      expect(content).toHaveLength(1);
      expect(content[0].marks).toContain('bold');
    });

    it('should convert em tag to italic mark', () => {
      const content = htmlToInlineContent('<em>Italic text</em>');
      expect(content).toHaveLength(1);
      expect(content[0].marks).toContain('italic');
    });

    it('should convert i tag to italic mark', () => {
      const content = htmlToInlineContent('<i>Italic text</i>');
      expect(content).toHaveLength(1);
      expect(content[0].marks).toContain('italic');
    });

    it('should convert code tag to code mark', () => {
      const content = htmlToInlineContent('<code>code</code>');
      expect(content).toHaveLength(1);
      expect(content[0].marks).toContain('code');
    });

    it('should convert s tag to strikethrough mark', () => {
      const content = htmlToInlineContent('<s>deleted</s>');
      expect(content).toHaveLength(1);
      expect(content[0].marks).toContain('strikethrough');
    });

    it('should convert del tag to strikethrough mark', () => {
      const content = htmlToInlineContent('<del>deleted</del>');
      expect(content).toHaveLength(1);
      expect(content[0].marks).toContain('strikethrough');
    });

    it('should convert a tag to link mark with href', () => {
      const content = htmlToInlineContent('<a href="https://example.com">Link</a>');
      expect(content).toHaveLength(1);
      expect(content[0].text).toBe('Link');
      expect(content[0].marks).toContain('link');
      expect(content[0].href).toBe('https://example.com');
    });

    it('should convert nested marks', () => {
      const content = htmlToInlineContent('<strong><em>Bold and italic</em></strong>');
      expect(content).toHaveLength(1);
      expect(content[0].marks).toContain('bold');
      expect(content[0].marks).toContain('italic');
    });

    it('should convert mixed content', () => {
      const content = htmlToInlineContent('Normal <strong>bold</strong> text');
      expect(content).toHaveLength(3);
      expect(content[0].text).toBe('Normal ');
      expect(content[0].marks).toBeUndefined();
      expect(content[1].text).toBe('bold');
      expect(content[1].marks).toContain('bold');
      expect(content[2].text).toBe(' text');
      expect(content[2].marks).toBeUndefined();
    });
  });
});

// ============================================================================
// R-200d: Editable Quote Tests
// ============================================================================

describe('Editable Quote (R-200d)', () => {
  describe('Blockquote editable mode', () => {
    it('should enable contenteditable when editable is true', () => {
      render(
        <Blockquote editable data-testid="quote">
          Editable quote content
        </Blockquote>,
      );
      const quote = screen.getByTestId('quote');
      expect(quote).toHaveAttribute('contenteditable', 'true');
    });

    it('should not enable contenteditable when editable is false', () => {
      render(<Blockquote data-testid="quote">Static quote</Blockquote>);
      const quote = screen.getByTestId('quote');
      expect(quote).not.toHaveAttribute('contenteditable');
    });

    it('should add data-editable attribute when editable', () => {
      render(
        <Blockquote editable data-testid="quote">
          Content
        </Blockquote>,
      );
      const quote = screen.getByTestId('quote');
      expect(quote).toHaveAttribute('data-editable', 'true');
    });

    it('should add focus styling classes when editable', () => {
      render(
        <Blockquote editable data-testid="quote">
          Content
        </Blockquote>,
      );
      const quote = screen.getByTestId('quote');
      expect(quote.className).toContain('focus:ring-2');
    });

    it('should call onChange with InlineContent[] on content change', () => {
      const onChange = vi.fn();
      render(
        <Blockquote editable onChange={onChange} data-testid="quote">
          Initial quote
        </Blockquote>,
      );
      const quote = screen.getByTestId('quote');

      quote.textContent = 'New quote content';
      fireEvent.input(quote);

      expect(onChange).toHaveBeenCalled();
      const content = onChange.mock.calls[0][0] as InlineContent[];
      expect(content).toHaveLength(1);
      expect(content[0].text).toBe('New quote content');
    });

    it('should call onFocus when quote receives focus', () => {
      const onFocus = vi.fn();
      render(
        <Blockquote editable onFocus={onFocus} data-testid="quote">
          Content
        </Blockquote>,
      );
      const quote = screen.getByTestId('quote');

      fireEvent.focus(quote);

      expect(onFocus).toHaveBeenCalledTimes(1);
    });

    it('should call onBlur when quote loses focus', () => {
      const onBlur = vi.fn();
      render(
        <Blockquote editable onBlur={onBlur} data-testid="quote">
          Content
        </Blockquote>,
      );
      const quote = screen.getByTestId('quote');

      fireEvent.blur(quote);

      expect(onBlur).toHaveBeenCalledTimes(1);
    });

    it('should set placeholder attributes when provided', () => {
      render(
        <Blockquote editable placeholder="Enter quote..." data-testid="quote">
          {null}
        </Blockquote>,
      );
      const quote = screen.getByTestId('quote');
      expect(quote).toHaveAttribute('data-placeholder', 'Enter quote...');
      expect(quote).toHaveAttribute('aria-placeholder', 'Enter quote...');
    });

    it('should call onEnter when Enter is pressed', () => {
      const onEnter = vi.fn();
      render(
        <Blockquote editable onEnter={onEnter} data-testid="quote">
          Content
        </Blockquote>,
      );
      const quote = screen.getByTestId('quote');

      fireEvent.keyDown(quote, { key: 'Enter' });

      expect(onEnter).toHaveBeenCalledTimes(1);
    });

    it('should forward ref correctly', () => {
      const ref = createRef<HTMLQuoteElement>();
      render(
        <Blockquote editable ref={ref} data-testid="quote">
          Content
        </Blockquote>,
      );
      expect(ref.current).toBeTruthy();
      expect(ref.current?.tagName).toBe('BLOCKQUOTE');
    });
  });

  describe('Blockquote citation', () => {
    it('should render citation when provided', () => {
      render(
        <Blockquote citation="John Doe" data-testid="quote">
          A great quote
        </Blockquote>,
      );
      const citation = screen.getByText('John Doe');
      expect(citation).toBeInTheDocument();
      expect(citation.tagName).toBe('CITE');
    });

    it('should render editable citation when editable with onCitationChange', () => {
      render(
        <Blockquote editable citation="Author" onCitationChange={vi.fn()} data-testid="quote">
          Content
        </Blockquote>,
      );
      const citation = screen.getByText('Author');
      expect(citation).toHaveAttribute('contenteditable', 'true');
    });

    it('should call onCitationChange when citation is edited', () => {
      const onCitationChange = vi.fn();
      render(
        <Blockquote
          editable
          citation="Original Author"
          onCitationChange={onCitationChange}
          data-testid="quote"
        >
          Content
        </Blockquote>,
      );
      const citation = screen.getByText('Original Author');

      citation.textContent = 'New Author';
      fireEvent.input(citation);

      expect(onCitationChange).toHaveBeenCalledWith('New Author');
    });
  });

  describe('Blockquote backward compatibility', () => {
    it('works without editable props', () => {
      render(<Blockquote data-testid="quote">Static quote</Blockquote>);
      const quote = screen.getByTestId('quote');
      expect(quote).not.toHaveAttribute('contenteditable');
      expect(quote).not.toHaveAttribute('data-editable');
      expect(quote).toHaveTextContent('Static quote');
    });

    it('renders as blockquote by default', () => {
      render(<Blockquote data-testid="quote">Content</Blockquote>);
      const quote = screen.getByTestId('quote');
      expect(quote.tagName).toBe('BLOCKQUOTE');
    });

    it('applies blockquote styling', () => {
      render(<Blockquote data-testid="quote">Content</Blockquote>);
      const quote = screen.getByTestId('quote');
      expect(quote.className).toContain('border-l-2');
      expect(quote.className).toContain('italic');
    });
  });
});

// ============================================================================
// List Tests (R-200c)
// ============================================================================

describe('List', () => {
  describe('static rendering', () => {
    it('renders unordered list by default', () => {
      render(
        <List
          data-testid="list"
          items={[
            { id: '1', content: 'First item' },
            { id: '2', content: 'Second item' },
          ]}
        />,
      );
      const list = screen.getByTestId('list');
      expect(list.tagName).toBe('UL');
    });

    it('renders ordered list when ordered prop is true', () => {
      render(<List data-testid="list" items={[{ id: '1', content: 'First item' }]} ordered />);
      const list = screen.getByTestId('list');
      expect(list.tagName).toBe('OL');
    });

    it('renders items as li elements', () => {
      render(
        <List
          data-testid="list"
          items={[
            { id: '1', content: 'First' },
            { id: '2', content: 'Second' },
            { id: '3', content: 'Third' },
          ]}
        />,
      );
      const items = screen.getAllByRole('listitem');
      expect(items).toHaveLength(3);
      expect(items[0]).toHaveTextContent('First');
      expect(items[1]).toHaveTextContent('Second');
      expect(items[2]).toHaveTextContent('Third');
    });

    it('applies unordered list classes', () => {
      render(<List data-testid="list" items={[{ id: '1', content: 'Item' }]} />);
      const list = screen.getByTestId('list');
      expect(list.className).toContain('list-disc');
    });

    it('applies ordered list classes', () => {
      render(<List data-testid="list" items={[{ id: '1', content: 'Item' }]} ordered />);
      const list = screen.getByTestId('list');
      expect(list.className).toContain('list-decimal');
    });

    it('renders InlineContent correctly', () => {
      render(
        <List
          data-testid="list"
          items={[
            {
              id: '1',
              content: [{ text: 'Bold ', marks: ['bold'] }, { text: 'text' }],
            },
          ]}
        />,
      );
      const item = screen.getByRole('listitem');
      expect(item.innerHTML).toContain('<strong>Bold </strong>');
    });

    it('applies indentation classes', () => {
      render(
        <List
          data-testid="list"
          items={[
            { id: '1', content: 'Level 0' },
            { id: '2', content: 'Level 1', indent: 1 },
            { id: '3', content: 'Level 2', indent: 2 },
          ]}
        />,
      );
      const items = screen.getAllByRole('listitem');
      expect(items[0]).not.toHaveClass('ml-6');
      expect(items[1]).toHaveClass('ml-6');
      expect(items[2]).toHaveClass('ml-12');
    });

    it('merges custom className', () => {
      render(
        <List data-testid="list" items={[{ id: '1', content: 'Item' }]} className="custom-list" />,
      );
      const list = screen.getByTestId('list');
      expect(list).toHaveClass('custom-list');
    });
  });

  describe('editable mode', () => {
    it('makes items contenteditable when editable is true', () => {
      render(<List data-testid="list" items={[{ id: '1', content: 'Editable item' }]} editable />);
      const item = screen.getByRole('listitem');
      expect(item).toHaveAttribute('contenteditable', 'true');
    });

    it('sets data-editable attribute on list', () => {
      render(<List data-testid="list" items={[{ id: '1', content: 'Item' }]} editable />);
      const list = screen.getByTestId('list');
      expect(list).toHaveAttribute('data-editable', 'true');
    });

    it('calls onChange when item content changes', () => {
      const onChange = vi.fn();
      render(<List items={[{ id: '1', content: 'Original' }]} editable onChange={onChange} />);
      const item = screen.getByRole('listitem');

      item.innerHTML = 'Modified';
      fireEvent.input(item);

      expect(onChange).toHaveBeenCalled();
    });

    it('calls onItemAdd when Enter is pressed', () => {
      const onItemAdd = vi.fn();
      render(<List items={[{ id: '1', content: 'Item' }]} editable onItemAdd={onItemAdd} />);
      const item = screen.getByRole('listitem');

      fireEvent.keyDown(item, { key: 'Enter' });

      expect(onItemAdd).toHaveBeenCalledWith(1);
    });

    it('calls onIndent when Tab is pressed', () => {
      const onIndent = vi.fn();
      render(<List items={[{ id: '1', content: 'Item' }]} editable onIndent={onIndent} />);
      const item = screen.getByRole('listitem');

      fireEvent.keyDown(item, { key: 'Tab' });

      expect(onIndent).toHaveBeenCalledWith(0);
    });

    it('calls onOutdent when Shift+Tab is pressed', () => {
      const onOutdent = vi.fn();
      render(
        <List items={[{ id: '1', content: 'Item', indent: 1 }]} editable onOutdent={onOutdent} />,
      );
      const item = screen.getByRole('listitem');

      fireEvent.keyDown(item, { key: 'Tab', shiftKey: true });

      expect(onOutdent).toHaveBeenCalledWith(0);
    });
  });

  describe('backward compatibility', () => {
    it('works without editable props', () => {
      render(<List data-testid="list" items={[{ id: '1', content: 'Static item' }]} />);
      const list = screen.getByTestId('list');
      const item = screen.getByRole('listitem');
      expect(list).not.toHaveAttribute('data-editable');
      expect(item).not.toHaveAttribute('contenteditable');
    });
  });
});

// ============================================================================
// CodeBlock Tests (R-200e)
// ============================================================================

describe('CodeBlock', () => {
  describe('static rendering', () => {
    it('renders pre element', () => {
      render(<CodeBlock data-testid="code">const x = 1;</CodeBlock>);
      const pre = screen.getByTestId('code');
      expect(pre.tagName).toBe('PRE');
    });

    it('renders code content inside code element', () => {
      render(<CodeBlock data-testid="code">console.log("test");</CodeBlock>);
      const code = screen.getByTestId('code').querySelector('code');
      expect(code).toBeInTheDocument();
      expect(code).toHaveTextContent('console.log("test");');
    });

    it('applies codeblock classes', () => {
      render(<CodeBlock data-testid="code">code</CodeBlock>);
      const pre = screen.getByTestId('code');
      expect(pre.className).toContain('font-mono');
      expect(pre.className).toContain('bg-muted');
      expect(pre.className).toContain('rounded-lg');
    });

    it('sets data-language attribute', () => {
      render(
        <CodeBlock data-testid="code" language="typescript">
          const x: number = 1;
        </CodeBlock>,
      );
      const pre = screen.getByTestId('code');
      expect(pre).toHaveAttribute('data-language', 'typescript');
    });

    it('renders line numbers when showLineNumbers is true', () => {
      render(
        <CodeBlock data-testid="code" showLineNumbers>
          {'line1\nline2\nline3'}
        </CodeBlock>,
      );
      const pre = screen.getByTestId('code');
      expect(pre.textContent).toContain('1');
      expect(pre.textContent).toContain('2');
      expect(pre.textContent).toContain('3');
    });

    it('merges custom className', () => {
      render(
        <CodeBlock data-testid="code" className="custom-code">
          code
        </CodeBlock>,
      );
      const pre = screen.getByTestId('code');
      expect(pre).toHaveClass('custom-code');
    });

    it('forwards ref to pre element', () => {
      const ref = createRef<HTMLPreElement>();
      render(<CodeBlock ref={ref}>code</CodeBlock>);
      expect(ref.current).toBeInstanceOf(HTMLPreElement);
    });
  });

  describe('editable mode', () => {
    it('makes pre contenteditable when editable is true', () => {
      render(
        <CodeBlock data-testid="code" editable>
          editable code
        </CodeBlock>,
      );
      const pre = screen.getByTestId('code');
      expect(pre).toHaveAttribute('contenteditable', 'true');
    });

    it('disables spellcheck in editable mode', () => {
      render(
        <CodeBlock data-testid="code" editable>
          code
        </CodeBlock>,
      );
      const pre = screen.getByTestId('code');
      expect(pre).toHaveAttribute('spellcheck', 'false');
    });

    it('shows language selector when onLanguageChange is provided', () => {
      render(
        <CodeBlock editable onLanguageChange={vi.fn()} language="javascript">
          code
        </CodeBlock>,
      );
      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
      expect(select).toHaveValue('javascript');
    });

    it('calls onChange when code content changes', () => {
      const onChange = vi.fn();
      render(
        <CodeBlock data-testid="code" editable onChange={onChange}>
          original
        </CodeBlock>,
      );
      const pre = screen.getByTestId('code');

      pre.textContent = 'modified';
      fireEvent.input(pre);

      expect(onChange).toHaveBeenCalledWith('modified');
    });

    it('calls onLanguageChange when language is selected', () => {
      const onLanguageChange = vi.fn();
      render(
        <CodeBlock editable onLanguageChange={onLanguageChange} language="">
          code
        </CodeBlock>,
      );
      const select = screen.getByRole('combobox');

      fireEvent.change(select, { target: { value: 'python' } });

      expect(onLanguageChange).toHaveBeenCalledWith('python');
    });
  });

  describe('backward compatibility', () => {
    it('works without editable props', () => {
      render(<CodeBlock data-testid="code">static code</CodeBlock>);
      const pre = screen.getByTestId('code');
      expect(pre).not.toHaveAttribute('contenteditable');
    });
  });
});

// ============================================================================
// Mark Tests
// ============================================================================

describe('Mark', () => {
  it('renders as mark element by default', () => {
    render(<Mark data-testid="mark">Highlighted</Mark>);
    const mark = screen.getByTestId('mark');
    expect(mark.tagName).toBe('MARK');
  });

  it('applies mark classes with semantic tokens', () => {
    render(<Mark data-testid="mark">Highlighted</Mark>);
    const mark = screen.getByTestId('mark');
    expect(mark.className).toContain('bg-accent');
    expect(mark.className).toContain('text-accent-foreground');
  });

  it('merges custom className', () => {
    render(
      <Mark data-testid="mark" className="custom-mark">
        Highlighted
      </Mark>,
    );
    const mark = screen.getByTestId('mark');
    expect(mark).toHaveClass('custom-mark');
    expect(mark).toHaveClass('bg-accent');
  });

  it('forwards ref', () => {
    const ref = createRef<HTMLElement>();
    render(<Mark ref={ref}>Highlighted</Mark>);
    expect(ref.current).toBeInstanceOf(HTMLElement);
  });

  it('passes through HTML attributes', () => {
    render(
      <Mark data-testid="mark" id="search-match">
        Match
      </Mark>,
    );
    expect(screen.getByTestId('mark')).toHaveAttribute('id', 'search-match');
  });
});

// ============================================================================
// Abbr Tests
// ============================================================================

describe('Abbr', () => {
  it('renders as abbr element by default', () => {
    render(
      <Abbr data-testid="abbr" title="Application Programming Interface">
        API
      </Abbr>,
    );
    const abbr = screen.getByTestId('abbr');
    expect(abbr.tagName).toBe('ABBR');
  });

  it('sets title attribute', () => {
    render(
      <Abbr data-testid="abbr" title="HyperText Markup Language">
        HTML
      </Abbr>,
    );
    const abbr = screen.getByTestId('abbr');
    expect(abbr).toHaveAttribute('title', 'HyperText Markup Language');
  });

  it('applies abbr classes', () => {
    render(
      <Abbr data-testid="abbr" title="Test">
        TLA
      </Abbr>,
    );
    const abbr = screen.getByTestId('abbr');
    expect(abbr.className).toContain('cursor-help');
    expect(abbr.className).toContain('underline');
    expect(abbr.className).toContain('decoration-dotted');
  });

  it('merges custom className', () => {
    render(
      <Abbr data-testid="abbr" title="Test" className="custom-abbr">
        TLA
      </Abbr>,
    );
    const abbr = screen.getByTestId('abbr');
    expect(abbr).toHaveClass('custom-abbr');
    expect(abbr).toHaveClass('cursor-help');
  });

  it('forwards ref', () => {
    const ref = createRef<HTMLElement>();
    render(
      <Abbr ref={ref} title="Test">
        TLA
      </Abbr>,
    );
    expect(ref.current).toBeInstanceOf(HTMLElement);
  });
});
