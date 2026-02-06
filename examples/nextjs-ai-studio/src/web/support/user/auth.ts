import { loginOut } from '@/web/support/user/api';
import { removeToken, setLogoutBlock } from './token';
import { useUserStore } from './useUserStore';

const clearAdStorage = () => {
  try {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('logout-')) {
        const oldValue = localStorage.getItem(key);
        localStorage.removeItem(key);

        // Dispatch ahooks sync event to update useLocalStorageState
        if (oldValue !== null) {
          window.dispatchEvent(
            new CustomEvent('AHOOKS_SYNC_STORAGE_EVENT_NAME', {
              detail: {
                key,
                newValue: null,
                oldValue,
                storageArea: localStorage
              }
            })
          );
        }
      }
    });
  } catch (error) {
    console.error('Failed to clear ad storage:', error);
  }
};

export const clearToken = () => {
  try {
    const logoutPromise = loginOut().catch(() => {});
    setLogoutBlock();
    removeToken();
    try {
      // ensure zustand store reflects logged-out state
      useUserStore.getState().setUserInfo(null);
      // clear persisted auth state to avoid rehydrate after logout
      localStorage.removeItem('userStore');
      clearAdStorage();
    } catch {}
    return logoutPromise;
  } catch (error) {
    error;
  }
};
