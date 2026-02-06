export const getCollectionSourceData = (collection?: any) => {
  return {
    sourceId: collection?.sourceId || "",
    sourceName: collection?.sourceName || ""
  };
};
