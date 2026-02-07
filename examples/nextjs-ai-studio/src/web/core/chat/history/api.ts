import type {
  ChatBatchDeleteBodyType,
  ClearChatHistoriesResponseType,
  DelChatHistoryType,
  ClearChatHistoriesType,
  GetHistoriesBodyType,
  GetHistoriesResponseType,
  UpdateHistoryBodyType,
  UpdateHistoryResponseType
} from '@/features/chat/types/conversationApi';
import { POST, PUT, DELETE } from '@/web/common/api/request';

export const getChatHistories = (data: GetHistoriesBodyType) =>
  POST<GetHistoriesResponseType>('/core/chat/history/getHistories', data);

// 修改历史记录: 标题/置顶
export const putChatHistory = (data: UpdateHistoryBodyType) =>
  PUT<UpdateHistoryResponseType>('/core/chat/history/updateHistory', data);

// delete one history (soft delete)
export const delChatHistoryById = (data: DelChatHistoryType) =>
  DELETE(`/core/chat/history/delHistory`, data);

// clear all history by appId
export const delClearChatHistories = (data: ClearChatHistoriesType) =>
  DELETE<ClearChatHistoriesResponseType>(`/core/chat/history/clearHistories`, data);

// 统一入口：清空 Entry 维度会话历史
export const delEntryClearChatHistories = (data: {
  entryId: string;
  shareId?: string;
  outLinkUid?: string;
}) => DELETE(`/entries/chat/clearHistories`, data);

// Log manger
export const batchDeleteChatHistories = (data: ChatBatchDeleteBodyType) =>
  POST<void>(`/core/chat/history/batchDelete`, data);
