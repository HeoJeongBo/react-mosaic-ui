import type { MosaicKey } from '@/shared/types';
import type { MosaicPanelConfig } from '@/shared/types';
import { useCallback, useState } from 'react';

function isPanelConfig<TId extends MosaicKey>(
  x: MosaicPanelConfig<TId> | TId,
): x is MosaicPanelConfig<TId> {
  return typeof x === 'object' && x !== null;
}

export function useMosaicPanels<TId extends MosaicKey = string>() {
  const [panels, setPanels] = useState<MosaicPanelConfig<TId>[]>([]);

  const addPanel = useCallback((panel: MosaicPanelConfig<TId>) => {
    setPanels((prev) => (prev.some((p) => p.id === panel.id) ? prev : [...prev, panel]));
  }, []);

  const removePanel = useCallback((id: TId) => {
    setPanels((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const togglePanel = useCallback((panelOrId: MosaicPanelConfig<TId> | TId) => {
    const id = isPanelConfig(panelOrId) ? panelOrId.id : panelOrId;
    setPanels((prev) => {
      if (prev.some((p) => p.id === id)) return prev.filter((p) => p.id !== id);
      if (!isPanelConfig(panelOrId)) return prev;
      return [...prev, panelOrId];
    });
  }, []);

  const hasPanel = useCallback((id: TId) => panels.some((p) => p.id === id), [panels]);

  const clearPanels = useCallback(() => setPanels([]), []);

  const updatePanel = useCallback((id: TId, updates: Partial<MosaicPanelConfig<TId>>) => {
    setPanels((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates, id: p.id } : p)));
  }, []);

  const getPanelById = useCallback(
    (id: TId): MosaicPanelConfig<TId> | null => panels.find((p) => p.id === id) ?? null,
    [panels],
  );

  return {
    panels,
    addPanel,
    removePanel,
    togglePanel,
    hasPanel,
    clearPanels,
    updatePanel,
    getPanelById,
  };
}
