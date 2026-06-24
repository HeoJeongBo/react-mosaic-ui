import {
  Mosaic,
  MosaicLayout,
  type MosaicNode,
  type MosaicPath,
  MosaicWindow,
  createBalancedTreeFromLeaves,
  defineRegistry,
  getLeaves,
  useMosaicPanels,
  usePanelState,
  usePersistedLayout,
} from '@heojeongbo/react-mosaic-ui';
import { useCallback, useEffect, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// Tab button
// ---------------------------------------------------------------------------

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} className={`demo-tab${active ? ' active' : ''}`}>
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// High-level API demo — useMosaicPanels + MosaicLayout
// ---------------------------------------------------------------------------

function PanelContent({ title, index }: { title: string; index: number }) {
  useEffect(() => {
    console.log(`[PanelContent] mount — ${title} (#${index})`);
    return () => {
      console.log(`[PanelContent] unmount — ${title} (#${index})`);
    };
  }, [title, index]);

  return (
    <div className="panel-content">
      <div className="panel-index">#{index}</div>
      <p className="panel-title">{title}</p>
    </div>
  );
}

function HighLevelDemo() {
  const { panels, addPanel, removePanel, clearPanels } = useMosaicPanels();
  const counterRef = useRef(0);

  const handleAdd = () => {
    counterRef.current += 1;
    const n = counterRef.current;
    const id = `panel-${n}`;
    addPanel({
      id,
      title: `Panel ${n}`,
      content: <PanelContent title={`Panel ${n}`} index={n} />,
      renderToolbar: () => (
        <div className="demo-window-toolbar">
          <span>Panel {n}</span>
          <button type="button" onClick={() => removePanel(id)}>
            Remove
          </button>
        </div>
      ),
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '0.75rem' }}>
      <div className="demo-controls">
        <button type="button" onClick={handleAdd} className="demo-btn demo-btn-primary">
          + Add Panel
        </button>
        <button
          type="button"
          onClick={clearPanels}
          disabled={panels.length === 0}
          className="demo-btn demo-btn-danger"
        >
          Clear All
        </button>
        <span className="demo-stat">
          panels.length = <span>{panels.length}</span>
        </span>
      </div>

      <div className="demo-mosaic-area">
        <MosaicLayout
          panels={panels}
          getDirection={(nextCount) => (nextCount % 2 === 0 ? 'row' : 'column')}
          zeroStateView={
            <div className="demo-zero-state">
              <p>Click the + Add Panel button to add panels</p>
            </div>
          }
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Low-level API demo — Mosaic + MosaicWindow (manual approach)
// ---------------------------------------------------------------------------

type LowLevelViewId = 'a' | 'b' | 'c' | 'd' | 'new';

const LOW_LEVEL_TITLE: Record<LowLevelViewId, string> = {
  a: 'Window A',
  b: 'Window B',
  c: 'Window C',
  d: 'Window D',
  new: 'New Window',
};

function LowLevelDemo() {
  const [currentNode, setCurrentNode] = useState<MosaicNode<LowLevelViewId> | null>({
    direction: 'column',
    splitPercentage: 50,
    first: { direction: 'row', splitPercentage: 50, first: 'a', second: 'b' },
    second: { direction: 'row', splitPercentage: 50, first: 'c', second: 'd' },
  });

  // onError demo: when the toggle is on, the tile factory rejects so a Split/Replace
  // surfaces the failure through MosaicWindow's `onError` instead of failing silently.
  const [failNext, setFailNext] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const createNode = useCallback(
    (): LowLevelViewId | Promise<LowLevelViewId> =>
      failNext ? Promise.reject(new Error('createNode failed')) : 'new',
    [failNext],
  );
  const handleError = useCallback((error: unknown, action: 'split' | 'replace') => {
    setLastError(`${action} failed: ${(error as Error).message}`);
  }, []);

  const autoArrange = useCallback(() => {
    setCurrentNode((node) => {
      if (!node) return node;
      return createBalancedTreeFromLeaves(getLeaves(node));
    });
  }, []);

  const addWindow = useCallback(() => {
    setCurrentNode((node) => {
      if (!node) return 'new';
      return { direction: 'row' as const, first: node, second: 'new', splitPercentage: 50 };
    });
  }, []);

  const renderTile = useCallback(
    (id: LowLevelViewId, path: MosaicPath) => (
      <MosaicWindow
        path={path}
        title={LOW_LEVEL_TITLE[id]}
        createNode={createNode}
        onError={handleError}
        additionalControls={
          <div className="window-extra-controls">
            <button
              type="button"
              className="demo-btn-sm"
              onClick={() => alert(`Custom action for ${LOW_LEVEL_TITLE[id]}`)}
            >
              Custom Action
            </button>
          </div>
        }
      >
        <div className="window-content">
          <h2>{LOW_LEVEL_TITLE[id]}</h2>
          <div className="window-path">path: {path.length > 0 ? path.join(' → ') : 'root'}</div>
        </div>
      </MosaicWindow>
    ),
    [createNode, handleError],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '0.75rem' }}>
      <div className="demo-controls">
        <button type="button" onClick={addWindow} className="demo-btn demo-btn-primary">
          ➕ Add Window
        </button>
        <button
          type="button"
          onClick={autoArrange}
          disabled={!currentNode}
          className="demo-btn demo-btn-success"
        >
          🔄 Auto Arrange
        </button>
        <button
          type="button"
          onClick={() => setCurrentNode(null)}
          className="demo-btn demo-btn-danger"
        >
          🗑️ Clear All
        </button>
        <label
          className="demo-stat"
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <input
            type="checkbox"
            checked={failNext}
            onChange={(e) => setFailNext(e.target.checked)}
          />
          Simulate createNode failure
        </label>
      </div>

      {lastError && (
        <button
          type="button"
          onClick={() => setLastError(null)}
          style={{
            textAlign: 'left',
            padding: '0.5rem 0.75rem',
            borderRadius: '0.375rem',
            border: '1px solid #b91c1c',
            background: '#7f1d1d',
            color: '#fee2e2',
            cursor: 'pointer',
          }}
        >
          ⚠ onError: {lastError} — toolbar Split/Replace surfaced this (click to dismiss)
        </button>
      )}

      <div className="demo-code-hint">
        <span className="demo-code-keyword">const</span> {'[currentNode, setCurrentNode] = '}
        <span className="demo-code-fn">useState</span>
        {'<MosaicNode<ViewId> | null>(initialTree)'}
        <br />
        <span className="demo-code-comment">
          {'// manage tree directly — wire renderTile and onChange manually'}
        </span>
      </div>

      <div className="demo-mosaic-area">
        <Mosaic<LowLevelViewId>
          renderTile={renderTile}
          value={currentNode}
          onChange={setCurrentNode}
          zeroStateView={
            <div className="demo-zero-state">
              <div style={{ fontSize: '3rem' }}>📭</div>
              <p>Click the Add Window button to get started</p>
            </div>
          }
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Persisted layout demo — usePersistedLayout (registry + localStorage)
// ---------------------------------------------------------------------------

type PersistedViewId = 'alpha' | 'beta' | 'gamma' | 'measured' | 'todo' | 'badge';

function PersistedView({ label, color }: { label: string; color: string }) {
  return (
    <div className="panel-content" style={{ background: color }}>
      <p className="panel-title">{label}</p>
    </div>
  );
}

function AlphaView() {
  return <PersistedView label="Alpha" color="#1e293b" />;
}
function BetaView() {
  return <PersistedView label="Beta" color="#312e81" />;
}
function GammaView() {
  return <PersistedView label="Gamma" color="#134e4a" />;
}
// Takes props — registered with `componentProps`, which defineRegistry type-checks.
function BadgeView({ count }: { count: number }) {
  return <PersistedView label={`Badge ×${count}`} color="#4c1d95" />;
}

// Mirrors a real consumer panel (e.g. oasys sensor views): it measures its own
// container with a ResizeObserver and only renders its content once a non-zero
// size is observed. If the library transiently detaches/recreates this panel's
// portal anchor (StrictMode desync), the observer never reports a real size and
// `.panel-content` is never rendered — a permanent blank tile. Used by the repro
// harness to surface the StrictMode portal bug that synchronous content hides.
function MeasuredView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setScale(Math.min(entry.contentRect.width, entry.contentRect.height) / 100);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full" style={{ width: '100%', height: '100%' }}>
      {scale > 0 && (
        <div className="panel-content" style={{ background: '#7c2d12' }}>
          <p className="panel-title">Measured (scale {scale.toFixed(2)})</p>
        </div>
      )}
    </div>
  );
}

const TODO_ITEMS = ['Read docs', 'Try drag & drop', 'Save layout', 'Reload page'];

function TodoView() {
  const [checked, setChecked] = usePanelState<Record<string, boolean>>({
    defaultState: {},
    version: 1,
  });

  const toggle = (item: string) => {
    setChecked((prev) => ({ ...prev, [item]: !prev[item] }));
  };

  return (
    <div className="panel-content" style={{ alignItems: 'flex-start', gap: '0.5rem' }}>
      <p className="panel-title" style={{ marginBottom: '0.25rem' }}>
        Check items — state is saved with the layout
      </p>
      {TODO_ITEMS.map((item) => (
        <label
          key={item}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
        >
          <input type="checkbox" checked={!!checked[item]} onChange={() => toggle(item)} />
          <span
            style={{
              textDecoration: checked[item] ? 'line-through' : 'none',
              opacity: checked[item] ? 0.5 : 1,
            }}
          >
            {item}
          </span>
        </label>
      ))}
    </div>
  );
}

function BetaToolbar() {
  return (
    <div className="demo-window-toolbar">
      <span>Beta (custom toolbar)</span>
    </div>
  );
}

function BorderProvider({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-testid="border-wrapper"
      style={{ height: '100%', padding: '4px', boxSizing: 'border-box' }}
    >
      {children}
    </div>
  );
}

// Titles are colocated with their registry entry — no separate titles map needed.
// defineRegistry preserves the literal key/entry types and checks each entry's
// `componentProps` against its `component` (try `{ count: 'oops' }` → type error).
const PERSISTED_REGISTRY = defineRegistry({
  alpha: { component: AlphaView, title: 'Alpha' },
  beta: { component: BetaView, toolbar: BetaToolbar, title: 'Beta' },
  gamma: { component: GammaView, wrapper: BorderProvider, title: 'Gamma' },
  measured: { component: MeasuredView, title: 'Measured' },
  todo: { component: TodoView, title: 'Todo (panel state)' },
  badge: { component: BadgeView, componentProps: { count: 5 }, title: 'Badge (typed props)' },
});

const PERSISTED_STORAGE_KEY = 'react-mosaic-demo-layout';

function PersistedDemo() {
  const [savedFlash, setSavedFlash] = useState(false);

  const {
    panels,
    initialNode,
    onNodeChange,
    saveLayout,
    addPanel,
    removePanel,
    activeIds,
    isDirty,
    resetLayout,
    PanelStateProvider,
  } = usePersistedLayout<PersistedViewId>({
    storageKey: PERSISTED_STORAGE_KEY,
    registry: PERSISTED_REGISTRY,
    // Re-hydrate when another tab saves the same storageKey (default is single-tab).
    syncAcrossTabs: true,
    onSave: () => {
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 1500);
    },
    onPanelOpen: (id) => console.log('[demo] panel opened:', id),
    onPanelClose: (id) => console.log('[demo] panel closed:', id),
    onReset: () => console.log('[demo] layout reset'),
  });

  const ids: PersistedViewId[] = ['alpha', 'beta', 'gamma', 'measured', 'todo', 'badge'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '0.75rem' }}>
      <div className="demo-controls">
        <button
          type="button"
          onClick={saveLayout}
          disabled={!isDirty}
          className="demo-btn demo-btn-primary"
        >
          {savedFlash ? '✓ Saved' : isDirty ? '💾 Save layout' : '💾 Up to date'}
        </button>
        <button type="button" onClick={resetLayout} className="demo-btn demo-btn-danger">
          ↺ Reset
        </button>
        {ids.map((id) => (
          <button
            key={id}
            type="button"
            className="demo-btn"
            onClick={() => (activeIds.has(id) ? removePanel(id) : addPanel(id))}
          >
            {activeIds.has(id)
              ? `− ${PERSISTED_REGISTRY[id].title ?? id}`
              : `+ ${PERSISTED_REGISTRY[id].title ?? id}`}
          </button>
        ))}
      </div>

      <div className="demo-code-hint">
        <span className="demo-code-comment">
          {'// Check items in "Todo" panel, Save layout, then reload — checkbox state is restored.'}
        </span>
        <br />
        <span className="demo-code-comment">
          {'// syncAcrossTabs: open this page in a 2nd tab and Save — the other tab updates live.'}
        </span>
      </div>

      <div className="demo-mosaic-area">
        <PanelStateProvider>
          <MosaicLayout<PersistedViewId>
            panels={panels}
            initialNode={initialNode}
            onNodeChange={onNodeChange}
            zeroStateView={
              <div className="demo-zero-state">
                <p>Add a panel, arrange it, then Save layout</p>
              </div>
            }
          />
        </PanelStateProvider>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root app with tab switcher
// ---------------------------------------------------------------------------

type Tab = 'high' | 'low' | 'persisted';

export const DemoApp = () => {
  const [activeTab, setActiveTab] = useState<Tab>('high');

  return (
    <div className="demo-app">
      <div className="demo-header">
        <div>
          <h1>React Mosaic UI</h1>
          <p>Tiling window manager for React</p>
        </div>
        <div className="demo-tabs">
          <TabButton active={activeTab === 'high'} onClick={() => setActiveTab('high')}>
            ✨ High-level API
          </TabButton>
          <TabButton active={activeTab === 'low'} onClick={() => setActiveTab('low')}>
            🔧 Low-level API
          </TabButton>
          <TabButton active={activeTab === 'persisted'} onClick={() => setActiveTab('persisted')}>
            💾 Persisted layout
          </TabButton>
        </div>
      </div>

      <div className="demo-content">
        {activeTab === 'high' && <HighLevelDemo />}
        {activeTab === 'low' && <LowLevelDemo />}
        {activeTab === 'persisted' && <PersistedDemo />}
      </div>
    </div>
  );
};
