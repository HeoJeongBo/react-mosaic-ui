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
}

export function MosaicLayout<TId extends MosaicKey = string>({
  panels,
  className,
  ...mosaicProps
}: MosaicLayoutProps<TId>) {
  const [currentNode, setCurrentNode] = useState<MosaicNode<TId> | null>(() =>
    createBalancedTreeFromLeaves(panels.map((p) => p.id)),
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

  const renderTile = useCallback(
    (id: TId, path: MosaicPath) => {
      const panel = panelMap.get(id);
      if (!panel) return <div />;

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

      return panel.Wrapper ? <panel.Wrapper>{windowContent}</panel.Wrapper> : windowContent;
    },
    [panelMap],
  );

  const mosaicClassName = className ?? '';

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Mosaic<TId>
        renderTile={renderTile}
        value={currentNode}
        onChange={onChange}
        {...(mosaicClassName ? { className: mosaicClassName } : {})}
        {...mosaicProps}
      />
    </div>
  );
}
