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
  MosaicKey,
  MosaicNode,
  MosaicPanelConfig,
  MosaicPath,
  MosaicUpdate,
} from '@/shared/types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

export interface MosaicLayoutProps<TId extends MosaicKey = string>
  extends Omit<MosaicProps<TId>, 'renderTile' | 'value' | 'onChange' | 'initialValue'> {
  panels: MosaicPanelConfig<TId>[];
  className?: string;
  initialNode?: MosaicNode<TId> | null;
}

// StablePanelList renders inside Mosaic's context provider (via Mosaic children prop).
// Each panel is portaled into a stable body-attached anchor div. renderTile appends
// that anchor div into the tile slot container via a DOM ref, so the anchor never
// changes identity — React portal target stays fixed, preventing unmount/remount.
function StablePanelList<TId extends MosaicKey>({
  panels,
  panelMap,
  anchorEls,
  paths,
  anchorVersion,
}: {
  panels: MosaicPanelConfig<TId>[];
  panelMap: Map<TId, MosaicPanelConfig<TId>>;
  anchorEls: React.MutableRefObject<Map<TId, HTMLDivElement>>;
  paths: Map<TId, MosaicPath>;
  anchorVersion: number;
}) {
  void anchorVersion;
  return (
    <>
      {panels.map((p) => {
        const panel = panelMap.get(p.id);
        const anchor = anchorEls.current.get(p.id);
        const path = paths.get(p.id) ?? [];
        if (!panel || !anchor) return null;

        const renderToolbar = panel.renderToolbar;
        const windowContent = renderToolbar ? (
          <MosaicWindow<TId>
            title={panel.title}
            path={path}
            renderToolbar={({ dragHandle }) => (
              <div ref={dragHandle.ref} className="rm-mosaic-custom-toolbar">
                {renderToolbar()}
              </div>
            )}
          >
            {panel.content}
          </MosaicWindow>
        ) : (
          <MosaicWindow<TId> title={panel.title} path={path}>
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

export function MosaicLayout<TId extends MosaicKey = string>({
  panels,
  className,
  initialNode,
  ...mosaicProps
}: MosaicLayoutProps<TId>) {
  const [currentNode, setCurrentNode] = useState<MosaicNode<TId> | null>(() =>
    initialNode !== undefined ? initialNode : createBalancedTreeFromLeaves(panels.map((p) => p.id)),
  );

  const prevIdsRef = useRef<Set<TId>>(new Set(panels.map((p) => p.id)));

  useEffect(() => {
    const prevIds = prevIdsRef.current;
    const nextIds = new Set(panels.map((p) => p.id));

    const addedPanels = panels.filter((p) => !prevIds.has(p.id));
    const removedIds = [...prevIds].filter((id) => !nextIds.has(id));

    prevIdsRef.current = nextIds;

    if (addedPanels.length === 0 && removedIds.length === 0) return;

    setCurrentNode((prev) => {
      if (nextIds.size === 0) return null;
      if (prev === null) return createBalancedTreeFromLeaves([...nextIds]);

      let node: MosaicNode<TId> | null = prev;

      for (const id of removedIds) {
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
          node = { direction: 'row', first: node, second: panel.id, splitPercentage: 50 };
        }
      }

      return node;
    });
  }, [panels]);

  const onChange = useCallback((node: MosaicNode<TId> | null) => {
    setCurrentNode(node);
  }, []);

  const panelMap = useMemo(() => new Map(panels.map((p) => [p.id, p])), [panels]);

  // anchorEls: stable DOM nodes attached to document.body, one per panel id.
  // They never change identity, so createPortal always targets the same node.
  // renderTile appends each anchor into the tile slot container div via a DOM ref,
  // making it visible at the right layout position without re-mounting.
  const anchorEls = useRef<Map<TId, HTMLDivElement>>(new Map());
  for (const p of panels) {
    if (!anchorEls.current.has(p.id)) {
      const el = document.createElement('div');
      el.style.width = '100%';
      el.style.height = '100%';
      document.body.appendChild(el);
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

  // Increments when a new anchor is first positioned into a tile slot,
  // causing StablePanelList to re-render and activate the portal.
  const [anchorVersion, setAnchorVersion] = useState(0);

  // Remove anchors for panels that are no longer present.
  useEffect(() => {
    const currentIds = new Set(panels.map((p) => p.id));
    for (const [id, el] of anchorEls.current.entries()) {
      if (!currentIds.has(id)) {
        el.remove();
        anchorEls.current.delete(id);
      }
    }
  }, [panels]);

  // Detach all anchors from body on unmount.
  useEffect(() => {
    const anchors = anchorEls.current;
    return () => {
      for (const el of anchors.values()) el.remove();
      anchors.clear();
    };
  }, []);

  const renderTile = useCallback((id: TId, _path: MosaicPath) => {
    const anchor = anchorEls.current.get(id);

    return (
      <div
        style={{ width: '100%', height: '100%' }}
        ref={(container) => {
          if (!container || !anchor) return;
          if (anchor.parentElement !== container) {
            // Move the stable anchor div into this tile slot container.
            // This is a direct DOM operation outside React, so anchor's
            // React subtree (and the portal into it) is unaffected.
            container.appendChild(anchor);
            setAnchorVersion((v) => v + 1);
          }
        }}
      />
    );
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
        <StablePanelList
          panels={panels}
          panelMap={panelMap}
          anchorEls={anchorEls}
          paths={paths}
          anchorVersion={anchorVersion}
        />
      </Mosaic>
    </div>
  );
}
