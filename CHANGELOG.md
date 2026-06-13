# Changelog

All notable changes to this project will be documented in this file.

## [4.0.0](https://github.com/HeoJeongBo/react-mosaic-ui/compare/v2.6.0...v4.0.0) (2026-06-13)

### Features

* improve dx ([09bf47a](https://github.com/HeoJeongBo/react-mosaic-ui/commit/09bf47a9ba5bb9bcc066aab2495f5fe48bbfe72e))

## [3.0.0](https://github.com/HeoJeongBo/react-mosaic-ui/compare/v2.6.0...v3.0.0)

### ⚠ BREAKING CHANGES

* **styles**: All styling now lives on single semantic classes (`.rm-mosaic-window-toolbar`, `.rm-mosaic-window-body`, …) and **no rule uses `!important`** anymore. Consumers can now override any class with plain CSS at normal specificity. If you previously fought the library's `!important` with your own `!important` overrides, you can drop them.
* **styles**: The internal `!important` utility classes (`rm-flex`, `rm-px-4`, `rm-bg-mosaic-toolbar`, etc.) are no longer emitted in `styles.css`. They were never a public API, but if you referenced them directly they're gone.
* **theming**: The CSS theming variables are unified under the `--rm-*` namespace (the names the README already documented). The old, undocumented `--color-mosaic-*` names are aliased for one release cycle and will be removed in v4 — migrate to `--rm-border-color`, `--rm-window-bg`, `--rm-toolbar-bg`, `--rm-split-color`, `--rm-split-hover`, `--rm-background`.

### Features

* **MosaicWindow**: new `hideToolbar`, `bodyPadding`, and `bodyClassName` props for headless / no-chrome windows without any CSS overrides. Also accepted per-panel via `MosaicPanelConfig` on `MosaicLayout` / `usePersistedLayout`.
* **theming**: new CSS variables `--rm-window-body-padding`, `--rm-toolbar-padding`, `--rm-toolbar-border`, `--rm-window-radius`, `--rm-window-shadow`.

### Chores

* Removed the dead `tailwind.config.ts` and the unused `tailwindcss` / `@tailwindcss/postcss` dev dependencies (the CSS is hand-written; the build only runs autoprefixer).

## [2.6.0](https://github.com/HeoJeongBo/react-mosaic-ui/compare/v2.4.2...v2.6.0) (2026-06-05)

### Features

* **usePanelState**: panel component internal state can now be saved and restored as part of the layout — call `usePanelState<T>({ defaultState, version?, migrate? })` inside any panel component ([765feda](https://github.com/HeoJeongBo/react-mosaic-ui/commit/765feda991ebc933b219286deed66a73dba72a5b))
* **PanelStateProvider**: `usePersistedLayout` now returns `PanelStateProvider`; wrap `MosaicLayout` with it to enable panel state persistence
* **callbacks**: `usePersistedLayout` options now accept `onSave`, `onReset`, `onPanelOpen`, `onPanelClose`, and `onNodeChange` callbacks
* **isDirty**: `usePersistedLayout` returns `isDirty` — `true` when the tree or panel states have changed since the last `saveLayout()` call
* **activeIds**: `usePersistedLayout` returns `activeIds: ReadonlySet<TId>` — the set of currently visible panel ids
* **resetLayout without remount**: `resetLayout()` no longer requires a `key`-based remount; `MosaicLayout` re-initialises automatically when `initialNode` changes

## [2.4.2](https://github.com/HeoJeongBo/react-mosaic-ui/compare/v2.4.1...v2.4.2) (2026-06-04)

### Bug Fixes

* strict mode issue ([e9a1e66](https://github.com/HeoJeongBo/react-mosaic-ui/commit/e9a1e662444ae5f952c7a1166d21d3ad6741afa5))

## [2.4.1](https://github.com/HeoJeongBo/react-mosaic-ui/compare/v2.4.0...v2.4.1) (2026-06-04)

### Bug Fixes

* persist issue ([a7febc7](https://github.com/HeoJeongBo/react-mosaic-ui/commit/a7febc705eacecd08f06847ace21b9f29f111890))

## [2.4.0](https://github.com/HeoJeongBo/react-mosaic-ui/compare/v2.3.4...v2.4.0) (2026-06-04)

### Features

* add layout persist ([90868c3](https://github.com/HeoJeongBo/react-mosaic-ui/commit/90868c34ed6a57b1b2bcc5fcd5b98313f634bc83))
* add mds ([6ee8f51](https://github.com/HeoJeongBo/react-mosaic-ui/commit/6ee8f511ea8ad077d43f469012a36536273bd27a))

## [2.3.4](https://github.com/HeoJeongBo/react-mosaic-ui/compare/v2.3.3...v2.3.4) (2026-05-28)

### Features

* add get direction on next count ([7e97a62](https://github.com/HeoJeongBo/react-mosaic-ui/commit/7e97a621792a2d8da78eb60192c93e1265d938f4))

## [2.3.3](https://github.com/HeoJeongBo/react-mosaic-ui/compare/v2.3.2...v2.3.3) (2026-05-27)

### Bug Fixes

* reredner issue ([6184cda](https://github.com/HeoJeongBo/react-mosaic-ui/commit/6184cda09f964445d042b7259214cf450bcd270d))

## [2.3.2](https://github.com/HeoJeongBo/react-mosaic-ui/compare/v2.3.1...v2.3.2) (2026-05-27)

### Features

* add initial node ([9881700](https://github.com/HeoJeongBo/react-mosaic-ui/commit/988170039e0ca75c06ea17ad934510a1aa24c0e7))

## [2.3.1](https://github.com/HeoJeongBo/react-mosaic-ui/compare/v2.3.0...v2.3.1) (2026-05-27)

### Features

* add apis ([e870f7f](https://github.com/HeoJeongBo/react-mosaic-ui/commit/e870f7f09cad39cf9e552bb9f3c481b75316e1b0))

## [2.3.0](https://github.com/HeoJeongBo/react-mosaic-ui/compare/v2.2.6...v2.3.0) (2026-05-27)

### Bug Fixes

* lint ([b57fd00](https://github.com/HeoJeongBo/react-mosaic-ui/commit/b57fd00578a2e0eddd37c1b34d6b0bc8a95eb790))
* performance issue ([15a1b1d](https://github.com/HeoJeongBo/react-mosaic-ui/commit/15a1b1d5aa825bd23580bb0ee92aebdc703a585a))

## [2.2.6](https://github.com/HeoJeongBo/react-mosaic-ui/compare/v2.2.5...v2.2.6) (2026-04-24)

### Bug Fixes

* improve drag end performance ([9f4ae4f](https://github.com/HeoJeongBo/react-mosaic-ui/commit/9f4ae4fda586fdd2c378b509a4936c8f9e58d3ed))

## [2.2.5](https://github.com/HeoJeongBo/react-mosaic-ui/compare/v2.2.4...v2.2.5) (2026-04-23)

### Features

* performance ([ec37768](https://github.com/HeoJeongBo/react-mosaic-ui/commit/ec37768b0ad9218567ee6ccc69e873ceaa6b255a))

## [2.2.4](https://github.com/HeoJeongBo/react-mosaic-ui/compare/v2.2.3...v2.2.4) (2026-04-21)

### Features

* toolbar drag ([a8e5df8](https://github.com/HeoJeongBo/react-mosaic-ui/commit/a8e5df8f6edc3d65b36beab8303eb4b8e072fe42))

## [2.2.3](https://github.com/HeoJeongBo/react-mosaic-ui/compare/v2.2.2...v2.2.3) (2026-04-21)

### Bug Fixes

* resize performace issue ([fc5f2ee](https://github.com/HeoJeongBo/react-mosaic-ui/commit/fc5f2ee936b40486bd4f2a1701f485c8eb930560))
* window drag bug ([7b15afa](https://github.com/HeoJeongBo/react-mosaic-ui/commit/7b15afa9b5d9ae8322501b1067d45ad5a46bd80e))

## [2.2.2](https://github.com/HeoJeongBo/react-mosaic-ui/compare/v2.2.1...v2.2.2) (2026-04-21)

### Features

* update md ([c96594f](https://github.com/HeoJeongBo/react-mosaic-ui/commit/c96594f0c932285e165ab60e0c8cc08b4a1571e6))

## [2.2.1](https://github.com/HeoJeongBo/react-mosaic-ui/compare/v2.2.0...v2.2.1) (2026-04-21)

### Features

* add npmrc ([019e49a](https://github.com/HeoJeongBo/react-mosaic-ui/commit/019e49a39799d663b94b27d9cf5c61f76eeda998))
* improve test coverage ([7af6f1c](https://github.com/HeoJeongBo/react-mosaic-ui/commit/7af6f1c33058bc580f6f39a8c4016cfa61e24a2f))

### Bug Fixes

* test script ([fb8c0a3](https://github.com/HeoJeongBo/react-mosaic-ui/commit/fb8c0a30534848f55385d5a12e8f1e2437a541b1))

## [2.2.0](https://github.com/HeoJeongBo/react-mosaic-ui/compare/v2.1.2...v2.2.0) (2026-03-01)

### Features

* add view port edge case ([68524a2](https://github.com/HeoJeongBo/react-mosaic-ui/commit/68524a2766304f333b88f15f5381d29f136e9c0b))

### Bug Fixes

* add lint huskty ([cb7e62c](https://github.com/HeoJeongBo/react-mosaic-ui/commit/cb7e62c52f29707fd53950081e966577d5b98833))

## [2.1.2](https://github.com/HeoJeongBo/react-mosaic-ui/compare/v2.1.1...v2.1.2) (2026-02-27)

### Features

* improve performance ([f6f5d27](https://github.com/HeoJeongBo/react-mosaic-ui/commit/f6f5d27c65d942a93187b84500e47b0a3ac935ad))

### Bug Fixes

* drop target logic ([6018efd](https://github.com/HeoJeongBo/react-mosaic-ui/commit/6018efdca0286f08da5c630bd67395a517b1dd5f))

## [2.1.1](https://github.com/HeoJeongBo/react-mosaic-ui/compare/v2.1.0...v2.1.1) (2026-02-27)

### Bug Fixes

* biome issue ([9ef0d42](https://github.com/HeoJeongBo/react-mosaic-ui/commit/9ef0d4280831a755668f8c0ba3247f4ae02a8d29))
* change package name ([21cadbf](https://github.com/HeoJeongBo/react-mosaic-ui/commit/21cadbf9b6b23e57c61abaa1017485cb370dec4f))
* tsconfig ([ebcc4d2](https://github.com/HeoJeongBo/react-mosaic-ui/commit/ebcc4d20238875931fa8c34a241034a7bfdec330))

## [2.1.0](https://github.com/HeoJeongBo/react-mosaic-ui/compare/v2.0.0...v2.1.0) (2026-02-21)

### Bug Fixes

* change pakcage info ([2806a4d](https://github.com/HeoJeongBo/react-mosaic-ui/commit/2806a4d360a99d486367346fbb27c73e9a9f4029))
* change to public ([9c4d5b4](https://github.com/HeoJeongBo/react-mosaic-ui/commit/9c4d5b48319540a0ceedca4a3df66027832dad16))
* releaes info ([ffd07c1](https://github.com/HeoJeongBo/react-mosaic-ui/commit/ffd07c110d9858763780a8f2bdc5c3c87eaca5dd))

## [2.0.0](https://github.com/HeoJeongBo/react-mosaic-ui/compare/v1.0.1...v2.0.0) (2026-02-17)

### Features

* add test cases in ui ([e349247](https://github.com/HeoJeongBo/react-mosaic-ui/commit/e3492478781813b679122bd2cdf58e733aea80e5))

### Bug Fixes

* chrome on drage end issue ([3c20f55](https://github.com/HeoJeongBo/react-mosaic-ui/commit/3c20f55090ae3b7c78387453f46d26ad41deb1ed))
* drop target logic ([25056c9](https://github.com/HeoJeongBo/react-mosaic-ui/commit/25056c92f8896dce93a67fd4cc009081a7e3e80a))
* husky warning ([f870d8e](https://github.com/HeoJeongBo/react-mosaic-ui/commit/f870d8ecf0cec6a80f8a83e137ac4f158e6de779))

## 1.0.1 (2025-12-28)

### Features

* add husky & release-it ([b42eff1](https://github.com/HeoJeongBo/react-mosaic-ui/commit/b42eff15394af460fed0ce73410f01c9c8166648))
* add mosiac ui ([9e5aebe](https://github.com/HeoJeongBo/react-mosaic-ui/commit/9e5aebef316f6b4c01a9f06a61a9bf9355b1917b))
