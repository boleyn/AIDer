import type {
  PlaygroundVisibilityConfigQuery,
  PlaygroundVisibilityConfigResponse,
  UpdatePlaygroundVisibilityConfigBody
} from '@fastgpt/global/support/outLink/api';
import { GET, POST, DELETE } from '@/web/common/api/request';
import type {
  OutlinkAppType,
  OutLinkEditType,
  OutLinkResourceType,
  OutLinkSchema
} from '@fastgpt/global/support/outLink/type.d';
import type { PublishChannelEnum, UnifiedLinkType } from '@fastgpt/global/support/outLink/constant';
import type {
  ValidateShareAccessBody,
  ValidateShareAccessResponse,
  CreateShareSnapshotBody,
  CreateShareSnapshotResponse,
  ShareSnapshotInfo,
  ShareSnapshotListQuery,
  ShareSnapshotListItem
} from '@fastgpt/global/support/outLink/api.d';

// create a shareChat
export function createShareChat<T>(
  data: Omit<OutLinkEditType<T>, 'type'> & {
    appId: string; // 作为统一的 resourceId
    type: UnifiedLinkType | PublishChannelEnum;
    resourceType?: OutLinkResourceType; // 'app' | 'entry'
  }
) {
  return POST<string>(`/support/outLink/create`, data);
}

export const putShareChat = (data: OutLinkEditType) =>
  POST<string>(`/support/outLink/update`, data);

// get shareChat
export function getShareChatList<T extends OutlinkAppType>(data: {
  appId: string; // 作为统一的 resourceId
  type?: UnifiedLinkType; // 可选，不传则返回所有类型
  resourceType?: OutLinkResourceType; // 'app' | 'entry'
}) {
  return GET<OutLinkSchema<T>[]>(`/support/outLink/list`, data);
}

// delete a  shareChat
export function delShareChatById(id: string) {
  return DELETE(`/support/outLink/delete?id=${id}`);
}

// update a shareChat
export function updateShareChat<T extends OutlinkAppType>(data: OutLinkEditType<T>) {
  return POST<string>(`/support/outLink/update`, data);
}

// extend shareChat expiry time
export function extendShareChat(id: string, days: number = 7) {
  return POST<OutLinkSchema>(`/support/outLink/extend`, { id, days });
}

// 统一的分享链接访问验证接口（枚举 resourceType，联合响应类型）
export function validateShareAccess(data: ValidateShareAccessBody) {
  return POST<ValidateShareAccessResponse>(`/support/outLink/validateShareAccess`, data);
}

export function createShareSnapshot(data: CreateShareSnapshotBody) {
  return POST<CreateShareSnapshotResponse>(`/support/outLink/snapshot/create`, data);
}

export function getShareSnapshot(code: string) {
  return GET<ShareSnapshotInfo>(`/support/outLink/snapshot/get`, { code });
}

export function getShareSnapshotList(data: ShareSnapshotListQuery) {
  return GET<ShareSnapshotListItem[]>(`/support/outLink/snapshot/list`, data);
}

export function deleteShareSnapshot(data: { appId: string; chatId: string; snapshotId: string }) {
  return POST<{ success: boolean }>(`/support/outLink/snapshot/delete`, data);
}
export function getPlaygroundVisibilityConfig(data: PlaygroundVisibilityConfigQuery) {
  return GET<PlaygroundVisibilityConfigResponse>('/support/outLink/playground/config', data);
}

export function updatePlaygroundVisibilityConfig(data: UpdatePlaygroundVisibilityConfigBody) {
  return POST<string>(`/support/outLink/playground/update`, data);
}

// /**
//  * create a shareChat
//  */
// export const createWecomLinkChat = (
//   data: OutLinkConfigEditType & {
//     appId: string;
//     type: OutLinkSchema['type'];
//   }
// ) => POST<string>(`/support/outLink/create`, data);
