import { MosaicContext } from '@/shared/lib/context';
import type { MosaicContextValue, MosaicNode, MosaicPanelConfig } from '@/shared/types';
import { act, cleanup, render, screen } from '@testing-library/react';
import { useContext } from 'react';
import type React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MosaicLayout } from './mosaic-layout';

afterEach(() => cleanup());

vi.mock('react-dnd', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-dnd')>();
  return {
    ...actual,
    useDrop: vi.fn(() => [{}, vi.fn()]),
    useDrag: vi.fn(() => [{ isDragging: false }, vi.fn(), vi.fn()]),
  };
});

const makePanel = (id: string, overrides: Partial<MosaicPanelConfig> = {}): MosaicPanelConfig => ({
  id,
  title: `Title ${id.toUpperCase()}`,
  content: <div data-testid={`content-${id}`}>{id}</div>,
  ...overrides,
});

describe('MosaicLayout', () => {
  it('renders zeroStateView when panels=[] and zeroStateView is provided', () => {
    render(<MosaicLayout panels={[]} zeroStateView={<div data-testid="zero">No items</div>} />);
    expect(screen.getByTestId('zero')).toBeInTheDocument();
  });

  it('renders empty mosaic when panels=[] and no zeroStateView', () => {
    const { container } = render(<MosaicLayout panels={[]} />);
    expect(container.querySelector('.react-mosaic')).toBeInTheDocument();
  });

  it('renders content when there is one panel', () => {
    render(<MosaicLayout panels={[makePanel('a')]} />);
    expect(screen.getByTestId('content-a')).toBeInTheDocument();
  });

  it('renders both content elements when there are two panels', () => {
    render(<MosaicLayout panels={[makePanel('a'), makePanel('b')]} />);
    expect(screen.getByTestId('content-a')).toBeInTheDocument();
    expect(screen.getByTestId('content-b')).toBeInTheDocument();
  });

  it('reflects new panel when panels change (add)', () => {
    const { rerender } = render(<MosaicLayout panels={[makePanel('a')]} />);
    rerender(<MosaicLayout panels={[makePanel('a'), makePanel('b')]} />);
    expect(screen.getByTestId('content-b')).toBeInTheDocument();
  });

  it('renders custom toolbar when renderToolbar is provided', () => {
    const panels: MosaicPanelConfig[] = [
      makePanel('a', {
        renderToolbar: () => <div data-testid="custom-toolbar">custom</div>,
      }),
    ];
    render(<MosaicLayout panels={panels} />);
    expect(screen.getByTestId('custom-toolbar')).toBeInTheDocument();
  });

  it('renders default MosaicWindow toolbar when renderToolbar is not provided', () => {
    render(<MosaicLayout panels={[makePanel('a')]} />);
    expect(screen.getByTitle('Close')).toBeInTheDocument();
  });

  it('wraps windowContent with Wrapper when Wrapper is provided', () => {
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <div data-testid="wrapper">{children}</div>
    );
    render(<MosaicLayout panels={[makePanel('a', { Wrapper })]} />);
    expect(screen.getByTestId('wrapper')).toBeInTheDocument();
    expect(screen.getByTestId('content-a')).toBeInTheDocument();
  });

  it('passes className prop to Mosaic', () => {
    const { container } = render(<MosaicLayout panels={[makePanel('a')]} className="my-layout" />);
    expect(container.querySelector('.my-layout')).toBeInTheDocument();
  });

  it('renders normally when className is not provided', () => {
    const { container } = render(<MosaicLayout panels={[makePanel('a')]} />);
    expect(container.querySelector('.react-mosaic')).toBeInTheDocument();
  });

  it('returns empty div for unknown id in renderTile', () => {
    const { rerender } = render(<MosaicLayout panels={[makePanel('a'), makePanel('b')]} />);
    rerender(<MosaicLayout panels={[makePanel('a')]} />);
    expect(screen.getByTestId('content-a')).toBeInTheDocument();
  });

  describe('panel diff behavior', () => {
    it('adding panel 1→2: existing panel id stays at first position in the tree', () => {
      let capturedNode: MosaicNode<string> | null = null;
      const ContextCapture = () => {
        const ctx = useContext(MosaicContext) as MosaicContextValue<string>;
        capturedNode = ctx.mosaicActions.getRoot();
        return null;
      };
      const panels: MosaicPanelConfig[] = [makePanel('a', { content: <ContextCapture /> })];
      const { rerender } = render(<MosaicLayout panels={panels} />);

      rerender(
        <MosaicLayout panels={[makePanel('a', { content: <ContextCapture /> }), makePanel('b')]} />,
      );

      expect(capturedNode).not.toBeNull();
      expect(
        typeof capturedNode === 'object' && capturedNode !== null && 'first' in capturedNode
          ? (capturedNode as { first: string }).first
          : capturedNode,
      ).toBe('a');
    });

    it('removing panel 2→1: remaining panel becomes a single leaf', () => {
      let capturedNode: MosaicNode<string> | null = null;
      const ContextCapture = () => {
        const ctx = useContext(MosaicContext) as MosaicContextValue<string>;
        capturedNode = ctx.mosaicActions.getRoot();
        return null;
      };
      const { rerender } = render(
        <MosaicLayout panels={[makePanel('a', { content: <ContextCapture /> }), makePanel('b')]} />,
      );

      rerender(<MosaicLayout panels={[makePanel('a', { content: <ContextCapture /> })]} />);

      expect(capturedNode).toBe('a');
    });

    it('panels=[] → currentNode is null (shows zeroStateView)', () => {
      const { rerender } = render(
        <MosaicLayout
          panels={[makePanel('a'), makePanel('b')]}
          zeroStateView={<div data-testid="zero">empty</div>}
        />,
      );
      rerender(<MosaicLayout panels={[]} zeroStateView={<div data-testid="zero">empty</div>} />);
      expect(screen.getByTestId('zero')).toBeInTheDocument();
    });

    it('adding first panel from null state → single leaf tree', () => {
      let capturedNode: MosaicNode<string> | null = null;
      const ContextCapture = () => {
        const ctx = useContext(MosaicContext) as MosaicContextValue<string>;
        capturedNode = ctx.mosaicActions.getRoot();
        return null;
      };
      const { rerender } = render(<MosaicLayout panels={[]} zeroStateView={<div>empty</div>} />);
      rerender(<MosaicLayout panels={[makePanel('a', { content: <ContextCapture /> })]} />);
      expect(capturedNode).toBe('a');
    });

    it('removing already-absent id is a no-op (content-a preserved)', () => {
      const { rerender } = render(<MosaicLayout panels={[makePanel('a'), makePanel('b')]} />);
      rerender(<MosaicLayout panels={[makePanel('a'), makePanel('b')]} />);
      expect(screen.getByTestId('content-a')).toBeInTheDocument();
      expect(screen.getByTestId('content-b')).toBeInTheDocument();
    });

    it('removing one of three panels: remaining two panels are both rendered', () => {
      const { rerender } = render(
        <MosaicLayout panels={[makePanel('a'), makePanel('b'), makePanel('c')]} />,
      );
      rerender(<MosaicLayout panels={[makePanel('a'), makePanel('c')]} />);
      expect(screen.getByTestId('content-a')).toBeInTheDocument();
      expect(screen.getByTestId('content-c')).toBeInTheDocument();
      expect(screen.queryByTestId('content-b')).toBeNull();
    });

    it('full panel swap (remove a + add b simultaneously): b becomes a single leaf', () => {
      let capturedNode: MosaicNode<string> | null = null;
      const ContextCapture = () => {
        const ctx = useContext(MosaicContext) as MosaicContextValue<string>;
        capturedNode = ctx.mosaicActions.getRoot();
        return null;
      };
      const { rerender } = render(<MosaicLayout panels={[makePanel('a')]} />);
      rerender(<MosaicLayout panels={[makePanel('b', { content: <ContextCapture /> })]} />);
      expect(capturedNode).toBe('b');
    });
  });

  it('onChange: currentNode updates when mosaicActions.updateTree is called', () => {
    let capturedCtx: MosaicContextValue<string> | null = null;

    const ContextCapture = () => {
      capturedCtx = useContext(MosaicContext) as MosaicContextValue<string>;
      return <div data-testid="ctx-capture" />;
    };

    // Captures context from inside a MosaicWindow rendered via MosaicLayout's renderTile
    const panels: MosaicPanelConfig[] = [
      makePanel('a', {
        content: (
          <>
            <div data-testid="content-a">a</div>
            <ContextCapture />
          </>
        ),
      }),
      makePanel('b'),
    ];

    render(<MosaicLayout panels={panels} />);

    expect(screen.getByTestId('ctx-capture')).toBeInTheDocument();

    act(() => {
      capturedCtx!.mosaicActions.updateTree([
        { path: [], spec: { splitPercentage: { $set: 70 } } },
      ]);
    });

    expect(screen.getByTestId('content-a')).toBeInTheDocument();
  });
});
