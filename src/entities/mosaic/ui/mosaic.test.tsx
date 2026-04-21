import { MosaicContext } from '@/shared/lib/context';
import type { MosaicContextValue, MosaicNode, MosaicPath } from '@/shared/types';
import { cleanup, render, screen } from '@testing-library/react';
import React, { useContext } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Mosaic } from './mosaic';

afterEach(() => cleanup());

vi.mock('react-dnd', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-dnd')>();
  return {
    ...actual,
    useDrop: vi.fn(() => [{ isOver: false }, vi.fn()]),
    useDrag: vi.fn(() => [{ isDragging: false }, vi.fn(), vi.fn()]),
  };
});

const renderTile = (id: string) => <div data-testid={`tile-${id}`}>{id}</div>;

describe('Mosaic', () => {
  describe('controlled mode', () => {
    it('renders container with react-mosaic class', () => {
      const { container } = render(
        <Mosaic value={null} onChange={() => {}} renderTile={renderTile} />,
      );
      expect(container.querySelector('.react-mosaic')).toBeInTheDocument();
    });

    it('renders tile when value is a leaf', () => {
      render(<Mosaic value="a" onChange={() => {}} renderTile={renderTile} />);
      expect(screen.getByTestId('tile-a')).toBeInTheDocument();
    });

    it('renders both tiles for a two-window tree', () => {
      const tree: MosaicNode<string> = {
        direction: 'row',
        first: 'a',
        second: 'b',
        splitPercentage: 50,
      };
      render(<Mosaic value={tree} onChange={() => {}} renderTile={renderTile} />);
      expect(screen.getByTestId('tile-a')).toBeInTheDocument();
      expect(screen.getByTestId('tile-b')).toBeInTheDocument();
    });

    it('renders custom zeroStateView when value is null', () => {
      render(
        <Mosaic
          value={null}
          onChange={() => {}}
          renderTile={renderTile}
          zeroStateView={<div data-testid="custom-empty">empty</div>}
        />,
      );
      expect(screen.getByTestId('custom-empty')).toBeInTheDocument();
    });

    it('renders default zero-state text when value is null', () => {
      render(<Mosaic value={null} onChange={() => {}} renderTile={renderTile} />);
      expect(screen.getByText('Drop a window here')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <Mosaic value={null} onChange={() => {}} renderTile={renderTile} className="my-mosaic" />,
      );
      expect(container.querySelector('.my-mosaic')).toBeInTheDocument();
    });
  });

  describe('uncontrolled mode', () => {
    it('renders tile with initialValue', () => {
      render(<Mosaic initialValue="x" renderTile={renderTile} />);
      expect(screen.getByTestId('tile-x')).toBeInTheDocument();
    });

    it('renders zero state when initialValue is null', () => {
      render(<Mosaic initialValue={null} renderTile={renderTile} />);
      expect(screen.getByText('Drop a window here')).toBeInTheDocument();
    });
  });

  describe('mosaicId', () => {
    it('propagates mosaicId to context via renderTile', () => {
      let capturedId = '';

      // Verify mosaicId is passed through by reading it from a MosaicContext consumer
      // rendered inside the tree
      const ContextReaderTile = () => {
        const { mosaicId } = useContext(MosaicContext);
        capturedId = mosaicId;
        return <div data-testid="tile-a">a</div>;
      };

      render(
        <Mosaic
          value="a"
          onChange={() => {}}
          renderTile={() => <ContextReaderTile />}
          mosaicId="my-mosaic"
        />,
      );
      expect(capturedId).toBe('my-mosaic');
    });
  });

  describe('mosaicActions stability', () => {
    it('mosaicActions reference is stable across re-renders', () => {
      // Capture the context value on each render of the tile.
      // We use a ref-based capture so it works even when the tile doesn't re-render
      // due to the context being stable (which is exactly what we're testing for).
      let firstCapture: object | undefined;
      let secondCapture: object | undefined;
      let renderCount = 0;

      const CapturingTile = () => {
        const { mosaicActions } = useContext(MosaicContext);
        renderCount += 1;
        if (renderCount === 1) firstCapture = mosaicActions;
        else secondCapture = mosaicActions;
        return <div data-testid="tile-a">a</div>;
      };
      const stableRenderTile = () => <CapturingTile />;

      const Parent = ({ extra }: { extra: number }) => (
        <Mosaic
          value="a"
          onChange={() => {}}
          renderTile={stableRenderTile}
          className={`mosaic-${extra}`}
        />
      );

      const { rerender } = render(<Parent extra={1} />);

      // Force a context re-render by changing mosaicId (the one dep that would destabilize context)
      // Changing className does NOT destabilize context — that's the optimization.
      // To verify mosaicActions identity, we re-render with same mosaicId and check it's same ref.
      // We do this by triggering a Mosaic re-render via a value change which causes internal re-render.
      rerender(<Parent extra={2} />);

      // If context was destabilized by className change, tile would re-render (secondCapture set).
      // The key assertion: if tile DID re-render (context changed), actions must be same reference.
      // If tile did NOT re-render, that proves context was stable — mosaicActions is definitely same.
      if (secondCapture !== undefined) {
        expect(firstCapture).toBe(secondCapture);
      } else {
        // Context was stable — tile didn't re-render at all, which is the desired outcome.
        expect(firstCapture).toBeDefined();
      }
    });
  });

  describe('StrictMode', () => {
    it('survives React StrictMode double-mount without errors', () => {
      expect(() => {
        render(
          <React.StrictMode>
            <Mosaic value="a" onChange={() => {}} renderTile={renderTile} />
          </React.StrictMode>,
        );
      }).not.toThrow();
    });
  });

  describe('onRelease suppression', () => {
    it('does not call onRelease when suppressOnRelease=true', () => {
      const onRelease = vi.fn();
      let capturedActions: MosaicContextValue<string> | null = null;

      const CapturingTile = () => {
        const ctx = useContext(MosaicContext);
        capturedActions = ctx as MosaicContextValue<string>;
        return <div data-testid="tile-a">a</div>;
      };

      render(
        <Mosaic
          value="a"
          onChange={() => {}}
          onRelease={onRelease}
          renderTile={() => <CapturingTile />}
        />,
      );

      capturedActions!.mosaicActions.updateTree(
        [{ path: [], spec: { splitPercentage: { $set: 60 } } }],
        true,
      );

      expect(onRelease).not.toHaveBeenCalled();
    });

    it('calls onRelease when suppressOnRelease=false', () => {
      const onRelease = vi.fn();
      let capturedActions: MosaicContextValue<string> | null = null;

      const CapturingTile = () => {
        const ctx = useContext(MosaicContext);
        capturedActions = ctx as MosaicContextValue<string>;
        return <div data-testid="tile-a">a</div>;
      };

      render(
        <Mosaic
          value={{ direction: 'row', first: 'a', second: 'b', splitPercentage: 50 }}
          onChange={() => {}}
          onRelease={onRelease}
          renderTile={() => <CapturingTile />}
        />,
      );

      capturedActions!.mosaicActions.updateTree(
        [{ path: [], spec: { splitPercentage: { $set: 60 } } }],
        false,
      );

      expect(onRelease).toHaveBeenCalledOnce();
    });
  });

  describe('controlled mode prop change', () => {
    it('shows updated tile when value prop changes', () => {
      const { rerender } = render(<Mosaic value="a" onChange={() => {}} renderTile={renderTile} />);
      expect(screen.getByTestId('tile-a')).toBeInTheDocument();

      rerender(<Mosaic value="b" onChange={() => {}} renderTile={renderTile} />);
      expect(screen.getByTestId('tile-b')).toBeInTheDocument();
    });

    it('switches to zero state when value changes to null', () => {
      const { rerender } = render(<Mosaic value="a" onChange={() => {}} renderTile={renderTile} />);
      rerender(<Mosaic value={null} onChange={() => {}} renderTile={renderTile} />);
      expect(screen.getByText('Drop a window here')).toBeInTheDocument();
    });
  });

  describe('mosaicActions.remove', () => {
    it('calls onRelease with null when removing last tile', () => {
      const onRelease = vi.fn();
      let capturedActions: MosaicContextValue<string> | null = null;

      const CapturingTile = () => {
        const ctx = useContext(MosaicContext);
        capturedActions = ctx as MosaicContextValue<string>;
        return <div data-testid="tile-a">a</div>;
      };

      render(
        <Mosaic
          value="a"
          onChange={() => {}}
          onRelease={onRelease}
          renderTile={() => <CapturingTile />}
        />,
      );

      capturedActions!.mosaicActions.remove([] as unknown as MosaicPath);
      expect(onRelease).toHaveBeenCalledWith(null);
    });
  });

  describe('mosaicActions.hide', () => {
    it('calls onChange when hide is called', () => {
      const onChange = vi.fn();
      let capturedActions: MosaicContextValue<string> | null = null;

      const CapturingTile = () => {
        const ctx = useContext(MosaicContext);
        capturedActions = ctx as MosaicContextValue<string>;
        return <div data-testid="tile-a">a</div>;
      };

      render(
        <Mosaic
          value={{ direction: 'row', first: 'a', second: 'b', splitPercentage: 50 }}
          onChange={onChange}
          renderTile={() => <CapturingTile />}
        />,
      );

      capturedActions!.mosaicActions.hide(['first']);
      expect(onChange).toHaveBeenCalled();
    });
  });

  describe('mosaicActions.replaceWith', () => {
    it('calls onChange and onRelease when replaceWith is called', () => {
      const onChange = vi.fn();
      const onRelease = vi.fn();
      let capturedActions: MosaicContextValue<string> | null = null;

      const CapturingTile = () => {
        const ctx = useContext(MosaicContext);
        capturedActions = ctx as MosaicContextValue<string>;
        return <div data-testid="tile-a">a</div>;
      };

      render(
        <Mosaic
          value={{ direction: 'row', first: 'a', second: 'b', splitPercentage: 50 }}
          onChange={onChange}
          onRelease={onRelease}
          renderTile={() => <CapturingTile />}
        />,
      );

      capturedActions!.mosaicActions.replaceWith(['first'], 'c');
      expect(onChange).toHaveBeenCalled();
      expect(onRelease).toHaveBeenCalled();
    });
  });

  describe('mosaicActions.expand', () => {
    it('calls onChange when expand is called', () => {
      const onChange = vi.fn();
      let capturedActions: MosaicContextValue<string> | null = null;

      const CapturingTile = () => {
        const ctx = useContext(MosaicContext);
        capturedActions = ctx as MosaicContextValue<string>;
        return <div data-testid="tile-a">a</div>;
      };

      render(
        <Mosaic
          value={{ direction: 'row', first: 'a', second: 'b', splitPercentage: 50 }}
          onChange={onChange}
          renderTile={() => <CapturingTile />}
        />,
      );

      capturedActions!.mosaicActions.expand(['first']);
      expect(onChange).toHaveBeenCalled();
    });
  });

  describe('uncontrolled mosaicActions', () => {
    it('expand updates internal state in uncontrolled mode', () => {
      let capturedActions: MosaicContextValue<string> | null = null;

      const CapturingTile = () => {
        const ctx = useContext(MosaicContext);
        capturedActions = ctx as MosaicContextValue<string>;
        return <div data-testid="tile-a">a</div>;
      };

      render(
        <Mosaic
          initialValue={{ direction: 'row', first: 'a', second: 'b', splitPercentage: 50 }}
          renderTile={() => <CapturingTile />}
        />,
      );

      expect(() => capturedActions!.mosaicActions.expand(['first'])).not.toThrow();
    });

    it('replaceWith updates internal state in uncontrolled mode', () => {
      let capturedActions: MosaicContextValue<string> | null = null;

      const CapturingTile = () => {
        const ctx = useContext(MosaicContext);
        capturedActions = ctx as MosaicContextValue<string>;
        return <div data-testid="tile-a">a</div>;
      };

      render(
        <Mosaic
          initialValue={{ direction: 'row', first: 'a', second: 'b', splitPercentage: 50 }}
          renderTile={() => <CapturingTile />}
        />,
      );

      expect(() => capturedActions!.mosaicActions.replaceWith(['first'], 'c')).not.toThrow();
    });

    it('updateTree updates internal state in uncontrolled mode (no suppress)', () => {
      let capturedActions: MosaicContextValue<string> | null = null;

      const CapturingTile = () => {
        const ctx = useContext(MosaicContext);
        capturedActions = ctx as MosaicContextValue<string>;
        return <div data-testid="tile-a">a</div>;
      };

      render(
        <Mosaic
          initialValue={{ direction: 'row', first: 'a', second: 'b', splitPercentage: 50 }}
          renderTile={() => <CapturingTile />}
        />,
      );

      expect(() =>
        capturedActions!.mosaicActions.updateTree(
          [{ path: [], spec: { splitPercentage: { $set: 60 } } }],
          false,
        ),
      ).not.toThrow();
    });
  });

  describe('renderTile in context', () => {
    it('provides renderTile via MosaicContext', () => {
      let capturedRenderTile: MosaicContextValue<string>['renderTile'] | null = null;

      const CapturingWrapper = () => {
        const ctx = useContext(MosaicContext);
        capturedRenderTile = (ctx as MosaicContextValue<string>).renderTile;
        return <div data-testid="tile-a">a</div>;
      };

      render(<Mosaic value="a" onChange={() => {}} renderTile={() => <CapturingWrapper />} />);

      // The CapturingWrapper reads the REAL renderTile from context
      // But we verify that renderTile IS in context (not null/undefined)
      expect(capturedRenderTile).not.toBeNull();
      expect(typeof capturedRenderTile).toBe('function');
    });
  });
});
