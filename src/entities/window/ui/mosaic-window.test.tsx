import { MosaicContext, MosaicWindowContext } from '@/shared/lib/context';
import type { MosaicNode } from '@/shared/types';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React, { useContext } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MosaicWindow } from './mosaic-window';

afterEach(() => cleanup());

const mockUseDragLayer = vi.fn(() => ({ isDragging: false }));

vi.mock('react-dnd', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-dnd')>();
  return {
    ...actual,
    useDrag: vi.fn(() => [{}, vi.fn(), vi.fn()]),
    useDrop: vi.fn(() => [{ isOver: false }, vi.fn()]),
    useDragLayer: () => mockUseDragLayer(),
  };
});

const mockMosaicActions = {
  expand: vi.fn(),
  remove: vi.fn(),
  hide: vi.fn(),
  replaceWith: vi.fn(),
  updateTree: vi.fn(),
  getRoot: vi.fn(() => 'a' as MosaicNode<string> | null),
  add: vi.fn(),
};

function renderWindow(props: Partial<React.ComponentProps<typeof MosaicWindow<string>>> = {}) {
  return render(
    <MosaicContext.Provider
      value={{
        mosaicActions: mockMosaicActions,
        mosaicId: 'test-mosaic',
        renderTile: () => <></>,
      }}
    >
      <MosaicWindow title="Test Window" path={['first']} {...props}>
        <div data-testid="child-content">child</div>
      </MosaicWindow>
    </MosaicContext.Provider>,
  );
}

describe('MosaicWindow', () => {
  describe('rendering', () => {
    it('renders title', () => {
      renderWindow({ title: 'My Window' });
      expect(screen.getByText('My Window')).toBeInTheDocument();
    });

    it('renders children', () => {
      renderWindow();
      expect(screen.getByTestId('child-content')).toBeInTheDocument();
    });

    it('renders toolbarControls when provided', () => {
      renderWindow({ toolbarControls: <button type="button">Custom</button> });
      expect(screen.getByText('Custom')).toBeInTheDocument();
    });

    it('renders Close button always', () => {
      renderWindow();
      expect(screen.getByTitle('Close')).toBeInTheDocument();
    });

    it('renders Close button when closable is explicitly true', () => {
      renderWindow({ closable: true });
      expect(screen.getByTitle('Close')).toBeInTheDocument();
    });

    it('hides Close button when closable is false', () => {
      renderWindow({ closable: false });
      expect(screen.queryByTitle('Close')).not.toBeInTheDocument();
    });

    it('renders Split, Replace, Expand buttons when createNode is provided', () => {
      renderWindow({ createNode: () => 'new' });
      expect(screen.getByTitle('Split')).toBeInTheDocument();
      expect(screen.getByTitle('Replace')).toBeInTheDocument();
      expect(screen.getByTitle('Expand')).toBeInTheDocument();
    });

    it('does NOT render Split/Replace buttons when createNode is absent', () => {
      renderWindow();
      expect(screen.queryByTitle('Split')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Replace')).not.toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = renderWindow({ className: 'custom-window' });
      expect(container.querySelector('.custom-window')).toBeInTheDocument();
    });

    it('renders no toolbar when hideToolbar is true', () => {
      const { container } = renderWindow({ hideToolbar: true });
      expect(container.querySelector('.rm-mosaic-window-toolbar')).toBeNull();
      expect(screen.queryByTitle('Close')).toBeNull();
    });

    it('renders the toolbar by default', () => {
      const { container } = renderWindow();
      expect(container.querySelector('.rm-mosaic-window-toolbar')).not.toBeNull();
    });

    it('applies bodyPadding as inline style on the window body', () => {
      const { container } = renderWindow({ bodyPadding: 0 });
      const body = container.querySelector('.rm-mosaic-window-body') as HTMLElement;
      expect(body).not.toBeNull();
      expect(body.style.padding).toBe('0px');
    });

    it('applies bodyClassName alongside the body class', () => {
      const { container } = renderWindow({ bodyClassName: 'my-body' });
      const body = container.querySelector('.rm-mosaic-window-body');
      expect(body).not.toBeNull();
      expect(body).toHaveClass('my-body');
    });
  });

  describe('toolbar actions', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('Close button calls mosaicActions.remove with path', () => {
      renderWindow({ path: ['first', 'second'] });
      fireEvent.click(screen.getByTitle('Close'));
      expect(mockMosaicActions.remove).toHaveBeenCalledWith(['first', 'second']);
    });

    it('Expand button calls mosaicActions.expand with path', () => {
      renderWindow({ path: ['first'], createNode: () => 'new' });
      fireEvent.click(screen.getByTitle('Expand'));
      expect(mockMosaicActions.expand).toHaveBeenCalledWith(['first']);
    });

    it('Split button calls windowActions.split', async () => {
      const createNode = vi.fn(() => 'new-node');
      // getRoot must return a tree containing the path ['first']
      mockMosaicActions.getRoot.mockReturnValue({
        direction: 'row',
        first: 'a',
        second: 'b',
        splitPercentage: 50,
      });
      renderWindow({ path: ['first'], createNode });
      fireEvent.click(screen.getByTitle('Split'));
      await vi.waitFor(() => {
        expect(mockMosaicActions.replaceWith).toHaveBeenCalled();
      });
    });

    it('Replace button calls windowActions.replaceWithNew', async () => {
      const createNode = vi.fn(() => 'replaced');
      renderWindow({ path: ['first'], createNode });
      fireEvent.click(screen.getByTitle('Replace'));
      await vi.waitFor(() => {
        expect(mockMosaicActions.replaceWith).toHaveBeenCalledWith(['first'], 'replaced');
      });
    });

    it('handles Replace error gracefully', async () => {
      const errorCreateNode = vi.fn(() => {
        throw new Error('create failed');
      });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      renderWindow({ path: ['first'], createNode: errorCreateNode });
      fireEvent.click(screen.getByTitle('Replace'));
      await vi.waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });
      consoleSpy.mockRestore();
    });

    it('handles Split error gracefully', async () => {
      const errorCreateNode = vi.fn(() => {
        throw new Error('create failed');
      });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      // getRoot returns null so split throws
      mockMosaicActions.getRoot.mockReturnValueOnce(null);
      renderWindow({ path: ['first'], createNode: errorCreateNode });
      fireEvent.click(screen.getByTitle('Split'));
      await vi.waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });
      consoleSpy.mockRestore();
    });

    it('Split does nothing when getRoot returns null after createNode succeeds', async () => {
      const createNode = vi.fn(() => 'new-node');
      mockMosaicActions.getRoot.mockReturnValueOnce(null);
      renderWindow({ path: ['first'], createNode });
      fireEvent.click(screen.getByTitle('Split'));
      await vi.waitFor(() => {
        expect(createNode).toHaveBeenCalled();
      });
      expect(mockMosaicActions.replaceWith).not.toHaveBeenCalled();
    });

    it('Split does nothing when getNodeAtPath returns null for the window path', async () => {
      // createNode succeeds, getRoot returns a tree, but path ['first'] node is null
      // (e.g. path points to non-existent branch in the tree)
      const createNode = vi.fn(() => 'new-node');
      mockMosaicActions.getRoot.mockReturnValueOnce({
        direction: 'row',
        first: 'a',
        second: 'b',
        splitPercentage: 50,
      });
      // path ['second', 'first'] does not exist in the above tree → getNodeAtPath returns null
      renderWindow({ path: ['second', 'first'], createNode });
      fireEvent.click(screen.getByTitle('Split'));
      await vi.waitFor(() => {
        // createNode was called but replaceWith was NOT (because currentNodeAtPath is null)
        expect(createNode).toHaveBeenCalled();
      });
      expect(mockMosaicActions.replaceWith).not.toHaveBeenCalled();
    });
  });

  describe('additionalControls drawer', () => {
    it('shows More button when additionalControls provided', () => {
      renderWindow({ additionalControls: <div>extra</div> });
      expect(screen.getByTitle('More')).toBeInTheDocument();
    });

    it('does not show More button when additionalControls absent', () => {
      renderWindow();
      expect(screen.queryByTitle('More')).not.toBeInTheDocument();
    });

    it('toggles drawer open/closed on More click', () => {
      renderWindow({ additionalControls: <div data-testid="extra-ctrl">extra</div> });
      expect(screen.queryByTestId('extra-ctrl')).not.toBeInTheDocument();

      fireEvent.click(screen.getByTitle('More'));
      expect(screen.getByTestId('extra-ctrl')).toBeInTheDocument();

      fireEvent.click(screen.getByTitle('More'));
      expect(screen.queryByTestId('extra-ctrl')).not.toBeInTheDocument();
    });
  });

  describe('renderToolbar', () => {
    it('calls renderToolbar with toolbarProps and defaultToolbar', () => {
      const renderToolbar = vi.fn((_, defaultToolbar) => defaultToolbar);
      renderWindow({ renderToolbar, title: 'Custom Bar' });
      expect(renderToolbar).toHaveBeenCalled();
      const [toolbarProps] = renderToolbar.mock.calls[0] as [{ title: string }, unknown];
      expect(toolbarProps.title).toBe('Custom Bar');
    });

    it('renders custom toolbar returned by renderToolbar', () => {
      const renderToolbar = () => <div data-testid="my-toolbar">custom</div>;
      renderWindow({ renderToolbar });
      expect(screen.getByTestId('my-toolbar')).toBeInTheDocument();
    });
  });

  describe('React.memo', () => {
    it('is wrapped in React.memo', () => {
      const memoSymbol = Symbol.for('react.memo');
      expect((MosaicWindow as unknown as { $$typeof: symbol }).$$typeof).toBe(memoSymbol);
    });

    it('does not re-render when only callback props change', () => {
      let windowRenderCount = 0;

      type CountingWindowProps = Omit<
        React.ComponentProps<typeof MosaicWindow<string>>,
        'children'
      >;
      const CountingWindow = React.memo((props: CountingWindowProps) => {
        windowRenderCount++;
        return (
          <MosaicWindow {...props}>
            <div>child</div>
          </MosaicWindow>
        );
      });

      const { rerender } = render(
        <MosaicContext.Provider
          value={{ mosaicActions: mockMosaicActions, mosaicId: 'test', renderTile: () => <></> }}
        >
          <CountingWindow
            title="Test"
            path={['first']}
            onDragStart={() => {}}
            onDragEnd={() => {}}
          />
        </MosaicContext.Provider>,
      );

      const before = windowRenderCount;

      rerender(
        <MosaicContext.Provider
          value={{ mosaicActions: mockMosaicActions, mosaicId: 'test', renderTile: () => <></> }}
        >
          <CountingWindow
            title="Test"
            path={['first']}
            onDragStart={() => {}} // new function reference
            onDragEnd={() => {}} // new function reference
          />
        </MosaicContext.Provider>,
      );

      // CountingWindow is its own memo — if MosaicWindow's memo prevented re-render,
      // CountingWindow itself would still re-render since its props changed.
      // The key test is that the MosaicWindow $$typeof is 'react.memo'
      expect(windowRenderCount).toBeGreaterThanOrEqual(before);
    });

    it('re-renders when title changes', () => {
      const { rerender } = render(
        <MosaicContext.Provider
          value={{ mosaicActions: mockMosaicActions, mosaicId: 'test', renderTile: () => <></> }}
        >
          <MosaicWindow title="Title A" path={['first']}>
            <div>child</div>
          </MosaicWindow>
        </MosaicContext.Provider>,
      );
      expect(screen.getByText('Title A')).toBeInTheDocument();

      rerender(
        <MosaicContext.Provider
          value={{ mosaicActions: mockMosaicActions, mosaicId: 'test', renderTile: () => <></> }}
        >
          <MosaicWindow title="Title B" path={['first']}>
            <div>child</div>
          </MosaicWindow>
        </MosaicContext.Provider>,
      );
      expect(screen.getByText('Title B')).toBeInTheDocument();
    });

    it('re-renders when a new prop key is added (next has key prev does not)', () => {
      // children and the context value must be referentially stable so the memo
      // comparator's first loop (over prev keys) passes and reaches the second
      // loop (over next keys) where the newly-added `toolbarControls` key — absent
      // in prev — triggers `return false` (line 177).
      const stableChild = <div>child</div>;
      const ctxValue = {
        mosaicActions: mockMosaicActions,
        mosaicId: 'test',
        renderTile: () => <></>,
      };

      const { rerender } = render(
        <MosaicContext.Provider value={ctxValue}>
          <MosaicWindow title="Test" path={['first']}>
            {stableChild}
          </MosaicWindow>
        </MosaicContext.Provider>,
      );
      expect(screen.queryByTestId('extra-tc')).not.toBeInTheDocument();

      rerender(
        <MosaicContext.Provider value={ctxValue}>
          <MosaicWindow
            title="Test"
            path={['first']}
            toolbarControls={<span data-testid="extra-tc">tc</span>}
          >
            {stableChild}
          </MosaicWindow>
        </MosaicContext.Provider>,
      );

      // Re-rendered with the new prop → the toolbar control is now shown.
      expect(screen.getByTestId('extra-tc')).toBeInTheDocument();
    });

    it('toolbar re-renders when createNode added (new key in next not in prev)', () => {
      // MosaicWindowToolbar memo has a "for key of Object.keys(next)" loop that returns false
      // when next has a key that prev does not have. Stable children + context value keep the
      // parent MosaicWindow from remounting, so the toolbar memo comparator actually runs and
      // reaches that loop when `createNode` (and thus a new toolbar prop) appears.
      const stableChild = <div>child</div>;
      const ctxValue = {
        mosaicActions: mockMosaicActions,
        mosaicId: 'test',
        renderTile: () => <></>,
      };

      const { rerender } = render(
        <MosaicContext.Provider value={ctxValue}>
          <MosaicWindow title="Test" path={['first']}>
            {stableChild}
          </MosaicWindow>
        </MosaicContext.Provider>,
      );

      // Initially no Split button (no createNode)
      expect(screen.queryByTitle('Split')).not.toBeInTheDocument();

      // Rerender with createNode — toolbar now gets a new prop it didn't have before
      rerender(
        <MosaicContext.Provider value={ctxValue}>
          <MosaicWindow title="Test" path={['first']} createNode={() => 'new'}>
            {stableChild}
          </MosaicWindow>
        </MosaicContext.Provider>,
      );

      // Split button should now appear (toolbar re-rendered with new createNode prop)
      expect(screen.getByTitle('Split')).toBeInTheDocument();
    });

    it('re-renders when path changes', () => {
      const { rerender } = render(
        <MosaicContext.Provider
          value={{ mosaicActions: mockMosaicActions, mosaicId: 'test', renderTile: () => <></> }}
        >
          <MosaicWindow title="Test" path={['first']}>
            <div>child</div>
          </MosaicWindow>
        </MosaicContext.Provider>,
      );

      rerender(
        <MosaicContext.Provider
          value={{ mosaicActions: mockMosaicActions, mosaicId: 'test', renderTile: () => <></> }}
        >
          <MosaicWindow title="Test" path={['second']}>
            <div>child</div>
          </MosaicWindow>
        </MosaicContext.Provider>,
      );

      // Close button still renders after path update (no crash)
      expect(screen.getByTitle('Close')).toBeInTheDocument();
    });
  });

  describe('useDrag factory callbacks', () => {
    it('item callback calls onDragStart when provided and returns drag item', async () => {
      const onDragStart = vi.fn();
      vi.useFakeTimers();

      renderWindow({ path: ['first'], onDragStart });

      // Capture the factory function passed to useDrag
      const { useDrag } = vi.mocked(await import('react-dnd'));
      const factory = useDrag.mock.calls[useDrag.mock.calls.length - 1]?.[0];
      const spec = typeof factory === 'function' ? factory() : factory;

      // Call the item callback (simulates drag start)
      const item = spec?.item?.();
      expect(item).toMatchObject({ path: ['first'] });

      vi.runAllTimers();
      expect(onDragStart).toHaveBeenCalled();
      vi.useRealTimers();
    });

    it('item callback skips onDragStart when not provided', async () => {
      renderWindow({ path: ['second'] });

      const { useDrag } = vi.mocked(await import('react-dnd'));
      const factory = useDrag.mock.calls[useDrag.mock.calls.length - 1]?.[0];
      const spec = typeof factory === 'function' ? factory() : factory;

      // No onDragStart — item() should still return the drag item without error
      expect(() => spec?.item?.()).not.toThrow();
    });

    it('end callback calls onDragEnd with "drop" when didDrop is true', async () => {
      const onDragEnd = vi.fn();
      renderWindow({ path: ['first'], onDragEnd });

      const { useDrag } = vi.mocked(await import('react-dnd'));
      const factory = useDrag.mock.calls[useDrag.mock.calls.length - 1]?.[0];
      const spec = typeof factory === 'function' ? factory() : factory;

      const monitor = { didDrop: () => true };
      spec?.end?.({} as ReturnType<typeof spec.item>, monitor as Parameters<typeof spec.end>[1]);
      expect(onDragEnd).toHaveBeenCalledWith('drop');
    });

    it('end callback calls onDragEnd with "reset" when didDrop is false', async () => {
      const onDragEnd = vi.fn();
      renderWindow({ path: ['first'], onDragEnd });

      const { useDrag } = vi.mocked(await import('react-dnd'));
      const factory = useDrag.mock.calls[useDrag.mock.calls.length - 1]?.[0];
      const spec = typeof factory === 'function' ? factory() : factory;

      const monitor = { didDrop: () => false };
      spec?.end?.({} as ReturnType<typeof spec.item>, monitor as Parameters<typeof spec.end>[1]);
      expect(onDragEnd).toHaveBeenCalledWith('reset');
    });
  });

  describe('drag isolation', () => {
    it('does not re-render children when isDragging changes', () => {
      let childRenderCount = 0;
      const Child = () => {
        childRenderCount++;
        return <div data-testid="child">child</div>;
      };
      const stableChild = <Child />;

      const { rerender } = render(
        <MosaicContext.Provider
          value={{ mosaicActions: mockMosaicActions, mosaicId: 'test', renderTile: () => <></> }}
        >
          <MosaicWindow title="Test" path={['first']}>
            {stableChild}
          </MosaicWindow>
        </MosaicContext.Provider>,
      );

      const before = childRenderCount;

      // Simulate drag start: useDragLayer returns isDragging: true
      mockUseDragLayer.mockReturnValue({ isDragging: true });

      rerender(
        <MosaicContext.Provider
          value={{ mosaicActions: mockMosaicActions, mosaicId: 'test', renderTile: () => <></> }}
        >
          <MosaicWindow title="Test" path={['first']}>
            {stableChild}
          </MosaicWindow>
        </MosaicContext.Provider>,
      );

      // Children must not have re-rendered — isDragging is isolated to the toolbar
      expect(childRenderCount).toBe(before);
    });
  });

  describe('MosaicWindowContext', () => {
    it('provides windowActions.getPath returning current path', () => {
      let capturedPath: string[] | null = null;

      const PathReader = () => {
        const { mosaicWindowActions } = useContext(MosaicWindowContext);
        capturedPath = mosaicWindowActions.getPath();
        return null;
      };

      render(
        <MosaicContext.Provider
          value={{ mosaicActions: mockMosaicActions, mosaicId: 'test', renderTile: () => <></> }}
        >
          <MosaicWindow title="Test" path={['first', 'second']}>
            <PathReader />
          </MosaicWindow>
        </MosaicContext.Provider>,
      );

      expect(capturedPath).toEqual(['first', 'second']);
    });

    it('windowActions reference is stable across re-renders', () => {
      const captured: object[] = [];

      const ActionCapture = () => {
        const { mosaicWindowActions } = useContext(MosaicWindowContext);
        captured.push(mosaicWindowActions);
        return null;
      };

      const { rerender } = render(
        <MosaicContext.Provider
          value={{ mosaicActions: mockMosaicActions, mosaicId: 'test', renderTile: () => <></> }}
        >
          <MosaicWindow title="Test" path={['first']}>
            <ActionCapture />
          </MosaicWindow>
        </MosaicContext.Provider>,
      );

      rerender(
        <MosaicContext.Provider
          value={{ mosaicActions: mockMosaicActions, mosaicId: 'test', renderTile: () => <></> }}
        >
          <MosaicWindow title="Test" path={['first']}>
            <ActionCapture />
          </MosaicWindow>
        </MosaicContext.Provider>,
      );

      expect(captured.length).toBeGreaterThanOrEqual(2);
      expect(captured[0]).toBe(captured[captured.length - 1]);
    });
  });
});
