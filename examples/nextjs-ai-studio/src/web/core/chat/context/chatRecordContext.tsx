import { type ChatSiteItemType } from '@fastgpt/global/core/chat/type';
import type { LinkedPaginationProps, LinkedListResponse } from '@fastgpt/web/common/fetch/type';
import { useLinkedScroll } from '@fastgpt/web/hooks/useLinkedScroll';
import React, { type ReactNode, useEffect, useMemo, useState } from 'react';
import { createContext } from 'use-context-selector';
import { getChatRecords } from '../api';
import { ChatStatusEnum } from '@fastgpt/global/core/chat/constants';
import { type BoxProps } from '@chakra-ui/react';
import { useMemoEnhance } from '@fastgpt/web/hooks/useMemoEnhance';
import type { GetChatRecordsProps } from '@/global/core/chat/api';
import { useChatStore } from './useChatStore';
import { writeChatSessionMeta } from '../sessionMeta';

type ChatRecordContextType = {
  isLoadingRecords: boolean;
  chatRecords: ChatSiteItemType[];
  setChatRecords: React.Dispatch<React.SetStateAction<ChatSiteItemType[]>>;
  isChatRecordsLoaded: boolean;
  totalRecordsCount: number;
  ScrollData: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    ScrollContainerRef?: React.RefObject<HTMLDivElement>;
  } & BoxProps) => React.JSX.Element;
  itemRefs: React.MutableRefObject<Map<string, HTMLElement | null>>;
};

export const ChatRecordContext = createContext<ChatRecordContextType>({
  isLoadingRecords: false,
  chatRecords: [],
  setChatRecords: function (value: React.SetStateAction<ChatSiteItemType[]>): void {
    // Default implementation - do nothing
  },
  isChatRecordsLoaded: false,

  ScrollData: function ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    ScrollContainerRef?: React.RefObject<HTMLDivElement>;
  } & BoxProps): React.JSX.Element {
    // Default implementation - return children wrapped in a div
    return React.createElement('div', props, children);
  },
  totalRecordsCount: 0,
  itemRefs: { current: new Map() }
});

/* 
  具体对话记录的上下文
*/
const ChatRecordContextProvider = ({
  children,
  params,
  feedbackRecordId,
  enableHistory = true
}: {
  children: ReactNode;
  params: GetChatRecordsProps;
  feedbackRecordId?: string;
  enableHistory?: boolean;
}) => {
  const [isChatRecordsLoaded, setIsChatRecordsLoaded] = useState(false);
  const [totalRecordsCount, setTotalRecordsCount] = useState(0);
  const source = useChatStore((s) => s.source);

  const currentData = useMemoEnhance(() => ({ id: feedbackRecordId || '' }), [feedbackRecordId]);
  const {
    dataList: chatRecords,
    setDataList: setChatRecords,
    ScrollData,
    isLoading,
    itemRefs
  } = useLinkedScroll(
    async (
      data: LinkedPaginationProps<GetChatRecordsProps>
    ): Promise<LinkedListResponse<ChatSiteItemType>> => {
      if (!enableHistory) {
        return {
          list: [],
          hasMorePrev: false,
          hasMoreNext: false,
          total: 0
        } as LinkedListResponse<ChatSiteItemType>;
      }
      setIsChatRecordsLoaded(false);

      const res = await getChatRecords(data).finally(() => {
        setIsChatRecordsLoaded(true);
      });
      setTotalRecordsCount(res.total);

      return {
        list: res.list.map((item) => ({
          ...item,
          dataId: item.dataId!,
          status: ChatStatusEnum.finish,
          time: item.time ? new Date(item.time) : undefined
        })),
        hasMorePrev: res.hasMorePrev,
        hasMoreNext: res.hasMoreNext
      };
    },
    {
      pageSize: 10,
      params,
      currentData,
      defaultScroll: 'bottom',
      showErrorToast: false,
      manual: !enableHistory
    }
  );

  const chatKey = useMemo(() => {
    if (!source || !params.chatId) return '';
    return `${source}-${params.chatId}`;
  }, [params.chatId, source]);

  // Track last active time for re-entry session policy.
  useEffect(() => {
    if (!chatKey) return;
    writeChatSessionMeta(chatKey, { lastActiveAt: Date.now() });
    return () => {
      writeChatSessionMeta(chatKey, { lastActiveAt: Date.now() });
    };
  }, [chatKey]);

  // Persist record count only after records are loaded (avoid overwriting with 0 during initial render).
  useEffect(() => {
    if (!enableHistory || !chatKey || !isChatRecordsLoaded) return;
    writeChatSessionMeta(chatKey, { lastActiveAt: Date.now(), totalRecordsCount });
  }, [enableHistory, chatKey, isChatRecordsLoaded, totalRecordsCount]);
  // 使用 useEffect 来更新 isChatRecordsLoaded，避免在渲染期间更新状态
  useEffect(() => {
    if (!enableHistory) {
      setIsChatRecordsLoaded(true);
      return;
    }
    setIsChatRecordsLoaded(!isLoading);
  }, [enableHistory, isLoading]);

  const contextValue = useMemoEnhance(() => {
    return {
      isLoadingRecords: isLoading,
      chatRecords,
      setChatRecords,
      ScrollData,
      isChatRecordsLoaded,
      totalRecordsCount,
      itemRefs
    };
  }, [isLoading, chatRecords, setChatRecords, totalRecordsCount, ScrollData, isChatRecordsLoaded]);
  return <ChatRecordContext.Provider value={contextValue}>{children}</ChatRecordContext.Provider>;
};

export default ChatRecordContextProvider;
