import { produce } from 'immer';
import type {
  MosaicBranch,
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

/**
 * Create updates for drag and drop operation
 */
export const createDragToUpdates = <T extends MosaicKey>(
  root: MosaicNode<T>,
  sourcePath: MosaicPath,
  destinationPath: MosaicPath,
  position: MosaicDropTargetPosition,
): MosaicUpdate<T>[] => {
  const sourceNode = getNodeAtPath(root, sourcePath);
  if (sourceNode === null) {
    return [];
  }

  const destinationNode = getNodeAtPath(root, destinationPath);
  if (destinationNode === null) {
    return [];
  }

  // Don't allow dropping on itself
  if (arePathsEqual(sourcePath, destinationPath)) {
    return [];
  }

  // Determine split direction based on drop position
  const direction =
    position === MosaicDropTargetPosition.LEFT || position === MosaicDropTargetPosition.RIGHT
      ? 'row'
      : 'column';

  // Determine which node goes first
  const first =
    position === MosaicDropTargetPosition.LEFT || position === MosaicDropTargetPosition.TOP
      ? sourceNode
      : destinationNode;

  const second =
    position === MosaicDropTargetPosition.LEFT || position === MosaicDropTargetPosition.TOP
      ? destinationNode
      : sourceNode;

  const newSplitNode: MosaicNode<T> = {
    direction,
    first,
    second,
    splitPercentage: 50,
  };

  // Check if destination is a parent of source
  const isDestinationParentOfSource =
    sourcePath.length > destinationPath.length &&
    destinationPath.every((branch, index) => sourcePath[index] === branch);

  if (isDestinationParentOfSource) {
    // Special case: destination contains source
    // We need to remove source from within destination first, then split
    const relativeSourcePath = sourcePath.slice(destinationPath.length);
    const updatedDestination = updateTree(destinationNode, [
      createRemoveUpdate(destinationNode, relativeSourcePath),
    ]);

    /* v8 ignore next 3 -- removing a child from a two-leaf parent always yields the sibling, never null */
    if (updatedDestination === null) {
      return [];
    }

    // Create new split node with updated destination
    const adjustedSplitNode: MosaicNode<T> = {
      direction,
      first:
        position === MosaicDropTargetPosition.LEFT || position === MosaicDropTargetPosition.TOP
          ? sourceNode
          : updatedDestination,
      second:
        position === MosaicDropTargetPosition.LEFT || position === MosaicDropTargetPosition.TOP
          ? updatedDestination
          : sourceNode,
      splitPercentage: 50,
    };

    return [
      {
        path: destinationPath,
        spec: { $set: adjustedSplitNode },
      },
    ];
  }

  // Standard case: remove source, then add split at destination
  const updates: MosaicUpdate<T>[] = [];

  // Remove source
  if (sourcePath.length > 0) {
    updates.push(createRemoveUpdate(root, sourcePath));
  }

  // Determine if we need to adjust the destination path after removal
  let adjustedDestinationPath = destinationPath;

  // Check if source and destination are siblings (share the same parent)
  const sourceParentPath = sourcePath.slice(0, -1);
  const destParentPath = destinationPath.slice(0, -1);

  const areSiblings =
    sourceParentPath.length === destParentPath.length &&
    sourceParentPath.every((branch, index) => destParentPath[index] === branch);

  if (areSiblings) {
    // After removing source, destination becomes its parent's only child
    // So the parent is replaced with destination
    // New destination path is the parent path
    adjustedDestinationPath = sourceParentPath;
  } else {
    // Check if source's parent is an ancestor of the destination path.
    // When sourceParentPath is [] (source is a root-level child), the condition
    // sourceParentPath.every(...) trivially returns true, so we need the length
    // check only to confirm the dest is actually deeper. We intentionally allow
    // sourceParentPath.length === 0 here — root collapses to its sibling after removal.
    const isSourceParentInDestPath =
      sourceParentPath.length < destinationPath.length &&
      sourceParentPath.every((branch, index) => destinationPath[index] === branch);

    if (isSourceParentInDestPath) {
      // Source parent is an ancestor of (or is the root of) destination.
      // After removing source, the parent node collapses: source's sibling takes
      // the parent's place. The destination path loses the segment that pointed
      // into source's sibling branch.
      const sourceBranch = sourcePath[sourceParentPath.length];
      const destBranchAtSameLevel = destinationPath[sourceParentPath.length];

      // Destination is in source's sibling subtree. After removal, that branch
      // segment disappears because source's parent collapses to the sibling.
      if (sourceBranch !== destBranchAtSameLevel) {
        // After removal, destination moves up in the path
        adjustedDestinationPath = [
          ...sourceParentPath,
          ...destinationPath.slice(sourceParentPath.length + 1),
        ];
      }
    }
  }

  // Add the new split at destination
  updates.push({
    path: adjustedDestinationPath,
    spec: { $set: newSplitNode },
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
 * Create an update to split a node
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
