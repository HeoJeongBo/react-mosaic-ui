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

      const persisted = persistedStates[panelId] ?? initialPersistedStates[panelId];
      let resolvedState: unknown;
      if (persisted) {
        if (persisted.version === version) {
          resolvedState = persisted.state;
        } else if (migrate) {
          resolvedState = migrate(persisted.state, persisted.version);
        } else {
          resolvedState = defaults;
        }
      } else {
        resolvedState = defaults;
      }

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
