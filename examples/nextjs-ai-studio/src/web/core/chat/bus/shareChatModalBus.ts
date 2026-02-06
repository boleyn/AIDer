export type OpenShareChatModalPayload = {
  chatId?: string;
  appId?: string;
  /** Explicit user action (e.g. click) */
  userTriggered?: boolean;
};

const listeners = new Set<(payload: OpenShareChatModalPayload) => void>();

export const openShareChatModal = (payload: OpenShareChatModalPayload) => {
  listeners.forEach((fn) => fn(payload));
};

export const onOpenShareChatModal = (handler: (payload: OpenShareChatModalPayload) => void) => {
  listeners.add(handler);
  return () => {
    listeners.delete(handler);
  };
};
