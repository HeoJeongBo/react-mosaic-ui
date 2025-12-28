import { useState } from 'react';
import {
  Mosaic,
  type MosaicNode,
  type MosaicPath,
  MosaicWindow,
  createBalancedTreeFromLeaves,
  getLeaves,
} from 'react-mosaic-ui';

type ViewId = 'a' | 'b' | 'c' | 'd' | 'new';

const TITLE_MAP: Record<ViewId, string> = {
  a: 'Window A',
  b: 'Window B',
  c: 'Window C',
  d: 'Window D',
  new: 'New Window',
};

const CONTENT_MAP: Record<ViewId, string> = {
  a: 'This is the content of Window A. You can drag the title bar to move this window.',
  b: 'This is Window B. Try resizing by dragging the split bars between windows.',
  c: 'Window C here. Click the split button (⊞) to divide this window.',
  d: 'Window D content. Use the expand button (⛶) to make this window larger.',
  new: 'A newly created window. You can close it with the × button.',
};

let windowCount = 0;

export const DemoApp = () => {
  // 2x2 grid for testing resize isolation
  const [currentNode, setCurrentNode] = useState<MosaicNode<ViewId> | null>({
    direction: 'column',
    splitPercentage: 50,
    first: {
      direction: 'row',
      splitPercentage: 50,
      first: 'a',
      second: 'b',
    },
    second: {
      direction: 'row',
      splitPercentage: 50,
      first: 'c',
      second: 'd',
    },
  });
  const [dragLog, setDragLog] = useState<string[]>([]);

  const createNode = (): ViewId => {
    windowCount++;
    return 'new';
  };

  const logDragEvent = (windowId: ViewId, event: string) => {
    setDragLog((prev) => [...prev.slice(-4), `${TITLE_MAP[windowId]}: ${event}`]);
  };

  const autoArrange = () => {
    if (!currentNode) return;
    const leaves = getLeaves(currentNode);
    const balanced = createBalancedTreeFromLeaves(leaves);
    setCurrentNode(balanced);
  };

  const addWindow = () => {
    const newId = createNode();
    if (!currentNode) {
      setCurrentNode(newId);
      return;
    }

    const leaves = getLeaves(currentNode);
    const newLeaves = [...leaves, newId];
    const balanced = createBalancedTreeFromLeaves(newLeaves);
    setCurrentNode(balanced);
  };

  return (
    <div className="rm-w-screen rm-h-screen rm-flex rm-flex-col rm-bg-gray-900 flex-col h-full">
      <div className="rm-bg-gray-800 rm-text-white rm-p-4 rm-flex rm-items-center rm-justify-between rm-shadow-lg">
        <div>
          <h1 className="rm-text-2xl rm-font-bold">React Mosaic UI Example</h1>
          <p className="rm-text-sm rm-text-gray-400 rm-mt-1">
            A modern tiling window manager for React
          </p>
        </div>
        <div className="rm-flex rm-gap-2">
          <button
            type="button"
            onClick={addWindow}
            className="rm-px-4 rm-py-2 rm-bg-blue-600 rm-text-white rm-rounded rm-font-medium hover:rm-bg-blue-700 rm-transition rm-shadow"
          >
            ➕ Add Window
          </button>
          <button
            type="button"
            onClick={autoArrange}
            className="rm-px-4 rm-py-2 rm-bg-green-600 rm-text-white rm-rounded rm-font-medium hover:rm-bg-green-700 rm-transition rm-shadow"
            disabled={!currentNode}
          >
            🔄 Auto Arrange
          </button>
          <button
            type="button"
            onClick={() => setCurrentNode(null)}
            className="rm-px-4 rm-py-2 rm-bg-red-600 rm-text-white rm-rounded rm-font-medium hover:rm-bg-red-700 rm-transition rm-shadow"
          >
            🗑️ Clear All
          </button>
        </div>
      </div>

      <div className="rm-flex-1 rm-p-4 rm-bg-gray-900 h-full">
        <Mosaic<ViewId>
          renderTile={(id: ViewId, path: MosaicPath) => (
            <MosaicWindow
              path={path}
              title={TITLE_MAP[id]}
              createNode={createNode}
              className="rm-h-full"
              onDragStart={() => logDragEvent(id, 'Drag started')}
              onDragEnd={(type: 'drop' | 'reset') => logDragEvent(id, `Drag ended: ${type}`)}
              additionalControls={
                <div className="rm-flex rm-flex-col rm-gap-2">
                  <button
                    type="button"
                    className="rm-px-3 rm-py-1 rm-text-xs rm-bg-blue-500 rm-text-white rm-rounded hover:rm-bg-blue-600"
                    onClick={() => alert(`Custom action for ${TITLE_MAP[id]}`)}
                  >
                    Custom Action
                  </button>
                  <button
                    type="button"
                    className="rm-px-3 rm-py-1 rm-text-xs rm-bg-green-500 rm-text-white rm-rounded hover:rm-bg-green-600"
                    onClick={() => console.log('Window info:', { id, path })}
                  >
                    Log Info
                  </button>
                </div>
              }
            >
              <div className="rm-flex rm-flex-col rm-h-full">
                <div className="rm-flex-1 rm-flex rm-flex-col rm-items-center rm-justify-center rm-space-y-4">
                  <div className="rm-text-center">
                    <h2 className="rm-text-3xl rm-font-bold rm-mb-2 rm-text-gray-800">
                      {TITLE_MAP[id]}
                    </h2>
                    <div className="rm-inline-block rm-bg-gray-100 rm-px-3 rm-py-1 rm-rounded-full rm-mb-4">
                      <code className="rm-text-xs rm-text-gray-600">ID: {id}</code>
                    </div>
                  </div>

                  <div className="rm-max-w-md rm-text-center">
                    <p className="rm-text-gray-600 rm-leading-relaxed">{CONTENT_MAP[id]}</p>
                  </div>

                  <div className="rm-bg-blue-50 rm-border rm-border-blue-200 rm-rounded-lg rm-p-4 rm-max-w-md">
                    <p className="rm-text-sm rm-font-semibold rm-text-blue-800 rm-mb-2">
                      📍 Current Path:
                    </p>
                    <code className="rm-text-xs rm-text-blue-600 rm-bg-white rm-px-2 rm-py-1 rm-rounded">
                      {path.length > 0 ? path.join(' → ') : 'root'}
                    </code>
                  </div>

                  {dragLog.length > 0 && (
                    <div className="rm-bg-yellow-50 rm-border rm-border-yellow-200 rm-rounded-lg rm-p-4 rm-max-w-md rm-w-full">
                      <p className="rm-text-sm rm-font-semibold rm-text-yellow-800 rm-mb-2">
                        🎯 Recent Drag Events:
                      </p>
                      <div className="rm-space-y-1">
                        {dragLog.map((log) => (
                          <div
                            key={`${log}-${Math.random()}`}
                            className="rm-text-xs rm-text-yellow-700 rm-bg-white rm-px-2 rm-py-1 rm-rounded"
                          >
                            {log}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="rm-grid rm-grid-cols-2 rm-gap-3 rm-max-w-md rm-w-full">
                    <div className="rm-bg-purple-50 rm-border rm-border-purple-200 rm-rounded rm-p-3 rm-text-center">
                      <div className="rm-text-2xl rm-mb-1">↻</div>
                      <div className="rm-text-xs rm-text-purple-800 rm-font-medium">Replace</div>
                      <div className="rm-text-xs rm-text-purple-600 rm-mt-1">Replace window</div>
                    </div>
                    <div className="rm-bg-green-50 rm-border rm-border-green-200 rm-rounded rm-p-3 rm-text-center">
                      <div className="rm-text-2xl rm-mb-1">⊞</div>
                      <div className="rm-text-xs rm-text-green-800 rm-font-medium">Split</div>
                      <div className="rm-text-xs rm-text-green-600 rm-mt-1">Divide window</div>
                    </div>
                    <div className="rm-bg-orange-50 rm-border rm-border-orange-200 rm-rounded rm-p-3 rm-text-center">
                      <div className="rm-text-2xl rm-mb-1">⛶</div>
                      <div className="rm-text-xs rm-text-orange-800 rm-font-medium">Expand</div>
                      <div className="rm-text-xs rm-text-orange-600 rm-mt-1">Maximize window</div>
                    </div>
                    <div className="rm-bg-red-50 rm-border rm-border-red-200 rm-rounded rm-p-3 rm-text-center">
                      <div className="rm-text-2xl rm-mb-1">✕</div>
                      <div className="rm-text-xs rm-text-red-800 rm-font-medium">Close</div>
                      <div className="rm-text-xs rm-text-red-600 rm-mt-1">Remove window</div>
                    </div>
                    <div className="rm-bg-indigo-50 rm-border rm-border-indigo-200 rm-rounded rm-p-3 rm-text-center rm-col-span-2">
                      <div className="rm-text-2xl rm-mb-1">⋯</div>
                      <div className="rm-text-xs rm-text-indigo-800 rm-font-medium">More</div>
                      <div className="rm-text-xs rm-text-indigo-600 rm-mt-1">
                        Additional controls drawer
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </MosaicWindow>
          )}
          value={currentNode}
          onChange={setCurrentNode}
          className="rm-h-full rm-rounded-lg rm-overflow-hidden rm-shadow-2xl"
          zeroStateView={
            <div className="rm-flex rm-flex-col rm-items-center rm-justify-center rm-h-full rm-bg-gradient-to-br rm-from-gray-50 rm-to-gray-100">
              <div className="rm-text-6xl rm-mb-4">📭</div>
              <h3 className="rm-text-2xl rm-font-bold rm-text-gray-700 rm-mb-2">No Windows</h3>
              <p className="rm-text-gray-500 rm-mb-6">Click "Add Window" to get started</p>
              <button
                type="button"
                onClick={addWindow}
                className="rm-px-6 rm-py-3 rm-bg-blue-600 rm-text-white rm-rounded-lg rm-font-medium hover:rm-bg-blue-700 rm-transition rm-shadow-lg"
              >
                ➕ Add Your First Window
              </button>
            </div>
          }
        />
      </div>
    </div>
  );
};
