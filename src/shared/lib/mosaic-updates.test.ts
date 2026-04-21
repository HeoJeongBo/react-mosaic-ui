import { describe, expect, it } from 'vitest';
import type { MosaicNode } from '../types';
import { MosaicDropTargetPosition } from '../types';
import {
  createDragToUpdates,
  createExpandUpdate,
  createHideUpdate,
  createRemoveUpdate,
  createReplaceUpdate,
  createSplitUpdate,
  updateSplitPercentage,
  updateTree,
} from './mosaic-updates';

type TestId = 'a' | 'b' | 'c' | 'd' | 'e';

describe('mosaic-updates', () => {
  describe('createRemoveUpdate', () => {
    it('should remove a leaf node and replace parent with sibling', () => {
      const root: MosaicNode<TestId> = {
        direction: 'row',
        first: 'a',
        second: 'b',
        splitPercentage: 50,
      };

      const update = createRemoveUpdate(root, ['first']);
      const result = updateTree(root, [update]);

      expect(result).toBe('b');
    });

    it('should remove a nested leaf node', () => {
      const root: MosaicNode<TestId> = {
        direction: 'row',
        first: {
          direction: 'column',
          first: 'a',
          second: 'b',
          splitPercentage: 50,
        },
        second: 'c',
        splitPercentage: 50,
      };

      const update = createRemoveUpdate(root, ['first', 'first']);
      const result = updateTree(root, [update]);

      expect(result).toEqual({
        direction: 'row',
        first: 'b',
        second: 'c',
        splitPercentage: 50,
      });
    });
  });

  describe('createDragToUpdates', () => {
    it('should move a window from one location to another', () => {
      const root: MosaicNode<TestId> = {
        direction: 'row',
        first: 'a',
        second: {
          direction: 'column',
          first: 'b',
          second: 'c',
          splitPercentage: 50,
        },
        splitPercentage: 40,
      };

      // Drag 'a' to the left of 'b'
      const updates = createDragToUpdates(
        root,
        ['first'],
        ['second', 'first'],
        MosaicDropTargetPosition.LEFT,
      );

      const result = updateTree(root, updates);

      // When 'a' is dragged to the left of 'b', 'a' is removed from root.first
      // and since root.first only contained 'a', it collapses to just the second branch
      expect(result).toEqual({
        direction: 'column',
        first: 'b',
        second: 'c',
        splitPercentage: 50,
      });
    });

    it('should move a window to the right', () => {
      const root: MosaicNode<TestId> = {
        direction: 'row',
        first: 'a',
        second: 'b',
        splitPercentage: 50,
      };

      const updates = createDragToUpdates(
        root,
        ['first'],
        ['second'],
        MosaicDropTargetPosition.RIGHT,
      );

      const result = updateTree(root, updates);

      // 'a' should be on the right of 'b'
      expect(result).toEqual({
        direction: 'row',
        first: 'b',
        second: 'a',
        splitPercentage: 50,
      });
    });

    it('should move a window to the top', () => {
      const root: MosaicNode<TestId> = {
        direction: 'row',
        first: 'a',
        second: 'b',
        splitPercentage: 50,
      };

      const updates = createDragToUpdates(
        root,
        ['first'],
        ['second'],
        MosaicDropTargetPosition.TOP,
      );

      const result = updateTree(root, updates);

      // 'a' should be on top of 'b' (column direction)
      expect(result).toEqual({
        direction: 'column',
        first: 'a',
        second: 'b',
        splitPercentage: 50,
      });
    });

    it('should move a window to the bottom', () => {
      const root: MosaicNode<TestId> = {
        direction: 'row',
        first: 'a',
        second: 'b',
        splitPercentage: 50,
      };

      const updates = createDragToUpdates(
        root,
        ['first'],
        ['second'],
        MosaicDropTargetPosition.BOTTOM,
      );

      const result = updateTree(root, updates);

      // 'a' should be at bottom of 'b' (column direction)
      expect(result).toEqual({
        direction: 'column',
        first: 'b',
        second: 'a',
        splitPercentage: 50,
      });
    });

    it('should handle complex nested moves', () => {
      const root: MosaicNode<TestId> = {
        direction: 'row',
        first: {
          direction: 'column',
          first: 'a',
          second: 'b',
          splitPercentage: 50,
        },
        second: {
          direction: 'column',
          first: 'c',
          second: 'd',
          splitPercentage: 50,
        },
        splitPercentage: 50,
      };

      // Move 'a' to the left of 'd'
      const updates = createDragToUpdates(
        root,
        ['first', 'first'],
        ['second', 'second'],
        MosaicDropTargetPosition.LEFT,
      );

      const result = updateTree(root, updates);

      // After removing 'a', root.first should become 'b'
      // root.second.second should become a split of 'a' and 'd'
      expect(result).toEqual({
        direction: 'row',
        first: 'b',
        second: {
          direction: 'column',
          first: 'c',
          second: {
            direction: 'row',
            first: 'a',
            second: 'd',
            splitPercentage: 50,
          },
          splitPercentage: 50,
        },
        splitPercentage: 50,
      });
    });

    it('should not allow dropping on itself', () => {
      const root: MosaicNode<TestId> = {
        direction: 'row',
        first: 'a',
        second: 'b',
        splitPercentage: 50,
      };

      const updates = createDragToUpdates(
        root,
        ['first'],
        ['first'],
        MosaicDropTargetPosition.LEFT,
      );

      expect(updates).toEqual([]);
    });

    it('should handle path adjustment when source parent is in destination path', () => {
      const root: MosaicNode<TestId> = {
        direction: 'row',
        first: {
          direction: 'column',
          first: 'a',
          second: 'b',
          splitPercentage: 50,
        },
        second: 'c',
        splitPercentage: 50,
      };

      // Move 'a' to the right of 'b' (sibling)
      const updates = createDragToUpdates(
        root,
        ['first', 'first'],
        ['first', 'second'],
        MosaicDropTargetPosition.RIGHT,
      );

      const result = updateTree(root, updates);

      // After removing 'a', root.first becomes 'b'
      // Then we want to split 'b' with 'a' on the right
      expect(result).toEqual({
        direction: 'row',
        first: {
          direction: 'row',
          first: 'b',
          second: 'a',
          splitPercentage: 50,
        },
        second: 'c',
        splitPercentage: 50,
      });
    });

    it('should handle moving to a descendant location', () => {
      const root: MosaicNode<TestId> = {
        direction: 'row',
        first: 'a',
        second: {
          direction: 'column',
          first: 'b',
          second: 'c',
          splitPercentage: 50,
        },
        splitPercentage: 50,
      };

      // Move entire 'second' subtree to the left of 'b' within itself
      // This is a special case: destination is within source
      const updates = createDragToUpdates(
        root,
        ['second'],
        ['second', 'first'],
        MosaicDropTargetPosition.LEFT,
      );

      const result = updateTree(root, updates);

      // When destination is a parent of source, we remove source from within destination first
      // This should create a valid result
      expect(result).toBeDefined();
    });

    it('should adjust destination path when destination is in source sibling subtree', () => {
      const root: MosaicNode<TestId> = {
        direction: 'row',
        first: {
          direction: 'column',
          first: {
            direction: 'row',
            first: 'a',
            second: 'c',
            splitPercentage: 50,
          },
          second: 'b',
          splitPercentage: 50,
        },
        second: 'd',
        splitPercentage: 50,
      };

      // Move 'b' to the right of nested 'c'
      // source parent path ['first'] collapses after removal, so destination
      // path must be adjusted from ['first', 'first', 'second'] -> ['first', 'second']
      const updates = createDragToUpdates(
        root,
        ['first', 'second'],
        ['first', 'first', 'second'],
        MosaicDropTargetPosition.RIGHT,
      );

      const result = updateTree(root, updates);

      expect(result).toEqual({
        direction: 'row',
        first: {
          direction: 'row',
          first: 'a',
          second: {
            direction: 'row',
            first: 'c',
            second: 'b',
            splitPercentage: 50,
          },
          splitPercentage: 50,
        },
        second: 'd',
        splitPercentage: 50,
      });
    });
  });

  describe('createExpandUpdate', () => {
    it('should expand first branch to given percentage', () => {
      const root: MosaicNode<TestId> = {
        direction: 'row',
        first: 'a',
        second: 'b',
        splitPercentage: 50,
      };

      const update = createExpandUpdate(['first'], 70);
      const result = updateTree(root, [update]);

      expect(result).toEqual({
        direction: 'row',
        first: 'a',
        second: 'b',
        splitPercentage: 70,
      });
    });

    it('should expand second branch so first takes remaining percentage', () => {
      const root: MosaicNode<TestId> = {
        direction: 'row',
        first: 'a',
        second: 'b',
        splitPercentage: 50,
      };

      const update = createExpandUpdate(['second'], 70);
      const result = updateTree(root, [update]);

      // second branch takes 70%, so splitPercentage = 100 - 70 = 30
      expect(result).toEqual({
        direction: 'row',
        first: 'a',
        second: 'b',
        splitPercentage: 30,
      });
    });

    it('should use default 70% when no percentage given', () => {
      const update = createExpandUpdate(['first']);
      expect(update.spec).toEqual({ splitPercentage: { $set: 70 } });
    });

    it('should throw when trying to expand root node', () => {
      expect(() => createExpandUpdate([])).toThrow();
    });

    it('should expand nested node', () => {
      const root: MosaicNode<TestId> = {
        direction: 'row',
        first: {
          direction: 'column',
          first: 'a',
          second: 'b',
          splitPercentage: 50,
        },
        second: 'c',
        splitPercentage: 50,
      };

      const update = createExpandUpdate(['first', 'first'], 90);
      const result = updateTree(root, [update]);

      expect(result).toEqual({
        direction: 'row',
        first: {
          direction: 'column',
          first: 'a',
          second: 'b',
          splitPercentage: 90,
        },
        second: 'c',
        splitPercentage: 50,
      });
    });
  });

  describe('createHideUpdate', () => {
    it('should set a node to null', () => {
      const root: MosaicNode<TestId> = {
        direction: 'row',
        first: 'a',
        second: 'b',
        splitPercentage: 50,
      };

      const update = createHideUpdate<TestId>(['first']);
      const result = updateTree(root, [update]);

      expect(result).toEqual({
        direction: 'row',
        first: null,
        second: 'b',
        splitPercentage: 50,
      });
    });

    it('should produce update targeting the correct path', () => {
      const update = createHideUpdate<TestId>(['first', 'second']);
      expect(update.path).toEqual(['first', 'second']);
      expect(update.spec).toEqual({ $set: null });
    });
  });

  describe('createReplaceUpdate', () => {
    it('should replace a leaf node', () => {
      const root: MosaicNode<TestId> = {
        direction: 'row',
        first: 'a',
        second: 'b',
        splitPercentage: 50,
      };

      const update = createReplaceUpdate<TestId>(['first'], 'e');
      const result = updateTree(root, [update]);

      expect(result).toEqual({
        direction: 'row',
        first: 'e',
        second: 'b',
        splitPercentage: 50,
      });
    });

    it('should replace with a parent node', () => {
      const root: MosaicNode<TestId> = {
        direction: 'row',
        first: 'a',
        second: 'b',
        splitPercentage: 50,
      };

      const newNode: MosaicNode<TestId> = {
        direction: 'column',
        first: 'c',
        second: 'd',
        splitPercentage: 50,
      };

      const update = createReplaceUpdate<TestId>(['second'], newNode);
      const result = updateTree(root, [update]);

      expect(result).toEqual({
        direction: 'row',
        first: 'a',
        second: {
          direction: 'column',
          first: 'c',
          second: 'd',
          splitPercentage: 50,
        },
        splitPercentage: 50,
      });
    });
  });

  describe('createSplitUpdate', () => {
    it('should split a node into two with default row direction', () => {
      const root: MosaicNode<TestId> = {
        direction: 'column',
        first: 'a',
        second: 'b',
        splitPercentage: 50,
      };

      const update = createSplitUpdate<TestId>(['first'], 'c');
      const result = updateTree(root, [update]);

      expect(result).toEqual({
        direction: 'column',
        first: {
          direction: 'row',
          first: 'c',
          second: 'c',
          splitPercentage: 50,
        },
        second: 'b',
        splitPercentage: 50,
      });
    });

    it('should split with column direction', () => {
      const root: MosaicNode<TestId> = {
        direction: 'row',
        first: 'a',
        second: 'b',
        splitPercentage: 50,
      };

      const update = createSplitUpdate<TestId>(['second'], 'e', 'column');
      const result = updateTree(root, [update]);

      expect(result).toEqual({
        direction: 'row',
        first: 'a',
        second: {
          direction: 'column',
          first: 'e',
          second: 'e',
          splitPercentage: 50,
        },
        splitPercentage: 50,
      });
    });
  });

  describe('createRemoveUpdate error cases', () => {
    it('should throw when root is null', () => {
      expect(() => createRemoveUpdate(null, ['first'])).toThrow();
    });

    it('should throw when path is empty (removing root)', () => {
      const root: MosaicNode<TestId> = {
        direction: 'row',
        first: 'a',
        second: 'b',
        splitPercentage: 50,
      };
      expect(() => createRemoveUpdate(root, [])).toThrow();
    });
  });
});

describe('updateSplitPercentage', () => {
  it('updates splitPercentage at root (empty path)', () => {
    const root: MosaicNode<TestId> = {
      direction: 'row',
      first: 'a',
      second: 'b',
      splitPercentage: 50,
    };
    const result = updateSplitPercentage(root, [], 70);
    expect(result).toEqual({ ...root, splitPercentage: 70 });
  });

  it('updates splitPercentage at nested path', () => {
    const inner: MosaicNode<TestId> = {
      direction: 'column',
      first: 'b',
      second: 'c',
      splitPercentage: 50,
    };
    const root: MosaicNode<TestId> = {
      direction: 'row',
      first: 'a',
      second: inner,
      splitPercentage: 50,
    };
    const result = updateSplitPercentage(root, ['second'], 30);
    expect(result).toEqual({ ...root, second: { ...inner, splitPercentage: 30 } });
  });

  it('preserves sibling subtree reference (no unnecessary clone)', () => {
    const firstNode: MosaicNode<TestId> = 'a';
    const inner: MosaicNode<TestId> = {
      direction: 'column',
      first: 'b',
      second: 'c',
      splitPercentage: 50,
    };
    const root: MosaicNode<TestId> = {
      direction: 'row',
      first: firstNode,
      second: inner,
      splitPercentage: 50,
    };
    const result = updateSplitPercentage(root, ['second'], 40);
    // 'first' subtree is untouched — same reference
    expect((result as typeof root).first).toBe(firstNode);
  });

  it('returns same reference when root is a leaf', () => {
    const leaf: MosaicNode<TestId> = 'a';
    const result = updateSplitPercentage(leaf, [], 60);
    expect(result).toBe(leaf);
  });

  it('returns same root reference when path does not exist', () => {
    const root: MosaicNode<TestId> = {
      direction: 'row',
      first: 'a',
      second: 'b',
      splitPercentage: 50,
    };
    // path leads into a leaf — nothing to update, root unchanged
    const result = updateSplitPercentage(root, ['first'], 60);
    expect(result).toBe(root);
  });
});
