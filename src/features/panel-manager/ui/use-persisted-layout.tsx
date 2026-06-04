import { createBalancedTreeFromLeaves, getLeaves, pruneTree } from '@/shared/lib';
import type { MosaicKey, MosaicNode, MosaicPanelConfig } from '@/shared/types';
import type { ComponentType, ReactNode } from 'react';
import { useCallback, useMemo, useRef, useState } from 'react';

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
}

export interface UsePersistedLayoutResult<TId extends MosaicKey = string> {
  /** Reconstructed panel configs to pass to `<MosaicLayout panels={...} />`. */
  panels: MosaicPanelConfig<TId>[];
  /** Restored tree to pass to `<MosaicLayout initialNode={...} />` (read once on mount). */
  initialNode: MosaicNode<TId> | null;
  /** Wire into `<MosaicLayout onNodeChange={...} />` to track the live tree. */
  onNodeChange: (node: MosaicNode<TId> | null) => void;
  /** Persist the latest tree to localStorage. Manual — call it when you want to save. */
  saveLayout: () => void;
  /** Show a panel by id. No-op if the id is not in the registry. */
  addPanel: (id: TId) => void;
  /** Hide a panel by id. */
  removePanel: (id: TId) => void;
  /** Whether a panel id is currently active. */
  hasPanel: (id: TId) => boolean;
  /** Hide all panels (does not touch storage). */
  clearLayout: () => void;
  /** Clear stored layout and restore the default panel set. */
  resetLayout: () => void;
}

const STORAGE_VERSION = 1 as const;

interface PersistedLayoutV1<TId extends MosaicKey = string> {
  version: typeof STORAGE_VERSION;
  tree: MosaicNode<TId> | null;
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
): MosaicNode<TId> | null {
  const validIds = new Set(Object.keys(registry) as TId[]);
  const raw = safeGetItem(storageKey);

  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<PersistedLayoutV1<TId>>;
      if (parsed && parsed.version === STORAGE_VERSION && 'tree' in parsed) {
        return pruneTree(parsed.tree ?? null, validIds);
      }
    } catch {
      // fall through to default
    }
  }

  return defaultTree(registry, defaultPanelIds, validIds);
}

export function usePersistedLayout<TId extends MosaicKey = string>(
  options: UsePersistedLayoutOptions<TId>,
): UsePersistedLayoutResult<TId> {
  const { storageKey, registry, titles, defaultPanelIds } = options;

  // Compute the restored tree once, synchronously, before MosaicLayout reads initialNode.
  const [initialNode] = useState<MosaicNode<TId> | null>(() =>
    readPersisted(storageKey, registry, defaultPanelIds),
  );
  const [activeIds, setActiveIds] = useState<Set<TId>>(() => new Set(getLeaves(initialNode)));

  const liveTreeRef = useRef<MosaicNode<TId> | null>(initialNode);

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
    const leaves = new Set(getLeaves(node));
    setActiveIds((prev) =>
      prev.size === leaves.size && [...prev].every((id) => leaves.has(id)) ? prev : leaves,
    );
  }, []);

  const saveLayout = useCallback(() => {
    const payload: PersistedLayoutV1<TId> = { version: STORAGE_VERSION, tree: liveTreeRef.current };
    safeSetItem(storageKey, JSON.stringify(payload));
  }, [storageKey]);

  const addPanel = useCallback(
    (id: TId) => {
      if (!(id in registry)) return;
      setActiveIds((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
    },
    [registry],
  );

  const removePanel = useCallback((id: TId) => {
    setActiveIds((prev) => {
      if (!prev.has(id)) return prev;
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
    const validIds = new Set(Object.keys(registry) as TId[]);
    const tree = defaultTree(registry, defaultPanelIds, validIds);
    liveTreeRef.current = tree;
    setActiveIds(new Set(getLeaves(tree)));
  }, [storageKey, registry, defaultPanelIds]);

  return {
    panels,
    initialNode,
    onNodeChange,
    saveLayout,
    addPanel,
    removePanel,
    hasPanel,
    clearLayout,
    resetLayout,
  };
}
