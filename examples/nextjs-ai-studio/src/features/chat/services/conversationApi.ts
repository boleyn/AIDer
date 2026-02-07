import type {
  ClearChatHistoriesResponseType,
  ClearChatHistoriesType,
  DelChatHistoryType,
  GetChatRecordsV2BodyType,
  GetChatRecordsV2ResponseType,
  GetHistoriesBodyType,
  GetHistoriesResponseType,
  InitChatQueryType,
  InitChatResponseType,
  UpdateHistoryBodyType,
  UpdateHistoryResponseType,
} from "../types/conversationApi";

import { DELETE, GET, POST, PUT } from "@/web/common/api/request";

export const getConversationHistories = (data: GetHistoriesBodyType) =>
  POST<GetHistoriesResponseType>("/core/chat/history/getHistories", data);

export const putConversationHistory = (data: UpdateHistoryBodyType) =>
  PUT<UpdateHistoryResponseType>("/core/chat/history/updateHistory", data);

export const deleteConversationHistory = (data: DelChatHistoryType) =>
  DELETE<{ success?: boolean }>("/core/chat/history/delHistory", data);

export const clearConversationHistories = (data: ClearChatHistoriesType) =>
  DELETE<ClearChatHistoriesResponseType>("/core/chat/history/clearHistories", data);

export const getConversationInit = (data: InitChatQueryType) =>
  GET<InitChatResponseType>("/core/chat/init", data);

export const getConversationRecordsV2 = (data: GetChatRecordsV2BodyType) =>
  POST<GetChatRecordsV2ResponseType>("/core/chat/record/getRecords_v2", data);
