import { describe, expect, it } from 'vitest';
import type { MosaicNode } from '../types';
import { MosaicDropTargetPosition } from '../types';
import {
  createDragToUpdates,
  createRemoveUpdate,
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

      // Expected: 'a' should be removed from root.first,
      // and 'b' should be replaced with a split of 'a' (left) and 'b' (right)
      expect(result).toEqual({
        direction: 'column',
        first: {
          direction: 'row',
          first: 'a',
          second: 'b',
          splitPercentage: 50,
        },
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
  });
});
