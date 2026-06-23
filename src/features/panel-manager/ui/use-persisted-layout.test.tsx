import { getLeaves } from '@/shared/lib';
import type { MosaicNode } from '@/shared/types';
import { act, cleanup, render, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MosaicLayout } from './mosaic-layout';
import type { PersistedLayoutRegistry } from './use-persisted-layout';
import { usePersistedLayout } from './use-persisted-layout';

vi.mock('react-dnd', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-dnd')>();
  return {
    ...actual,
    useDrop: vi.fn(() => [{}, vi.fn()]),
    useDrag: vi.fn(() => [{ isDragging: false }, vi.fn(), vi.fn()]),
  };
});

type ViewId = 'alpha' | 'beta' | 'gamma';

const Comp = () => null;
const Toolbar = () => null;
const Wrapper = ({ children }: { children: React.ReactNode }) => <>{children}</>;

const REGISTRY: PersistedLayoutRegistry<ViewId> = {
  alpha: { component: Comp },
  beta: { component: Comp, toolbar: Toolbar },
  gamma: { component: Comp, wrapper: Wrapper },
};

const KEY = 'test-layout';

function seed(tree: MosaicNode<string> | null, version = 1) {
  localStorage.setItem(KEY, JSON.stringify({ version, tree }));
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('usePersistedLayout', () => {
  it('clean start uses all registry ids', () => {
    const { result } = renderHook(() =>
      usePersistedLayout({ storageKey: KEY, registry: REGISTRY }),
    );
    const ids = result.current.panels.map((p) => p.id).sort();
    expect(ids).toEqual(['alpha', 'beta', 'gamma']);
    expect(new Set(getLeaves(result.current.initialNode))).toEqual(
      new Set(['alpha', 'beta', 'gamma']),
    );
  });

  it('clean start honours defaultPanelIds and filters unknown ids', () => {
    const { result } = renderHook(() =>
      usePersistedLayout({
        storageKey: KEY,
        registry: REGISTRY,
        defaultPanelIds: ['alpha', 'zzz' as ViewId],
      }),
    );
    expect(result.current.panels.map((p) => p.id)).toEqual(['alpha']);
  });

  it('restores a valid stored tree preserving splitPercentage', () => {
    const tree: MosaicNode<ViewId> = {
      direction: 'row',
      first: 'alpha',
      second: { direction: 'column', first: 'beta', second: 'gamma', splitPercentage: 70 },
      splitPercentage: 30,
    };
    seed(tree);
    const { result } = renderHook(() =>
      usePersistedLayout({ storageKey: KEY, registry: REGISTRY }),
    );
    expect(result.current.initialNode).toEqual(tree);
    expect(new Set(result.current.panels.map((p) => p.id))).toEqual(
      new Set(getLeaves(result.current.initialNode)),
    );
  });

  it('restores a v2 payload (tree + panel states)', () => {
    const tree: MosaicNode<string> = {
      direction: 'row',
      first: 'alpha',
      second: 'beta',
      splitPercentage: 50,
    };
    localStorage.setItem(
      KEY,
      JSON.stringify({
        version: 2,
        tree,
        panelStates: { alpha: { state: { open: true }, version: 1 } },
      }),
    );
    const { result } = renderHook(() =>
      usePersistedLayout({ storageKey: KEY, registry: REGISTRY }),
    );
    expect(result.current.initialNode).toEqual(tree);
    expect(new Set(result.current.panels.map((p) => p.id))).toEqual(new Set(['alpha', 'beta']));
  });

  it('restores a v2 payload missing panelStates (defaults to empty)', () => {
    localStorage.setItem(KEY, JSON.stringify({ version: 2, tree: 'alpha' }));
    const { result } = renderHook(() =>
      usePersistedLayout({ storageKey: KEY, registry: REGISTRY }),
    );
    expect(result.current.initialNode).toBe('alpha');
  });

  it('restores a v2 payload with a null tree', () => {
    localStorage.setItem(KEY, JSON.stringify({ version: 2, tree: null, panelStates: {} }));
    const { result } = renderHook(() =>
      usePersistedLayout({ storageKey: KEY, registry: REGISTRY }),
    );
    expect(result.current.initialNode).toBeNull();
  });

  it('drops stale ids and collapses the split', () => {
    seed({ direction: 'row', first: 'alpha', second: 'ghost', splitPercentage: 40 });
    const { result } = renderHook(() =>
      usePersistedLayout({ storageKey: KEY, registry: REGISTRY }),
    );
    expect(result.current.initialNode).toBe('alpha');
    expect(result.current.panels.map((p) => p.id)).toEqual(['alpha']);
  });

  it('when every id is stale, tree is null and panels empty', () => {
    seed({ direction: 'row', first: 'ghost1', second: 'ghost2' });
    const { result } = renderHook(() =>
      usePersistedLayout({ storageKey: KEY, registry: REGISTRY }),
    );
    expect(result.current.initialNode).toBeNull();
    expect(result.current.panels).toEqual([]);
  });

  it('falls back to defaults on corrupt JSON', () => {
    localStorage.setItem(KEY, '{not json');
    const { result } = renderHook(() =>
      usePersistedLayout({ storageKey: KEY, registry: REGISTRY }),
    );
    expect(result.current.panels).toHaveLength(3);
  });

  it('ignores a blob with the wrong version', () => {
    seed('alpha', 99);
    const { result } = renderHook(() =>
      usePersistedLayout({ storageKey: KEY, registry: REGISTRY }),
    );
    expect(result.current.panels).toHaveLength(3);
  });

  it('saveLayout persists the latest tree', () => {
    const { result } = renderHook(() =>
      usePersistedLayout({ storageKey: KEY, registry: REGISTRY }),
    );
    const newTree: MosaicNode<ViewId> = {
      direction: 'column',
      first: 'alpha',
      second: 'beta',
      splitPercentage: 25,
    };
    act(() => result.current.onNodeChange(newTree));
    act(() => result.current.saveLayout());
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual({
      version: 2,
      tree: newTree,
      panelStates: {},
    });
  });

  it('onNodeChange alone does not write storage (manual save only)', () => {
    const { result } = renderHook(() =>
      usePersistedLayout({ storageKey: KEY, registry: REGISTRY }),
    );
    act(() => result.current.onNodeChange('alpha'));
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('addPanel/removePanel and registry-unknown id is a no-op', () => {
    const { result } = renderHook(() =>
      usePersistedLayout({ storageKey: KEY, registry: REGISTRY, defaultPanelIds: ['alpha'] }),
    );
    act(() => result.current.addPanel('beta'));
    expect(result.current.hasPanel('beta')).toBe(true);
    act(() => result.current.addPanel('nope' as ViewId));
    expect(result.current.panels.map((p) => p.id).sort()).toEqual(['alpha', 'beta']);
    act(() => result.current.removePanel('alpha'));
    expect(result.current.hasPanel('alpha')).toBe(false);
  });

  it('uses titles map with String(id) fallback', () => {
    const { result } = renderHook(() =>
      usePersistedLayout({
        storageKey: KEY,
        registry: REGISTRY,
        titles: { alpha: 'Alpha!' },
        defaultPanelIds: ['alpha', 'beta'],
      }),
    );
    const byId = Object.fromEntries(result.current.panels.map((p) => [p.id, p.title]));
    expect(byId.alpha).toBe('Alpha!');
    expect(byId.beta).toBe('beta');
  });

  it('reconstructs renderToolbar and Wrapper from registry', () => {
    const { result } = renderHook(() =>
      usePersistedLayout({
        storageKey: KEY,
        registry: REGISTRY,
        defaultPanelIds: ['alpha', 'beta', 'gamma'],
      }),
    );
    const beta = result.current.panels.find((p) => p.id === 'beta')!;
    const gamma = result.current.panels.find((p) => p.id === 'gamma')!;
    const alpha = result.current.panels.find((p) => p.id === 'alpha')!;
    expect(typeof beta.renderToolbar).toBe('function');
    expect(gamma.Wrapper).toBe(Wrapper);
    expect(alpha.renderToolbar).toBeUndefined();
    expect(alpha.Wrapper).toBeUndefined();
  });

  it('onNodeChange syncs activeIds when a leaf disappears', () => {
    const { result } = renderHook(() =>
      usePersistedLayout({ storageKey: KEY, registry: REGISTRY }),
    );
    act(() => result.current.onNodeChange({ direction: 'row', first: 'alpha', second: 'beta' }));
    expect(result.current.panels.map((p) => p.id).sort()).toEqual(['alpha', 'beta']);
    act(() => result.current.onNodeChange('alpha'));
    expect(result.current.panels.map((p) => p.id)).toEqual(['alpha']);
  });

  it('clearLayout empties the panel set', () => {
    const { result } = renderHook(() =>
      usePersistedLayout({ storageKey: KEY, registry: REGISTRY }),
    );
    act(() => result.current.clearLayout());
    expect(result.current.panels).toEqual([]);
  });

  it('resetLayout clears storage and restores defaults', () => {
    seed('alpha');
    const { result } = renderHook(() =>
      usePersistedLayout({
        storageKey: KEY,
        registry: REGISTRY,
        defaultPanelIds: ['alpha', 'beta'],
      }),
    );
    act(() => result.current.resetLayout());
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(result.current.panels.map((p) => p.id).sort()).toEqual(['alpha', 'beta']);
  });

  it('initialises safely when localStorage.getItem throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { result } = renderHook(() =>
      usePersistedLayout({ storageKey: KEY, registry: REGISTRY }),
    );
    expect(result.current.panels).toHaveLength(3);
  });

  it('saveLayout swallows storage write errors', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    const { result } = renderHook(() =>
      usePersistedLayout({ storageKey: KEY, registry: REGISTRY }),
    );
    expect(() => act(() => result.current.saveLayout())).not.toThrow();
  });

  it('resetLayout swallows storage remove errors', () => {
    seed('alpha');
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { result } = renderHook(() =>
      usePersistedLayout({ storageKey: KEY, registry: REGISTRY, defaultPanelIds: ['alpha'] }),
    );
    expect(() => act(() => result.current.resetLayout())).not.toThrow();
    expect(result.current.panels.map((p) => p.id)).toEqual(['alpha']);
  });

  it('treats a missing window.localStorage as no storage', () => {
    seed('alpha');
    const original = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', { configurable: true, value: undefined });
    try {
      const { result } = renderHook(() =>
        usePersistedLayout({ storageKey: KEY, registry: REGISTRY, defaultPanelIds: ['alpha'] }),
      );
      // read falls back to defaults (storage unavailable)
      expect(result.current.panels.map((p) => p.id)).toEqual(['alpha']);
      // write/remove are silent no-ops
      expect(() => act(() => result.current.saveLayout())).not.toThrow();
      expect(() => act(() => result.current.resetLayout())).not.toThrow();
    } finally {
      if (original) Object.defineProperty(window, 'localStorage', original);
    }
  });

  it('maps closable from the registry entry', () => {
    const registry: PersistedLayoutRegistry<ViewId> = {
      alpha: { component: Comp, closable: false },
      beta: { component: Comp },
      gamma: { component: Comp },
    };
    const { result } = renderHook(() =>
      usePersistedLayout({ storageKey: KEY, registry, defaultPanelIds: ['alpha', 'beta'] }),
    );
    const alpha = result.current.panels.find((p) => p.id === 'alpha')!;
    const beta = result.current.panels.find((p) => p.id === 'beta')!;
    expect(alpha.closable).toBe(false);
    expect(beta.closable).toBeUndefined();
  });

  it('renderToolbar thunk renders the registry toolbar component', () => {
    const { result } = renderHook(() =>
      usePersistedLayout({ storageKey: KEY, registry: REGISTRY, defaultPanelIds: ['beta'] }),
    );
    const beta = result.current.panels.find((p) => p.id === 'beta')!;
    const node = beta.renderToolbar!();
    expect((node as React.ReactElement).type).toBe(Toolbar);
  });

  it('restores a stored tree of null without throwing', () => {
    seed(null);
    const { result } = renderHook(() =>
      usePersistedLayout({ storageKey: KEY, registry: REGISTRY }),
    );
    expect(result.current.initialNode).toBeNull();
    expect(result.current.panels).toEqual([]);
  });

  it('skips active ids that are not in the registry', () => {
    const { result } = renderHook(() =>
      usePersistedLayout({ storageKey: KEY, registry: REGISTRY }),
    );
    // inject an id ('ghost') with no registry entry via onNodeChange
    act(() => result.current.onNodeChange({ direction: 'row', first: 'alpha', second: 'ghost' }));
    expect(result.current.panels.map((p) => p.id)).toEqual(['alpha']);
  });

  it('onNodeChange keeps the same activeIds set when leaves are unchanged', () => {
    seed({ direction: 'row', first: 'alpha', second: 'beta' });
    const { result } = renderHook(() =>
      usePersistedLayout({ storageKey: KEY, registry: REGISTRY }),
    );
    const before = result.current.panels;
    // Same leaf set, different splitPercentage → activeIds unchanged → panels identity stable
    act(() =>
      result.current.onNodeChange({
        direction: 'row',
        first: 'alpha',
        second: 'beta',
        splitPercentage: 80,
      }),
    );
    expect(result.current.panels).toBe(before);
  });

  it('addPanel is a no-op when the id is already active', () => {
    const { result } = renderHook(() =>
      usePersistedLayout({ storageKey: KEY, registry: REGISTRY, defaultPanelIds: ['alpha'] }),
    );
    const before = result.current.panels;
    act(() => result.current.addPanel('alpha'));
    expect(result.current.panels).toBe(before);
  });

  it('removePanel is a no-op when the id is not active', () => {
    const { result } = renderHook(() =>
      usePersistedLayout({ storageKey: KEY, registry: REGISTRY, defaultPanelIds: ['alpha'] }),
    );
    const before = result.current.panels;
    act(() => result.current.removePanel('beta'));
    expect(result.current.panels).toBe(before);
  });

  it('clearLayout is a no-op when already empty', () => {
    const { result } = renderHook(() =>
      usePersistedLayout({ storageKey: KEY, registry: REGISTRY, defaultPanelIds: [] }),
    );
    act(() => result.current.clearLayout());
    const empty = result.current.panels;
    act(() => result.current.clearLayout());
    expect(result.current.panels).toBe(empty);
  });

  // Regression: programmatic addPanel must reach the persisted tree so that
  // save → reload restores the arranged layout (not the default).
  describe('end-to-end through MosaicLayout (reload simulation)', () => {
    const api: {
      addPanel?: (id: ViewId) => void;
      save?: () => void;
      initialNode?: MosaicNode<ViewId> | null;
    } = {};

    function Harness() {
      const h = usePersistedLayout<ViewId>({
        storageKey: KEY,
        registry: REGISTRY,
        defaultPanelIds: ['alpha'],
      });
      api.addPanel = h.addPanel;
      api.save = h.saveLayout;
      api.initialNode = h.initialNode;
      return (
        <MosaicLayout<ViewId>
          panels={h.panels}
          initialNode={h.initialNode}
          onNodeChange={h.onNodeChange}
        />
      );
    }

    it('add panel → save → reload restores the arranged tree, not the default', () => {
      const first = render(<Harness />);
      act(() => api.addPanel!('beta'));
      act(() => api.save!());

      const stored = JSON.parse(localStorage.getItem(KEY)!) as {
        version: number;
        tree: MosaicNode<ViewId>;
      };
      expect(stored.version).toBe(2);
      // Before the fix this is just ['alpha'] (stale default) — must be both ids now.
      expect(new Set(getLeaves(stored.tree))).toEqual(new Set(['alpha', 'beta']));

      // Simulate a reload: unmount, then mount a fresh hook instance.
      first.unmount();
      cleanup();
      render(<Harness />);
      expect(new Set(getLeaves(api.initialNode))).toEqual(new Set(['alpha', 'beta']));
    });
  });

  // ---------------------------------------------------------------------------
  // Callbacks
  // ---------------------------------------------------------------------------

  describe('callbacks', () => {
    it('onSave is called after saveLayout with the current tree', () => {
      const onSave = vi.fn();
      const { result } = renderHook(() =>
        usePersistedLayout({ storageKey: KEY, registry: REGISTRY, onSave }),
      );
      const tree: MosaicNode<ViewId> = {
        direction: 'row',
        first: 'alpha',
        second: 'beta',
        splitPercentage: 50,
      };
      act(() => result.current.onNodeChange(tree));
      act(() => result.current.saveLayout());
      expect(onSave).toHaveBeenCalledOnce();
      expect(onSave).toHaveBeenCalledWith(tree);
    });

    it('onReset is called after resetLayout with the new default tree', () => {
      const onReset = vi.fn();
      const { result } = renderHook(() =>
        usePersistedLayout({
          storageKey: KEY,
          registry: REGISTRY,
          defaultPanelIds: ['alpha', 'beta'],
          onReset,
        }),
      );
      act(() => result.current.resetLayout());
      expect(onReset).toHaveBeenCalledOnce();
      const arg = onReset.mock.calls[0][0] as MosaicNode<ViewId> | null;
      expect(new Set(getLeaves(arg))).toEqual(new Set(['alpha', 'beta']));
    });

    it('onPanelOpen is called when addPanel adds a new panel', () => {
      const onPanelOpen = vi.fn();
      const { result } = renderHook(() =>
        usePersistedLayout({
          storageKey: KEY,
          registry: REGISTRY,
          defaultPanelIds: ['alpha'],
          onPanelOpen,
        }),
      );
      act(() => result.current.addPanel('beta'));
      expect(onPanelOpen).toHaveBeenCalledOnce();
      expect(onPanelOpen).toHaveBeenCalledWith('beta');
    });

    it('onPanelOpen is NOT called when addPanel is a no-op (already visible)', () => {
      const onPanelOpen = vi.fn();
      const { result } = renderHook(() =>
        usePersistedLayout({
          storageKey: KEY,
          registry: REGISTRY,
          defaultPanelIds: ['alpha'],
          onPanelOpen,
        }),
      );
      act(() => result.current.addPanel('alpha'));
      expect(onPanelOpen).not.toHaveBeenCalled();
    });

    it('onPanelClose is called when removePanel removes a visible panel', () => {
      const onPanelClose = vi.fn();
      const { result } = renderHook(() =>
        usePersistedLayout({
          storageKey: KEY,
          registry: REGISTRY,
          defaultPanelIds: ['alpha', 'beta'],
          onPanelClose,
        }),
      );
      act(() => result.current.removePanel('beta'));
      expect(onPanelClose).toHaveBeenCalledOnce();
      expect(onPanelClose).toHaveBeenCalledWith('beta');
    });

    it('onPanelClose is NOT called when removePanel is a no-op (not visible)', () => {
      const onPanelClose = vi.fn();
      const { result } = renderHook(() =>
        usePersistedLayout({
          storageKey: KEY,
          registry: REGISTRY,
          defaultPanelIds: ['alpha'],
          onPanelClose,
        }),
      );
      act(() => result.current.removePanel('beta'));
      expect(onPanelClose).not.toHaveBeenCalled();
    });

    it('onNodeChange option is called whenever the tree changes', () => {
      const onNodeChange = vi.fn();
      const { result } = renderHook(() =>
        usePersistedLayout({ storageKey: KEY, registry: REGISTRY, onNodeChange }),
      );
      const tree: MosaicNode<ViewId> = 'alpha';
      act(() => result.current.onNodeChange(tree));
      expect(onNodeChange).toHaveBeenCalledWith(tree);
    });

    it('callbacks use the latest function reference without re-render', () => {
      let capturedTree: MosaicNode<ViewId> | null | undefined;
      const onSave = vi.fn((t: MosaicNode<ViewId> | null) => {
        capturedTree = t;
      });
      const { result, rerender } = renderHook(
        (cb: typeof onSave) =>
          usePersistedLayout({ storageKey: KEY, registry: REGISTRY, onSave: cb }),
        { initialProps: onSave },
      );
      const newOnSave = vi.fn((t: MosaicNode<ViewId> | null) => {
        capturedTree = t;
      });
      rerender(newOnSave);
      act(() => result.current.saveLayout());
      expect(onSave).not.toHaveBeenCalled();
      expect(newOnSave).toHaveBeenCalledOnce();
      void capturedTree;
    });
  });

  // ---------------------------------------------------------------------------
  // isDirty
  // ---------------------------------------------------------------------------

  describe('isDirty', () => {
    it('starts as false', () => {
      const { result } = renderHook(() =>
        usePersistedLayout({ storageKey: KEY, registry: REGISTRY }),
      );
      expect(result.current.isDirty).toBe(false);
    });

    it('becomes true after onNodeChange', () => {
      const { result } = renderHook(() =>
        usePersistedLayout({ storageKey: KEY, registry: REGISTRY }),
      );
      act(() => result.current.onNodeChange('alpha'));
      expect(result.current.isDirty).toBe(true);
    });

    it('resets to false after saveLayout', () => {
      const { result } = renderHook(() =>
        usePersistedLayout({ storageKey: KEY, registry: REGISTRY }),
      );
      act(() => result.current.onNodeChange('alpha'));
      act(() => result.current.saveLayout());
      expect(result.current.isDirty).toBe(false);
    });

    it('resets to false after resetLayout', () => {
      const { result } = renderHook(() =>
        usePersistedLayout({ storageKey: KEY, registry: REGISTRY }),
      );
      act(() => result.current.onNodeChange('alpha'));
      act(() => result.current.resetLayout());
      expect(result.current.isDirty).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // activeIds
  // ---------------------------------------------------------------------------

  describe('activeIds', () => {
    it('reflects the initial panel set', () => {
      const { result } = renderHook(() =>
        usePersistedLayout({
          storageKey: KEY,
          registry: REGISTRY,
          defaultPanelIds: ['alpha', 'beta'],
        }),
      );
      expect(result.current.activeIds).toEqual(new Set(['alpha', 'beta']));
    });

    it('updates when addPanel is called', () => {
      const { result } = renderHook(() =>
        usePersistedLayout({ storageKey: KEY, registry: REGISTRY, defaultPanelIds: ['alpha'] }),
      );
      act(() => result.current.addPanel('beta'));
      expect(result.current.activeIds.has('beta')).toBe(true);
    });

    it('updates when removePanel is called', () => {
      const { result } = renderHook(() =>
        usePersistedLayout({
          storageKey: KEY,
          registry: REGISTRY,
          defaultPanelIds: ['alpha', 'beta'],
        }),
      );
      act(() => result.current.removePanel('alpha'));
      expect(result.current.activeIds.has('alpha')).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // resetLayout without remount
  // ---------------------------------------------------------------------------

  describe('resetLayout without remount', () => {
    it('updates initialNode so MosaicLayout can re-init without a key remount', () => {
      const { result } = renderHook(() =>
        usePersistedLayout({ storageKey: KEY, registry: REGISTRY, defaultPanelIds: ['alpha'] }),
      );
      // Change the tree then reset
      act(() => result.current.onNodeChange('beta' as ViewId));
      act(() => result.current.resetLayout());
      // initialNode should now reflect the default (alpha only)
      expect(new Set(getLeaves(result.current.initialNode))).toEqual(new Set(['alpha']));
    });
  });

  // ---------------------------------------------------------------------------
  // PanelStateProvider render path
  // ---------------------------------------------------------------------------

  describe('PanelStateProvider', () => {
    it('renders its children inside the panel-state context', () => {
      const { result } = renderHook(() =>
        usePersistedLayout({ storageKey: KEY, registry: REGISTRY }),
      );
      const Provider = result.current.PanelStateProvider;
      const { getByTestId } = render(
        <Provider>
          <div data-testid="child">child</div>
        </Provider>,
      );
      expect(getByTestId('child')).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // autoSaveDelayMs (opt-in debounced persistence)
  // ---------------------------------------------------------------------------

  describe('autoSaveDelayMs', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('persists after the delay once the tree changes', () => {
      const { result } = renderHook(() =>
        usePersistedLayout({ storageKey: KEY, registry: REGISTRY, autoSaveDelayMs: 500 }),
      );
      act(() => result.current.onNodeChange('alpha'));
      expect(localStorage.getItem(KEY)).toBeNull();
      act(() => vi.advanceTimersByTime(500));
      expect(localStorage.getItem(KEY)).not.toBeNull();
      expect(result.current.isDirty).toBe(false);
    });

    it('debounces rapid changes into a single write', () => {
      const setItem = vi.spyOn(Storage.prototype, 'setItem');
      const { result } = renderHook(() =>
        usePersistedLayout({ storageKey: KEY, registry: REGISTRY, autoSaveDelayMs: 500 }),
      );
      act(() => result.current.onNodeChange('alpha'));
      act(() => vi.advanceTimersByTime(200));
      act(() => result.current.onNodeChange('beta'));
      act(() => vi.advanceTimersByTime(500));
      expect(setItem).toHaveBeenCalledTimes(1);
    });

    it('does not auto-save when the option is undefined', () => {
      const { result } = renderHook(() =>
        usePersistedLayout({ storageKey: KEY, registry: REGISTRY }),
      );
      act(() => result.current.onNodeChange('alpha'));
      act(() => vi.advanceTimersByTime(10_000));
      expect(localStorage.getItem(KEY)).toBeNull();
    });

    it('does not auto-save while the layout is not dirty', () => {
      renderHook(() =>
        usePersistedLayout({ storageKey: KEY, registry: REGISTRY, autoSaveDelayMs: 500 }),
      );
      act(() => vi.advanceTimersByTime(500));
      expect(localStorage.getItem(KEY)).toBeNull();
    });

    it('clears the pending timer on unmount', () => {
      const setItem = vi.spyOn(Storage.prototype, 'setItem');
      const { result, unmount } = renderHook(() =>
        usePersistedLayout({ storageKey: KEY, registry: REGISTRY, autoSaveDelayMs: 500 }),
      );
      act(() => result.current.onNodeChange('alpha'));
      unmount();
      act(() => vi.advanceTimersByTime(500));
      expect(setItem).not.toHaveBeenCalled();
    });
  });

  describe('syncAcrossTabs', () => {
    function fireStorage(key: string | null, newValue: string | null) {
      act(() => {
        window.dispatchEvent(new StorageEvent('storage', { key, newValue }));
      });
    }

    it('re-hydrates the tree and active panels on a storage event for the same key', () => {
      const { result } = renderHook(() =>
        usePersistedLayout({ storageKey: KEY, registry: REGISTRY, syncAcrossTabs: true }),
      );
      // Another tab saves a smaller layout.
      const next = JSON.stringify({ version: 2, tree: 'alpha', panelStates: {} });
      localStorage.setItem(KEY, next);
      fireStorage(KEY, next);
      expect(new Set(getLeaves(result.current.initialNode))).toEqual(new Set(['alpha']));
      expect([...result.current.activeIds]).toEqual(['alpha']);
      expect(result.current.isDirty).toBe(false);
    });

    it('ignores storage events for a different key', () => {
      const { result } = renderHook(() =>
        usePersistedLayout({ storageKey: KEY, registry: REGISTRY, syncAcrossTabs: true }),
      );
      localStorage.setItem('other-key', JSON.stringify({ version: 2, tree: 'alpha' }));
      fireStorage('other-key', 'x');
      expect(new Set(getLeaves(result.current.initialNode))).toEqual(
        new Set(['alpha', 'beta', 'gamma']),
      );
    });

    it('re-hydrates to the default layout when storage is cleared (key === null)', () => {
      seed('alpha');
      const { result } = renderHook(() =>
        usePersistedLayout({ storageKey: KEY, registry: REGISTRY, syncAcrossTabs: true }),
      );
      expect([...result.current.activeIds]).toEqual(['alpha']);
      localStorage.clear();
      fireStorage(null, null);
      expect(new Set(result.current.activeIds)).toEqual(new Set(['alpha', 'beta', 'gamma']));
    });

    it('does not subscribe when syncAcrossTabs is not set', () => {
      const { result } = renderHook(() =>
        usePersistedLayout({ storageKey: KEY, registry: REGISTRY }),
      );
      localStorage.setItem(KEY, JSON.stringify({ version: 2, tree: 'alpha' }));
      fireStorage(KEY, 'x');
      expect(new Set(getLeaves(result.current.initialNode))).toEqual(
        new Set(['alpha', 'beta', 'gamma']),
      );
    });

    it('removes the storage listener on unmount', () => {
      const remove = vi.spyOn(window, 'removeEventListener');
      const { unmount } = renderHook(() =>
        usePersistedLayout({ storageKey: KEY, registry: REGISTRY, syncAcrossTabs: true }),
      );
      unmount();
      expect(remove).toHaveBeenCalledWith('storage', expect.any(Function));
    });
  });
});
