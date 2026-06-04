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
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual({ version: 1, tree: newTree });
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
      expect(stored.version).toBe(1);
      // Before the fix this is just ['alpha'] (stale default) — must be both ids now.
      expect(new Set(getLeaves(stored.tree))).toEqual(new Set(['alpha', 'beta']));

      // Simulate a reload: unmount, then mount a fresh hook instance.
      first.unmount();
      cleanup();
      render(<Harness />);
      expect(new Set(getLeaves(api.initialNode))).toEqual(new Set(['alpha', 'beta']));
    });
  });
});
