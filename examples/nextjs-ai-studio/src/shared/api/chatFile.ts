type PresignChatFileGetUrlParams = {
  key: string;
  appId?: string;
  outLinkAuthData?: unknown;
};

export const getPresignedChatFileGetUrl = async (
  params: PresignChatFileGetUrlParams
): Promise<string> => {
  return `/api/core/chat/files/view?storagePath=${encodeURIComponent(params.key)}`;
};

