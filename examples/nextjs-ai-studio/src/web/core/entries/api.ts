import { DELETE, GET, POST, PUT } from '@/web/common/api/request';
import type { CollaboratorListType } from '@fastgpt/global/support/permission/collaborator';
import type {
  ChatEntry,
  ChatEntryStatusEnum,
  CreateEntryData,
  GetEntriesQuery,
  GetEntriesResponse,
  GetEntryLogsQuery,
  GetEntryLogsResponse,
  UpdateEntryData
} from '@/types/entries';

/**
 * 获取入口列表
 */
export const getEntries = (query: GetEntriesQuery): Promise<GetEntriesResponse> =>
  GET('/entries', query);

/**
 * 创建入口
 */
export const createEntry = (data: CreateEntryData): Promise<string> => POST('/entries', data);

/**
 * 获取入口详情
 */
export const getEntryById = (
  id: string,
  params?: {
    shareId?: string;
    outLinkUid?: string;
  }
): Promise<ChatEntry> => GET(`/entries/${id}`, params);

/**
 * 更新入口
 */
export const updateEntry = (id: string, data: UpdateEntryData): Promise<ChatEntry> =>
  PUT(`/entries/${id}`, data);

/**
 * 删除入口
 */
export const deleteEntry = (id: string): Promise<void> => DELETE(`/entries/${id}`);

/**
 * 切换入口状态
 */
export const toggleEntryStatus = (id: string, status: ChatEntryStatusEnum): Promise<ChatEntry> =>
  PUT(`/entries/${id}`, { status });

/**
 * 获取入口协作者
 */
export const getEntryCollaborators = (id: string) =>
  GET<CollaboratorListType>(`/entries/${id}/collaborators`);

/**
 * 添加入口协作者
 */
export const addEntryCollaborator = (id: string, data: any) =>
  POST(`/entries/${id}/collaborators`, data);

/**
 * 更新入口协作者
 */
export const updateEntryCollaborator = (id: string, data: any) =>
  PUT(`/entries/${id}/collaborators`, data);

/**
 * 删除入口协作者
 */
export const deleteEntryCollaborator = (id: string, data: any) =>
  DELETE(`/entries/${id}/collaborators`, data);

/**
 * 恢复继承权限
 */
export const resumeEntryInheritPermission = (id: string) => POST(`/entries/${id}/inherit`, {});

/**
 * 获取入口使用日志
 */
export const getEntryUsageLogs = (
  id: string,
  query?: GetEntryLogsQuery
): Promise<GetEntryLogsResponse> => GET(`/entries/${id}/logs`, query);

/**
 * 获取入口统计数据
 */
export const getEntryStatistics = (
  entryId: string,
  params: {
    startDate: string;
    endDate: string;
    timeUnit?: 'day' | 'week' | 'month';
  }
) => {
  return GET<any>(`/entries/${entryId}/statistics`, params);
};
