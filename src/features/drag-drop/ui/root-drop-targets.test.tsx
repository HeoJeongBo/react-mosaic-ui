import { MosaicContext } from '@/shared/lib/context';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RootDropTargets } from './root-drop-targets';

afterEach(() => cleanup());

vi.mock('react-dnd', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-dnd')>();
  return {
    ...actual,
    useDrop: vi.fn(() => [{ isOver: false }, vi.fn()]),
  };
});

const mockMosaicActions = {
  expand: vi.fn(),
  remove: vi.fn(),
  hide: vi.fn(),
  replaceWith: vi.fn(),
  updateTree: vi.fn(),
  getRoot: vi.fn(() => null),
};

function renderRootDropTargets(mosaicId = 'test-mosaic') {
  return render(
    <MosaicContext.Provider
      value={{
        mosaicActions: mockMosaicActions,
        mosaicId,
        renderTile: () => <></>,
      }}
    >
      <div style={{ position: 'relative' }}>
        <RootDropTargets />
      </div>
    </MosaicContext.Provider>,
  );
}

describe('RootDropTargets', () => {
  it('renders 8 MosaicDropTarget instances', () => {
    const { container } = renderRootDropTargets();
    const targets = container.querySelectorAll('.rm-mosaic-drop-target');
    expect(targets).toHaveLength(8);
  });

  it('renders 4 root-level drop targets inside rm-root-drop-targets', () => {
    const { container } = renderRootDropTargets();
    const rootContainer = container.querySelector('.rm-root-drop-targets');
    expect(rootContainer).toBeInTheDocument();
    const targets = rootContainer!.querySelectorAll('.rm-mosaic-drop-target');
    expect(targets).toHaveLength(4);
  });

  it('renders 4 viewport-edge drop targets inside rm-viewport-edge-drop-targets', () => {
    const { container } = renderRootDropTargets();
    const edgeContainer = container.querySelector('.rm-viewport-edge-drop-targets');
    expect(edgeContainer).toBeInTheDocument();
    const targets = edgeContainer!.querySelectorAll('.rm-mosaic-drop-target');
    expect(targets).toHaveLength(4);
  });

  it('root-level container has zIndex 990', () => {
    const { container } = renderRootDropTargets();
    const rootContainer = container.querySelector('.rm-root-drop-targets') as HTMLElement;
    expect(rootContainer.style.zIndex).toBe('990');
  });

  it('viewport-edge container has zIndex 9990 and fixed position', () => {
    const { container } = renderRootDropTargets();
    const edgeContainer = container.querySelector('.rm-viewport-edge-drop-targets') as HTMLElement;
    expect(edgeContainer.style.zIndex).toBe('9990');
    expect(edgeContainer.style.position).toBe('fixed');
  });

  it('is wrapped in React.memo', () => {
    const memoSymbol = Symbol.for('react.memo');
    expect((RootDropTargets as unknown as { $$typeof: symbol }).$$typeof).toBe(memoSymbol);
  });

  it('reads mosaicId from context', () => {
    // If mosaicId changes the component re-renders with new value
    const { rerender, container } = render(
      <MosaicContext.Provider
        value={{ mosaicActions: mockMosaicActions, mosaicId: 'mosaic-a', renderTile: () => <></> }}
      >
        <RootDropTargets />
      </MosaicContext.Provider>,
    );
    expect(container.querySelectorAll('.rm-mosaic-drop-target')).toHaveLength(8);

    rerender(
      <MosaicContext.Provider
        value={{ mosaicActions: mockMosaicActions, mosaicId: 'mosaic-b', renderTile: () => <></> }}
      >
        <RootDropTargets />
      </MosaicContext.Provider>,
    );
    expect(container.querySelectorAll('.rm-mosaic-drop-target')).toHaveLength(8);
  });
});
