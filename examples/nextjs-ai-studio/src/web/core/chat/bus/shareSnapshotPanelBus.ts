export type OpenShareSnapshotPanelPayload = {
  /** Target a specific ChatItemContextProvider instance */
  contextId?: string;
  chatId?: string;
  appId?: string;
  /** Explicit user action (e.g. click) */
  userTriggered?: boolean;
  /**
   * Change this value to force ShareSnapshot panel refresh.
   * Typically use `Date.now()` when opening.
   */
  refreshTrigger?: number;
};

const listeners = new Set<(payload: OpenShareSnapshotPanelPayload) => void>();

export const openShareSnapshotPanel = (payload: OpenShareSnapshotPanelPayload) => {
  listeners.forEach((fn) => fn(payload));
};

export const onOpenShareSnapshotPanel = (
  handler: (payload: OpenShareSnapshotPanelPayload) => void
) => {
  listeners.add(handler);
  return () => {
    listeners.delete(handler);
  };
};
