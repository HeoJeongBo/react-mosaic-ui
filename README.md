# react-mosaic-ui

![coverage](https://img.shields.io/badge/coverage-100%25-brightgreen)

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
| `closable` | `boolean` | Optional — show/hide the close button |
| `hideToolbar` | `boolean` | Optional — render this panel's window with no toolbar chrome |
| `bodyPadding` | `string \| number` | Optional — inline padding override for this panel's body |
| `bodyClassName` | `string` | Optional — extra class on this panel's body |

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

Saves the layout to `localStorage` and restores it on reload. Panels are described by a **registry** that maps each id to its component(s) — only panel ids and the tree (with split percentages) are persisted, and the registry rebuilds the `MosaicPanelConfig`s on restore. Saving is **manual** (`saveLayout()`) by default; pass `autoSaveDelayMs` to debounce-save automatically. Restoring is automatic on mount.

The registry shape mirrors a real-world config map, so an existing one can be passed as-is:

**`PersistedPanelEntry`**

| Field | Type | Description |
|-------|------|-------------|
| `component` | `ComponentType<P>` | Rendered as the panel body |
| `componentProps` | `P` | Optional props forwarded to `component` at render time |
| `toolbar` | `ComponentType` | Optional custom toolbar component |
| `wrapper` | `ComponentType<{ children: ReactNode }>` | Optional wrapper (e.g. a context provider) |
| `closable` | `boolean` | Optional — show/hide the close button |
| `title` | `string` | Optional window title (overridden by the `titles` option) |

**Options**

| Option | Type | Description |
|--------|------|-------------|
| `storageKey` | `string` | required — `localStorage` key |
| `registry` | `PersistedLayoutRegistry<T>` | required — `Record<T, PersistedPanelEntry>` |
| `titles` | `Partial<Record<T, string>>` | Optional id → window title map; falls back to `String(id)` |
| `defaultPanelIds` | `T[]` | Panels shown on a clean first run; defaults to all registry keys |
| `autoSaveDelayMs` | `number` | Opt-in: debounce-persist this many ms after the tree changes (no manual `saveLayout()` needed) |
| `syncAcrossTabs` | `boolean` | Opt-in: re-hydrate from the `storage` event when another tab saves the same `storageKey` (default single-tab) |
| `onSave` / `onReset` | `(node) => void` | Called after `saveLayout()` / `resetLayout()` |
| `onPanelOpen` / `onPanelClose` | `(id) => void` | Called when a panel is shown / hidden |
| `onNodeChange` | `(node) => void` | Called on every tree change |

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
| `activeIds` | `ReadonlySet<T>` | Currently visible panel ids |
| `isDirty` | `boolean` | Whether the layout changed since the last `saveLayout()` |
| `clearLayout()` | `void` | Hide all panels (does not touch storage) |
| `resetLayout()` | `void` | Clear stored layout and restore the default panel set |
| `PanelStateProvider` | `ComponentType` | Wrap `<MosaicLayout>` with it to enable `usePanelState()` (see below) |

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

#### `defineRegistry()` — type-safe registries

`PersistedLayoutRegistry<T>` erases each entry's component prop types. Wrap your registry in `defineRegistry()` to keep them: `componentProps` is then checked against each entry's `component`, and the literal key/entry types are preserved.

```tsx
import { defineRegistry } from '@heojeongbo/react-mosaic-ui';

const REGISTRY = defineRegistry({
  chart: { component: Chart, componentProps: { series } }, // ✗ wrong-shaped componentProps now errors
  table: { component: Table },
});
```

#### `usePanelState()` — per-panel state that persists with the layout

Inside a panel rendered by a `MosaicLayout` wrapped in the `PanelStateProvider`, `usePanelState()` works like `useState` but the value is saved and restored with the layout. Outside a provider it transparently falls back to local component state.

```tsx
const { PanelStateProvider, /* … */ } = usePersistedLayout({ storageKey, registry });

return (
  <PanelStateProvider>
    <MosaicLayout panels={panels} initialNode={initialNode} onNodeChange={onNodeChange} />
  </PanelStateProvider>
);

// inside a panel component:
function TodoPanel() {
  const [checked, setChecked] = usePanelState<Record<string, boolean>>({ defaultState: {}, version: 1 });
  // … state is saved with saveLayout() and restored on reload
}
```

---

## API Reference

### `<Mosaic>`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `renderTile` | `(id: T, path: MosaicPath) => ReactNode` | required | Renders each leaf tile |
| `value` | `MosaicNode<T> \| null` | — | Controlled tree value |
| `initialValue` | `MosaicNode<T> \| null` | — | Uncontrolled initial value |
| `onChange` | `(node: MosaicNode<T> \| null) => void` | — | Called on every tree change |
| `onRelease` | `(node: MosaicNode<T> \| null) => void` | — | Called when drag/resize is released |
| `className` | `string` | — | Extra class on the root element |
| `zeroStateView` | `JSX.Element` | built-in | Shown when tree is `null` |
| `mosaicId` | `string` | auto | ID for multi-mosaic DnD isolation |
| `resize` | `ResizeOptions` | — | Override minimum pane size |
| `ariaLabel` | `string` | `"Mosaic layout"` | Accessible label for the container (`role="group"`) |
| `highlightActive` | `boolean` | `true` | Highlight the focused window with a ring |

### `<MosaicWindow>`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | required | Toolbar title (and default accessible label) |
| `path` | `MosaicPath` | required | Position in the tree (passed from `renderTile`) |
| `children` | `ReactNode` | required | Window body content |
| `createNode` | `() => T \| Promise<T>` | — | Enables Split and Replace toolbar buttons |
| `toolbarControls` | `ReactNode` | — | Extra controls rendered before the built-in toolbar buttons |
| `additionalControls` | `ReactNode` | — | Extra controls shown in a collapsible drawer (⋯) |
| `renderToolbar` | `(props, defaultToolbar) => ReactNode` | — | Full toolbar override (receives default as second arg); return `null` for no toolbar |
| `onDragStart` | `() => void` | — | Called when drag begins |
| `onDragEnd` | `(type: 'drop' \| 'reset') => void` | — | Called when drag ends |
| `onError` | `(error, action: 'split' \| 'replace') => void` | — | Called when a Split/Replace `createNode` rejects or throws (otherwise logged via `console.error`) |
| `closable` | `boolean` | `true` | Show the Close (✕) button |
| `hideToolbar` | `boolean` | `false` | Render with no toolbar chrome at all |
| `className` | `string` | — | Extra class on the window element |
| `bodyPadding` | `string \| number` | — | Inline padding override for the body (wins over CSS) |
| `bodyClassName` | `string` | — | Extra class on the window body |
| `ariaLabel` | `string` | `title` | Accessible label for the window region |
| `panelId` | `T` | — | Leaf id; supplied by `MosaicLayout` for panel-state persistence |

**Built-in toolbar buttons** (visible when `createNode` is provided):

| Button | Description |
|--------|-------------|
| Split | Splits the window in half |
| Replace | Replaces the window with a new tile |
| Expand | Expands to 70% of the parent |
| Maximize | Maximizes the tile to fill the layout; click again to restore |
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
  createSplitUpdate,            // Split a tile into [existing, new]: createSplitUpdate(root, path, newNode)
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
| `maximize(path)` | Render only the tile at `path`, remembering the previous tree |
| `restore()` | Restore the tree captured by the last `maximize()` |
| `isMaximized()` | Whether a tile is currently maximized |

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

### Theming with CSS variables

Override these on `:root` (or any ancestor of the mosaic) to theme the layout. No `!important` required.

```css
:root {
  /* Colors */
  --rm-border-color: #cbd5e1;
  --rm-background: #ffffff;
  --rm-window-bg: #f8fafc;
  --rm-toolbar-bg: #f1f5f9;
  --rm-split-color: #94a3b8;
  --rm-split-hover: #64748b;

  /* Sizing / layout */
  --rm-split-size: 4px;                 /* Width/height of the resize handle */
  --rm-toolbar-height: 40px;
  --rm-toolbar-padding: 0.5rem 1rem;
  --rm-toolbar-border: 1px solid var(--rm-border-color);
  --rm-window-radius: 0.25rem;
  --rm-window-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  --rm-window-body-padding: 1rem;       /* Inner padding of each window's content */

  /* Active-window highlight (static ring, no animation) */
  --rm-active-color: #3b82f6;           /* Ring color of the focused window */
  --rm-window-active-border: 0 0 0 2px var(--rm-active-color);
  --rm-window-active-shadow: 0 0 0 4px rgb(59 130 246 / 0.18);
}
```

### Overriding with plain CSS (no `!important`)

Every element carries exactly one semantic class that owns all of its styling — `.rm-mosaic-window`, `.rm-mosaic-window-toolbar`, `.rm-mosaic-window-title`, `.rm-mosaic-window-controls`, `.rm-mosaic-window-body`, `.rm-mosaic-button`, `.rm-mosaic-split`, … Because none of them use `!important`, you can override any of them at normal specificity:

```css
/* A flush, chrome-less look — no !important anywhere */
.rm-mosaic-window {
  border-radius: 8px;
  overflow: hidden;
}

.rm-mosaic-window-toolbar {
  background: none;
  height: auto;
  border-bottom: none;
  padding: 0;
}

.rm-mosaic-window-body {
  padding: 0;
}
```

You can also kill the body padding globally with just the variable:

```css
:root { --rm-window-body-padding: 0; }
```

All class names use the `rm-` prefix, so they won't collide with your own styles.

### Headless / no-chrome windows

When you don't want the default toolbar or body padding at all, use props instead of CSS overrides:

| Prop | Type | Effect |
|------|------|--------|
| `hideToolbar` | `boolean` | Render the window with no toolbar chrome at all. |
| `bodyPadding` | `string \| number` | Inline padding override for the body (e.g. `0`). Wins over CSS without `!important`. |
| `bodyClassName` | `string` | Extra class on the body, for full control. |

```tsx
<MosaicWindow title="Chart" path={path} hideToolbar bodyPadding={0}>
  <Chart />
</MosaicWindow>
```

These are also available per-panel on `MosaicLayout` / `usePersistedLayout` panel configs (`hideToolbar`, `bodyPadding`, `bodyClassName`). The `renderToolbar={() => null}` escape hatch still works if you prefer it.

### Migrating to 5.x

- **`createSplitUpdate` now takes the root and preserves the existing tile.** The signature changed from `createSplitUpdate(path, newNode, direction?)` to `createSplitUpdate(root, path, newNode, direction?)`, and it splits the node at `path` into `[existing, newNode]` instead of placing `newNode` on both sides (which produced a duplicate leaf id). Pass the current tree as the first argument.
- **Low-level bounding-box helpers are no longer exported from the package root:** `createBoundingBox`, `getWidth`, `getHeight`, `split`, `containsPoint`. They were layout internals. The `BoundingBox` **type** is still exported, so build one as a plain object (`{ top, right, bottom, left }`) if you ever pass one to `<Split>` directly.

### Migrating from 2.x

- **No more `!important`.** All styling moved onto single semantic classes with normal specificity. If you previously used `!important` to fight the library's own `!important`, you can remove it — plain overrides now win.
- **Theming variables renamed to `--rm-*`.** The old `--color-mosaic-*` aliases were removed in 4.x; use the `--rm-*` names (`--rm-border-color`, `--rm-window-bg`, `--rm-toolbar-bg`, `--rm-split-color`, `--rm-split-hover`, `--rm-background`).
- **Internal utility classes removed.** `rm-flex`, `rm-px-4`, `rm-bg-mosaic-toolbar`, etc. are no longer in `styles.css`. They were never public; if you referenced them, target the semantic classes instead.

## Active panel highlight

When you have several similar (or identical) panels, it can be hard to tell which one
you're working in. The focused window is highlighted with a persistent ring (no
animation). It's on by default and toggled imperatively, so it never triggers re-renders.

- Focusing a window (keyboard, programmatic, or clicking anywhere inside it) marks it active.
  Active state persists as "last focused", like an editor's active pane.
- Disable globally with `highlightActive={false}` on `<Mosaic>`.
- Theme with the `--rm-active-color`, `--rm-window-active-border`, and `--rm-window-active-shadow`
  CSS variables.

```tsx
// Default on:
<Mosaic value={tree} onChange={setTree} renderTile={renderTile} />

// Off:
<Mosaic value={tree} onChange={setTree} renderTile={renderTile} highlightActive={false} />
```

Style hook: the active window gets `.rm-mosaic-window--active`.

## Accessibility

The library ships sensible ARIA defaults:

- The mosaic container has `role="group"` and an `aria-label` (default `"Mosaic layout"`, override with the `ariaLabel` prop on `<Mosaic>`).
- Each window has `role="region"` and an `aria-label` defaulting to its `title` (override per window with the `ariaLabel` prop on `<MosaicWindow>`).
- Resize handles have `role="separator"`, `aria-orientation`, `aria-valuenow/min/max`, are focusable (`tabIndex={0}`), and are **keyboard operable**: with the handle focused, Arrow keys nudge the split by 1% (10% with <kbd>Shift</kbd>), and <kbd>Home</kbd>/<kbd>End</kbd> jump to the minimum/maximum pane size.
- Toolbar buttons carry `aria-label`s matching their action (Split, Replace, Expand, Maximize, Close, More) and show a visible focus ring via `:focus-visible` (keyboard only) — no `outline: none` dead end.
- The active-panel highlight is purely visual — a focused window's `role="region"` is already announced, so no extra ARIA is added.

```tsx
<Mosaic ariaLabel="Dashboard panes" renderTile={...} value={...} onChange={...} />
<MosaicWindow title="Sales" ariaLabel="Sales chart" path={path}>…</MosaicWindow>
```

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

# Run tests
bun run test

# Run tests with coverage (100% thresholds enforced)
bun run test:coverage

# Type check
bun run typecheck

# Lint
bun run lint

# Run all checks (lint + typecheck + tests)
bun run check

# Run the example app
cd example && bun install && bun run dev
```

### Testing & coverage

The test suite runs on [Vitest](https://vitest.dev) + Testing Library (jsdom).
`vitest.config.ts` enforces **100% coverage** thresholds for statements, branches,
functions, and lines:

```bash
bun run test:coverage
```

Notes on what 100% means here:

- `bun run check` runs lint + typecheck + tests; coverage thresholds are enforced
  separately by `bun run test:coverage`.
- A small number of genuinely-unreachable defensive guards and drag-and-drop timing
  branches are annotated with `/* v8 ignore */` and excluded from the count.
- Barrel `index.ts` files, type-only modules, and the context default object are
  excluded from instrumentation (see `coverage.exclude` in `vitest.config.ts`).

### Release

```bash
bun run release:patch   # 5.0.0 → 5.0.1
bun run release:minor   # 5.0.0 → 5.1.0
bun run release:major   # 5.0.0 → 6.0.0
bun run release:dry     # dry run (no publish)
```

The release process runs lint + typecheck + tests, builds, bumps the version, generates CHANGELOG, tags the commit, pushes to GitHub, and publishes to npm.

## Tech Stack

| Tool | Purpose |
|------|---------|
| React 18 / 19 | UI |
| TypeScript 5 | Type safety |
| Rollup | Library bundler |
| Plain CSS | Styling — `rm-` prefix, CSS-variable theming, no `!important` |
| React DnD | Drag and drop |
| Immer | Immutable tree updates |
| Vitest | Testing |
| Bun | Package manager & scripts |

## License

MIT
