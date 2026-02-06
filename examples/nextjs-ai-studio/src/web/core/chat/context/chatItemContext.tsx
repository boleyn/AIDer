import { type ChatBoxInputFormType } from '@/components/core/chat/ChatContainer/ChatBox/type';
import { PluginRunBoxTabEnum } from '@/components/core/chat/ChatContainer/PluginRunBox/constants';
import React, {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useId
} from 'react';
import { createContext } from 'use-context-selector';
import { type ComponentRef as ChatComponentRef } from '@/components/core/chat/ChatContainer/ChatBox/type';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { defaultChatData } from '@/global/core/chat/constants';
import { AppTypeEnum } from '@fastgpt/global/core/app/constants';
import { type AppChatConfigType, type VariableItemType } from '@fastgpt/global/core/app/type';
import { type FlowNodeInputItemType } from '@fastgpt/global/core/workflow/type/io';
import { type SearchDataResponseItemType } from '@fastgpt/global/core/dataset/type';
import { type OutLinkChatAuthProps } from '@fastgpt/global/support/permission/chat';
import { onOpenWorkspacePanel } from '@/web/core/chat/bus/workspacePanelBus';
import { onOpenScheduledTaskPanel } from '@/web/core/chat/bus/scheduledTaskPanelBus';
import { onOpenShareSnapshotPanel } from '@/web/core/chat/bus/shareSnapshotPanelBus';
import { useSystem } from '@fastgpt/web/hooks/useSystem';

// Context 中使用的类型（所有属性都是必需的，因为组件中有默认值）
type ContextProps = {
  showRouteToDatasetDetail: boolean;
  showRouteToAppDetail: boolean;
  isShowReadRawSource: boolean;
  isResponseDetail: boolean;
  showNodeStatus: boolean;
  canDownloadSource: boolean;
  isShowCite: boolean;
  isShowFullText: boolean;
  showRunningStatus: boolean;
  showWholeResponse: boolean;
};

// 组件 props 使用的类型（除 showRouteToDatasetDetail 外都可选，因为有默认值）
type ContextPropsInput = {
  showRouteToDatasetDetail: boolean;
  showRouteToAppDetail?: boolean;
  isShowReadRawSource?: boolean;
  isResponseDetail?: boolean;
  showNodeStatus?: boolean;
  canDownloadSource?: boolean;
  isShowCite?: boolean;
  isShowFullText?: boolean;
  showRunningStatus?: boolean;
  showWholeResponse?: boolean;
};
type ChatBoxDataType = {
  chatId?: string;
  appId: string;
  title?: string;
  userAvatar?: string;
  variables?: Record<string, any>;
  app: {
    chatConfig?: AppChatConfigType;
    name: string;
    avatar: string;
    type: `${AppTypeEnum}`;
    pluginInputs: FlowNodeInputItemType[];
    chatModels?: string[];
  };
};

// 知识库引用相关 type
export type GetQuoteDataBasicProps = {
  appId: string;
  chatId: string;
  chatItemDataId: string;
  outLinkAuthData?: OutLinkChatAuthProps;
};
export type GetCollectionQuoteDataProps = GetQuoteDataBasicProps & {
  quoteId?: string;
  collectionId: string;
  sourceId: string;
  sourceName: string;
  datasetId: string;
};
export type GetAllQuoteDataProps = GetQuoteDataBasicProps & {
  collectionIdList: string[];
  sourceId?: string;
  sourceName?: string;
};
export type GetQuoteProps = GetAllQuoteDataProps | GetCollectionQuoteDataProps;
export type QuoteDataType = {
  rawSearch: SearchDataResponseItemType[];
  metadata: GetQuoteProps;
};
export type OnOpenCiteModalProps = {
  collectionId?: string;
  sourceId?: string;
  sourceName?: string;
  datasetId?: string;
  quoteId?: string;
};

export type FilesystemPanelState = {
  isOpen: boolean;
  chatId?: string;
  userId?: string;
  maxDepth?: number;
  refreshTrigger?: number; // 用于触发文件树刷新
};
export type ScheduledTaskPanelState = {
  isOpen: boolean;
  chatId?: string;
  appId?: string;
  tmbId?: string;
  refreshTrigger?: number;
};
export type ShareSnapshotPanelState = {
  isOpen: boolean;
  chatId?: string;
  appId?: string;
  refreshTrigger?: number;
};

// 段落编辑侧栏数据
export type EditorPanelData = {
  chatItemDataId: string;
  documentData: {
    fullMarkdown: string;
    paragraphs: Array<{
      id: string;
      title: string;
      order: number;
      status: 'generating' | 'completed' | 'error';
      contentPreview: string;
    }>;
  };
  documentTitle?: string; // 添加文档标题字段
};

type ChatItemContextType = {
  contextId: string;
  ChatBoxRef: React.RefObject<ChatComponentRef> | null;
  variablesForm: UseFormReturn<ChatBoxInputFormType, any>;
  pluginRunTab: PluginRunBoxTabEnum;
  setPluginRunTab: React.Dispatch<React.SetStateAction<PluginRunBoxTabEnum>>;
  resetVariables: (props?: {
    variables: Record<string, any> | undefined;
    variableList?: VariableItemType[];
  }) => void;
  clearChatRecords: () => void;
  chatBoxData: ChatBoxDataType;
  setChatBoxData: React.Dispatch<React.SetStateAction<ChatBoxDataType>>;
  isPlugin: boolean;

  datasetCiteData?: QuoteDataType;
  setCiteModalData: React.Dispatch<React.SetStateAction<QuoteDataType | undefined>>;
  isVariableVisible: boolean;
  setIsVariableVisible: React.Dispatch<React.SetStateAction<boolean>>;
  // 段落编辑器侧栏（与引用窗口同级管理）
  editorPanelData?: EditorPanelData;
  setEditorPanelData: React.Dispatch<React.SetStateAction<EditorPanelData | undefined>>;
  filesystemPanel: FilesystemPanelState;
  setFilesystemPanel: React.Dispatch<React.SetStateAction<FilesystemPanelState>>;
  scheduledTaskPanel: ScheduledTaskPanelState;
  setScheduledTaskPanel: React.Dispatch<React.SetStateAction<ScheduledTaskPanelState>>;
  shareSnapshotPanel: ShareSnapshotPanelState;
  setShareSnapshotPanel: React.Dispatch<React.SetStateAction<ShareSnapshotPanelState>>;
} & ContextProps;

export const ChatItemContext = createContext<ChatItemContextType>({
  contextId: '',
  ChatBoxRef: null,
  // @ts-ignore
  variablesForm: undefined,
  pluginRunTab: PluginRunBoxTabEnum.input,
  setPluginRunTab: function (value: React.SetStateAction<PluginRunBoxTabEnum>): void {
    throw new Error('Function not implemented.');
  },
  resetVariables: function (props?: {
    variables: Record<string, any> | undefined;
    variableList?: VariableItemType[];
  }): void {
    throw new Error('Function not implemented.');
  },
  clearChatRecords: function (): void {
    throw new Error('Function not implemented.');
  },

  datasetCiteData: undefined,
  setCiteModalData: function (value: React.SetStateAction<QuoteDataType | undefined>): void {
    throw new Error('Function not implemented.');
  },
  isVariableVisible: true,
  setIsVariableVisible: function (value: React.SetStateAction<boolean>): void {
    throw new Error('Function not implemented.');
  },
  editorPanelData: undefined,
  setEditorPanelData: function (value: React.SetStateAction<EditorPanelData | undefined>): void {
    throw new Error('Function not implemented.');
  },
  filesystemPanel: { isOpen: false },
  setFilesystemPanel: function (value: React.SetStateAction<FilesystemPanelState>): void {
    throw new Error('Function not implemented.');
  },
  scheduledTaskPanel: { isOpen: false },
  setScheduledTaskPanel: function (value: React.SetStateAction<ScheduledTaskPanelState>): void {
    throw new Error('Function not implemented.');
  },
  shareSnapshotPanel: { isOpen: false },
  setShareSnapshotPanel: function (value: React.SetStateAction<ShareSnapshotPanelState>): void {
    throw new Error('Function not implemented.');
  }
});

/* 
    Chat 对象的上下文
*/
const ChatItemContextProvider = ({
  children,
  showRouteToDatasetDetail,
  showRouteToAppDetail = true,
  isShowReadRawSource = false,
  isResponseDetail = false,
  // isShowFullText,
  showNodeStatus = false,
  canDownloadSource = false,
  isShowCite = true,
  isShowFullText = false,
  showRunningStatus = true,
  showWholeResponse = false
}: {
  children: ReactNode;
} & ContextPropsInput) => {
  const contextId = useId();
  const ChatBoxRef = useRef<ChatComponentRef>(null);
  const variablesForm = useForm<ChatBoxInputFormType>();
  const [isVariableVisible, setIsVariableVisible] = useState(true);

  const [chatBoxData, setChatBoxData] = useState<ChatBoxDataType>({
    ...defaultChatData
  });

  const isPlugin = chatBoxData.app.type === AppTypeEnum.workflowTool;

  // plugin
  const [pluginRunTab, setPluginRunTab] = useState<PluginRunBoxTabEnum>(PluginRunBoxTabEnum.input);

  const [datasetCiteData, setCiteModalDataRaw] = useState<QuoteDataType>();
  const [editorPanelData, setEditorPanelData] = useState<EditorPanelData>();
  const [filesystemPanel, setFilesystemPanel] = useState<FilesystemPanelState>({ isOpen: false });
  const [scheduledTaskPanel, setScheduledTaskPanel] = useState<ScheduledTaskPanelState>({
    isOpen: false
  });
  const [shareSnapshotPanel, setShareSnapshotPanel] = useState<ShareSnapshotPanelState>({
    isOpen: false
  });
  const { isPc } = useSystem();

  // 包装 setCiteModalData，确保打开引用面板时关闭其他两个面板
  const setCiteModalData = useCallback(
    (value: React.SetStateAction<QuoteDataType | undefined>) => {
      // 判断是否要打开引用面板
      const willOpen =
        typeof value === 'function' ? value(datasetCiteData) !== undefined : value !== undefined;

      // 如果要打开引用面板，则关闭其他两个面板
      if (willOpen) {
        setFilesystemPanel({ isOpen: false });
        setScheduledTaskPanel({ isOpen: false });
        setShareSnapshotPanel({ isOpen: false });
      }
      setCiteModalDataRaw(value);
    },
    [datasetCiteData]
  );

  useEffect(() => {
    return onOpenWorkspacePanel((payload) => {
      if (payload.contextId && payload.contextId !== contextId) return;
      // Avoid cross-opening when multiple chat contexts exist.
      if (payload.chatId && chatBoxData.chatId && payload.chatId !== chatBoxData.chatId) return;

      setFilesystemPanel((prev) => {
        const allowOpen = prev.isOpen || isPc || payload.userTriggered;
        if (!allowOpen) return prev;
        // 打开工作空间面板时，关闭引用面板和任务列表面板
        setCiteModalDataRaw(undefined);
        setScheduledTaskPanel({ isOpen: false });
        setShareSnapshotPanel({ isOpen: false });
        return {
          ...prev,
          isOpen: true,
          chatId: payload.chatId || prev.chatId,
          userId: payload.userId || prev.userId,
          maxDepth: payload.maxDepth ?? prev.maxDepth,
          refreshTrigger: payload.refreshTrigger ?? prev.refreshTrigger
        };
      });
    });
  }, [chatBoxData.chatId, contextId, isPc]);

  useEffect(() => {
    return onOpenScheduledTaskPanel((payload) => {
      if (payload.contextId && payload.contextId !== contextId) return;
      if (payload.appId && chatBoxData.appId && payload.appId !== chatBoxData.appId) return;

      setScheduledTaskPanel((prev) => {
        const allowOpen = prev.isOpen || isPc || payload.userTriggered;
        if (!allowOpen) return prev;
        // 打开任务列表面板时，关闭引用面板和工作空间面板
        setCiteModalDataRaw(undefined);
        setFilesystemPanel({ isOpen: false });
        setShareSnapshotPanel({ isOpen: false });
        return {
          ...prev,
          isOpen: true,
          chatId: payload.chatId || prev.chatId,
          appId: payload.appId || prev.appId,
          tmbId: payload.tmbId || prev.tmbId,
          refreshTrigger: payload.refreshTrigger ?? prev.refreshTrigger
        };
      });
    });
  }, [chatBoxData.appId, contextId, isPc]);

  useEffect(() => {
    return onOpenShareSnapshotPanel((payload) => {
      if (payload.contextId && payload.contextId !== contextId) return;
      if (payload.appId && chatBoxData.appId && payload.appId !== chatBoxData.appId) return;

      setShareSnapshotPanel((prev) => {
        const allowOpen = prev.isOpen || isPc || payload.userTriggered;
        if (!allowOpen) return prev;
        // 打开分享管理面板时，关闭引用面板和任务/工作空间面板
        setCiteModalDataRaw(undefined);
        setFilesystemPanel({ isOpen: false });
        setScheduledTaskPanel({ isOpen: false });
        return {
          ...prev,
          isOpen: true,
          chatId: payload.chatId || prev.chatId,
          appId: payload.appId || prev.appId,
          refreshTrigger: payload.refreshTrigger ?? prev.refreshTrigger
        };
      });
    });
  }, [chatBoxData.appId, contextId, isPc]);

  const resetVariables = useCallback(
    (props?: { variables?: Record<string, any>; variableList?: VariableItemType[] }) => {
      const { variables = {}, variableList = [] } = props || {};

      const values = variablesForm.getValues();

      if (variableList.length) {
        const varValues: Record<string, any> = {};
        variableList.forEach((item) => {
          varValues[item.key] = variables[item.key] ?? variables[item.label] ?? item.defaultValue;
        });

        variablesForm.reset({
          ...values,
          variables: varValues
        });
      } else {
        variablesForm.reset({
          ...values,
          variables
        });
      }
    },
    [variablesForm]
  );

  const clearChatRecords = useCallback(() => {
    const variables = chatBoxData?.app?.chatConfig?.variables || [];
    const values = variablesForm.getValues();

    variables.forEach((item) => {
      if (item.defaultValue !== undefined) {
        values.variables[item.key] = item.defaultValue;
      } else {
        values.variables[item.key] = '';
      }
    });
    variablesForm.reset(values);

    // 重开对话时，直接清空并关闭段落面板
    try {
      setEditorPanelData(undefined);
      setFilesystemPanel({ isOpen: false });
      setScheduledTaskPanel({ isOpen: false });
      setShareSnapshotPanel({ isOpen: false });
    } catch {}

    ChatBoxRef.current?.restartChat?.();
  }, [chatBoxData?.app?.chatConfig?.variables, variablesForm, setFilesystemPanel]);

  const contextValue = useMemo(() => {
    return {
      contextId,
      chatBoxData,
      setChatBoxData,
      isPlugin,
      ChatBoxRef,
      variablesForm,
      pluginRunTab,
      setPluginRunTab,
      resetVariables,
      clearChatRecords,
      showRouteToDatasetDetail,
      showRouteToAppDetail,
      isShowReadRawSource,
      isResponseDetail,
      showNodeStatus,
      canDownloadSource,
      isShowCite,
      isShowFullText,
      showRunningStatus,
      showWholeResponse,
      datasetCiteData,
      setCiteModalData,
      isVariableVisible,
      setIsVariableVisible,
      editorPanelData,
      setEditorPanelData,
      filesystemPanel,
      setFilesystemPanel,
      scheduledTaskPanel,
      setScheduledTaskPanel,
      shareSnapshotPanel,
      setShareSnapshotPanel
    };
  }, [
    contextId,
    chatBoxData,
    isPlugin,
    variablesForm,
    pluginRunTab,
    resetVariables,
    clearChatRecords,
    showRouteToDatasetDetail,
    showRouteToAppDetail,
    isShowReadRawSource,
    isResponseDetail,
    showNodeStatus,
    canDownloadSource,
    isShowCite,
    showRunningStatus,
    isShowFullText,
    showWholeResponse,
    datasetCiteData,
    setCiteModalData,
    isVariableVisible,
    setIsVariableVisible,
    editorPanelData,
    setEditorPanelData,
    filesystemPanel,
    setFilesystemPanel,
    scheduledTaskPanel,
    setScheduledTaskPanel,
    shareSnapshotPanel,
    setShareSnapshotPanel
  ]);

  return <ChatItemContext.Provider value={contextValue}>{children}</ChatItemContext.Provider>;
};

export default ChatItemContextProvider;
