import React from "react";

export const WorkflowRuntimeContext = React.createContext<any>({
  appId: "",
  chatId: "",
  outLinkAuthData: null
});
