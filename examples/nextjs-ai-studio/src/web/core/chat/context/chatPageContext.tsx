import type { ChatSettingType } from '@fastgpt/global/core/chat/setting/type';
import type { GetRecentlyUsedAppsResponseType } from '@fastgpt/global/openapi/core/chat/api';
import type { UserType } from '@fastgpt/global/support/user/type';
import { useMemoEnhance } from '@fastgpt/web/hooks/useMemoEnhance';
import { useRequest2 } from '@fastgpt/web/hooks/useRequest';
import { useMount } from 'ahooks';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createContext } from 'use-context-selector';

import type { ChatSettingTabOptionEnum } from '@/pageComponents/chat/constants';
import {
  ChatSidebarPaneEnum,
  defaultCollapseStatus,
  type CollapseStatusType
} from '@/pageComponents/chat/constants';
import { getRecentlyUsedApps } from '@/web/core/chat/api';
import { useChatStore } from '@/web/core/chat/context/useChatStore';
import { useUserStore } from '@/web/support/user/useUserStore';

export interface ChatPageContextValue {
  // Pane & collapse
  pane: ChatSidebarPaneEnum;
  handlePaneChange: (
    pane: ChatSidebarPaneEnum,
    _id?: string,
    _tab?: ChatSettingTabOptionEnum
  ) => void;
  collapse: CollapseStatusType;
  onTriggerCollapse: () => void;
  // Chat settings
  chatSettings: ChatSettingType | undefined;
  refreshChatSetting: () => Promise<ChatSettingType | undefined>;
  logos: { wideLogoUrl?: string; squareLogoUrl?: string };

  // User & apps
  isInitedUser: boolean;
  userInfo: UserType | null;
  myApps: GetRecentlyUsedAppsResponseType;
  refreshRecentlyUsed: () => void;
}

export const ChatPageContext = createContext<ChatPageContextValue>({
  pane: ChatSidebarPaneEnum.HOME,
  handlePaneChange: function (): void {
    throw new Error('Function not implemented.');
  },
  collapse: defaultCollapseStatus,
  onTriggerCollapse: function (): void {
    throw new Error('Function not implemented.');
  },
  chatSettings: undefined,
  logos: { wideLogoUrl: '', squareLogoUrl: '' },
  refreshChatSetting: function (): Promise<ChatSettingType | undefined> {
    throw new Error('Function not implemented.');
  },
  isInitedUser: false,
  userInfo: null,
  myApps: [],
  refreshRecentlyUsed: function (): void {
    throw new Error('Function not implemented.');
  }
});

export const ChatPageContextProvider = ({
  appId: routeAppId,
  children
}: {
  appId: string;
  children: React.ReactNode;
}) => {
  const router = useRouter();
  const { setSource, setAppId, setLastPane, setLastChatAppId, lastPane } = useChatStore();
  const { userInfo, initUserInfo } = useUserStore();

  const { pane = lastPane || ChatSidebarPaneEnum.HOME } = router.query as {
    pane: ChatSidebarPaneEnum;
  };

  const [collapse, setCollapse] = useState<CollapseStatusType>(defaultCollapseStatus);
  const [isInitedUser, setIsInitedUser] = useState(false);

  // Get recently used apps
  const { data: myApps = [], refresh: refreshRecentlyUsed } = useRequest2(
    () => getRecentlyUsedApps(),
    {
      manual: false,
      errorToast: '',
      refreshDeps: [userInfo],
      pollingInterval: 30000,
      throttleWait: 500 // 500ms throttle
    }
  );

  // Initialize user info
  useMount(async () => {
    if (routeAppId) setAppId(routeAppId);
    try {
      await initUserInfo();
    } catch {
      // ignore auth failure in unauthenticated chat contexts
    } finally {
      setSource('online');
      setIsInitedUser(true);
    }
  });

  // Sync appId to store as route/appId changes
  useEffect(() => {
    if (routeAppId) {
      setAppId(routeAppId);
    }
  }, [routeAppId, setAppId, userInfo]);

  const chatSettings = undefined;
  const refreshChatSetting = useCallback(
    async (): Promise<ChatSettingType | undefined> => undefined,
    []
  );

  const handlePaneChange = useCallback(
    async (newPane: ChatSidebarPaneEnum, id?: string, tab?: ChatSettingTabOptionEnum) => {
      // 注意：id 为 undefined 表示不改变 appId，id 为空字符串 '' 表示明确要清除 appId
      const shouldClearAppId = id === '';
      if (newPane === pane && id === undefined && !tab) return;

      const _id = (() => {
        if (shouldClearAppId) return '';
        if (id) return id;

        const hiddenAppId = chatSettings?.appId;
        if (newPane === ChatSidebarPaneEnum.HOME && hiddenAppId) {
          return hiddenAppId;
        }

        return '';
      })();

      await router.replace({
        query: {
          ...router.query,
          appId: _id,
          pane: newPane,
          tab
        }
      });

      setLastPane(newPane);
      setLastChatAppId(_id);
    },
    [pane, router, setLastPane, setLastChatAppId, chatSettings?.appId]
  );

  useEffect(() => {
    if (!Object.values(ChatSidebarPaneEnum).includes(pane)) {
      handlePaneChange(ChatSidebarPaneEnum.HOME);
      return;
    }
    // 注意：不自动跳转到 ENTRY_CHAT，因为 URL 中的 appId 可能是普通 app ID 而不是 entry ID
    // 用户需要从 entries 列表中选择一个 entry 进入聊天
  }, [pane, handlePaneChange]);

  const logos: Pick<ChatSettingType, 'wideLogoUrl' | 'squareLogoUrl'> = useMemo(
    () => ({
      wideLogoUrl: chatSettings?.wideLogoUrl,
      squareLogoUrl: chatSettings?.squareLogoUrl
    }),
    [chatSettings?.squareLogoUrl, chatSettings?.wideLogoUrl]
  );

  const onTriggerCollapse = useCallback(() => {
    setCollapse(collapse === 0 ? 1 : 0);
  }, [collapse]);

  const value: ChatPageContextValue = useMemoEnhance(
    () => ({
      pane,
      handlePaneChange,
      collapse,
      onTriggerCollapse,
      chatSettings,
      refreshChatSetting,
      logos,
      isInitedUser,
      userInfo,
      myApps,
      refreshRecentlyUsed
    }),
    [
      pane,
      handlePaneChange,
      collapse,
      onTriggerCollapse,
      chatSettings,
      refreshChatSetting,
      logos,
      isInitedUser,
      userInfo,
      myApps,
      refreshRecentlyUsed
    ]
  );

  return <ChatPageContext.Provider value={value}>{children}</ChatPageContext.Provider>;
};
