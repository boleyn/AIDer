import type { updateBody } from '@/pages/api/support/mcp/update';
import { GET, POST, DELETE, PUT } from '../../common/api/request';
import type { createBody } from '@/pages/api/support/mcp/create';
import type { listResponse } from '@/pages/api/support/mcp/list';

export const getMcpServerList = () => {
  return GET<listResponse>('/support/mcp/list');
};

export const postCreateMcpServer = (data: createBody) => {
  return POST('/support/mcp/create', data);
};

export const putUpdateMcpServer = (data: updateBody) => {
  return PUT('/support/mcp/update', data);
};

export const deleteMcpServer = (id: string) => {
  return DELETE(`/support/mcp/delete`, { id });
};

export const getWorkspaceTree = (params: {
  chatId: string;
  userId: string;
  maxDepth?: number;
  shareId?: string;
  outLinkUid?: string;
}) => {
  return GET<{ success: boolean; tree?: any; error?: string }>(
    '/core/chat/workspace/getWorkspaceTree',
    params
  );
};

export const getFileContent = (params: {
  chatId: string;
  userId: string;
  path: string;
  shareId?: string;
  outLinkUid?: string;
}) => {
  return GET<{ success: boolean; content?: string; error?: string }>(
    '/core/chat/workspace/fileContent',
    params
  );
};

export const updateWorkspaceFile = (data: {
  chatId: string;
  userId: string;
  filePath: string;
  content: string;
  shareId?: string;
  outLinkUid?: string;
}) => {
  return POST<{ success: boolean; error?: string }>('/core/chat/workspace/updateFile', data);
};

export const deployPreview = (data: {
  userId: string;
  chatId: string;
  directory: string;
  entry: string;
}) => {
  return POST<{ success: boolean; url?: string; error?: string }>(
    '/core/chat/workspace/deploy',
    data
  );
};

export const stopPreview = (data: { userId: string; chatId: string }) => {
  return POST<{ success: boolean; error?: string }>('/core/chat/workspace/stop', data);
};

export const getDownloadUrl = (params: {
  chatId: string;
  userId: string;
  filePath: string;
  shareId?: string;
  outLinkUid?: string;
}) => {
  const { chatId, userId, filePath, shareId, outLinkUid } = params;
  // 注意：不要加 /api 前缀，GET 函数会自动添加
  const qs = new URLSearchParams({
    chatId,
    userId,
    filePath: filePath
  });
  if (shareId && outLinkUid) {
    qs.append('shareId', shareId);
    qs.append('outLinkUid', outLinkUid);
  }
  return `/core/chat/workspace/downloadFile?${qs.toString()}`;
};

export const getDownloadAllUrl = (params: {
  chatId: string;
  userId: string;
  shareId?: string;
  outLinkUid?: string;
}) => {
  const { chatId, userId, shareId, outLinkUid } = params;
  // 下载全部工作空间使用不同的接口
  const qs = new URLSearchParams({
    chatId,
    userId
  });
  if (shareId && outLinkUid) {
    qs.append('shareId', shareId);
    qs.append('outLinkUid', outLinkUid);
  }
  return `/core/chat/workspace/downloadAll?${qs.toString()}`;
};

export const uploadWorkspaceFiles = (params: {
  chatId: string;
  userId: string;
  files: File[];
  shareId?: string;
  outLinkUid?: string;
  onUploadProgress?: (progress: number) => void;
}) => {
  const { chatId, userId, files, shareId, outLinkUid, onUploadProgress } = params;

  const formData = new FormData();
  files.forEach((file) => {
    formData.append('file', file, file.name);
  });
  formData.append(
    'data',
    JSON.stringify({
      chatId,
      userId,
      shareId,
      outLinkUid
    })
  );

  return POST<{
    success: boolean;
    results: Array<{
      filename: string;
      success: boolean;
      error?: string;
      data?: any;
    }>;
    total: number;
    successCount: number;
  }>('/core/chat/workspace/uploadFile', formData, {
    timeout: 5 * 60 * 1000, // 5 minutes
    headers: {
      'Content-Type': 'multipart/form-data; charset=utf-8'
    },
    onUploadProgress: (progressEvent) => {
      if (onUploadProgress && progressEvent.total) {
        const percent = Math.round((progressEvent.loaded / progressEvent.total) * 100);
        onUploadProgress(percent);
      }
    }
  });
};
