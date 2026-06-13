# React Mosaic UI - Example

This is a live example of React Mosaic UI demonstrating all features.

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Then open your browser to `http://localhost:5173`

## Features Demonstrated

### 🪟 Window Management
- **Add Window**: Create new windows dynamically
- **Remove Window**: Close windows with the × button
- **Auto Arrange**: Automatically balance the layout

### 🎯 Window Controls
- **⛶ Expand**: Maximize a window to take up more space (70% by default)
- **⊞ Split**: Divide a window into two parts
- **✕ Close**: Remove a window from the layout

### 🎨 Drag & Drop
- **Drag Title Bar**: Click and drag the window title to move it
- **Drop Zones**: Drop on any of the 4 sides (Top, Bottom, Left, Right)
- **Visual Feedback**: See drop zones highlight as you drag

### ↔️ Resizing
- **Drag Split Bars**: Click and drag the dividers between windows
- **Minimum Size**: Windows respect minimum size constraints
- **Live Update**: See changes in real-time as you resize

### 💾 Persisted Layout
- **Registry-based panels**: Panels are described by an id → component registry (`usePersistedLayout`)
- **Save Layout**: Persist the current arrangement (and split sizes) to `localStorage`
- **Restore on reload**: Reopen the page and the saved layout is rebuilt automatically

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
