# react-mosaic-ui

A modern React tiling window manager with drag-and-drop, resizable splits, and full TypeScript support.

> Inspired by [react-mosaic](https://github.com/nomcopter/react-mosaic)

## Installation

```bash
# npm
npm install @heojeongbo/react-mosaic-ui

# yarn
yarn add @heojeongbo/react-mosaic-ui

# pnpm
pnpm add @heojeongbo/react-mosaic-ui

# bun
bun add @heojeongbo/react-mosaic-ui
```

**Peer dependencies** (if not already installed):

```bash
bun add react react-dom
```

## Quick Start

```tsx
import { useState } from 'react';
import { Mosaic, MosaicWindow, type MosaicNode } from '@heojeongbo/react-mosaic-ui';
import '@heojeongbo/react-mosaic-ui/styles.css';

type ViewId = 'editor' | 'preview' | 'terminal';

const TITLES: Record<ViewId, string> = {
  editor: 'Editor',
  preview: 'Preview',
  terminal: 'Terminal',
};

export default function App() {
  const [tree, setTree] = useState<MosaicNode<ViewId> | null>({
    direction: 'row',
    first: 'editor',
    second: {
      direction: 'column',
      first: 'preview',
      second: 'terminal',
      splitPercentage: 60,
    },
    splitPercentage: 60,
  });

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Mosaic<ViewId>
        value={tree}
        onChange={setTree}
        renderTile={(id, path) => (
          <MosaicWindow title={TITLES[id]} path={path} createNode={() => 'editor'}>
            <div style={{ padding: 16 }}>Content: {id}</div>
          </MosaicWindow>
        )}
      />
    </div>
  );
}
```

## Core Concepts

### Tree Structure

A layout is represented as a binary tree. Leaf nodes are tile IDs (`string | number`), and parent nodes describe how to split the space.

```ts
type MosaicNode<T> = T | MosaicParent<T>;

interface MosaicParent<T> {
  direction: 'row' | 'column'; // row = left/right split, column = top/bottom split
  first: MosaicNode<T>;
  second: MosaicNode<T>;
  splitPercentage?: number;    // 0–100, defaults to 50
}
```

**Example tree** (3 tiles):

```ts
const tree: MosaicNode<string> = {
  direction: 'row',
  first: 'a',
  second: {
    direction: 'column',
    first: 'b',
    second: 'c',
  },
};
```

### Controlled vs Uncontrolled

**Controlled** — you own the state:

```tsx
const [tree, setTree] = useState<MosaicNode<string> | null>(initialTree);

<Mosaic value={tree} onChange={setTree} renderTile={renderTile} />
```

**Uncontrolled** — the component manages state internally:

```tsx
<Mosaic initialValue={initialTree} renderTile={renderTile} />
```

## High-Level API

For most use cases you don't need to manage the tree manually. `MosaicLayout` + `useMosaicPanels` handles panel state and tree structure automatically.

```tsx
import { MosaicLayout, useMosaicPanels } from '@heojeongbo/react-mosaic-ui';
import '@heojeongbo/react-mosaic-ui/styles.css';

function App() {
  const { panels, addPanel, removePanel } = useMosaicPanels();

  return (
    <>
      <button
        onClick={() =>
          addPanel({ id: 'a', title: 'Panel A', content: <div>Hello from A</div> })
        }
      >
        Add Panel
      </button>
      <div style={{ width: '100vw', height: '100vh' }}>
        <MosaicLayout panels={panels} />
      </div>
    </>
  );
}
```

### `<MosaicLayout>`

Renders a mosaic from a flat array of panel configs. Adding or removing panels surgically updates the tree — existing panel positions are preserved.

**`MosaicPanelConfig<T>`**

| Field | Type | Description |
|-------|------|-------------|
| `id` | `T` | Unique identifier |
| `title` | `string` | Window toolbar title |
| `content` | `ReactNode` | Window body |
| `renderToolbar` | `() => ReactNode` | Optional custom toolbar content |
| `Wrapper` | `ComponentType<{ children: ReactNode }>` | Optional wrapper around the entire window |

**`MosaicLayout` props**

| Prop | Type | Description |
|------|------|-------------|
| `panels` | `MosaicPanelConfig<T>[]` | required — panels to display |
| `initialNode` | `MosaicNode<T> \| null` | Starting tree, read once on mount. Falls back to a balanced tree built from `panels` when omitted |
| `onNodeChange` | `(node: MosaicNode<T> \| null) => void` | Called whenever the tree changes (resize, drag, add/remove) |
| `onPanelClose` | `(id: T) => void` | Called when a panel is closed |
| `getDirection` | `(nextCount: number) => 'row' \| 'column'` | Split direction used when a panel is added (`nextCount` = leaf count after the add) |
| `className` | `string` | Extra CSS class |
| `zeroStateView` | `JSX.Element` | Shown when panels array is empty |
| `...rest` | — | All other `<Mosaic>` props except `renderTile`, `value`, `onChange`, `initialValue` |

### `useMosaicPanels<T>()`

Hook for managing panel state. Pair with `<MosaicLayout>`.

| Return | Type | Description |
|--------|------|-------------|
| `panels` | `MosaicPanelConfig<T>[]` | Current panels array |
| `addPanel(config)` | `void` | Add panel; no-op if id already exists |
| `removePanel(id)` | `void` | Remove panel by id |
| `togglePanel(config)` | `void` | Add if absent, remove if present |
| `hasPanel(id)` | `boolean` | Check if panel with id exists |
| `clearPanels()` | `void` | Remove all panels |
| `updatePanel(id, updates)` | `void` | Patch an existing panel (id is immutable) |
| `getPanelById(id)` | `MosaicPanelConfig<T> \| null` | Look up a panel by id |

```tsx
const { panels, addPanel, removePanel, updatePanel, getPanelById } = useMosaicPanels();

// Add
addPanel({ id: 'logs', title: 'Logs', content: <LogViewer /> });

// Update title without changing id
updatePanel('logs', { title: 'Application Logs' });

// Look up
const panel = getPanelById('logs'); // MosaicPanelConfig | null

// Remove
removePanel('logs');
```

### `usePersistedLayout<T>()`

Saves the layout to `localStorage` and restores it on reload. Panels are described by a **registry** that maps each id to its component(s) — only panel ids and the tree (with split percentages) are persisted, and the registry rebuilds the `MosaicPanelConfig`s on restore. Saving is **manual** (`saveLayout()`); restoring is automatic on mount.

The registry shape mirrors a real-world config map, so an existing one can be passed as-is:

**`PersistedPanelEntry`**

| Field | Type | Description |
|-------|------|-------------|
| `component` | `ComponentType` | Rendered as the panel body |
| `toolbar` | `ComponentType` | Optional custom toolbar component |
| `wrapper` | `ComponentType<{ children: ReactNode }>` | Optional wrapper (e.g. a context provider) |
| `closable` | `boolean` | Optional — show/hide the close button |

**Options**

| Option | Type | Description |
|--------|------|-------------|
| `storageKey` | `string` | required — `localStorage` key |
| `registry` | `PersistedLayoutRegistry<T>` | required — `Record<T, PersistedPanelEntry>` |
| `titles` | `Partial<Record<T, string>>` | Optional id → window title map; falls back to `String(id)` |
| `defaultPanelIds` | `T[]` | Panels shown on a clean first run; defaults to all registry keys |

**Return**

| Return | Type | Description |
|--------|------|-------------|
| `panels` | `MosaicPanelConfig<T>[]` | Pass to `<MosaicLayout panels={...} />` |
| `initialNode` | `MosaicNode<T> \| null` | Pass to `<MosaicLayout initialNode={...} />` |
| `onNodeChange` | `(node) => void` | Wire to `<MosaicLayout onNodeChange={...} />` to track the live tree |
| `saveLayout()` | `void` | Persist the latest tree (call from a Save button) |
| `addPanel(id)` | `void` | Show a panel; no-op if id is not in the registry |
| `removePanel(id)` | `void` | Hide a panel |
| `hasPanel(id)` | `boolean` | Whether a panel id is currently shown |
| `clearLayout()` | `void` | Hide all panels (does not touch storage) |
| `resetLayout()` | `void` | Clear stored layout and restore the default panel set |

```tsx
import { MosaicLayout, usePersistedLayout } from '@heojeongbo/react-mosaic-ui';
import type { PersistedLayoutRegistry } from '@heojeongbo/react-mosaic-ui';

// Same shape as a real STATIC_SENSOR_CONFIG_REGISTRY — no titles inline.
const REGISTRY: PersistedLayoutRegistry = {
  'encoder-data': { component: EncoderData, toolbar: EncoderToolbar, wrapper: EncoderProvider },
  'motor-position': { component: MotorPosition },
  '2d-lidar': { component: Lidar2D },
};
const TITLES = { 'encoder-data': 'Encoder', 'motor-position': 'Motor', '2d-lidar': '2D LiDAR' };

function Dashboard() {
  const { panels, initialNode, onNodeChange, saveLayout } = usePersistedLayout({
    storageKey: 'dashboard-layout',
    registry: REGISTRY,
    titles: TITLES,
  });

  return (
    <>
      <button onClick={saveLayout}>Save layout</button>
      <MosaicLayout panels={panels} initialNode={initialNode} onNodeChange={onNodeChange} />
    </>
  );
}
```

> `MosaicLayout` reads `initialNode` only once (on mount). To apply a fresh tree after `resetLayout()`, remount the subtree by bumping a React `key`.

---

## API Reference

### `<Mosaic>`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `renderTile` | `(id: T, path: MosaicPath) => JSX.Element` | required | Renders each leaf tile |
| `value` | `MosaicNode<T> \| null` | — | Controlled tree value |
| `initialValue` | `MosaicNode<T> \| null` | — | Uncontrolled initial value |
| `onChange` | `(node: MosaicNode<T> \| null) => void` | — | Called on every tree change |
| `onRelease` | `(node: MosaicNode<T> \| null) => void` | — | Called when drag/resize is released |
| `className` | `string` | — | Extra class on the root element |
| `zeroStateView` | `JSX.Element` | built-in | Shown when tree is `null` |
| `mosaicId` | `string` | auto | ID for multi-mosaic DnD isolation |
| `createNode` | `() => T \| Promise<T>` | — | Factory for new tiles (enables split/replace) |
| `resize` | `ResizeOptions` | — | Override minimum pane size |

### `<MosaicWindow>`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | required | Toolbar title |
| `path` | `MosaicPath` | required | Position in the tree (passed from `renderTile`) |
| `children` | `ReactNode` | required | Window body content |
| `createNode` | `() => T \| Promise<T>` | — | Enables Split and Replace toolbar buttons |
| `draggable` | `boolean` | `true` | Whether the window can be dragged |
| `toolbarControls` | `ReactNode` | — | Replaces the default toolbar buttons entirely |
| `additionalControls` | `ReactNode` | — | Extra controls shown in a collapsible drawer |
| `renderToolbar` | `(props, defaultToolbar) => ReactNode` | — | Full toolbar override (receives default as second arg) |
| `onDragStart` | `() => void` | — | Called when drag begins |
| `onDragEnd` | `(type: 'drop' \| 'reset') => void` | — | Called when drag ends |
| `className` | `string` | — | Extra class on the window element |

**Built-in toolbar buttons** (visible when `createNode` is provided):

| Button | Description |
|--------|-------------|
| Split | Splits the window in half |
| Replace | Replaces the window with a new tile |
| Expand | Expands to 70% of the parent |
| Close | Removes the window from the layout |

### Utility Functions

```ts
import {
  // Tree inspection
  getLeaves,                    // Get all leaf IDs in order
  isParent,                     // Check if a node is a parent
  pruneTree,                    // Drop leaves not in a valid-id set, collapsing emptied splits
  getNodeAtPath,                // Get node at a given path
  getAndAssertNodeAtPathExists, // Same, throws if not found
  countNodes,                   // Count total nodes in the tree
  getTreeDepth,                 // Get maximum depth
  arePathsEqual,                // Compare two MosaicPath arrays
  getPathToCorner,              // Get path to a corner tile
  getOtherDirection,            // 'row' ↔ 'column'
  getOtherBranch,               // 'first' ↔ 'second'

  // Tree building
  createBalancedTreeFromLeaves, // Build balanced tree from array of IDs

  // Update generators (use with updateTree or mosaicActions.updateTree)
  updateTree,                   // Apply an array of MosaicUpdate to a tree
  createRemoveUpdate,           // Remove a tile
  createExpandUpdate,           // Expand a tile to a percentage
  createHideUpdate,             // Hide a tile (DnD internal)
  createReplaceUpdate,          // Replace a tile with another node
  createSplitUpdate,            // Split a tile into two
  createDragToUpdates,          // Move a tile via drag
} from '@heojeongbo/react-mosaic-ui';
```

#### Common patterns

```ts
// Get all tile IDs currently in the layout
const ids = getLeaves(tree); // ['editor', 'preview', 'terminal']

// Auto-arrange: rebuild a balanced layout from existing tiles
const balanced = createBalancedTreeFromLeaves(getLeaves(tree));
setTree(balanced);

// Remove a specific tile programmatically
const update = createRemoveUpdate(tree, pathToTile);
setTree(updateTree(tree, [update]));

// Drop tiles whose ids are no longer valid (e.g. when restoring a saved tree)
const valid = new Set(['editor', 'preview']);
const cleaned = pruneTree(tree, valid); // emptied splits collapse to the surviving side
```

### Contexts

For advanced use cases you can read the mosaic state from context using the typed convenience hooks:

```tsx
import { useMosaicContext, useMosaicWindowContext } from '@heojeongbo/react-mosaic-ui';

// Inside a tile rendered by renderTile:
function MyTile() {
  const { mosaicActions, mosaicId } = useMosaicContext();
  const { mosaicWindowActions } = useMosaicWindowContext();

  return (
    <button onClick={() => mosaicActions.remove(mosaicWindowActions.getPath())}>
      Close me
    </button>
  );
}
```

`useMosaicContext<T>()` accepts an optional generic type parameter to type `mosaicActions` when your tile key is not `string`:

```tsx
const { mosaicActions } = useMosaicContext<number>();
```

> If you prefer, you can access the raw contexts directly: `useContext(MosaicContext)` / `useContext(MosaicWindowContext)`.

**`MosaicRootActions`** (via `useMosaicContext().mosaicActions`):

| Method | Description |
|--------|-------------|
| `expand(path, percentage?)` | Expand node to percentage (default 70%) |
| `remove(path)` | Remove node at path |
| `hide(path)` | Hide node (used internally by DnD) |
| `replaceWith(path, node)` | Replace node at path |
| `updateTree(updates, suppressOnRelease?)` | Apply multiple updates atomically |
| `getRoot()` | Get current root node |
| `add(node, position?)` | Add a new node to the layout |

**`MosaicWindowActions`** (via `useMosaicWindowContext().mosaicWindowActions`):

| Method | Description |
|--------|-------------|
| `split()` | Split the current window |
| `replaceWithNew()` | Replace current window with a new tile |
| `getPath()` | Get current window's path in the tree |

## Style Customization

Import the stylesheet once at your app entry point:

```ts
import '@heojeongbo/react-mosaic-ui/styles.css';
```

Override CSS variables to theme the layout:

```css
:root {
  --rm-border-color: #cbd5e1;
  --rm-background: #ffffff;
  --rm-window-bg: #f8fafc;
  --rm-toolbar-bg: #f1f5f9;
  --rm-split-color: #94a3b8;
  --rm-split-hover: #64748b;
  --rm-split-size: 4px;       /* Width/height of the resize handle */
  --rm-toolbar-height: 40px;
}
```

All internal class names use the `rm-` prefix and are scoped under `.react-mosaic`, so they won't conflict with your own styles.

### Custom toolbar

```tsx
<MosaicWindow
  title="My Window"
  path={path}
  renderToolbar={(props, defaultToolbar) => (
    <div className="my-toolbar">
      <span>{props.title}</span>
      <div className="actions">{defaultToolbar}</div>
    </div>
  )}
>
  <div>Content</div>
</MosaicWindow>
```

When extracting the toolbar into a separate component, use the exported `MosaicWindowToolbarProps` type:

```tsx
import type { MosaicWindowToolbarProps } from '@heojeongbo/react-mosaic-ui';

function MyToolbar({ title, dragHandle }: MosaicWindowToolbarProps<string>) {
  return (
    <div ref={dragHandle.ref} style={{ display: 'flex', alignItems: 'center', padding: '0 8px' }}>
      <span>{title}</span>
    </div>
  );
}

<MosaicWindow
  title="My Window"
  path={path}
  renderToolbar={(props) => <MyToolbar {...props} />}
>
  <div>Content</div>
</MosaicWindow>
```

### Additional controls (drawer)

```tsx
<MosaicWindow
  title="My Window"
  path={path}
  additionalControls={
    <>
      <button onClick={handleExport}>Export</button>
      <button onClick={handleSettings}>Settings</button>
    </>
  }
>
  <div>Content</div>
</MosaicWindow>
```

## Advanced Examples

### Dynamic tile creation

```tsx
let nextId = 1;

function App() {
  const [tree, setTree] = useState<MosaicNode<number> | null>(1);

  return (
    <Mosaic<number>
      value={tree}
      onChange={setTree}
      createNode={() => ++nextId}
      renderTile={(id, path) => (
        <MosaicWindow title={`Window ${id}`} path={path} createNode={() => ++nextId}>
          <div>Content {id}</div>
        </MosaicWindow>
      )}
    />
  );
}
```

### Adding a new window to an existing layout

```ts
import { createBalancedTreeFromLeaves, getLeaves } from '@heojeongbo/react-mosaic-ui';

function addWindow(tree: MosaicNode<string> | null, newId: string) {
  const current = getLeaves(tree ?? []);
  return createBalancedTreeFromLeaves([...current, newId]);
}
```

### Multiple independent mosaics on one page

```tsx
<Mosaic mosaicId="mosaic-left"  value={leftTree}  onChange={setLeft}  renderTile={renderTile} />
<Mosaic mosaicId="mosaic-right" value={rightTree} onChange={setRight} renderTile={renderTile} />
```

Tiles can only be dragged within the same `mosaicId`.

### `onRelease` — respond after resize or drag completes

```tsx
<Mosaic
  value={tree}
  onChange={setTree}
  onRelease={(newTree) => {
    // save layout to server/localStorage after user finishes dragging
    saveLayout(newTree);
  }}
  renderTile={renderTile}
/>
```

## Development

```bash
# Install dependencies
bun install

# Build library
bun run build

# Run tests (367 tests)
bun run test

# Type check
bun run typecheck

# Lint
bun run lint

# Run all checks
bun run check

# Run the example app
cd example && bun install && bun run dev
```

### Release

```bash
bun run release:patch   # 2.2.1 → 2.2.2
bun run release:minor   # 2.2.1 → 2.3.0
bun run release:major   # 2.2.1 → 3.0.0
bun run release:dry     # dry run (no publish)
```

The release process runs lint + typecheck + tests, builds, bumps the version, generates CHANGELOG, tags the commit, pushes to GitHub, and publishes to npm.

## Tech Stack

| Tool | Purpose |
|------|---------|
| React 18 / 19 | UI |
| TypeScript 5 | Type safety |
| Rollup | Library bundler |
| Tailwind CSS v4 | Styling (`rm-` prefix) |
| React DnD | Drag and drop |
| Immer | Immutable tree updates |
| Vitest | Testing |
| Bun | Package manager & scripts |

## License

MIT
