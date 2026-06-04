import { getLeaves } from '@/shared/lib';
import { MosaicContext } from '@/shared/lib/context';
import type { MosaicContextValue, MosaicNode, MosaicPanelConfig } from '@/shared/types';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { useContext, useEffect } from 'react';
import type React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GetDirectionFn } from './mosaic-layout';
import { MosaicLayout } from './mosaic-layout';

afterEach(() => cleanup());

vi.mock('react-dnd', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-dnd')>();
  return {
    ...actual,
    useDrop: vi.fn(() => [{}, vi.fn()]),
    useDrag: vi.fn(() => [{ isDragging: false }, vi.fn(), vi.fn()]),
  };
});

const makePanel = (id: string, overrides: Partial<MosaicPanelConfig> = {}): MosaicPanelConfig => ({
  id,
  title: `Title ${id.toUpperCase()}`,
  content: <div data-testid={`content-${id}`}>{id}</div>,
  ...overrides,
});

describe('MosaicLayout', () => {
  it('renders zeroStateView when panels=[] and zeroStateView is provided', () => {
    render(<MosaicLayout panels={[]} zeroStateView={<div data-testid="zero">No items</div>} />);
    expect(screen.getByTestId('zero')).toBeInTheDocument();
  });

  it('renders empty mosaic when panels=[] and no zeroStateView', () => {
    const { container } = render(<MosaicLayout panels={[]} />);
    expect(container.querySelector('.react-mosaic')).toBeInTheDocument();
  });

  it('renders content when there is one panel', () => {
    render(<MosaicLayout panels={[makePanel('a')]} />);
    expect(screen.getByTestId('content-a')).toBeInTheDocument();
  });

  it('renders both content elements when there are two panels', () => {
    render(<MosaicLayout panels={[makePanel('a'), makePanel('b')]} />);
    expect(screen.getByTestId('content-a')).toBeInTheDocument();
    expect(screen.getByTestId('content-b')).toBeInTheDocument();
  });

  it('reflects new panel when panels change (add)', () => {
    const { rerender } = render(<MosaicLayout panels={[makePanel('a')]} />);
    rerender(<MosaicLayout panels={[makePanel('a'), makePanel('b')]} />);
    expect(screen.getByTestId('content-b')).toBeInTheDocument();
  });

  it('renders custom toolbar when renderToolbar is provided', () => {
    const panels: MosaicPanelConfig[] = [
      makePanel('a', {
        renderToolbar: () => <div data-testid="custom-toolbar">custom</div>,
      }),
    ];
    render(<MosaicLayout panels={panels} />);
    expect(screen.getByTestId('custom-toolbar')).toBeInTheDocument();
  });

  it('renders default MosaicWindow toolbar when renderToolbar is not provided', () => {
    render(<MosaicLayout panels={[makePanel('a')]} />);
    expect(screen.getByTitle('Close')).toBeInTheDocument();
  });

  it('wraps windowContent with Wrapper when Wrapper is provided', () => {
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <div data-testid="wrapper">{children}</div>
    );
    render(<MosaicLayout panels={[makePanel('a', { Wrapper })]} />);
    expect(screen.getByTestId('wrapper')).toBeInTheDocument();
    expect(screen.getByTestId('content-a')).toBeInTheDocument();
  });

  it('passes className prop to Mosaic', () => {
    const { container } = render(<MosaicLayout panels={[makePanel('a')]} className="my-layout" />);
    expect(container.querySelector('.my-layout')).toBeInTheDocument();
  });

  it('renders normally when className is not provided', () => {
    const { container } = render(<MosaicLayout panels={[makePanel('a')]} />);
    expect(container.querySelector('.react-mosaic')).toBeInTheDocument();
  });

  it('returns empty div for unknown id in renderTile', () => {
    const { rerender } = render(<MosaicLayout panels={[makePanel('a'), makePanel('b')]} />);
    rerender(<MosaicLayout panels={[makePanel('a')]} />);
    expect(screen.getByTestId('content-a')).toBeInTheDocument();
  });

  describe('panel diff behavior', () => {
    it('adding panel 1→2: existing panel id stays at first position in the tree', () => {
      let capturedNode: MosaicNode<string> | null = null;
      const ContextCapture = () => {
        const ctx = useContext(MosaicContext) as MosaicContextValue<string>;
        capturedNode = ctx.mosaicActions.getRoot();
        return null;
      };
      const panels: MosaicPanelConfig[] = [makePanel('a', { content: <ContextCapture /> })];
      const { rerender } = render(<MosaicLayout panels={panels} />);

      rerender(
        <MosaicLayout panels={[makePanel('a', { content: <ContextCapture /> }), makePanel('b')]} />,
      );

      expect(capturedNode).not.toBeNull();
      expect(
        typeof capturedNode === 'object' && capturedNode !== null && 'first' in capturedNode
          ? (capturedNode as { first: string }).first
          : capturedNode,
      ).toBe('a');
    });

    it('removing panel 2→1: remaining panel becomes a single leaf', () => {
      const { rerender } = render(<MosaicLayout panels={[makePanel('a'), makePanel('b')]} />);

      rerender(<MosaicLayout panels={[makePanel('a')]} />);

      expect(screen.getByTestId('content-a')).toBeInTheDocument();
      expect(screen.queryByTestId('content-b')).toBeNull();
    });

    it('panels=[] → currentNode is null (shows zeroStateView)', () => {
      const { rerender } = render(
        <MosaicLayout
          panels={[makePanel('a'), makePanel('b')]}
          zeroStateView={<div data-testid="zero">empty</div>}
        />,
      );
      rerender(<MosaicLayout panels={[]} zeroStateView={<div data-testid="zero">empty</div>} />);
      expect(screen.getByTestId('zero')).toBeInTheDocument();
    });

    it('adding first panel from null state → single leaf tree', () => {
      const { rerender } = render(<MosaicLayout panels={[]} zeroStateView={<div>empty</div>} />);
      rerender(<MosaicLayout panels={[makePanel('a')]} />);
      expect(screen.getByTestId('content-a')).toBeInTheDocument();
    });

    it('removing already-absent id is a no-op (content-a preserved)', () => {
      const { rerender } = render(<MosaicLayout panels={[makePanel('a'), makePanel('b')]} />);
      rerender(<MosaicLayout panels={[makePanel('a'), makePanel('b')]} />);
      expect(screen.getByTestId('content-a')).toBeInTheDocument();
      expect(screen.getByTestId('content-b')).toBeInTheDocument();
    });

    it('removing one of three panels: remaining two panels are both rendered', () => {
      const { rerender } = render(
        <MosaicLayout panels={[makePanel('a'), makePanel('b'), makePanel('c')]} />,
      );
      rerender(<MosaicLayout panels={[makePanel('a'), makePanel('c')]} />);
      expect(screen.getByTestId('content-a')).toBeInTheDocument();
      expect(screen.getByTestId('content-c')).toBeInTheDocument();
      expect(screen.queryByTestId('content-b')).toBeNull();
    });

    it('full panel swap (remove a + add b simultaneously): b becomes a single leaf', () => {
      const { rerender } = render(<MosaicLayout panels={[makePanel('a')]} />);
      rerender(<MosaicLayout panels={[makePanel('b')]} />);
      expect(screen.getByTestId('content-b')).toBeInTheDocument();
      expect(screen.queryByTestId('content-a')).toBeNull();
    });

    it('removing a panel whose id is absent from the tree is skipped (getPathToLeaf null)', () => {
      // initialNode only contains 'a' even though panel 'b' is supplied — so 'b'
      // has no leaf in the tree. Removing 'b' exercises the `path === null` continue.
      const { rerender } = render(
        <MosaicLayout panels={[makePanel('a'), makePanel('b')]} initialNode="a" />,
      );
      expect(screen.getByTestId('content-a')).toBeInTheDocument();

      rerender(<MosaicLayout panels={[makePanel('a')]} initialNode="a" />);
      expect(screen.getByTestId('content-a')).toBeInTheDocument();
    });
  });

  describe('initialNode prop', () => {
    it('uses initialNode as the starting tree when provided', () => {
      let capturedNode: MosaicNode<string> | null = null;
      const ContextCapture = () => {
        const ctx = useContext(MosaicContext) as MosaicContextValue<string>;
        capturedNode = ctx.mosaicActions.getRoot();
        return null;
      };
      const customNode: MosaicNode<string> = {
        direction: 'column',
        first: 'a',
        second: 'b',
        splitPercentage: 30,
      };
      render(
        <MosaicLayout
          panels={[makePanel('a', { content: <ContextCapture /> }), makePanel('b')]}
          initialNode={customNode}
        />,
      );
      expect(capturedNode).toEqual(customNode);
    });

    it('falls back to balanced tree when initialNode is not provided', () => {
      let capturedNode: MosaicNode<string> | null = null;
      const ContextCapture = () => {
        const ctx = useContext(MosaicContext) as MosaicContextValue<string>;
        capturedNode = ctx.mosaicActions.getRoot();
        return null;
      };
      render(
        <MosaicLayout panels={[makePanel('a', { content: <ContextCapture /> }), makePanel('b')]} />,
      );
      expect(capturedNode).not.toBeNull();
      expect(typeof capturedNode).toBe('object');
    });

    it('starts with null (zeroState) when initialNode={null} is provided', () => {
      render(
        <MosaicLayout
          panels={[makePanel('a'), makePanel('b')]}
          initialNode={null}
          zeroStateView={<div data-testid="zero">empty</div>}
        />,
      );
      expect(screen.getByTestId('zero')).toBeInTheDocument();
    });
  });

  describe('stable mount (portal)', () => {
    it('restored multi-panel initialNode mounts each content inside a mosaic tile slot', () => {
      // A nested 3-panel restore exercises the multi-anchor-in-one-commit case:
      // the layout effect must home every anchor into its tile slot on first mount,
      // not just the last one positioned by a ref callback.
      render(
        <MosaicLayout
          panels={[makePanel('alpha'), makePanel('beta'), makePanel('gamma')]}
          initialNode={{
            direction: 'row',
            first: 'alpha',
            second: { direction: 'column', first: 'beta', second: 'gamma' },
          }}
        />,
      );

      for (const id of ['alpha', 'beta', 'gamma']) {
        const content = screen.getByTestId(`content-${id}`);
        // The content's anchor must have been moved INTO a mosaic tile slot,
        // not left orphaned on document.body.
        expect(content.closest('.react-mosaic')).not.toBeNull();
        expect(content.closest('.rm-absolute')).not.toBeNull();
      }
    });

    it('adding a panel does not unmount existing panels', () => {
      let mountCount = 0;
      let unmountCount = 0;

      const StablePanel = () => {
        useEffect(() => {
          mountCount++;
          return () => {
            unmountCount++;
          };
        }, []);
        return <div data-testid="stable-panel" />;
      };

      const { rerender } = render(
        <MosaicLayout panels={[makePanel('a', { content: <StablePanel /> })]} />,
      );

      expect(mountCount).toBe(1);
      expect(unmountCount).toBe(0);

      rerender(
        <MosaicLayout panels={[makePanel('a', { content: <StablePanel /> }), makePanel('b')]} />,
      );

      expect(unmountCount).toBe(0);
    });

    it('removing a panel unmounts only that panel', () => {
      let unmountCountA = 0;
      let unmountCountB = 0;

      const PanelA = () => {
        useEffect(
          () => () => {
            unmountCountA++;
          },
          [],
        );
        return <div data-testid="panel-a" />;
      };
      const PanelB = () => {
        useEffect(
          () => () => {
            unmountCountB++;
          },
          [],
        );
        return <div data-testid="panel-b" />;
      };

      const { rerender } = render(
        <MosaicLayout
          panels={[
            makePanel('a', { content: <PanelA /> }),
            makePanel('b', { content: <PanelB /> }),
          ]}
        />,
      );

      rerender(<MosaicLayout panels={[makePanel('a', { content: <PanelA /> })]} />);

      expect(unmountCountA).toBe(0);
      expect(unmountCountB).toBe(1);
    });
  });

  it('onChange: currentNode updates when mosaicActions.updateTree is called', () => {
    let capturedCtx: MosaicContextValue<string> | null = null;

    const ContextCapture = () => {
      capturedCtx = useContext(MosaicContext) as MosaicContextValue<string>;
      return <div data-testid="ctx-capture" />;
    };

    // Captures context from inside a MosaicWindow rendered via MosaicLayout's renderTile
    const panels: MosaicPanelConfig[] = [
      makePanel('a', {
        content: (
          <>
            <div data-testid="content-a">a</div>
            <ContextCapture />
          </>
        ),
      }),
      makePanel('b'),
    ];

    render(<MosaicLayout panels={panels} />);

    expect(screen.getByTestId('ctx-capture')).toBeInTheDocument();

    act(() => {
      capturedCtx!.mosaicActions.updateTree([
        { path: [], spec: { splitPercentage: { $set: 70 } } },
      ]);
    });

    expect(screen.getByTestId('content-a')).toBeInTheDocument();
  });

  describe('getDirection prop', () => {
    it('기본값은 항상 row (수평 splitter)', async () => {
      const { rerender } = render(<MosaicLayout panels={[makePanel('a')]} />);
      rerender(<MosaicLayout panels={[makePanel('a'), makePanel('b')]} />);
      // row direction → vertical split bar → cursor-col-resize
      await waitFor(() => {
        expect(document.querySelector('.rm-cursor-col-resize')).toBeInTheDocument();
      });
    });

    it('getDirection이 column을 반환하면 수직 splitter', async () => {
      const getDirection: GetDirectionFn = () => 'column';
      const { rerender } = render(
        <MosaicLayout panels={[makePanel('a')]} getDirection={getDirection} />,
      );
      rerender(
        <MosaicLayout panels={[makePanel('a'), makePanel('b')]} getDirection={getDirection} />,
      );
      // column direction → horizontal split bar → cursor-row-resize
      await waitFor(() => {
        expect(document.querySelector('.rm-cursor-row-resize')).toBeInTheDocument();
      });
    });

    it('nextCount 기반 교대 방향: 3번째 패널은 column', async () => {
      // nextCount=2 → row, nextCount=3 → column
      const getDirection: GetDirectionFn = (nextCount) => (nextCount % 2 === 0 ? 'row' : 'column');
      const { rerender } = render(
        <MosaicLayout panels={[makePanel('a')]} getDirection={getDirection} />,
      );
      rerender(
        <MosaicLayout panels={[makePanel('a'), makePanel('b')]} getDirection={getDirection} />,
      );
      rerender(
        <MosaicLayout
          panels={[makePanel('a'), makePanel('b'), makePanel('c')]}
          getDirection={getDirection}
        />,
      );
      // 최상위 split이 column → horizontal split bar (cursor-row-resize)
      await waitFor(() => {
        expect(document.querySelector('.rm-cursor-row-resize')).toBeInTheDocument();
      });
    });
  });

  describe('onPanelClose prop', () => {
    it('MosaicWindow Close 버튼 클릭 시 onPanelClose(id)가 호출됨', async () => {
      const onPanelClose = vi.fn();
      render(
        <MosaicLayout panels={[makePanel('a'), makePanel('b')]} onPanelClose={onPanelClose} />,
      );

      const closeButtons = screen.getAllByTitle('Close');
      act(() => {
        closeButtons[0]!.click();
      });

      await waitFor(() => {
        expect(onPanelClose).toHaveBeenCalledTimes(1);
      });
    });

    it('onChange(null) fires onPanelClose for every previously-open panel', () => {
      const onPanelClose = vi.fn();
      let capturedCtx: MosaicContextValue<string> | null = null;
      const ContextCapture = () => {
        capturedCtx = useContext(MosaicContext) as MosaicContextValue<string>;
        return null;
      };

      render(
        <MosaicLayout
          panels={[makePanel('a', { content: <ContextCapture /> }), makePanel('b')]}
          onPanelClose={onPanelClose}
        />,
      );

      // Removing the root path collapses the whole tree to null, exercising the
      // `node ? getLeaves(node) : []` null branch in onChange.
      act(() => {
        capturedCtx!.mosaicActions.remove([]);
      });

      expect(onPanelClose).toHaveBeenCalledWith('a');
      expect(onPanelClose).toHaveBeenCalledWith('b');
    });
  });

  describe('onNodeChange prop', () => {
    it('MosaicWindow Close 버튼으로 트리가 바뀌면 onNodeChange가 호출됨', async () => {
      const onNodeChange = vi.fn();
      render(
        <MosaicLayout panels={[makePanel('a'), makePanel('b')]} onNodeChange={onNodeChange} />,
      );
      const closeButtons = screen.getAllByTitle('Close');
      act(() => {
        closeButtons[0]!.click();
      });
      await waitFor(() => {
        expect(onNodeChange).toHaveBeenCalled();
      });
    });

    it('panels prop change (add) fires onNodeChange with the reconciled tree', () => {
      const onNodeChange = vi.fn();
      const { rerender } = render(
        <MosaicLayout panels={[makePanel('a')]} initialNode="a" onNodeChange={onNodeChange} />,
      );
      onNodeChange.mockClear(); // ignore any mount-time call

      rerender(
        <MosaicLayout
          panels={[makePanel('a'), makePanel('b')]}
          initialNode="a"
          onNodeChange={onNodeChange}
        />,
      );

      expect(onNodeChange).toHaveBeenCalledTimes(1);
      const node = onNodeChange.mock.calls[0]![0] as MosaicNode<string>;
      expect(new Set(getLeaves(node))).toEqual(new Set(['a', 'b']));
    });

    it('panels prop change (remove) fires onNodeChange with the reconciled tree', () => {
      const onNodeChange = vi.fn();
      const { rerender } = render(
        <MosaicLayout panels={[makePanel('a'), makePanel('b')]} onNodeChange={onNodeChange} />,
      );
      onNodeChange.mockClear();

      rerender(<MosaicLayout panels={[makePanel('a')]} onNodeChange={onNodeChange} />);

      expect(onNodeChange).toHaveBeenCalledTimes(1);
      expect(onNodeChange.mock.calls[0]![0]).toBe('a'); // collapsed to a single leaf
    });
  });

  describe('togglePanel 오버로드', () => {
    it('id만으로 togglePanel 호출 시 해당 패널이 제거됨', () => {
      const { rerender } = render(<MosaicLayout panels={[makePanel('a'), makePanel('b')]} />);
      expect(screen.getByTestId('content-a')).toBeInTheDocument();
      expect(screen.getByTestId('content-b')).toBeInTheDocument();
      rerender(<MosaicLayout panels={[makePanel('b')]} />);
      expect(screen.queryByTestId('content-a')).toBeNull();
    });
  });

  describe('closable prop', () => {
    it('closable=false이면 Close 버튼이 렌더되지 않음', () => {
      render(<MosaicLayout panels={[makePanel('a', { closable: false })]} />);
      expect(screen.queryByTitle('Close')).toBeNull();
    });

    it('closable=true이면 Close 버튼이 렌더됨', () => {
      render(<MosaicLayout panels={[makePanel('a', { closable: true })]} />);
      expect(screen.getByTitle('Close')).toBeInTheDocument();
    });

    it('closable 미지정이면 기본적으로 Close 버튼이 렌더됨', () => {
      render(<MosaicLayout panels={[makePanel('a')]} />);
      expect(screen.getByTitle('Close')).toBeInTheDocument();
    });
  });
});
