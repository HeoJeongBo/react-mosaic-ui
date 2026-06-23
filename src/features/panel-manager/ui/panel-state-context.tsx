import { createContext, useContext, useRef } from 'react';

export interface PanelStateEntry {
  state: unknown;
  version: number;
  migrate?: (persisted: unknown, fromVersion: number) => unknown;
}

export interface PanelStateActions {
  getState: (panelId: string) => unknown;
  setState: (panelId: string, updater: (prev: unknown) => unknown) => void;
  registerDefaults: (
    panelId: string,
    defaults: unknown,
    version: number,
    persistedStates: Record<string, { state: unknown; version: number }>,
    migrate?: (persisted: unknown, fromVersion: number) => unknown,
  ) => void;
  getAllState: () => Record<string, { state: unknown; version: number }>;
  /**
   * Replace the whole persisted snapshot (used by cross-tab sync). Updates the seed
   * for not-yet-registered panels and re-applies state to already-registered ones
   * (respecting each entry's version/migrate), then notifies all subscribers.
   */
  replaceAllState: (states: Record<string, { state: unknown; version: number }>) => void;
}

export interface PanelStateContextValue {
  storeRef: React.MutableRefObject<Map<string, PanelStateEntry>>;
  subscribersRef: React.MutableRefObject<Map<string, Set<() => void>>>;
  actions: PanelStateActions;
}

export const PanelStateContext = createContext<PanelStateContextValue | null>(null);

export function createPanelStateContextValue(
  storeRef: React.MutableRefObject<Map<string, PanelStateEntry>>,
  subscribersRef: React.MutableRefObject<Map<string, Set<() => void>>>,
  initialPersistedStates: Record<string, { state: unknown; version: number }>,
): PanelStateContextValue {
  // Mutable seed for panels that have not registered yet. Cross-tab sync updates it
  // via replaceAllState so a later-mounting panel still picks up the synced value.
  let seedStates = initialPersistedStates;

  // Resolve a persisted snapshot against an entry's version/migrate.
  const resolvePersisted = (
    persisted: { state: unknown; version: number },
    version: number,
    migrate: ((persisted: unknown, fromVersion: number) => unknown) | undefined,
    fallback: unknown,
  ): unknown => {
    if (persisted.version === version) return persisted.state;
    if (migrate) return migrate(persisted.state, persisted.version);
    return fallback;
  };

  const actions: PanelStateActions = {
    getState: (panelId) => storeRef.current.get(panelId)?.state,

    setState: (panelId, updater) => {
      const entry = storeRef.current.get(panelId);
      if (!entry) return;
      const next = updater(entry.state);
      storeRef.current.set(panelId, { ...entry, state: next });
      for (const notify of subscribersRef.current.get(panelId) ?? []) {
        notify();
      }
    },

    registerDefaults: (panelId, defaults, version, persistedStates, migrate) => {
      if (storeRef.current.has(panelId)) return;

      const persisted = persistedStates[panelId] ?? seedStates[panelId];
      const resolvedState = persisted
        ? resolvePersisted(persisted, version, migrate, defaults)
        : defaults;

      const entry: PanelStateEntry = { state: resolvedState, version };
      if (migrate !== undefined) entry.migrate = migrate;
      storeRef.current.set(panelId, entry);
    },

    getAllState: () => {
      const result: Record<string, { state: unknown; version: number }> = {};
      for (const [id, entry] of storeRef.current.entries()) {
        result[id] = { state: entry.state, version: entry.version };
      }
      return result;
    },

    replaceAllState: (states) => {
      // Seed update so panels that mount after the sync pick up the synced value.
      seedStates = states;
      const toNotify = new Set<() => void>();
      for (const [id, snapshot] of Object.entries(states)) {
        const entry = storeRef.current.get(id);
        if (!entry) continue;
        const next = resolvePersisted(snapshot, entry.version, entry.migrate, entry.state);
        storeRef.current.set(id, { ...entry, state: next });
        for (const notify of subscribersRef.current.get(id) ?? []) toNotify.add(notify);
      }
      for (const notify of toNotify) notify();
    },
  };

  return { storeRef, subscribersRef, actions };
}

export function usePanelStateContext(): PanelStateContextValue | null {
  return useContext(PanelStateContext);
}

export function usePanelStateRefs() {
  const storeRef = useRef<Map<string, PanelStateEntry>>(new Map());
  const subscribersRef = useRef<Map<string, Set<() => void>>>(new Map());
  return { storeRef, subscribersRef };
}
