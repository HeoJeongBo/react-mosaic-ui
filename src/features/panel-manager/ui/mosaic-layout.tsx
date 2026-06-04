import { Mosaic } from '@/entities/mosaic';
import type { MosaicProps } from '@/entities/mosaic';
import { MosaicWindow } from '@/entities/window';
import {
  createBalancedTreeFromLeaves,
  createRemoveUpdate,
  getLeaves,
  isParent,
  updateTree,
} from '@/shared/lib';
import type {
  MosaicDirection,
  MosaicKey,
  MosaicNode,
  MosaicPanelConfig,
  MosaicPath,
  MosaicUpdate,
} from '@/shared/types';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

function getPathToLeaf<T extends MosaicKey>(
  node: MosaicNode<T>,
  id: T,
  path: MosaicPath = [],
): MosaicPath | null {
  if (!isParent(node)) return node === id ? path : null;
  return (
    getPathToLeaf(node.first, id, [...path, 'first']) ??
    getPathToLeaf(node.second, id, [...path, 'second'])
  );
}

export type GetDirectionFn = (nextCount: number) => MosaicDirection;

export interface MosaicLayoutProps<TId extends MosaicKey = string>
  extends Omit<MosaicProps<TId>, 'renderTile' | 'value' | 'onChange' | 'initialValue'> {
  panels: MosaicPanelConfig<TId>[];
  className?: string;
  initialNode?: MosaicNode<TId> | null;
  getDirection?: GetDirectionFn;
  onPanelClose?: (id: TId) => void;
  onNodeChange?: (node: MosaicNode<TId> | null) => void;
}

// StablePanelList renders inside Mosaic's context provider (via Mosaic children prop).
// Each panel's content is portaled into a STABLE anchor div (identity never changes for
// a given id) so the portal target is fixed — the panel subtree is never unmounted when
// the tree reshuffles. AnchorSlot (rendered by renderTile) places that anchor into the
// current tile slot via a React-owned layout effect (StrictMode-safe — no manual gate).
function StablePanelList<TId extends MosaicKey>({
  panels,
  panelMap,
  anchorEls,
  paths,
}: {
  panels: MosaicPanelConfig<TId>[];
  panelMap: Map<TId, MosaicPanelConfig<TId>>;
  anchorEls: React.MutableRefObject<Map<TId, HTMLDivElement>>;
  paths: Map<TId, MosaicPath>;
}) {
  return (
    <>
      {panels.map((p) => {
        const panel = panelMap.get(p.id);
        const anchor = anchorEls.current.get(p.id);
        const path = paths.get(p.id) ?? [];
        /* v8 ignore next 1 -- defensive: panelMap and anchorEls are both built from `panels`, so both always resolve here */
        if (!panel || !anchor) return null;

        const renderToolbar = panel.renderToolbar;
        const closableProps = panel.closable !== undefined ? { closable: panel.closable } : {};
        const windowContent = renderToolbar ? (
          <MosaicWindow<TId>
            title={panel.title}
            path={path}
            {...closableProps}
            renderToolbar={({ dragHandle }) => (
              <div
                ref={dragHandle.ref}
                className="rm-mosaic-custom-toolbar rm-cursor-grab active:rm-cursor-grabbing"
              >
                {renderToolbar()}
              </div>
            )}
          >
            {panel.content}
          </MosaicWindow>
        ) : (
          <MosaicWindow<TId> title={panel.title} path={path} {...closableProps}>
            {panel.content}
          </MosaicWindow>
        );

        const content = panel.Wrapper ? (
          <panel.Wrapper>{windowContent}</panel.Wrapper>
        ) : (
          windowContent
        );

        return createPortal(content, anchor, p.id as string);
      })}
    </>
  );
}

// Placed by renderTile into each tile slot. It mounts the stable `anchor` div as a
// child of its host via a React-owned layout effect: setup appends, cleanup removes.
// Because React re-mounts this component (and re-commits a fresh host) whenever the
// tile slot changes — including StrictMode's double-mount — the effect re-runs and
// re-homes the anchor deterministically against the host React just committed. No
// manual parent-comparison gate, so it never desyncs from React's node ownership.
function AnchorSlot({ anchor }: { anchor: HTMLDivElement }) {
  const hostRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const host = hostRef.current;
    /* v8 ignore next 1 -- host is always attached when the layout effect runs */
    if (!host) return;
    // appendChild MOVES the anchor from any prior host to this one (a DOM node has a
    // single parent). There is intentionally NO cleanup-detach: on a tree reshuffle
    // or StrictMode remount the next AnchorSlot's setup re-homes the anchor
    // atomically, so the content is never left detached mid-remount. A panel that is
    // truly removed has its anchor detached by the panel-departed effect below.
    host.appendChild(anchor);
  }, [anchor]);
  return <div ref={hostRef} style={{ width: '100%', height: '100%' }} />;
}

export function MosaicLayout<TId extends MosaicKey = string>({
  panels,
  className,
  initialNode,
  getDirection,
  onPanelClose,
  onNodeChange,
  ...mosaicProps
}: MosaicLayoutProps<TId>) {
  const [currentNode, setCurrentNode] = useState<MosaicNode<TId> | null>(() =>
    initialNode !== undefined ? initialNode : createBalancedTreeFromLeaves(panels.map((p) => p.id)),
  );

  const prevIdsRef = useRef<Set<TId>>(new Set(panels.map((p) => p.id)));
  const getDirectionRef = useRef(getDirection);
  getDirectionRef.current = getDirection;
  const currentNodeRef = useRef(currentNode);
  currentNodeRef.current = currentNode;
  const onPanelCloseRef = useRef(onPanelClose);
  onPanelCloseRef.current = onPanelClose;
  const onNodeChangeRef = useRef(onNodeChange);
  onNodeChangeRef.current = onNodeChange;

  useEffect(() => {
    const prevIds = prevIdsRef.current;
    const nextIds = new Set(panels.map((p) => p.id));

    const addedPanels = panels.filter((p) => !prevIds.has(p.id));
    const removedIds = [...prevIds].filter((id) => !nextIds.has(id));

    prevIdsRef.current = nextIds;

    if (addedPanels.length === 0 && removedIds.length === 0) return;

    // Compute the reconciled node outside the setState updater so we can also
    // notify the parent via onNodeChange — otherwise programmatic panel add/remove
    // would advance the rendered tree without the parent (e.g. usePersistedLayout)
    // ever observing it, leaving its tracked tree stale.
    const computeNext = (prev: MosaicNode<TId> | null): MosaicNode<TId> | null => {
      if (nextIds.size === 0) return null;
      if (prev === null) return createBalancedTreeFromLeaves([...nextIds]);

      let node: MosaicNode<TId> | null = prev;

      for (const id of removedIds) {
        /* v8 ignore next 1 -- defensive: the loop always exits via break/return before node becomes null at the top */
        if (node === null) break;
        const leaves = getLeaves(node);
        const path = getPathToLeaf(node, id);
        if (path === null) continue;
        if (leaves.length === 1) {
          node = null;
          break;
        }
        const update: MosaicUpdate<TId> = createRemoveUpdate(node, path);
        /* v8 ignore next 3 -- updateTree always returns non-null for a valid remove update */
        node =
          updateTree(node, [update]) ??
          createBalancedTreeFromLeaves(getLeaves(node).filter((l) => l !== id));
      }

      for (const panel of addedPanels) {
        if (node === null) {
          node = panel.id;
        } else {
          const nextCount = getLeaves(node).length + 1;
          const direction = getDirectionRef.current ? getDirectionRef.current(nextCount) : 'row';
          node = { direction, first: node, second: panel.id, splitPercentage: 50 };
        }
      }

      return node;
    };

    const nextNode = computeNext(currentNodeRef.current);
    setCurrentNode(nextNode);
    onNodeChangeRef.current?.(nextNode);
  }, [panels]);

  const onChange = useCallback((node: MosaicNode<TId> | null) => {
    const prev = currentNodeRef.current;
    setCurrentNode(node);
    onNodeChangeRef.current?.(node);
    if (onPanelCloseRef.current && prev !== null) {
      const prevLeaves = getLeaves(prev);
      const nextLeaves = new Set(node ? getLeaves(node) : []);
      for (const id of prevLeaves) {
        if (!nextLeaves.has(id)) onPanelCloseRef.current(id);
      }
    }
  }, []);

  const panelMap = useMemo(() => new Map(panels.map((p) => [p.id, p])), [panels]);

  // anchorEls: stable DOM nodes (one per panel id) that serve as the fixed portal
  // target for each panel. Their identity never changes, so reshuffling the tree
  // never remounts panel content (stable-mount guarantee). renderTile re-parents
  // each anchor into the live tile slot.
  const anchorEls = useRef<Map<TId, HTMLDivElement>>(new Map());
  for (const p of panels) {
    if (!anchorEls.current.has(p.id)) {
      const el = document.createElement('div');
      el.style.width = '100%';
      el.style.height = '100%';
      anchorEls.current.set(p.id, el);
    }
  }

  // Derive paths from currentNode — avoids setState during render.
  const paths = useMemo(() => {
    const map = new Map<TId, MosaicPath>();
    if (!currentNode) return map;
    for (const p of panels) {
      const path = getPathToLeaf(currentNode, p.id) ?? [];
      map.set(p.id, path);
    }
    return map;
  }, [currentNode, panels]);

  // Drop anchors for panels that are no longer present. AnchorSlot's effect cleanup
  // already detached them from the DOM on unmount; here we just clear the map entry.
  useEffect(() => {
    const currentIds = new Set(panels.map((p) => p.id));
    for (const [id, el] of anchorEls.current.entries()) {
      if (!currentIds.has(id)) {
        el.remove();
        anchorEls.current.delete(id);
      }
    }
  }, [panels]);

  // Detach all anchors on unmount.
  useEffect(() => {
    const anchors = anchorEls.current;
    return () => {
      for (const el of anchors.values()) el.remove();
      anchors.clear();
    };
  }, []);

  const renderTile = useCallback((id: TId, _path: MosaicPath) => {
    const anchor = anchorEls.current.get(id);
    /* v8 ignore next 1 -- anchor is created during render for every panel id */
    if (!anchor) return <div style={{ width: '100%', height: '100%' }} />;
    return <AnchorSlot anchor={anchor} />;
  }, []);

  const mosaicClassName = className ?? '';

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Mosaic<TId>
        renderTile={renderTile}
        value={currentNode}
        onChange={onChange}
        {...(mosaicClassName ? { className: mosaicClassName } : {})}
        {...mosaicProps}
      >
        <StablePanelList panels={panels} panelMap={panelMap} anchorEls={anchorEls} paths={paths} />
      </Mosaic>
    </div>
  );
}
