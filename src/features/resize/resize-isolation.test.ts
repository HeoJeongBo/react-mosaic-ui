import { createBoundingBox, split } from '@/shared/lib/bounding-box';
import { describe, expect, it } from 'vitest';

describe('Resize Isolation', () => {
  it('should isolate horizontal resize in 2x2 grid', () => {
    // 2x2 grid structure:
    // Root (column)
    // ├── Top Row (row)
    // │   ├── A
    // │   └── B
    // └── Bottom Row (row)
    //     ├── C
    //     └── D

    // Root bounding box
    const rootBox = createBoundingBox(0, 100, 100, 0);

    // Split into top and bottom rows
    const [topRowBox, bottomRowBox] = split(rootBox, 50, 'column');

    // Top row should only occupy top 50%
    expect(topRowBox.top).toBe(0);
    expect(topRowBox.bottom).toBe(50);
    expect(topRowBox.left).toBe(0);
    expect(topRowBox.right).toBe(100);

    // Bottom row should only occupy bottom 50%
    expect(bottomRowBox.top).toBe(50);
    expect(bottomRowBox.bottom).toBe(100);
    expect(bottomRowBox.left).toBe(0);
    expect(bottomRowBox.right).toBe(100);

    // Now split top row horizontally
    const [topA, topB] = split(topRowBox, 50, 'row');

    // Top A should be in top-left quadrant
    expect(topA.top).toBe(0);
    expect(topA.bottom).toBe(50);
    expect(topA.left).toBe(0);
    expect(topA.right).toBe(50);

    // Top B should be in top-right quadrant
    expect(topB.top).toBe(0);
    expect(topB.bottom).toBe(50);
    expect(topB.left).toBe(50);
    expect(topB.right).toBe(100);

    // Bottom row should remain unchanged
    const [bottomC, bottomD] = split(bottomRowBox, 50, 'row');

    expect(bottomC.top).toBe(50);
    expect(bottomC.bottom).toBe(100);
    expect(bottomC.left).toBe(0);
    expect(bottomC.right).toBe(50);

    expect(bottomD.top).toBe(50);
    expect(bottomD.bottom).toBe(100);
    expect(bottomD.left).toBe(50);
    expect(bottomD.right).toBe(100);
  });

  it('should not affect sibling rows when resizing', () => {
    // When we resize the top row's horizontal split from 50% to 70%
    const rootBox = createBoundingBox(0, 100, 100, 0);
    const [topRowBox, bottomRowBox] = split(rootBox, 50, 'column');

    // Resize top row: A takes 70%, B takes 30%
    const [topA_resized, topB_resized] = split(topRowBox, 70, 'row');

    // Top row should be affected
    expect(topA_resized.right).toBe(70);
    expect(topB_resized.left).toBe(70);

    // Bottom row should remain at 50/50
    const [bottomC, bottomD] = split(bottomRowBox, 50, 'row');
    expect(bottomC.right).toBe(50);
    expect(bottomD.left).toBe(50);

    // The key insight: bottomRowBox itself should not change
    expect(bottomRowBox.top).toBe(50);
    expect(bottomRowBox.bottom).toBe(100);
    expect(bottomRowBox.left).toBe(0);
    expect(bottomRowBox.right).toBe(100);
  });
});
