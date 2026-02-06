export type OpenWorkspacePanelPayload = {
  /** Target a specific ChatItemContextProvider instance */
  contextId?: string;
  chatId?: string;
  userId?: string;
  maxDepth?: number;
  /** Explicit user action (e.g. click) */
  userTriggered?: boolean;
  /**
   * Change this value to force WorkspacePanel refresh.
   * Typically use `Date.now()` when opening.
   */
  refreshTrigger?: number;
};

const listeners = new Set<(payload: OpenWorkspacePanelPayload) => void>();

export const openWorkspacePanel = (payload: OpenWorkspacePanelPayload) => {
  listeners.forEach((fn) => fn(payload));
};

export const onOpenWorkspacePanel = (handler: (payload: OpenWorkspacePanelPayload) => void) => {
  listeners.add(handler);
  return () => {
    listeners.delete(handler);
  };
};
