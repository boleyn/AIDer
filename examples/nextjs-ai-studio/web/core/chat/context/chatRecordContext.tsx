import React from "react";

export const ChatRecordContext = React.createContext<any>({
  chatRecords: [],
  setChatRecords: () => undefined
});
