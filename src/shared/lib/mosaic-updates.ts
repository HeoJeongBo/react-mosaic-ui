import { produce } from 'immer';
import type {
  MosaicBranch,
  MosaicDirection,
  MosaicKey,
  MosaicNode,
  MosaicPath,
  MosaicUpdate,
  MosaicUpdateSpec,
} from '../types';
import { MosaicDropTargetPosition } from '../types';
import {
  arePathsEqual,
  getAndAssertNodeAtPathExists,
  getNodeAtPath,
  getOtherBranch,
  isParent,
  isPathPrefix,
} from './mosaic-utilities';

/**
 * Apply an array of updates to a tree
 */
export const updateTree = <T extends MosaicKey>(
  root: MosaicNode<T> | null,
  updates: MosaicUpdate<T>[],
): MosaicNode<T> | null => {
  if (root === null) {
    return null;
  }

  let current = root;

  for (const update of updates) {
    // Handle root-level $set specially
    if (update.path.length === 0 && '$set' in update.spec) {
      current = update.spec.$set;
    } else {
      current = produce(current, (draft) => {
        applyUpdateAtPath(draft as MosaicNode<T>, update.path, update.spec);
      });
    }
  }

  return current;
};

// Applies a structural spec (splitPercentage / direction / nested first|second)
// to `node` in place, recursing into child specs. Only meaningful for parent nodes.
const applySpecToNode = <T extends MosaicKey>(
  node: MosaicNode<T>,
  spec: MosaicUpdateSpec<T>,
): void => {
  /* v8 ignore next 3 -- a root-level $set is handled before applySpecToNode is reached */
  if ('$set' in spec) {
    return;
  }
  if (isParent(node)) {
    if (spec.splitPercentage) {
      node.splitPercentage = spec.splitPercentage.$set;
    }
    if (spec.direction) {
      node.direction = spec.direction.$set;
    }
    if (spec.first) {
      applySpecToNode(node.first, spec.first);
    }
    if (spec.second) {
      applySpecToNode(node.second, spec.second);
    }
  }
};

const applyUpdateAtPath = <T extends MosaicKey>(
  node: MosaicNode<T>,
  path: MosaicPath,
  spec: MosaicUpdateSpec<T>,
): void => {
  // path exhausted: apply the structural spec to this node.
  if (path.length === 0) {
    applySpecToNode(node, spec);
    return;
  }

  // descend one branch toward the target node.
  if (!isParent(node)) {
    return;
  }

  const [branch, ...rest] = path;
  /* v8 ignore next 1 -- branch is always 'first' | 'second' at this point */
  if (!branch) return;

  if (rest.length === 0 && '$set' in spec) {
    node[branch] = spec.$set;
  } else {
    applyUpdateAtPath(node[branch], rest, spec);
  }
};

/**
 * Create an update to remove a node at a path
 */
export const createRemoveUpdate = <T extends MosaicKey>(
  root: MosaicNode<T> | null,
  path: MosaicPath,
): MosaicUpdate<T> => {
  if (root === null || path.length === 0) {
    throw new Error(
      'Cannot remove the root node: a path of length 0 has no parent to collapse into. ' +
        'To clear the layout, set the tree to null instead.',
    );
  }

  const parentPath = path.slice(0, -1);
  const branch = path[path.length - 1]!;
  const siblingBranch = getOtherBranch(branch);

  const parent = getAndAssertNodeAtPathExists(root, parentPath);
  /* v8 ignore next 6 -- tree invariant: the parent of a valid leaf path is always a parent node */
  if (!isParent(parent)) {
    throw new Error(
      "Expected a split (parent) node at the path's parent, but found a leaf. " +
        'The tree is malformed or the path is stale.',
    );
  }

  const sibling = parent[siblingBranch];

  return {
    path: parentPath,
    spec: { $set: sibling },
  };
};

/**
 * Create an update to expand a node to a percentage
 */
export const createExpandUpdate = <T extends MosaicKey>(
  path: MosaicPath,
  percentage = 70,
): MosaicUpdate<T> => {
  if (path.length === 0) {
    throw new Error(
      'Cannot expand the root node: expand requires a node nested inside at least one split.',
    );
  }

  const parentPath = path.slice(0, -1);
  const branch = path[path.length - 1]!;

  const splitPercentage = branch === 'first' ? percentage : 100 - percentage;

  return {
    path: parentPath,
    spec: {
      splitPercentage: { $set: splitPercentage },
    },
  };
};

/**
 * Create an update to hide a node (set to null placeholder)
 */
export const createHideUpdate = <T extends MosaicKey>(path: MosaicPath): MosaicUpdate<T> => {
  return {
    path,
    spec: { $set: null as unknown as MosaicNode<T> },
  };
};

/**
 * Lightweight canDrop check used during drag hover (called 30-60×/s).
 * Avoids building the full update array — only verifies source/dest nodes exist
 * and the paths are distinct.
 */
export const canDropOnTarget = <T extends MosaicKey>(
  root: MosaicNode<T>,
  sourcePath: MosaicPath,
  destinationPath: MosaicPath,
): boolean => {
  if (sourcePath.length === 0) return false;
  if (arePathsEqual(sourcePath, destinationPath)) return false;
  return getNodeAtPath(root, sourcePath) !== null && getNodeAtPath(root, destinationPath) !== null;
};

// Maps a drop position to the new split's orientation and whether the dragged
// source becomes the first (left/top) child.
const computeSplitOrientation = (
  position: MosaicDropTargetPosition,
): { direction: MosaicDirection; sourceIsFirst: boolean } => ({
  direction:
    position === MosaicDropTargetPosition.LEFT || position === MosaicDropTargetPosition.RIGHT
      ? 'row'
      : 'column',
  sourceIsFirst:
    position === MosaicDropTargetPosition.LEFT || position === MosaicDropTargetPosition.TOP,
});

// Builds a 50/50 split parent with the source on the chosen side.
const buildSplitNode = <T extends MosaicKey>(
  source: MosaicNode<T>,
  other: MosaicNode<T>,
  direction: MosaicDirection,
  sourceIsFirst: boolean,
): MosaicNode<T> => ({
  direction,
  first: sourceIsFirst ? source : other,
  second: sourceIsFirst ? other : source,
  splitPercentage: 50,
});

// After the source is removed its parent collapses into the surviving sibling,
// which can shift the destination path up. Returns the destination path as it will
// be once the removal has been applied.
const adjustDestinationAfterRemoval = (
  sourcePath: MosaicPath,
  destinationPath: MosaicPath,
): MosaicPath => {
  const sourceParentPath = sourcePath.slice(0, -1);
  const destParentPath = destinationPath.slice(0, -1);

  // Siblings: after removing source, the parent collapses to destination, so the
  // destination's new path is the (former) parent path.
  if (arePathsEqual(sourceParentPath, destParentPath)) {
    return sourceParentPath;
  }

  // Source's parent is an ancestor of destination (including the root collapse case
  // when sourceParentPath is []). After removal that parent collapses to source's
  // sibling, so the branch segment that pointed into the sibling disappears.
  if (
    isPathPrefix(sourceParentPath, destinationPath) &&
    sourceParentPath.length < destinationPath.length
  ) {
    const sourceBranch = sourcePath[sourceParentPath.length];
    const destBranchAtSameLevel = destinationPath[sourceParentPath.length];
    if (sourceBranch !== destBranchAtSameLevel) {
      return [...sourceParentPath, ...destinationPath.slice(sourceParentPath.length + 1)];
    }
  }

  return destinationPath;
};

/**
 * Create updates for drag and drop operation
 */
export const createDragToUpdates = <T extends MosaicKey>(
  root: MosaicNode<T>,
  sourcePath: MosaicPath,
  destinationPath: MosaicPath,
  position: MosaicDropTargetPosition,
): MosaicUpdate<T>[] => {
  // 1. validate: both nodes exist and the drop isn't onto itself.
  const sourceNode = getNodeAtPath(root, sourcePath);
  if (sourceNode === null) return [];
  const destinationNode = getNodeAtPath(root, destinationPath);
  if (destinationNode === null) return [];
  if (arePathsEqual(sourcePath, destinationPath)) return [];

  // 2. orient: split direction + which side the source lands on.
  const { direction, sourceIsFirst } = computeSplitOrientation(position);

  // 3a. destination contains source: remove source from within destination, then
  // replace destination with the split (no separate remove update needed).
  if (isPathPrefix(destinationPath, sourcePath) && destinationPath.length < sourcePath.length) {
    const relativeSourcePath = sourcePath.slice(destinationPath.length);
    const updatedDestination = updateTree(destinationNode, [
      createRemoveUpdate(destinationNode, relativeSourcePath),
    ]);
    /* v8 ignore next 1 -- removing a child from a two-leaf parent always yields the sibling, never null */
    if (updatedDestination === null) return [];

    return [
      {
        path: destinationPath,
        spec: { $set: buildSplitNode(sourceNode, updatedDestination, direction, sourceIsFirst) },
      },
    ];
  }

  // 3b. standard case: remove source, then add the split at the (possibly shifted)
  // destination path.
  const updates: MosaicUpdate<T>[] = [];
  if (sourcePath.length > 0) {
    updates.push(createRemoveUpdate(root, sourcePath));
  }
  updates.push({
    path: adjustDestinationAfterRemoval(sourcePath, destinationPath),
    spec: { $set: buildSplitNode(sourceNode, destinationNode, direction, sourceIsFirst) },
  });

  return updates;
};

/**
 * Create an update to replace a node at a path
 */
export const createReplaceUpdate = <T extends MosaicKey>(
  path: MosaicPath,
  node: MosaicNode<T>,
): MosaicUpdate<T> => {
  return {
    path,
    spec: { $set: node },
  };
};

/**
 * Replace the node at `path` with a split whose BOTH children are `newNode`.
 *
 * ⚠️ This discards the existing node at `path` and places `newNode` on both sides,
 * so the resulting tree contains the same leaf id twice. That violates the leaf-id
 * uniqueness that {@link getLeaves}/{@link pruneTree} assume — use it only when you
 * genuinely want two copies of the same id. To split a tile into `[existing, new]`,
 * read the node at `path` and emit a `{ $set: { first: existing, second: newNode } }`
 * update instead (this is what `MosaicWindow`'s Split button does).
 */
export const createSplitUpdate = <T extends MosaicKey>(
  path: MosaicPath,
  newNode: T,
  direction: 'row' | 'column' = 'row',
): MosaicUpdate<T> => {
  return {
    path,
    spec: {
      $set: {
        direction,
        first: newNode,
        second: newNode,
        splitPercentage: 50,
      },
    },
  };
};

/**
 * For resize ticks only: O(depth) shallow update that replaces only one splitPercentage.
 * Replaces only nodes along the path with new spread references, without immer produce.
 * Sibling subtrees retain their existing references → passes MosaicNodeRenderer memo.
 */
export const updateSplitPercentage = <T extends MosaicKey>(
  root: MosaicNode<T>,
  path: MosaicPath,
  percentage: number,
): MosaicNode<T> => {
  if (!isParent(root)) return root;
  if (path.length === 0) {
    return { ...root, splitPercentage: percentage };
  }
  // root is narrowed to MosaicParent<T> by the isParent guard above, so root[branch]
  // is already MosaicNode<T> (a declared property, not an index signature).
  const [branch, ...rest] = path as [MosaicBranch, ...MosaicPath];
  const child = root[branch];
  const updated = updateSplitPercentage(child, rest, percentage);
  if (updated === child) return root;
  return { ...root, [branch]: updated };
};
