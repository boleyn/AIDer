import { GET, POST, PUT, DELETE } from '@/web/common/api/request';
import type { PostWorkflowDebugProps, PostWorkflowDebugResponse } from '@/global/core/workflow/api';
import type {
  ScheduledTaskListItemType,
  ScheduledTaskScheduleType,
  ScheduledTaskSchemaType,
  ScheduledTaskRunListItemType
} from '@fastgpt/global/core/workflow/scheduledTask/type';
import type { PaginationResponse } from '@fastgpt/web/common/fetch/type';

export const postWorkflowDebug = (data: PostWorkflowDebugProps) =>
  POST<PostWorkflowDebugResponse>(
    '/core/workflow/debug',
    {
      ...data,
      mode: 'debug'
    },
    {
      timeout: 300000
    }
  );

export const getScheduledTaskList = (data: {
  searchText?: string;
  status?: string;
  chatId?: string;
  userId?: string;
  outLinkUid?: string;
  appId?: string;
  tmbId?: string;
  offset?: number;
  pageSize?: number;
}) =>
  POST<PaginationResponse<ScheduledTaskListItemType>>('/core/workflow/scheduledTask/list', data);

export const getScheduledTaskDetail = (
  taskId: string,
  options?: {
    tmbId?: string;
    chatId?: string;
    userId?: string;
    outLinkUid?: string;
    appId?: string;
  }
) =>
  POST<
    ScheduledTaskSchemaType & {
      targetName?: string;
      targetAvatar?: string;
      sourceAppName?: string;
      sourceAppAvatar?: string;
    }
  >('/core/workflow/scheduledTask/detail', {
    taskId,
    ...(options?.tmbId ? { tmbId: options.tmbId } : {}),
    ...(options?.chatId ? { chatId: options.chatId } : {}),
    ...(options?.userId ? { userId: options.userId } : {}),
    ...(options?.outLinkUid ? { outLinkUid: options.outLinkUid } : {}),
    ...(options?.appId ? { appId: options.appId } : {})
  });

export const getScheduledTaskRuns = (data: {
  taskId: string;
  tmbId?: string;
  chatId?: string;
  userId?: string;
  outLinkUid?: string;
  appId?: string;
  offset?: number;
  pageSize?: number;
}) =>
  POST<PaginationResponse<ScheduledTaskRunListItemType>>('/core/workflow/scheduledTask/runs', data);

export const updateScheduledTask = (data: {
  taskId: string;
  action: 'pause' | 'activate' | 'delete';
  tmbId?: string;
  chatId?: string;
  userId?: string;
  outLinkUid?: string;
  appId?: string;
}) => POST<ScheduledTaskSchemaType | null>('/core/workflow/scheduledTask/update', data);

export const updateScheduledTaskSchedule = (data: {
  taskId: string;
  schedule: ScheduledTaskScheduleType;
  executeTime?: string;
  inputs?: Record<string, any>;
  tmbId?: string;
  chatId?: string;
  userId?: string;
  outLinkUid?: string;
  appId?: string;
}) => POST<ScheduledTaskSchemaType>('/core/workflow/scheduledTask/updateSchedule', data);

export const runScheduledTaskNow = (data: {
  taskId: string;
  tmbId?: string;
  chatId?: string;
  userId?: string;
  outLinkUid?: string;
  appId?: string;
}) => POST<ScheduledTaskSchemaType>('/core/workflow/scheduledTask/run', data);
