import { createBalancedTreeFromLeaves, getLeaves, pruneTree } from '@/shared/lib';
import type { MosaicKey, MosaicNode, MosaicPanelConfig } from '@/shared/types';
import type { ComponentType, ReactNode } from 'react';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  PanelStateContext,
  createPanelStateContextValue,
  usePanelStateRefs,
} from './panel-state-context';

/**
 * A single registry entry describing how to render a panel by its id.
 *
 * Mirrors the real-world `SensorConfigMap` shape (component / toolbar / wrapper)
 * so an existing registry can be passed in without modification. Titles are kept
 * out of this shape on purpose — supply them via the separate `titles` option.
 */
export interface PersistedPanelEntry {
  component: ComponentType;
  toolbar?: ComponentType;
  wrapper?: ComponentType<{ children: ReactNode }>;
  closable?: boolean;
}

export type PersistedLayoutRegistry<TId extends MosaicKey = string> = Record<
  TId,
  PersistedPanelEntry
>;

export interface UsePersistedLayoutOptions<TId extends MosaicKey = string> {
  /** localStorage key under which the layout tree is persisted. */
  storageKey: string;
  /** Maps each panel id to the component(s) used to render it. */
  registry: PersistedLayoutRegistry<TId>;
  /** Optional id → window title map. Falls back to `String(id)` when absent. */
  titles?: Partial<Record<TId, string>>;
  /** Panels to show on a clean first run (no stored data). Defaults to all registry keys. */
  defaultPanelIds?: TId[];

  // ---------------------------------------------------------------------------
  // Lifecycle callbacks — all optional. Stored in refs so they never need to be
  // listed as dependencies; the latest function reference is always called.
  // ---------------------------------------------------------------------------

  /** Called after `saveLayout()` completes. Receives the tree that was saved. */
  onSave?: (node: MosaicNode<TId> | null) => void;
  /** Called after `resetLayout()` completes. Receives the new default tree. */
  onReset?: (node: MosaicNode<TId> | null) => void;
  /** Called when a panel is added via `addPanel(id)`. Fires only when the panel was not already visible. */
  onPanelOpen?: (id: TId) => void;
  /** Called when a panel is removed via `removePanel(id)`. Fires only when the panel was visible. */
  onPanelClose?: (id: TId) => void;
  /** Called whenever the mosaic tree changes (resize, drag, panel add/remove). */
  onNodeChange?: (node: MosaicNode<TId> | null) => void;
}

export interface UsePersistedLayoutResult<TId extends MosaicKey = string> {
  /** Reconstructed panel configs to pass to `<MosaicLayout panels={...} />`. */
  panels: MosaicPanelConfig<TId>[];
  /** Restored tree to pass to `<MosaicLayout initialNode={...} />` (read once on mount, updated on reset). */
  initialNode: MosaicNode<TId> | null;
  /** Wire into `<MosaicLayout onNodeChange={...} />` to track the live tree. */
  onNodeChange: (node: MosaicNode<TId> | null) => void;
  /** Persist the latest tree and all panel states to localStorage. Manual — call it when you want to save. */
  saveLayout: () => void;
  /** Show a panel by id. No-op if the id is not in the registry. */
  addPanel: (id: TId) => void;
  /** Hide a panel by id. */
  removePanel: (id: TId) => void;
  /** Whether a panel id is currently active. */
  hasPanel: (id: TId) => boolean;
  /** Currently visible panel ids. Useful for rendering panel-toggle menus without calling `hasPanel` per id. */
  activeIds: ReadonlySet<TId>;
  /** True when the tree or panel states have changed since the last `saveLayout()` call. */
  isDirty: boolean;
  /** Hide all panels (does not touch storage). */
  clearLayout: () => void;
  /** Clear stored layout, reset panel states, and restore the default panel set. No remount needed. */
  resetLayout: () => void;
  /**
   * Wrap your MosaicLayout with this provider to enable panel state persistence.
   * Panel components can then call `usePanelState()` to save/restore their state.
   */
  PanelStateProvider: ComponentType<{ children: ReactNode }>;
}

const STORAGE_VERSION = 2 as const;

interface PersistedLayoutV1<TId extends MosaicKey = string> {
  version: 1;
  tree: MosaicNode<TId> | null;
}

interface PersistedLayoutV2<TId extends MosaicKey = string> {
  version: 2;
  tree: MosaicNode<TId> | null;
  panelStates?: Record<string, { state: unknown; version: number }>;
}

type PersistedLayout<TId extends MosaicKey = string> =
  | PersistedLayoutV1<TId>
  | PersistedLayoutV2<TId>;

interface ReadResult<TId extends MosaicKey> {
  tree: MosaicNode<TId> | null;
  panelStates: Record<string, { state: unknown; version: number }>;
}

function safeGetItem(key: string): string | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore quota / disabled storage errors
  }
}

function safeRemoveItem(key: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

function entryToConfig<TId extends MosaicKey>(
  id: TId,
  entry: PersistedPanelEntry,
  title: string,
): MosaicPanelConfig<TId> {
  const Component = entry.component;
  const Toolbar = entry.toolbar;
  const Wrapper = entry.wrapper;
  return {
    id,
    title,
    content: <Component />,
    ...(Toolbar ? { renderToolbar: () => <Toolbar /> } : {}),
    ...(Wrapper ? { Wrapper } : {}),
    ...(entry.closable !== undefined ? { closable: entry.closable } : {}),
  };
}

function defaultTree<TId extends MosaicKey>(
  registry: PersistedLayoutRegistry<TId>,
  defaultPanelIds: TId[] | undefined,
  validIds: Set<TId>,
): MosaicNode<TId> | null {
  const ids = (defaultPanelIds ?? (Object.keys(registry) as TId[])).filter((id) =>
    validIds.has(id),
  );
  return createBalancedTreeFromLeaves(ids);
}

function readPersisted<TId extends MosaicKey>(
  storageKey: string,
  registry: PersistedLayoutRegistry<TId>,
  defaultPanelIds: TId[] | undefined,
): ReadResult<TId> {
  const validIds = new Set(Object.keys(registry) as TId[]);
  const raw = safeGetItem(storageKey);
  const emptyStates: Record<string, { state: unknown; version: number }> = {};

  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<PersistedLayout<TId>>;
      if (parsed?.version === 1 && 'tree' in parsed) {
        return {
          tree: pruneTree((parsed as PersistedLayoutV1<TId>).tree ?? null, validIds),
          panelStates: emptyStates,
        };
      }
      if (parsed?.version === 2 && 'tree' in parsed) {
        const v2 = parsed as PersistedLayoutV2<TId>;
        return {
          tree: pruneTree(v2.tree ?? null, validIds),
          panelStates: v2.panelStates ?? emptyStates,
        };
      }
    } catch {
      // fall through to default
    }
  }

  return {
    tree: defaultTree(registry, defaultPanelIds, validIds),
    panelStates: emptyStates,
  };
}

export function usePersistedLayout<TId extends MosaicKey = string>(
  options: UsePersistedLayoutOptions<TId>,
): UsePersistedLayoutResult<TId> {
  const {
    storageKey,
    registry,
    titles,
    defaultPanelIds,
    onSave,
    onReset,
    onPanelOpen,
    onPanelClose,
    onNodeChange: onNodeChangeProp,
  } = options;

  // Store callbacks in refs so they never need to be listed as deps.
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;
  const onResetRef = useRef(onReset);
  onResetRef.current = onReset;
  const onPanelOpenRef = useRef(onPanelOpen);
  onPanelOpenRef.current = onPanelOpen;
  const onPanelCloseRef = useRef(onPanelClose);
  onPanelCloseRef.current = onPanelClose;
  const onNodeChangePropRef = useRef(onNodeChangeProp);
  onNodeChangePropRef.current = onNodeChangeProp;

  // Compute the restored tree and panel states once, synchronously, before MosaicLayout reads initialNode.
  const [readResult] = useState<ReadResult<TId>>(() =>
    readPersisted(storageKey, registry, defaultPanelIds),
  );
  // initialNode is exposed to MosaicLayout. Updated by resetLayout so MosaicLayout can re-init without remount.
  const [initialNode, setInitialNode] = useState<MosaicNode<TId> | null>(() => readResult.tree);
  const [activeIds, setActiveIds] = useState<Set<TId>>(() => new Set(getLeaves(initialNode)));
  const [isDirty, setIsDirty] = useState(false);

  const liveTreeRef = useRef<MosaicNode<TId> | null>(initialNode);

  // Panel state store — created once per hook instance, never recreated.
  const { storeRef, subscribersRef } = usePanelStateRefs();

  // The context value captures the initialPersistedStates so registerDefaults can seed the store.
  // storeRef, subscribersRef, and readResult are all created via useState/usePanelStateRefs and
  // are stable for the lifetime of this hook instance — including them satisfies exhaustive-deps
  // without causing unnecessary re-creation.
  const panelStateContextValue = useMemo(
    () => createPanelStateContextValue(storeRef, subscribersRef, readResult.panelStates),
    [storeRef, subscribersRef, readResult.panelStates],
  );

  // Stable provider component returned to the consumer.
  const PanelStateProvider = useMemo<ComponentType<{ children: ReactNode }>>(
    () =>
      function PanelStateProvider({ children }: { children: ReactNode }) {
        return (
          <PanelStateContext.Provider value={panelStateContextValue}>
            {children}
          </PanelStateContext.Provider>
        );
      },
    [panelStateContextValue],
  );

  const panels = useMemo<MosaicPanelConfig<TId>[]>(() => {
    const result: MosaicPanelConfig<TId>[] = [];
    for (const id of activeIds) {
      const entry = registry[id];
      if (!entry) continue;
      result.push(entryToConfig(id, entry, titles?.[id] ?? String(id)));
    }
    return result;
  }, [activeIds, registry, titles]);

  const onNodeChange = useCallback((node: MosaicNode<TId> | null) => {
    liveTreeRef.current = node;
    const leaves = new Set(getLeaves(node) as TId[]);
    setActiveIds((prev) =>
      prev.size === leaves.size && [...prev].every((id) => leaves.has(id)) ? prev : leaves,
    );
    setIsDirty(true);
    onNodeChangePropRef.current?.(node);
  }, []);

  const saveLayout = useCallback(() => {
    const payload: PersistedLayoutV2<TId> = {
      version: STORAGE_VERSION,
      tree: liveTreeRef.current,
      panelStates: panelStateContextValue.actions.getAllState(),
    };
    safeSetItem(storageKey, JSON.stringify(payload));
    setIsDirty(false);
    onSaveRef.current?.(liveTreeRef.current);
  }, [storageKey, panelStateContextValue]);

  const addPanel = useCallback(
    (id: TId) => {
      if (!(id in registry)) return;
      setActiveIds((prev) => {
        if (prev.has(id)) return prev;
        onPanelOpenRef.current?.(id);
        return new Set(prev).add(id);
      });
    },
    [registry],
  );

  const removePanel = useCallback((id: TId) => {
    setActiveIds((prev) => {
      if (!prev.has(id)) return prev;
      onPanelCloseRef.current?.(id);
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const hasPanel = useCallback((id: TId) => activeIds.has(id), [activeIds]);

  const clearLayout = useCallback(() => {
    liveTreeRef.current = null;
    setActiveIds((prev) => (prev.size === 0 ? prev : new Set<TId>()));
  }, []);

  const resetLayout = useCallback(() => {
    safeRemoveItem(storageKey);
    storeRef.current.clear();
    const validIds = new Set(Object.keys(registry) as TId[]);
    const tree = defaultTree(registry, defaultPanelIds, validIds);
    liveTreeRef.current = tree;
    setActiveIds(new Set(getLeaves(tree)));
    setInitialNode(tree);
    setIsDirty(false);
    onResetRef.current?.(tree);
  }, [storageKey, registry, defaultPanelIds, storeRef]);

  return {
    panels,
    initialNode,
    onNodeChange,
    saveLayout,
    addPanel,
    removePanel,
    hasPanel,
    activeIds,
    isDirty,
    clearLayout,
    resetLayout,
    PanelStateProvider,
  };
}
