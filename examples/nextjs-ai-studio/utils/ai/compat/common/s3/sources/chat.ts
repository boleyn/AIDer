export const getS3ChatSource = () => ({
  createGetChatFileURL: async ({ key }: { key: string; external?: boolean }) => ({
    url: key
  })
});
