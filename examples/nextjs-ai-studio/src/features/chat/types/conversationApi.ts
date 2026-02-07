import type { Conversation, ConversationMessage, ConversationSummary } from "@/types/conversation";

export type ChatHistoryItemType = {
  id?: string;
  chatId?: string;
  title?: string;
  customTitle?: string;
  createdAt?: string;
  updatedAt?: string;
  createTime?: string;
  updateTime?: string;
  top?: boolean;
};

export type GetHistoriesBodyType = {
  token?: string;
  appId?: string;
  shareId?: string;
  outLinkUid?: string;
  teamId?: string;
  teamToken?: string;
  source?: string;
  startCreateTime?: string;
  endCreateTime?: string;
  startUpdateTime?: string;
  endUpdateTime?: string;
};

export type GetHistoriesResponseType = {
  list: ChatHistoryItemType[];
  total: number;
};

export type UpdateHistoryBodyType = {
  token?: string;
  appId?: string;
  shareId?: string;
  outLinkUid?: string;
  teamId?: string;
  teamToken?: string;
  chatId: string;
  title?: string;
  customTitle?: string;
  top?: boolean;
  messages?: ConversationMessage[];
};

export type UpdateHistoryResponseType = {
  history?: Conversation;
};

export type DelChatHistoryType = {
  token?: string;
  appId?: string;
  shareId?: string;
  outLinkUid?: string;
  teamId?: string;
  teamToken?: string;
  chatId: string;
};

export type ClearChatHistoriesType = {
  token?: string;
  appId?: string;
  shareId?: string;
  outLinkUid?: string;
  teamId?: string;
  teamToken?: string;
};

export type ClearChatHistoriesResponseType = {
  deletedCount?: number;
};

export type ChatBatchDeleteBodyType = {
  token?: string;
  appId?: string;
  chatIds: string[];
};

export type InitChatQueryType = {
  token: string;
  chatId: string;
};

export type InitChatResponseType = {
  chatId?: string;
  title?: string;
};

export type GetChatRecordsV2BodyType = {
  token: string;
  chatId: string;
  pageSize?: number;
  initialId?: string;
  prevId?: string;
  nextId?: string;
  includeDeleted?: boolean;
};

export type GetChatRecordsV2ResponseType = {
  list?: ConversationMessage[];
  total?: number;
  hasMorePrev?: boolean;
  hasMoreNext?: boolean;
};

export type ConversationListResult = ConversationSummary[];
