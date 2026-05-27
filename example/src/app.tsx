import {
  Mosaic,
  MosaicLayout,
  type MosaicNode,
  type MosaicPath,
  MosaicWindow,
  createBalancedTreeFromLeaves,
  getLeaves,
  useMosaicPanels,
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

  const createNode = useCallback((): LowLevelViewId => 'new', []);

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
    [createNode],
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
      </div>

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
// Root app with tab switcher
// ---------------------------------------------------------------------------

type Tab = 'high' | 'low';

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
        </div>
      </div>

      <div className="demo-content">
        {activeTab === 'high' ? <HighLevelDemo /> : <LowLevelDemo />}
      </div>
    </div>
  );
};
