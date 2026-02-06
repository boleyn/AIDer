const STORAGE_KEY = 'auth_token';
const LOGOUT_BLOCK_KEY = 'auth_token_logout_block';

const getPayload = (token: string): Record<string, any> | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    let payload = parts[1];
    payload = payload.replace(/-/g, '+').replace(/_/g, '/');
    while (payload.length % 4 !== 0) {
      payload += '=';
    }
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
};

export const getToken = (): string | null => {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

export const setToken = (token: string, options?: { ignoreLogoutBlock?: boolean }) => {
  try {
    if (typeof window === 'undefined') return;
    if (!options?.ignoreLogoutBlock) {
      const hasLogoutBlock = window.localStorage.getItem(LOGOUT_BLOCK_KEY);
      if (hasLogoutBlock) return;
    }
    window.localStorage.setItem(STORAGE_KEY, token);
    if (options?.ignoreLogoutBlock) {
      window.localStorage.removeItem(LOGOUT_BLOCK_KEY);
    }
  } catch {}
};

export const removeToken = () => {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {}
};

export const setLogoutBlock = () => {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(LOGOUT_BLOCK_KEY, '1');
  } catch {}
};

/**
 * 检查 token 是否已过期
 * @param token JWT token
 * @returns 如果已过期返回 true，否则返回 false
 */
export const isTokenExpired = (token: string | null): boolean => {
  if (!token) return true;
  const payload = getPayload(token);
  if (!payload || !payload.exp) return true;
  const expirationTime = payload.exp * 1000;
  return Date.now() >= expirationTime;
};

/**
 * 检查 token 是否快过期（剩余时间少于 7 天）
 * @param token JWT token
 * @returns 如果快过期返回 true，否则返回 false
 */
export const isTokenExpiringSoon = (token: string | null): boolean => {
  if (!token) return false;
  const payload = getPayload(token);
  if (!payload || !payload.exp) return false;
  const expirationTime = payload.exp * 1000;
  const remainingTime = expirationTime - Date.now();
  return remainingTime < 7 * 24 * 60 * 60 * 1000;
};
