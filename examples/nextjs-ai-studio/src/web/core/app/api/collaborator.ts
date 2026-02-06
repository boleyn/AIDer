import type {
  UpdateAppCollaboratorBody,
  AppCollaboratorDeleteParams
} from '@fastgpt/global/core/app/collaborator';
import { DELETE, GET, POST } from '@/web/common/api/request';
import type {
  CollaboratorListType,
  CollaboratorItemDetailType
} from '@fastgpt/global/support/permission/collaborator';

export const getCollaboratorList = async (appId: string): Promise<CollaboratorListType> => {
  const res = await GET<CollaboratorListType | CollaboratorItemDetailType[]>(
    '/core/app/collaborator/list',
    { appId }
  );

  // 兼容旧版仅返回数组的接口，统一转换为带 clbs 的结构
  if (Array.isArray(res)) {
    return {
      clbs: res as any,
      parentClbs: []
    } as CollaboratorListType;
  }

  return res as CollaboratorListType;
};

export const postUpdateAppCollaborators = (body: UpdateAppCollaboratorBody) =>
  POST('/core/app/collaborator/update', body);

export const deleteAppCollaborators = (params: AppCollaboratorDeleteParams) =>
  DELETE('/core/app/collaborator/delete', params);
