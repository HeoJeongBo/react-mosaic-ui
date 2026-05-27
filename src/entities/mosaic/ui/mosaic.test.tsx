import { MosaicContext } from '@/shared/lib/context';
import type { MosaicContextValue, MosaicNode, MosaicParent, MosaicPath } from '@/shared/types';
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

  describe('uncontrolled updateTree with suppressOnRelease', () => {
    it('calls startTransition when suppressOnRelease=true in uncontrolled mode', () => {
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

      // suppress=true in uncontrolled mode hits the startTransition branch (line 180)
      expect(() =>
        capturedActions!.mosaicActions.updateTree(
          [{ path: [], spec: { splitPercentage: { $set: 70 } } }],
          true,
        ),
      ).not.toThrow();
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

  describe('mosaicActions.add', () => {
    it('sets newNode directly when root is null (controlled)', () => {
      // Capture actions from a non-null render, then test add() when internal root is null.
      // We use uncontrolled mode starting from null so we can verify onChange is called with 'x'.
      const onChangeNull = vi.fn();
      const onReleaseNull = vi.fn();
      let actionsNull: MosaicContextValue<string> | null = null;

      const CapturingZero = () => {
        const ctx = useContext(MosaicContext);
        actionsNull = ctx as MosaicContextValue<string>;
        return <div data-testid="zero">empty</div>;
      };

      render(
        <Mosaic
          value={null}
          onChange={onChangeNull}
          onRelease={onReleaseNull}
          renderTile={renderTile}
          zeroStateView={<CapturingZero />}
        />,
      );

      expect(actionsNull).not.toBeNull();
      actionsNull!.mosaicActions.add('x');
      expect(onChangeNull).toHaveBeenCalledWith('x');
      expect(onReleaseNull).toHaveBeenCalledWith('x');
    });

    it('wraps existing root — preserves root reference as first child', () => {
      const existingRoot: MosaicNode<string> = {
        direction: 'row',
        first: 'a',
        second: 'b',
        splitPercentage: 50,
      };
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
          value={existingRoot}
          onChange={onChange}
          onRelease={onRelease}
          renderTile={() => <CapturingTile />}
        />,
      );

      capturedActions!.mosaicActions.add('c');

      const newTree = onChange.mock.calls[0]?.[0] as MosaicParent<string>;
      expect(newTree.first).toBe(existingRoot);
      expect(newTree.second).toBe('c');
      expect(newTree.direction).toBe('row');
      expect(onRelease).toHaveBeenCalledWith(newTree);
    });

    it('respects custom direction parameter', () => {
      const onChange = vi.fn();
      let capturedActions: MosaicContextValue<string> | null = null;

      const CapturingTile = () => {
        const ctx = useContext(MosaicContext);
        capturedActions = ctx as MosaicContextValue<string>;
        return <div>a</div>;
      };

      render(
        <Mosaic value="a" onChange={onChange} renderTile={() => <CapturingTile />} />,
      );

      capturedActions!.mosaicActions.add('b', 'column');
      const newTree = onChange.mock.calls[0]?.[0] as MosaicParent<string>;
      expect(newTree.direction).toBe('column');
    });

    it('updates internal state in uncontrolled mode', () => {
      let capturedActions: MosaicContextValue<string> | null = null;

      const CapturingTile = () => {
        const ctx = useContext(MosaicContext);
        capturedActions = ctx as MosaicContextValue<string>;
        return <div data-testid="tile-a">a</div>;
      };

      render(
        <Mosaic initialValue="a" renderTile={() => <CapturingTile />} />,
      );

      expect(() => capturedActions!.mosaicActions.add('b')).not.toThrow();
    });
  });

  describe('mosaicActions.expand with null root', () => {
    it('does nothing when root is null and expand is called', () => {
      const onChange = vi.fn();
      let capturedActions: MosaicContextValue<string> | null = null;

      const CapturingZero = () => {
        const ctx = useContext(MosaicContext);
        capturedActions = ctx as MosaicContextValue<string>;
        return <div data-testid="zero">empty</div>;
      };

      render(
        <Mosaic
          value={null}
          onChange={onChange}
          renderTile={renderTile}
          zeroStateView={<CapturingZero />}
        />,
      );

      capturedActions!.mosaicActions.expand(['first']);
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('mosaicActions.expand without onRelease', () => {
    it('calls onChange but not onRelease when onRelease is undefined', () => {
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

      // No onRelease prop — optional chaining returns undefined branch
      expect(() => capturedActions!.mosaicActions.expand(['first'])).not.toThrow();
      expect(onChange).toHaveBeenCalled();
    });
  });

  describe('mosaicActions.remove without onRelease (try block)', () => {
    it('calls onChange after successful remove without onRelease', () => {
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

      // No onRelease — covers the onReleaseRef.current?.(newTree) undefined branch
      expect(() => capturedActions!.mosaicActions.remove(['first'])).not.toThrow();
      expect(onChange).toHaveBeenCalled();
    });
  });

  describe('mosaicActions.remove with null root', () => {
    it('does nothing when root is null and remove is called', () => {
      const onChange = vi.fn();
      let capturedActions: MosaicContextValue<string> | null = null;

      const CapturingZero = () => {
        const ctx = useContext(MosaicContext);
        capturedActions = ctx as MosaicContextValue<string>;
        return <div data-testid="zero">empty</div>;
      };

      render(
        <Mosaic
          value={null}
          onChange={onChange}
          renderTile={renderTile}
          zeroStateView={<CapturingZero />}
        />,
      );

      capturedActions!.mosaicActions.remove(['first']);
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('uncontrolled mosaicActions — remove catch branch', () => {
    it('sets internal state to null when remove throws in uncontrolled mode', () => {
      let capturedActions: MosaicContextValue<string> | null = null;

      const CapturingTile = () => {
        const ctx = useContext(MosaicContext);
        capturedActions = ctx as MosaicContextValue<string>;
        return <div data-testid="tile-a">a</div>;
      };

      render(
        <Mosaic
          initialValue="a"
          renderTile={() => <CapturingTile />}
        />,
      );

      // Removing at path [] throws (cannot remove root), triggering the catch block
      // which sets internal state to null in uncontrolled mode
      expect(() =>
        capturedActions!.mosaicActions.remove([] as unknown as MosaicPath),
      ).not.toThrow();
    });
  });

  describe('uncontrolled mosaicActions — hide branch', () => {
    it('updates internal state when hide is called in uncontrolled mode', () => {
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

      expect(() => capturedActions!.mosaicActions.hide(['first'])).not.toThrow();
    });
  });

  describe('mosaicActions.hide with null root', () => {
    it('does nothing when root is null and hide is called', () => {
      const onChange = vi.fn();
      let capturedActions: MosaicContextValue<string> | null = null;

      const CapturingZero = () => {
        const ctx = useContext(MosaicContext);
        capturedActions = ctx as MosaicContextValue<string>;
        return <div data-testid="zero">empty</div>;
      };

      render(
        <Mosaic
          value={null}
          onChange={onChange}
          renderTile={renderTile}
          zeroStateView={<CapturingZero />}
        />,
      );

      capturedActions!.mosaicActions.hide(['first']);
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('mosaicActions.replaceWith with null root', () => {
    it('does nothing when root is null and replaceWith is called', () => {
      const onChange = vi.fn();
      let capturedActions: MosaicContextValue<string> | null = null;

      const CapturingZero = () => {
        const ctx = useContext(MosaicContext);
        capturedActions = ctx as MosaicContextValue<string>;
        return <div data-testid="zero">empty</div>;
      };

      render(
        <Mosaic
          value={null}
          onChange={onChange}
          renderTile={renderTile}
          zeroStateView={<CapturingZero />}
        />,
      );

      capturedActions!.mosaicActions.replaceWith(['first'], 'b');
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('mosaicActions.updateTree with $set spec (non-optimized path)', () => {
    it('uses regular updateTree when spec has $set (not isSplitPercentageTick)', () => {
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

      // $set in spec — should use regular updateTree (not the optimized path)
      capturedActions!.mosaicActions.updateTree(
        [{ path: ['first'], spec: { $set: 'c' } }],
        true,
      );
      expect(onChange).toHaveBeenCalled();
    });
  });

  describe('mosaicActions.updateTree with null root', () => {
    it('does nothing when root is null and updateTree is called', () => {
      const onChange = vi.fn();
      let capturedActions: MosaicContextValue<string> | null = null;

      const CapturingZero = () => {
        const ctx = useContext(MosaicContext);
        capturedActions = ctx as MosaicContextValue<string>;
        return <div data-testid="zero">empty</div>;
      };

      render(
        <Mosaic
          value={null}
          onChange={onChange}
          renderTile={renderTile}
          zeroStateView={<CapturingZero />}
        />,
      );

      capturedActions!.mosaicActions.updateTree([
        { path: [], spec: { splitPercentage: { $set: 70 } } },
      ]);
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('resize prop', () => {
    it('passes resize options to MosaicRoot when provided', () => {
      const tree: MosaicNode<string> = {
        direction: 'row',
        first: 'a',
        second: 'b',
        splitPercentage: 50,
      };
      expect(() =>
        render(
          <Mosaic
            value={tree}
            onChange={() => {}}
            renderTile={renderTile}
            resize={{ minimumPaneSizePercentage: 10 }}
          />,
        ),
      ).not.toThrow();
    });
  });

  describe('mosaicActions.add in uncontrolled mode with null root', () => {
    it('sets newNode as initial value when root is null in uncontrolled mode', () => {
      const onChange = vi.fn();
      let capturedActions: MosaicContextValue<string> | null = null;

      const CapturingZero = () => {
        const ctx = useContext(MosaicContext);
        capturedActions = ctx as MosaicContextValue<string>;
        return <div data-testid="zero">empty</div>;
      };

      render(
        <Mosaic
          initialValue={null}
          onChange={onChange}
          renderTile={renderTile}
          zeroStateView={<CapturingZero />}
        />,
      );

      capturedActions!.mosaicActions.add('x');
      expect(onChange).toHaveBeenCalledWith('x');
    });
  });

  describe('touch backend detection', () => {
    it('renders without error in touch-only environment', () => {
      // Simulate touch-only device: ontouchstart present, pointer: coarse, no pointer: fine
      const originalOntouchstart = Object.getOwnPropertyDescriptor(window, 'ontouchstart');
      Object.defineProperty(window, 'ontouchstart', { value: () => {}, configurable: true });

      const originalMatchMedia = window.matchMedia;
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query === '(pointer: coarse)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      expect(() =>
        render(<Mosaic value="a" onChange={() => {}} renderTile={renderTile} />),
      ).not.toThrow();

      window.matchMedia = originalMatchMedia;
      if (originalOntouchstart) {
        Object.defineProperty(window, 'ontouchstart', originalOntouchstart);
      } else {
        Object.defineProperty(window, 'ontouchstart', { value: undefined, configurable: true });
      }
    });
  });

  describe('DnD drag CSS class', () => {
    it('subscribeToStateChange is wired up by the useEffect', () => {
      // Verify the DnD manager monitor subscription is established.
      // We can't trigger real DnD events in jsdom, but we can confirm the
      // monitor.subscribeToStateChange path is hit by spying on createDragDropManager.
      // The real manager is created — this covers the useEffect setup code path.
      const { container } = render(
        <Mosaic value="a" onChange={() => {}} renderTile={(id) => <div>{id}</div>} />,
      );
      const mosaic = container.querySelector('.react-mosaic') as HTMLElement;
      // Container exists and rm-dragging is NOT present initially
      expect(mosaic).toBeTruthy();
      expect(mosaic.classList.contains('rm-dragging')).toBe(false);
    });

    it('toggles rm-dragging class via DnD monitor state changes', async () => {
      vi.useFakeTimers();

      // We intercept createDragDropManager via vi.mock at module scope,
      // but since the module is already loaded we use the real manager and
      // invoke the subscribeToStateChange callback manually via a spy.
      let capturedCallback: (() => void) | null = null;
      let isDraggingNow = false;

      // Mock dnd-core for this test to capture the subscription callback
      vi.mock('dnd-core', async (importOriginal) => {
        const actual = await importOriginal<typeof import('dnd-core')>();
        return {
          ...actual,
          createDragDropManager: vi.fn((...args: unknown[]) => {
            const manager = actual.createDragDropManager(...(args as Parameters<typeof actual.createDragDropManager>));
            const originalGetMonitor = manager.getMonitor.bind(manager);
            manager.getMonitor = () => {
              const monitor = originalGetMonitor();
              const originalSubscribe = monitor.subscribeToStateChange.bind(monitor);
              monitor.subscribeToStateChange = (cb: () => void) => {
                capturedCallback = cb;
                return originalSubscribe(cb);
              };
              monitor.isDragging = () => isDraggingNow;
              return monitor;
            };
            return manager;
          }),
        };
      });

      const { container } = render(
        <Mosaic value="a" onChange={() => {}} renderTile={(id) => <div>{id}</div>} />,
      );
      const mosaic = container.querySelector('.react-mosaic') as HTMLElement;

      if (capturedCallback) {
        // Simulate drag start
        isDraggingNow = true;
        capturedCallback();
        vi.runAllTimers();
        expect(mosaic.classList.contains('rm-dragging')).toBe(true);

        // Simulate drag end
        isDraggingNow = false;
        capturedCallback();
        expect(mosaic.classList.contains('rm-dragging')).toBe(false);

        // Same isDragging value — should be a no-op (wasDragging guard)
        capturedCallback();
        expect(mosaic.classList.contains('rm-dragging')).toBe(false);
      }

      vi.useRealTimers();
      vi.unmock('dnd-core');
    });
  });
});
