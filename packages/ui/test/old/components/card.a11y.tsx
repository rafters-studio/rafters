import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../../../src/old/ui/card';

describe('Card - Accessibility', () => {
  it('has no accessibility violations with default props', async () => {
    const { container } = render(
      <Card>
        <CardContent>Card content</CardContent>
      </Card>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations when rendered as article', async () => {
    const { container } = render(
      <Card as="article">
        <CardHeader>
          <CardTitle>Blog Post</CardTitle>
          <CardDescription>Published Jan 2025</CardDescription>
        </CardHeader>
        <CardContent>Article content here</CardContent>
      </Card>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations when rendered as section', async () => {
    const { container } = render(
      <Card as="section">
        <CardHeader>
          <CardTitle>Section Title</CardTitle>
        </CardHeader>
        <CardContent>Section content</CardContent>
      </Card>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations when rendered as aside', async () => {
    const { container } = render(
      <Card as="aside">
        <CardHeader>
          <CardTitle>Related Links</CardTitle>
        </CardHeader>
        <CardContent>Supplementary content</CardContent>
      </Card>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with interactive card', async () => {
    const { container } = render(
      <Card interactive>
        <CardHeader>
          <CardTitle>Interactive Card</CardTitle>
        </CardHeader>
        <CardContent>Click to select</CardContent>
      </Card>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with all subcomponents', async () => {
    const { container } = render(
      <Card as="article">
        <CardHeader>
          <CardTitle>Complete Card</CardTitle>
          <CardDescription>With all components</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Main content paragraph</p>
        </CardContent>
        <CardFooter>
          <button type="button">Action</button>
        </CardFooter>
      </Card>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with different heading levels', async () => {
    const headingLevels = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const;
    for (const level of headingLevels) {
      const { container } = render(
        <Card>
          <CardHeader>
            <CardTitle as={level}>Heading Level {level}</CardTitle>
          </CardHeader>
          <CardContent>Content</CardContent>
        </Card>,
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    }
  });

  it('has no violations with aria attributes', async () => {
    const { container } = render(
      <Card aria-label="Product card" role="region">
        <CardHeader>
          <CardTitle>Product Name</CardTitle>
          <CardDescription>Product description</CardDescription>
        </CardHeader>
        <CardContent>Price and details</CardContent>
      </Card>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with interactive content inside', async () => {
    const { container } = render(
      <Card>
        <CardHeader>
          <CardTitle>Form Card</CardTitle>
        </CardHeader>
        <CardContent>
          <label htmlFor="input">Name</label>
          <input id="input" type="text" />
        </CardContent>
        <CardFooter>
          <button type="submit">Submit</button>
          <button type="button">Cancel</button>
        </CardFooter>
      </Card>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with links inside', async () => {
    const { container } = render(
      <Card as="article">
        <CardHeader>
          <CardTitle>Article with Links</CardTitle>
        </CardHeader>
        <CardContent>
          <p>
            Read more at <a href="#docs">documentation</a> or <a href="#api">API reference</a>.
          </p>
        </CardContent>
      </Card>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('CardHeader - Accessibility', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(
      <CardHeader>
        <CardTitle>Header Title</CardTitle>
      </CardHeader>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('CardTitle - Accessibility', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<CardTitle>Title Text</CardTitle>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('CardDescription - Accessibility', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<CardDescription>Description text</CardDescription>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('CardContent - Accessibility', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<CardContent>Content here</CardContent>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('CardFooter - Accessibility', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(
      <CardFooter>
        <button type="button">Action</button>
      </CardFooter>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
