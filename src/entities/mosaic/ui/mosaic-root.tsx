import { isParent } from '@/shared/lib';
import { areBoundingBoxesEqual, createBoundingBox, split } from '@/shared/lib/bounding-box';
import { MosaicContext } from '@/shared/lib/context';
import { arePathsEqual } from '@/shared/lib/mosaic-utilities';
import type { MosaicKey, MosaicNode, MosaicPath } from '@/shared/types';
import type { BoundingBox, ResizeOptions } from '@/shared/types';
import { MosaicDropTargetPosition } from '@/shared/types';
import { MosaicDropTarget, RootDropTargets, Split } from '@/shared/ui';
import React, { useCallback, useContext, useMemo, useRef } from 'react';

export interface MosaicRootProps<T extends MosaicKey> {
  root: MosaicNode<T> | null;
  className?: string;
  resize?: ResizeOptions;
}

const DEFAULT_RESIZE_OPTIONS: ResizeOptions = { minimumPaneSizePercentage: 20 };

// Stable React key for a subtree so the recursive renderer reuses the same
// element (and thus the same tile DOM + portal anchor) when a node moves to a
// new depth/position on a tree reshape. A leaf is keyed by its id; a branch by
// its first (leftmost/topmost) leaf id — a stable anchor that survives wrapping
// the subtree in a new parent or another leaf moving into it, so unrelated tiles
// in the branch aren't remounted while the stable-mount guarantee still holds.
// Walk down the `first` branches to the leftmost/topmost leaf — exactly
// getLeaves(node)[0], but O(depth) and allocation-free (no intermediate arrays).
const firstLeaf = <T extends MosaicKey>(node: MosaicNode<T>): T => {
  let current = node;
  while (isParent(current)) current = current.first;
  return current;
};

const nodeKey = <T extends MosaicKey>(node: MosaicNode<T>): string =>
  isParent(node) ? `b:${String(firstLeaf(node))}` : `l:${String(node)}`;

export const MosaicRoot = <T extends MosaicKey>({
  root,
  className,
  resize = DEFAULT_RESIZE_OPTIONS,
}: MosaicRootProps<T>) => {
  const { mosaicId } = useContext(MosaicContext);
  const boundingBox = useMemo(() => createBoundingBox(0, 100, 100, 0), []);

  if (root === null) {
    return null;
  }

  return (
    <div className={className} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <MosaicNodeRenderer
        node={root}
        path={[]}
        boundingBox={boundingBox}
        resize={resize}
        mosaicId={mosaicId}
      />
      <RootDropTargets />
    </div>
  );
};

interface MosaicNodeRendererProps<T extends MosaicKey> {
  node: MosaicNode<T>;
  path: MosaicPath;
  boundingBox: BoundingBox;
  resize: ResizeOptions;
  mosaicId: string;
}

const MosaicNodeRendererImpl = <T extends MosaicKey>({
  node,
  path,
  boundingBox,
  resize,
  mosaicId,
}: MosaicNodeRendererProps<T>) => {
  const { mosaicActions, renderTile } = useContext(MosaicContext);

  // path is a new array reference on every render even when content is identical.
  // Store in a ref so callbacks/memos read the latest value without being in deps.
  const pathRef = useRef(path);
  pathRef.current = path;

  // Stable string derived from path content — used as a dep so memos/callbacks only
  // invalidate when the actual path changes (e.g. node moves in the tree).
  const pathKey = path.join('/');

  const handleSplitChange = useCallback(
    (newPercentage: number) => {
      // pathKey in deps ensures this callback is recreated when the path moves in
      // the tree, while pathRef.current provides the actual latest value at call time.
      void pathKey;
      const root = mosaicActions.getRoot();
      if (!root) return;

      mosaicActions.updateTree(
        [
          {
            path: pathRef.current,
            spec: {
              splitPercentage: { $set: newPercentage },
            },
          },
        ],
        true,
      );
    },
    [mosaicActions, pathKey],
  );

  const handleSplitRelease = useCallback(
    (newPercentage: number) => {
      void pathKey;
      const root = mosaicActions.getRoot();
      if (!root) return;

      mosaicActions.updateTree([
        {
          path: pathRef.current,
          spec: {
            splitPercentage: { $set: newPercentage },
          },
        },
      ]);
    },
    [mosaicActions, pathKey],
  );

  // Hooks must run unconditionally before any early return.
  // pathKey in deps invalidates only when path content changes (not on every render).
  const firstPath = useMemo(() => {
    void pathKey;
    return [...pathRef.current, 'first'] as MosaicPath;
  }, [pathKey]);
  const secondPath = useMemo(() => {
    void pathKey;
    return [...pathRef.current, 'second'] as MosaicPath;
  }, [pathKey]);

  if (!isParent(node)) {
    return (
      <div
        className="rm-mosaic-tile"
        style={{
          top: `${boundingBox.top}%`,
          right: `${100 - boundingBox.right}%`,
          bottom: `${100 - boundingBox.bottom}%`,
          left: `${boundingBox.left}%`,
        }}
      >
        {renderTile(node as T, path)}
        <MosaicDropTarget position={MosaicDropTargetPosition.TOP} path={path} mosaicId={mosaicId} />
        <MosaicDropTarget
          position={MosaicDropTargetPosition.BOTTOM}
          path={path}
          mosaicId={mosaicId}
        />
        <MosaicDropTarget
          position={MosaicDropTargetPosition.LEFT}
          path={path}
          mosaicId={mosaicId}
        />
        <MosaicDropTarget
          position={MosaicDropTargetPosition.RIGHT}
          path={path}
          mosaicId={mosaicId}
        />
      </div>
    );
  }

  const splitPercentage = node.splitPercentage ?? 50;
  const [firstBox, secondBox] = split(boundingBox, splitPercentage, node.direction);

  return (
    <>
      <MosaicNodeRenderer
        key={nodeKey(node.first)}
        node={node.first}
        path={firstPath}
        boundingBox={firstBox}
        resize={resize}
        mosaicId={mosaicId}
      />
      <Split
        key="__split"
        direction={node.direction}
        percentage={splitPercentage}
        onChange={handleSplitChange}
        onRelease={handleSplitRelease}
        boundingBox={boundingBox}
        {...(resize.minimumPaneSizePercentage !== undefined && {
          minimumPaneSizePercentage: resize.minimumPaneSizePercentage,
        })}
      />
      <MosaicNodeRenderer
        key={nodeKey(node.second)}
        node={node.second}
        path={secondPath}
        boundingBox={secondBox}
        resize={resize}
        mosaicId={mosaicId}
      />
    </>
  );
};

const MosaicNodeRenderer = React.memo(
  MosaicNodeRendererImpl,
  (prev, next) =>
    prev.node === next.node &&
    areBoundingBoxesEqual(prev.boundingBox, next.boundingBox) &&
    arePathsEqual(prev.path, next.path) &&
    prev.resize?.minimumPaneSizePercentage === next.resize?.minimumPaneSizePercentage &&
    prev.mosaicId === next.mosaicId,
) as typeof MosaicNodeRendererImpl;
