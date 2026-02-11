export const getS3ChatSource = () => ({
  createGetChatFileURL: async ({ key }: { key: string; external?: boolean }) => ({
    url: `/api/core/chat/files/view?storagePath=${encodeURIComponent(key)}`
  })
});
