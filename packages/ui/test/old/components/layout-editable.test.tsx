/**
 * Tests for R-202 Layout Components editable features
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Card, CardDescription, CardHeader, CardTitle } from '../../../src/old/ui/card';
import { Container } from '../../../src/old/ui/container';
import { Grid } from '../../../src/old/ui/grid';

describe('Container (editable)', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('should show outline when editable', () => {
    render(
      <Container editable data-testid="container">
        Content
      </Container>,
    );

    const container = screen.getByTestId('container');
    expect(container).toHaveClass('outline-dashed');
    expect(container).toHaveAttribute('data-editable', 'true');
  });

  it('should not show outline when not editable', () => {
    render(<Container data-testid="container">Content</Container>);

    const container = screen.getByTestId('container');
    expect(container).not.toHaveClass('outline-dashed');
    expect(container).not.toHaveAttribute('data-editable');
  });

  it('should show drop zone when showDropZone true and empty', () => {
    render(<Container editable showDropZone data-testid="container" />);

    expect(screen.getByText('Drop blocks here')).toBeInTheDocument();
  });

  it('should not show drop zone when has children', () => {
    render(
      <Container editable showDropZone data-testid="container">
        <div>Child content</div>
      </Container>,
    );

    expect(screen.queryByText('Drop blocks here')).not.toBeInTheDocument();
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('should not show drop zone when showDropZone false', () => {
    render(<Container editable showDropZone={false} data-testid="container" />);

    expect(screen.queryByText('Drop blocks here')).not.toBeInTheDocument();
  });

  it('should apply background preset classes', () => {
    const { rerender } = render(
      <Container background="muted" data-testid="container">
        Content
      </Container>,
    );

    expect(screen.getByTestId('container')).toHaveClass('bg-muted');

    rerender(
      <Container background="accent" data-testid="container">
        Content
      </Container>,
    );
    expect(screen.getByTestId('container')).toHaveClass('bg-accent');

    rerender(
      <Container background="card" data-testid="container">
        Content
      </Container>,
    );
    expect(screen.getByTestId('container')).toHaveClass('bg-card');
  });

  it('should not apply background class when none', () => {
    render(
      <Container background="none" data-testid="container">
        Content
      </Container>,
    );

    const container = screen.getByTestId('container');
    expect(container).not.toHaveClass('bg-muted');
    expect(container).not.toHaveClass('bg-accent');
    expect(container).not.toHaveClass('bg-card');
  });

  it('should set data-background attribute', () => {
    render(
      <Container background="muted" data-testid="container">
        Content
      </Container>,
    );

    expect(screen.getByTestId('container')).toHaveAttribute('data-background', 'muted');
  });

  it('should maintain all existing non-editable behavior', () => {
    render(
      <Container as="section" size="lg" padding="6" data-testid="container">
        Content
      </Container>,
    );

    const container = screen.getByTestId('container');
    expect(container.tagName).toBe('SECTION');
    expect(container).toHaveClass('max-w-lg');
    expect(container).toHaveClass('p-6');
  });
});

describe('Grid (editable)', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('should show outline when editable', () => {
    render(
      <Grid editable data-testid="grid">
        <Grid.Item>Item 1</Grid.Item>
      </Grid>,
    );

    const grid = screen.getByTestId('grid');
    expect(grid).toHaveClass('outline-dashed');
    expect(grid).toHaveAttribute('data-editable', 'true');
  });

  it('should not show outline when not editable', () => {
    render(
      <Grid data-testid="grid">
        <Grid.Item>Item 1</Grid.Item>
      </Grid>,
    );

    const grid = screen.getByTestId('grid');
    expect(grid).not.toHaveClass('outline-dashed');
    expect(grid).not.toHaveAttribute('data-editable');
  });

  it('should show column guides in Grid.Item when editable', () => {
    render(
      <Grid editable data-testid="grid">
        <Grid.Item data-testid="item">Item 1</Grid.Item>
      </Grid>,
    );

    const item = screen.getByTestId('item');
    expect(item).toHaveClass('outline-dashed');
  });

  it('should show drop zones when showColumnDropZones true and items empty', () => {
    render(
      <Grid editable showColumnDropZones data-testid="grid">
        <Grid.Item data-testid="item" />
      </Grid>,
    );

    expect(screen.getByText('Drop here')).toBeInTheDocument();
  });

  it('should not show drop zone when item has children', () => {
    render(
      <Grid editable showColumnDropZones data-testid="grid">
        <Grid.Item data-testid="item">Content</Grid.Item>
      </Grid>,
    );

    expect(screen.queryByText('Drop here')).not.toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('should set data-preset attribute', () => {
    render(
      <Grid preset="golden" data-testid="grid">
        <Grid.Item>Item</Grid.Item>
      </Grid>,
    );

    expect(screen.getByTestId('grid')).toHaveAttribute('data-preset', 'golden');
  });

  it('should set data-columns attribute for numeric columns', () => {
    render(
      <Grid columns={3} data-testid="grid">
        <Grid.Item>Item</Grid.Item>
      </Grid>,
    );

    expect(screen.getByTestId('grid')).toHaveAttribute('data-columns', '3');
  });

  it('should maintain all existing preset behavior', () => {
    render(
      <Grid preset="linear" columns={2} gap="6" data-testid="grid">
        <Grid.Item>Item 1</Grid.Item>
        <Grid.Item>Item 2</Grid.Item>
      </Grid>,
    );

    const grid = screen.getByTestId('grid');
    expect(grid).toHaveClass('grid');
    expect(grid).toHaveClass('grid-cols-2');
    expect(grid).toHaveClass('gap-6');
  });
});

describe('Card (editable)', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('should show outline when editable', () => {
    render(
      <Card editable data-testid="card">
        <CardHeader>
          <CardTitle>Title</CardTitle>
        </CardHeader>
      </Card>,
    );

    const card = screen.getByTestId('card');
    expect(card).toHaveClass('outline-dashed');
    expect(card).toHaveAttribute('data-editable', 'true');
  });

  it('should not show outline when not editable', () => {
    render(
      <Card data-testid="card">
        <CardHeader>
          <CardTitle>Title</CardTitle>
        </CardHeader>
      </Card>,
    );

    const card = screen.getByTestId('card');
    expect(card).not.toHaveClass('outline-dashed');
  });

  it('should make CardTitle contenteditable when editable', () => {
    render(
      <Card editable>
        <CardHeader>
          <CardTitle data-testid="title">Title</CardTitle>
        </CardHeader>
      </Card>,
    );

    const title = screen.getByTestId('title');
    expect(title).toHaveAttribute('contenteditable', 'true');
  });

  it('should not make CardTitle contenteditable when not editable', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle data-testid="title">Title</CardTitle>
        </CardHeader>
      </Card>,
    );

    const title = screen.getByTestId('title');
    expect(title).not.toHaveAttribute('contenteditable');
  });

  it('should call onTitleChange when title edited', () => {
    const onTitleChange = vi.fn();
    render(
      <Card editable onTitleChange={onTitleChange}>
        <CardHeader>
          <CardTitle data-testid="title">Original Title</CardTitle>
        </CardHeader>
      </Card>,
    );

    const title = screen.getByTestId('title');
    title.textContent = 'New Title';
    fireEvent.input(title);

    expect(onTitleChange).toHaveBeenCalledWith('New Title');
  });

  it('should make CardDescription contenteditable when editable', () => {
    render(
      <Card editable>
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription data-testid="desc">Description</CardDescription>
        </CardHeader>
      </Card>,
    );

    const desc = screen.getByTestId('desc');
    expect(desc).toHaveAttribute('contenteditable', 'true');
  });

  it('should call onDescriptionChange when description edited', () => {
    const onDescriptionChange = vi.fn();
    render(
      <Card editable onDescriptionChange={onDescriptionChange}>
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription data-testid="desc">Original Description</CardDescription>
        </CardHeader>
      </Card>,
    );

    const desc = screen.getByTestId('desc');
    desc.textContent = 'New Description';
    fireEvent.input(desc);

    expect(onDescriptionChange).toHaveBeenCalledWith('New Description');
  });

  it('should show placeholder on CardTitle when editable', () => {
    render(
      <Card editable>
        <CardHeader>
          <CardTitle data-testid="title" placeholder="Custom placeholder" />
        </CardHeader>
      </Card>,
    );

    const title = screen.getByTestId('title');
    expect(title).toHaveAttribute('data-placeholder', 'Custom placeholder');
  });

  it('should show default placeholder on CardTitle', () => {
    render(
      <Card editable>
        <CardHeader>
          <CardTitle data-testid="title" />
        </CardHeader>
      </Card>,
    );

    const title = screen.getByTestId('title');
    expect(title).toHaveAttribute('data-placeholder', 'Add title...');
  });

  it('should maintain interactive styling when editable', () => {
    render(
      <Card editable interactive data-testid="card">
        <CardHeader>
          <CardTitle>Title</CardTitle>
        </CardHeader>
      </Card>,
    );

    const card = screen.getByTestId('card');
    expect(card).toHaveClass('hover:shadow-md');
    expect(card).toHaveAttribute('tabIndex', '0');
  });
});
