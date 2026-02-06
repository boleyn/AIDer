export type ChatSessionMeta = {
  lastActiveAt?: number;
  totalRecordsCount?: number;
};

const META_PREFIX = 'chatSessionMeta:';

export const CHAT_NEW_SESSION_IDLE_MS = 2 * 60 * 60 * 1000;
export const CHAT_NEW_SESSION_MAX_RECORDS = 10;

const isBrowser = () => typeof window !== 'undefined';

export const getChatSessionMetaKey = (chatKey: string) => `${META_PREFIX}${chatKey}`;

export const readChatSessionMeta = (chatKey: string): ChatSessionMeta | null => {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(getChatSessionMetaKey(chatKey));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const writeChatSessionMeta = (chatKey: string, patch: ChatSessionMeta) => {
  if (!isBrowser()) return;
  try {
    const prev = readChatSessionMeta(chatKey) || {};
    localStorage.setItem(getChatSessionMetaKey(chatKey), JSON.stringify({ ...prev, ...patch }));
  } catch {
    /* ignore */
  }
};

export const shouldStartNewSessionOnEnter = (chatKey: string) => {
  const meta = readChatSessionMeta(chatKey);
  if (!meta) return false;

  if (
    typeof meta.totalRecordsCount === 'number' &&
    meta.totalRecordsCount > CHAT_NEW_SESSION_MAX_RECORDS
  ) {
    return true;
  }

  if (
    typeof meta.lastActiveAt === 'number' &&
    Date.now() - meta.lastActiveAt > CHAT_NEW_SESSION_IDLE_MS
  ) {
    return true;
  }

  return false;
};
