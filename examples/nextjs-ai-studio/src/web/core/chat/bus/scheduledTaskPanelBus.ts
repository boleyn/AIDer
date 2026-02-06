export type OpenScheduledTaskPanelPayload = {
  /** Target a specific ChatItemContextProvider instance */
  contextId?: string;
  chatId?: string;
  appId?: string;
  tmbId?: string;
  /** Explicit user action (e.g. click) */
  userTriggered?: boolean;
  /**
   * Change this value to force ScheduledTaskPanel refresh.
   * Typically use `Date.now()` when opening.
   */
  refreshTrigger?: number;
};

const listeners = new Set<(payload: OpenScheduledTaskPanelPayload) => void>();

export const openScheduledTaskPanel = (payload: OpenScheduledTaskPanelPayload) => {
  listeners.forEach((fn) => fn(payload));
};

export const onOpenScheduledTaskPanel = (
  handler: (payload: OpenScheduledTaskPanelPayload) => void
) => {
  listeners.add(handler);
  return () => {
    listeners.delete(handler);
  };
};
