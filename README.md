# React Mosaic UI

A modern React tiling window manager built with FSD architecture, TypeScript, and Tailwind CSS v4.

> Inspired by [react-mosaic](https://github.com/nomcopter/react-mosaic)

## 📚 Documentation

### Core Guides
- **[Claude Guide](./docs/claude.md)**: Main guide for working with Claude Code
- **[FSD Architecture](./docs/fsd-architecture.md)**: Feature-Sliced Design architecture details
- **[Naming Convention](./docs/naming-convention.md)**: File, variable, and function naming rules
- **[Clean Code Guide](./docs/clean-code-guide.md)**: Clean code principles and patterns
- **[TypeScript Guide](./docs/typescript-guide.md)**: Type definitions and TypeScript best practices
- **[Testing Guide](./docs/testing-guide.md)**: Test writing and `.test.ts` file rules

## 🏗️ Project Structure

```
src/
├── shared/       # Reusable types, utilities, UI
│   ├── types/    # Common type definitions
│   ├── lib/      # Utility functions
│   └── ui/       # Basic UI components
├── entities/     # Business entities
│   ├── mosaic/   # Mosaic main component
│   └── window/   # MosaicWindow component
├── features/     # Business features
│   ├── drag-drop/    # Drag and drop
│   ├── resize/       # Resizing
│   └── window-controls/  # Window controls
└── widgets/      # Complex UI blocks
```

## 🎯 Core Principles

### 1. File Naming
- **Kebab-case**: `user-profile.tsx`, `add-to-cart.ts`
- **Test files**: `my-component.test.ts`
- **Type definitions**: `my-component.types.ts`

### 2. FSD Layers
```
shared → entities → features → widgets
```

### 3. Tailwind CSS v4
- **Prefix**: `rm-` (react-mosaic)
- **Scoped**: Only applied within `.react-mosaic` class
- **CSS Variables**: User customizable

## 🚀 Getting Started

### Installation

```bash
bun install
```

### Development

```bash
# Build library
bun run build

# Run example (recommended)
cd example && bun install && bun run dev

# Run tests
bun run test

# Type checking
bun run typecheck
```

### Example App

The example app runs in a separate directory:

```bash
cd example
bun install
bun run dev
```

Open `http://localhost:5173` in your browser.

## 📦 Usage

### Basic Usage

```typescript
import { Mosaic, MosaicWindow, type MosaicNode } from 'react-mosaic-ui';
import 'react-mosaic-ui/styles.css';

type ViewId = 'a' | 'b' | 'c';

function App() {
  const [tree, setTree] = useState<MosaicNode<ViewId>>({
    direction: 'row',
    first: 'a',
    second: {
      direction: 'column',
      first: 'b',
      second: 'c',
    },
  });

  return (
    <Mosaic<ViewId>
      renderTile={(id, path) => (
        <MosaicWindow path={path} title={`Window ${id}`}>
          <div>Content for {id}</div>
        </MosaicWindow>
      )}
      value={tree}
      onChange={setTree}
    />
  );
}
```

### Advanced Usage

```typescript
import {
  Mosaic,
  MosaicWindow,
  createBalancedTreeFromLeaves,
  getLeaves,
} from 'react-mosaic-ui';

function App() {
  const [tree, setTree] = useState<MosaicNode<string> | null>(null);

  const createNode = () => `window-${Date.now()}`;

  const autoArrange = () => {
    if (!tree) return;
    const leaves = getLeaves(tree);
    const balanced = createBalancedTreeFromLeaves(leaves);
    setTree(balanced);
  };

  return (
    <Mosaic
      renderTile={(id, path) => (
        <MosaicWindow
          path={path}
          title={id}
          createNode={createNode}
          onDragStart={() => console.log('Drag started')}
          onDragEnd={(type) => console.log('Drag ended:', type)}
          additionalControls={
            <div>
              <button onClick={() => alert('Custom action')}>
                Custom Action
              </button>
            </div>
          }
        >
          <div>Window: {id}</div>
        </MosaicWindow>
      )}
      value={tree}
      onChange={setTree}
    />
  );
}
```

### Drag and Drop Events

```typescript
<MosaicWindow
  path={path}
  title="Window"
  onDragStart={() => {
    console.log('Window drag started');
  }}
  onDragEnd={(type) => {
    // type: 'drop' | 'reset'
    console.log('Window drag ended:', type);
  }}
>
  <div>Content</div>
</MosaicWindow>
```

### Additional Controls (Drawer Menu)

```typescript
<MosaicWindow
  path={path}
  title="Window"
  additionalControls={
    <div>
      <button onClick={() => console.log('Action 1')}>Action 1</button>
      <button onClick={() => console.log('Action 2')}>Action 2</button>
    </div>
  }
>
  <div>Content</div>
</MosaicWindow>
```

## 🎨 Style Customization

You can customize the theme using CSS variables:

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

## 🔧 API

### Mosaic Component

```typescript
interface MosaicProps<T> {
  renderTile: (id: T, path: MosaicPath) => JSX.Element;
  value?: MosaicNode<T> | null;
  initialValue?: MosaicNode<T> | null;
  onChange?: (node: MosaicNode<T> | null) => void;
  onRelease?: (node: MosaicNode<T> | null) => void;
  className?: string;
  zeroStateView?: JSX.Element;
  mosaicId?: string;
  createNode?: () => T | Promise<T>;
}
```

### MosaicWindow Component

```typescript
interface MosaicWindowProps<T> {
  title: string;
  path: MosaicPath;
  children: ReactNode;
  createNode?: () => T | Promise<T>;
  draggable?: boolean;
  toolbarControls?: ReactNode;
  additionalControls?: ReactNode;
  renderToolbar?: (props: MosaicWindowToolbarProps<T>, defaultToolbar: ReactNode) => ReactNode;
  onDragStart?: () => void;
  onDragEnd?: (type: 'drop' | 'reset') => void;
  className?: string;
}
```

### Utility Functions

```typescript
// Tree manipulation
getLeaves(node: MosaicNode<T>): T[]
getNodeAtPath(node: MosaicNode<T>, path: MosaicPath): MosaicNode<T> | null
createBalancedTreeFromLeaves(leaves: T[]): MosaicNode<T> | null

// Tree updates
updateTree(root: MosaicNode<T>, updates: MosaicUpdate<T>[]): MosaicNode<T>
createRemoveUpdate(root: MosaicNode<T>, path: MosaicPath): MosaicUpdate<T>
createExpandUpdate(path: MosaicPath, percentage?: number): MosaicUpdate<T>
```

## 🛠️ Tech Stack

- **React 18+**: UI library
- **TypeScript 5**: Type safety
- **Rollup**: Bundler
- **Tailwind CSS v4**: Styling (prefix: `rm-`)
- **React DnD**: Drag and drop
- **Immer**: Immutable state updates
- **Vitest**: Testing
- **Bun**: Package manager

## 📋 Features

✅ **Modern React**: React 18+ support
✅ **TypeScript**: Full type safety
✅ **FSD Architecture**: Scalable structure
✅ **Tailwind CSS v4**: Conflict-free styling (`rm-` prefix)
✅ **Tree Structure**: Flexible layouts
✅ **Drag and Drop**: Intuitive UI based on React DnD
✅ **Built-in Controls**: Replace, Split, Expand, Remove buttons
✅ **Additional Controls**: Drawer menu via additionalControls
✅ **Drag Events**: onDragStart, onDragEnd hooks
✅ **Customization**: Theme via CSS variables, full customization via renderToolbar
✅ **Controlled/Uncontrolled**: Both modes supported

## 🤝 Contributing

This project strictly follows FSD architecture and clean code principles.
Before contributing, please review the [Clean Code Guide](./docs/clean-code-guide.md) and [FSD Architecture](./docs/fsd-architecture.md).

### Git Workflow

This project uses Husky for git hooks and follows conventional commit standards.

#### Commit Message Format

All commits must follow the conventional commit format:

```
type(scope?): subject

Examples:
feat: add window resize feature
fix(mosaic): resolve drag and drop issue
docs: update README
```

**Allowed types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements
- `ci`: CI/CD changes
- `build`: Build system changes
- `revert`: Revert previous commit

#### Pre-commit Hooks

Before each commit, the following checks run automatically:
1. Linting (`bun run lint`)
2. Type checking (`bun run typecheck`)
3. Tests (`bun test`)

If any check fails, the commit will be blocked.

### Release Process

This project uses [release-it](https://github.com/release-it/release-it) for automated releases.

#### Creating a Release

```bash
# Patch release (1.0.0 → 1.0.1)
bun run release:patch

# Minor release (1.0.0 → 1.1.0)
bun run release:minor

# Major release (1.0.0 → 2.0.0)
bun run release:major

# Interactive release (choose version)
bun run release

# Dry run (test without publishing)
bun run release:dry
```

The release process will:
1. Run all checks (lint, typecheck, tests)
2. Build the project
3. Update version in package.json
4. Generate/update CHANGELOG.md
5. Create a git tag
6. Push to GitHub
7. Create a GitHub release
8. Publish to npm

## 📄 License

MIT
