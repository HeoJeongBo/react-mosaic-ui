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

The example uses Tailwind CSS for styling. You can customize the theme by modifying CSS variables:

```css
:root {
  --rm-border-color: #cbd5e1;
  --rm-background: #ffffff;
  --rm-window-bg: #f8fafc;
  --rm-toolbar-bg: #f1f5f9;
  --rm-split-color: #94a3b8;
  --rm-split-hover: #64748b;
  --rm-split-size: 4px;
  --rm-toolbar-height: 40px;
}
```

## Learn More

- [Main Documentation](../README.md)
- [FSD Architecture](../fsd-architecture.md)
- [API Reference](../README.md#-api)
