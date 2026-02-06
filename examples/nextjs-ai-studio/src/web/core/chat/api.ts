import { GET, POST, DELETE, PUT } from '@/web/common/api/request';
import type { ChatHistoryItemResType } from '@fastgpt/global/core/chat/type.d';
import type { getResDataQuery } from '@/pages/api/core/chat/record/getResData';
import type {
  InitChatResponse,
  InitOutLinkChatProps,
  InitTeamChatProps
} from '@/global/core/chat/api.d';

import type { DeleteChatItemProps } from '@/global/core/chat/api.d';
import type {
  DelChatHistoryType as DelHistoryProps,
  ClearChatHistoriesType as ClearHistoriesProps
} from '@fastgpt/global/openapi/core/chat/history/api';
import type {
  getChatRecordsBody,
  getChatRecordsResponse
} from '@/pages/api/core/chat/record/getRecords_v2';
import type {
  getPaginationRecordsBody,
  getPaginationRecordsResponse
} from '@/pages/api/entries/chat/getPaginationRecords';
import type { GetQuoteProps, GetQuotesRes } from '@/pages/api/core/chat/quote/getQuote';
import type {
  GetCollectionQuoteProps,
  GetCollectionQuoteRes
} from '@/pages/api/core/chat/quote/getCollectionQuote';
import type { ChatSettingModelType, ChatSettingType } from '@fastgpt/global/core/chat/setting/type';
import type {
  GetChatFavouriteListParamsType,
  UpdateFavouriteAppParamsType
} from '@fastgpt/global/openapi/core/chat/favourite/api';
import type { ChatFavouriteAppType } from '@fastgpt/global/core/chat/favouriteApp/type';
import type {
  InitChatQueryType,
  StopV2ChatParams
} from '@fastgpt/global/openapi/core/chat/controler/api';
import type { GetRecentlyUsedAppsResponseType } from '@fastgpt/global/openapi/core/chat/api';

export const getRecentlyUsedApps = () =>
  GET<GetRecentlyUsedAppsResponseType>('/core/chat/recentlyUsed', undefined, { maxQuantity: 1 });

/**
 * 获取初始化聊天内容
 */
export const getInitChatInfo = (data: InitChatQueryType) =>
  GET<InitChatResponse>(`/core/chat/init`, data);
export const getInitOutLinkChatInfo = (data: InitOutLinkChatProps) =>
  GET<InitChatResponse>(`/core/chat/outLink/init`, data);
export const getTeamChatInfo = (data: InitTeamChatProps) =>
  GET<InitChatResponse>(`/core/chat/team/init`, data);

/**
 * get detail responseData by dataId appId chatId
 */
export const getChatResData = (data: getResDataQuery) =>
  GET<ChatHistoryItemResType[]>(`/core/chat/getResData`, data);

export const getChatRecords = (data: getChatRecordsBody) =>
  POST<getChatRecordsResponse>('/core/chat/record/getRecords_v2', data);

export const getEntryChatRecords = (
  data: Omit<getPaginationRecordsBody, 'appId'> & { entryId: string }
) => POST<getPaginationRecordsResponse>('entries/chat/getPaginationRecords', data);

/**
 * 读取绑定应用的公开初始化信息（Entry 分享场景）
 * 注意：全局 GET 会返回后端 data 字段的解包结果，这里直接声明为内层数据类型即可。
 */
export const getEntryShareAppInit = (params: { appId: string; shareId: string }) =>
  GET<{ variables: any; app: { chatConfig: any } }>(`/entries/app/init`, params);

/**
 * delete one history
 */
export const delChatHistoryById = (data: DelHistoryProps) => DELETE(`/core/chat/delHistory`, data);
/**
 * clear all history by appid
 */
export const delClearChatHistories = (data: ClearHistoriesProps) =>
  DELETE(`/core/chat/clearHistories`, data);

/* 统一入口：清空 Entry 维度会话历史 */
export const delEntryClearChatHistories = (data: {
  entryId: string;
  shareId?: string;
  outLinkUid?: string;
}) => DELETE(`/entries/chat/clearHistories`, data);

/**
 * delete one chat record
 */
export const delChatRecordById = (data: DeleteChatItemProps) =>
  POST(`/core/chat/item/delete`, data);

export const getQuoteDataList = (data: GetQuoteProps) =>
  POST<GetQuotesRes>(`/core/chat/quote/getQuote`, data);

export const getCollectionQuote = (data: GetCollectionQuoteProps) =>
  POST<GetCollectionQuoteRes>(`/core/chat/quote/getCollectionQuote`, data);

/* -------------- paragraph ------------ */
export const getParagraphDocument = (data: {
  dataId: string;
  appId?: string;
  chatId?: string;
  shareId?: string;
  outLinkUid?: string;
}) =>
  GET(`/core/chat/paragraph/${data.dataId}`, {
    ...(data.appId ? { appId: data.appId } : {}),
    ...(data.chatId ? { chatId: data.chatId } : {}),
    ...(data.shareId ? { shareId: data.shareId } : {}),
    ...(data.outLinkUid ? { outLinkUid: data.outLinkUid } : {})
  });

export const updateParagraphDocument = (data: {
  chatItemDataId: string;
  markdown: string;
  title?: string;
  sources?: { id: number; title: string; url: string }[];
  shareId?: string;
  outLinkUid?: string;
}) =>
  PUT(`/core/chat/paragraph/${data.chatItemDataId}`, {
    markdown: data.markdown,
    ...(data.title ? { title: data.title } : {}),
    ...(data.sources ? { sources: data.sources } : {}),
    ...(data.shareId ? { shareId: data.shareId } : {}),
    ...(data.outLinkUid ? { outLinkUid: data.outLinkUid } : {})
  });

export const updateInstructionStatus = (data: {
  appId: string;
  chatId: string;
  dataId: string;
  instructionIndex: number; // 一次消息中的序号，用于区分同一条消息中的多个指令
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  executionTime?: number;
  error?: string;
  shareId?: string;
  outLinkUid?: string;
}) => PUT('/core/chat/item/updateInstructionStatus', data);

/*---------- chat setting ------------*/
export const getChatSetting = () => GET<ChatSettingType>('/proApi/core/chat/setting/detail');

export const updateChatSetting = (data: Partial<ChatSettingModelType>) =>
  POST<Partial<ChatSettingType>>('/proApi/core/chat/setting/update', data);

export const getFavouriteApps = (data?: GetChatFavouriteListParamsType) =>
  GET<ChatFavouriteAppType[]>('/proApi/core/chat/setting/favourite/list', data);

export const updateFavouriteApps = (data: UpdateFavouriteAppParamsType[]) =>
  POST<ChatFavouriteAppType[]>('/proApi/core/chat/setting/favourite/update', data);

export const updateFavouriteAppOrder = (data: { id: string; order: number }[]) =>
  PUT<null>('/proApi/core/chat/setting/favourite/order', data);

export const updateFavouriteAppTags = (data: { id: string; tags: string[] }[]) =>
  PUT<null>('/proApi/core/chat/setting/favourite/tags', data);

export const deleteFavouriteApp = (data: { id: string }) =>
  DELETE<null>('/proApi/core/chat/setting/favourite/delete', data);

/* Chat controller */
export const postStopV2Chat = (data: StopV2ChatParams) => POST('/v2/chat/stop', data);
