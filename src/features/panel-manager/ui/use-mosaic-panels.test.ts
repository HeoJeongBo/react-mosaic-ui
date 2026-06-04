import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useMosaicPanels } from './use-mosaic-panels';

const makePanel = (id: string) => ({ id, title: `Panel ${id}`, content: null });

describe('useMosaicPanels', () => {
  it('initial panels is an empty array', () => {
    const { result } = renderHook(() => useMosaicPanels());
    expect(result.current.panels).toEqual([]);
  });

  describe('addPanel', () => {
    it('adds a new panel', () => {
      const { result } = renderHook(() => useMosaicPanels());
      act(() => result.current.addPanel(makePanel('a')));
      expect(result.current.panels).toHaveLength(1);
      expect(result.current.panels[0]?.id).toBe('a');
    });

    it('ignores duplicate id', () => {
      const { result } = renderHook(() => useMosaicPanels());
      act(() => result.current.addPanel(makePanel('a')));
      act(() => result.current.addPanel(makePanel('a')));
      expect(result.current.panels).toHaveLength(1);
    });
  });

  describe('removePanel', () => {
    it('removes an existing panel', () => {
      const { result } = renderHook(() => useMosaicPanels());
      act(() => result.current.addPanel(makePanel('a')));
      act(() => result.current.removePanel('a'));
      expect(result.current.panels).toHaveLength(0);
    });

    it('is a no-op for unknown id', () => {
      const { result } = renderHook(() => useMosaicPanels());
      act(() => result.current.addPanel(makePanel('a')));
      act(() => result.current.removePanel('z'));
      expect(result.current.panels).toHaveLength(1);
    });
  });

  describe('togglePanel', () => {
    it('adds if not present', () => {
      const { result } = renderHook(() => useMosaicPanels());
      act(() => result.current.togglePanel(makePanel('a')));
      expect(result.current.panels).toHaveLength(1);
    });

    it('removes if present', () => {
      const { result } = renderHook(() => useMosaicPanels());
      act(() => result.current.togglePanel(makePanel('a')));
      act(() => result.current.togglePanel(makePanel('a')));
      expect(result.current.panels).toHaveLength(0);
    });

    it('id만으로 호출 시 존재하는 패널을 제거함', () => {
      const { result } = renderHook(() => useMosaicPanels());
      act(() => result.current.addPanel(makePanel('a')));
      act(() => result.current.togglePanel('a'));
      expect(result.current.panels).toHaveLength(0);
    });

    it('id만으로 호출 시 없는 패널이면 no-op', () => {
      const { result } = renderHook(() => useMosaicPanels());
      act(() => result.current.togglePanel('nonexistent'));
      expect(result.current.panels).toHaveLength(0);
    });
  });

  describe('hasPanel', () => {
    it('returns true when panel exists', () => {
      const { result } = renderHook(() => useMosaicPanels());
      act(() => result.current.addPanel(makePanel('a')));
      expect(result.current.hasPanel('a')).toBe(true);
    });

    it('returns false when panel does not exist', () => {
      const { result } = renderHook(() => useMosaicPanels());
      expect(result.current.hasPanel('a')).toBe(false);
    });
  });

  describe('clearPanels', () => {
    it('removes all panels', () => {
      const { result } = renderHook(() => useMosaicPanels());
      act(() => result.current.addPanel(makePanel('a')));
      act(() => result.current.addPanel(makePanel('b')));
      act(() => result.current.clearPanels());
      expect(result.current.panels).toHaveLength(0);
    });
  });

  describe('updatePanel', () => {
    it('updates title', () => {
      const { result } = renderHook(() => useMosaicPanels());
      act(() => result.current.addPanel(makePanel('a')));
      act(() => result.current.updatePanel('a', { title: 'Updated Title' }));
      expect(result.current.panels[0]?.title).toBe('Updated Title');
    });

    it('updates content', () => {
      const { result } = renderHook(() => useMosaicPanels());
      act(() => result.current.addPanel(makePanel('a')));
      act(() => result.current.updatePanel('a', { content: 'new content' }));
      expect(result.current.panels[0]?.content).toBe('new content');
    });

    it('does not change id even when id is included in updates', () => {
      const { result } = renderHook(() => useMosaicPanels());
      act(() => result.current.addPanel(makePanel('a')));
      act(() => result.current.updatePanel('a', { id: 'z' } as never));
      expect(result.current.panels[0]?.id).toBe('a');
    });

    it('is a no-op for non-existent id', () => {
      const { result } = renderHook(() => useMosaicPanels());
      act(() => result.current.addPanel(makePanel('a')));
      const before = result.current.panels[0];
      act(() => result.current.updatePanel('z', { title: 'X' }));
      expect(result.current.panels).toHaveLength(1);
      expect(result.current.panels[0]).toBe(before);
    });

    it('only changes the target panel and preserves other panels', () => {
      const { result } = renderHook(() => useMosaicPanels());
      act(() => result.current.addPanel(makePanel('a')));
      act(() => result.current.addPanel(makePanel('b')));
      const beforeB = result.current.panels[1];
      act(() => result.current.updatePanel('a', { title: 'New A' }));
      expect(result.current.panels[0]?.title).toBe('New A');
      expect(result.current.panels[1]).toBe(beforeB);
    });
  });

  describe('getPanelById', () => {
    it('returns the config for an existing id', () => {
      const { result } = renderHook(() => useMosaicPanels());
      act(() => result.current.addPanel(makePanel('a')));
      const panel = result.current.getPanelById('a');
      expect(panel?.id).toBe('a');
      expect(panel?.title).toBe('Panel a');
    });

    it('returns null for a non-existent id', () => {
      const { result } = renderHook(() => useMosaicPanels());
      expect(result.current.getPanelById('z')).toBeNull();
    });

    it('returns updated config after updatePanel', () => {
      const { result } = renderHook(() => useMosaicPanels());
      act(() => result.current.addPanel(makePanel('a')));
      act(() => result.current.updatePanel('a', { title: 'Updated' }));
      expect(result.current.getPanelById('a')?.title).toBe('Updated');
    });
  });
});
