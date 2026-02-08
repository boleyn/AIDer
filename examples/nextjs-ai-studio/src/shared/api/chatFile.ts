type PresignChatFileGetUrlParams = {
  key: string;
  appId?: string;
  outLinkAuthData?: unknown;
};

export const getPresignedChatFileGetUrl = async (
  params: PresignChatFileGetUrlParams
): Promise<string> => {
  const res = await fetch('/core/chat/file/presignChatFileGetUrl', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(params)
  });

  if (!res.ok) {
    throw new Error(`Failed to get chat file URL: ${res.status}`);
  }

  return res.json();
};
