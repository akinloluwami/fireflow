/**
 * Editor settings persistence for workflow canvas
 * Stores viewport, panel states, and selection per workflow
 */

export interface EditorViewport {
  x: number;
  y: number;
  zoom: number;
}

export interface EditorSettings {
  viewport?: EditorViewport;
  isPanelOpen: boolean;
  isChatOpen: boolean;
  selectedNodeId: string | null;
  panelWidth?: number;
  chatWidth?: number;
}

const STORAGE_PREFIX = "editorSettings:";

const defaultSettings: EditorSettings = {
  isPanelOpen: false,
  isChatOpen: false,
  selectedNodeId: null,
};

/**
 * Get editor settings for a specific workflow
 */
export function getEditorSettings(workflowId: string): EditorSettings {
  try {
    const key = `${STORAGE_PREFIX}${workflowId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      return { ...defaultSettings, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.warn("Failed to load editor settings:", error);
  }
  return { ...defaultSettings };
}

/**
 * Save editor settings for a specific workflow
 */
export function saveEditorSettings(
  workflowId: string,
  settings: Partial<EditorSettings>,
): void {
  try {
    const key = `${STORAGE_PREFIX}${workflowId}`;
    const existing = getEditorSettings(workflowId);
    const merged = { ...existing, ...settings };
    localStorage.setItem(key, JSON.stringify(merged));
  } catch (error) {
    console.warn("Failed to save editor settings:", error);
  }
}

/**
 * Save just the viewport (called frequently, so separate for clarity)
 */
export function saveViewport(
  workflowId: string,
  viewport: EditorViewport,
): void {
  saveEditorSettings(workflowId, { viewport });
}

/**
 * Debounced save for viewport changes (avoid excessive writes)
 */
let viewportSaveTimeout: ReturnType<typeof setTimeout> | null = null;

export function saveViewportDebounced(
  workflowId: string,
  viewport: EditorViewport,
  delay = 300,
): void {
  if (viewportSaveTimeout) {
    clearTimeout(viewportSaveTimeout);
  }
  viewportSaveTimeout = setTimeout(() => {
    saveViewport(workflowId, viewport);
    viewportSaveTimeout = null;
  }, delay);
}

/**
 * Clear editor settings for a workflow
 */
export function clearEditorSettings(workflowId: string): void {
  try {
    const key = `${STORAGE_PREFIX}${workflowId}`;
    localStorage.removeItem(key);
  } catch (error) {
    console.warn("Failed to clear editor settings:", error);
  }
}
