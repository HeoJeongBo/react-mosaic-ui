# Quick Start Guide

## Getting Started

### 1. Run Example App (Recommended)

```bash
# From root
cd example
bun install
bun run dev
```

Open `http://localhost:5173` in your browser.

### 2. Library Development

```bash
# Build library (watch mode)
bun run dev

# Single build
bun run build
```

### 3. Testing

```bash
# Run tests
bun run test

# Coverage
bun run test:coverage
```

## Project Structure

```
react-mosaic-ui/
├── src/                    # Library source
│   ├── shared/            # Types, utilities
│   ├── entities/          # Mosaic, MosaicWindow
│   ├── features/          # resize, drag-drop
│   └── styles/            # Tailwind CSS
│
├── example/               # Standalone example app
│   ├── src/
│   │   ├── app.tsx       # Demo app
│   │   └── main.tsx      # Entry point
│   └── package.json      # Independent dependencies
│
└── dist/                  # Build output (for npm publish)
```

## Key Commands

| Command | Description |
|---------|-------------|
| `bun run build` | Build library |
| `bun run dev` | Library watch mode |
| `bun run test` | Run tests |
| `bun run typecheck` | Type checking |
| `bun run lint` | Run Biome linting |
| `bun run format` | Format with Biome |

## Next Steps

1. [README.md](./README.md) - Full documentation
2. [FSD Architecture](./docs/fsd-architecture.md) - Project structure
3. [Example README](./example/README.md) - Example details
