# React Mosaic UI - Example

A live demo of React Mosaic UI across three tabs — a high-level, a low-level, and a
persisted-layout approach.

## Quick Start

```bash
# Install dependencies
bun install

# Run development server
bun run dev
```

Then open your browser to `http://localhost:5173`

## What's Demonstrated

The app has three tabs:

### ✨ High-level API — `useMosaicPanels` + `<MosaicLayout>`
- Add / remove / clear panels by id; the tree is reconciled for you.
- Panel content is portaled into stable anchors, so reshuffling never unmounts it.

### 🔧 Low-level API — `<Mosaic>` + `<MosaicWindow>`
- Manage the tree yourself (`value` / `onChange`), wire `renderTile` and the toolbar.
- Built-in toolbar buttons (Split `⊞`, Replace `↻`, Expand `⛶` 70%, Maximize `⤢`, Close `✕`).
- **`onError`**: toggle "Simulate createNode failure", then Split/Replace surfaces the
  rejected `createNode` through a banner instead of failing silently.

### 💾 Persisted layout — `usePersistedLayout`
- **Registry-based panels** (id → component) saved to `localStorage`; restore on reload.
- **`usePanelState`**: the "Todo" panel's checkbox state is saved/restored with the layout
  (wrap `<MosaicLayout>` in the returned `PanelStateProvider`).
- **`syncAcrossTabs`**: open the page in a second tab and Save — the other tab re-hydrates live.
- **`defineRegistry`**: the registry is type-checked, including per-entry `componentProps`
  (the "Badge" panel passes typed props).

### 🎨 Drag & drop and ↔️ resizing (all tabs)
- Drag a window's title to move it; drop on any of the 4 sides or the viewport edges.
- Drag the split bars to resize (minimum pane size enforced, live update).
- Resize handles are **keyboard operable**: focus a handle, then Arrow keys nudge
  (Shift = 10%), Home/End jump to the min/max pane size.

## Code Structure

```
example/
├── src/
│   ├── app.tsx          # Main demo application
│   └── main.tsx         # Entry point
├── index.html           # HTML template
├── vite.config.ts       # Vite configuration
└── package.json         # Dependencies
```

## Customization

> The mosaic itself is themed with `--rm-*` CSS variables (shipped by the library).
> The example app's own chrome (buttons, page layout) uses Tailwind — that's separate
> from how you theme `react-mosaic-ui`.

Theme the mosaic by overriding its CSS variables on `:root` (or any ancestor). No `!important` needed:

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
  --rm-split-size: 4px;
  --rm-toolbar-height: 40px;
  --rm-toolbar-padding: 0.5rem 1rem;
  --rm-toolbar-border: 1px solid var(--rm-border-color);
  --rm-window-radius: 0.25rem;
  --rm-window-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  --rm-window-body-padding: 1rem;
}
```

Every element carries a single semantic class (`.rm-mosaic-window-toolbar`, `.rm-mosaic-window-body`, …)
that owns all of its styling and uses **no `!important`** — so you can override any of them with plain CSS.
For a chrome-less look, you can also use the `hideToolbar`, `bodyPadding`, and `bodyClassName` props on
`MosaicWindow` / per-panel configs instead of CSS overrides.

See the [Style Customization section in the main README](../README.md#style-customization) for the full
variable list, override examples, and headless-window props.

## Learn More

- [Main Documentation](../README.md)
- [FSD Architecture](../docs/fsd-architecture.md)
- [API Reference](../README.md#api-reference)
