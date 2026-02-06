import {
  type AppChatConfigType,
  type AppDetailType,
  type AppSchema,
  type AppSimpleEditFormType
} from '@fastgpt/global/core/app/type';
import { type StoreNodeItemType } from '@fastgpt/global/core/workflow/type/node.d';
import {
  chatHistoryValueDesc,
  FlowNodeInputTypeEnum,
  FlowNodeTypeEnum
} from '@fastgpt/global/core/workflow/node/constant';
import {
  NodeInputKeyEnum,
  NodeOutputKeyEnum,
  WorkflowIOValueTypeEnum
} from '@fastgpt/global/core/workflow/constants';

import { getNanoid } from '@fastgpt/global/common/string/tools';
import { type StoreEdgeItemType } from '@fastgpt/global/core/workflow/type/edge';
import { type EditorVariablePickerType } from '@fastgpt/web/components/common/Textarea/PromptEditor/type';
import { AgentNode } from '@fastgpt/global/core/workflow/template/system/agent';
import {
  WorkflowStart,
  userFilesInput
} from '@fastgpt/global/core/workflow/template/system/workflowStart';
import { SystemConfigNode } from '@fastgpt/global/core/workflow/template/system/systemConfig';
import {
  AiChatModule,
  AiChatQuotePrompt,
  AiChatQuoteRole,
  AiChatQuoteTemplate
} from '@fastgpt/global/core/workflow/template/system/aiChat/index';
import { DatasetSearchModule } from '@fastgpt/global/core/workflow/template/system/datasetSearch';
import { BochaWebSearchTemplate } from '@fastgpt/global/core/workflow/template/system/bochaWebSearch';
import { DatasetConcatModule } from '@fastgpt/global/core/workflow/template/system/datasetConcat';
import { i18nT } from '@/web/i18n/utils';
import {
  Input_Template_File_Link,
  Input_Template_UserChatInput
} from '@fastgpt/global/core/workflow/template/input';
import { workflowStartNodeId } from './constants';
import { getDefaultAppForm } from '@fastgpt/global/core/app/utils';

type WorkflowType = {
  nodes: StoreNodeItemType[];
  edges: StoreEdgeItemType[];
};
export function form2AppWorkflow(
  data: AppSimpleEditFormType,
  t: any // i18nT
): WorkflowType & {
  chatConfig: AppChatConfigType;
} {
  const datasetNodeId = 'iKBoX2vIzETU';
  const webSearchNodeId = 'webSearchNode';
  const concatNodeId = 'concatNode';
  const aiChatNodeId = '7BdojPlukIQw';
  const selectedDatasets = data.dataset.datasets;
  function systemConfigTemplate(): StoreNodeItemType {
    return {
      nodeId: SystemConfigNode.id,
      name: t(SystemConfigNode.name),
      intro: '',
      flowNodeType: SystemConfigNode.flowNodeType,
      position: {
        x: 531.2422736065552,
        y: -486.7611729549753
      },
      version: SystemConfigNode.version,
      inputs: [],
      outputs: []
    };
  }
  function workflowStartTemplate(): StoreNodeItemType {
    return {
      nodeId: workflowStartNodeId,
      name: t(WorkflowStart.name),
      intro: '',
      avatar: WorkflowStart.avatar,
      flowNodeType: WorkflowStart.flowNodeType,
      position: {
        x: 558.4082376415505,
        y: 123.72387429194112
      },
      version: WorkflowStart.version,
      inputs: WorkflowStart.inputs,
      outputs: [...WorkflowStart.outputs, userFilesInput]
    };
  }
  function aiChatTemplate(formData: AppSimpleEditFormType): StoreNodeItemType {
    return {
      nodeId: aiChatNodeId,
      name: t(AiChatModule.name),
      intro: t(AiChatModule.intro),
      avatar: AiChatModule.avatar,
      flowNodeType: AiChatModule.flowNodeType,
      showStatus: true,
      position: {
        x: 1106.3238387960757,
        y: -350.6030674683474
      },
      version: AiChatModule.version,
      inputs: [
        {
          key: NodeInputKeyEnum.aiModel,
          renderTypeList: [FlowNodeInputTypeEnum.settingLLMModel, FlowNodeInputTypeEnum.reference],
          label: '',
          valueType: WorkflowIOValueTypeEnum.string,
          value: formData.aiSettings.model
        },
        {
          key: NodeInputKeyEnum.aiChatTemperature,
          renderTypeList: [FlowNodeInputTypeEnum.hidden],
          label: '',
          value: formData.aiSettings.temperature,
          valueType: WorkflowIOValueTypeEnum.number,
          min: 0,
          max: 10,
          step: 1
        },
        {
          key: NodeInputKeyEnum.aiChatMaxToken,
          renderTypeList: [FlowNodeInputTypeEnum.hidden],
          label: '',
          value: formData.aiSettings.maxToken,
          valueType: WorkflowIOValueTypeEnum.number,
          min: 100,
          max: 4000,
          step: 50
        },
        {
          key: NodeInputKeyEnum.aiChatIsResponseText,
          renderTypeList: [FlowNodeInputTypeEnum.hidden],
          label: '',
          value: true,
          valueType: WorkflowIOValueTypeEnum.boolean
        },
        AiChatQuoteRole,
        AiChatQuoteTemplate,
        AiChatQuotePrompt,
        {
          key: NodeInputKeyEnum.aiSystemPrompt,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference],
          max: 3000,
          valueType: WorkflowIOValueTypeEnum.string,
          label: 'core.ai.Prompt',
          description: 'core.app.tip.systemPromptTip',
          placeholder: 'core.app.tip.chatNodeSystemPromptTip',
          value: formData.aiSettings.systemPrompt
        },
        {
          key: NodeInputKeyEnum.history,
          renderTypeList: [FlowNodeInputTypeEnum.numberInput, FlowNodeInputTypeEnum.reference],
          valueType: WorkflowIOValueTypeEnum.chatHistory,
          label: 'core.module.input.label.chat history',
          required: true,
          min: 0,
          max: 30,
          value: formData.aiSettings.maxHistories
        },
        {
          key: NodeInputKeyEnum.userChatInput,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          valueType: WorkflowIOValueTypeEnum.string,
          label: i18nT('common:core.module.input.label.user question'),
          required: true,
          toolDescription: i18nT('common:core.module.input.label.user question'),
          value: [workflowStartNodeId, NodeInputKeyEnum.userChatInput]
        },
        {
          key: NodeInputKeyEnum.aiChatDatasetQuote,
          renderTypeList: [FlowNodeInputTypeEnum.settingDatasetQuotePrompt],
          label: '',
          debugLabel: i18nT('common:core.module.Dataset quote.label'),
          description: '',
          valueType: WorkflowIOValueTypeEnum.datasetQuote,
          value: selectedDatasets?.length > 0 ? [datasetNodeId, 'quoteQA'] : undefined
        },
        {
          ...Input_Template_File_Link,
          value: [[workflowStartNodeId, NodeOutputKeyEnum.userFiles]]
        },
        {
          key: NodeInputKeyEnum.aiChatVision,
          renderTypeList: [FlowNodeInputTypeEnum.hidden],
          label: '',
          valueType: WorkflowIOValueTypeEnum.boolean,
          value: true
        },
        {
          key: NodeInputKeyEnum.aiChatReasoning,
          renderTypeList: [FlowNodeInputTypeEnum.hidden],
          label: '',
          valueType: WorkflowIOValueTypeEnum.boolean,
          value: formData.aiSettings.aiChatReasoning
        },
        {
          key: NodeInputKeyEnum.aiChatTopP,
          renderTypeList: [FlowNodeInputTypeEnum.hidden],
          label: '',
          valueType: WorkflowIOValueTypeEnum.number,
          value: formData.aiSettings.aiChatTopP
        },
        {
          key: NodeInputKeyEnum.aiChatStopSign,
          renderTypeList: [FlowNodeInputTypeEnum.hidden],
          label: '',
          valueType: WorkflowIOValueTypeEnum.string,
          value: formData.aiSettings.aiChatStopSign
        },
        {
          key: NodeInputKeyEnum.aiChatResponseFormat,
          renderTypeList: [FlowNodeInputTypeEnum.hidden],
          label: '',
          valueType: WorkflowIOValueTypeEnum.string,
          value: formData.aiSettings.aiChatResponseFormat
        },
        {
          key: NodeInputKeyEnum.aiChatJsonSchema,
          renderTypeList: [FlowNodeInputTypeEnum.hidden],
          label: '',
          valueType: WorkflowIOValueTypeEnum.string,
          value: formData.aiSettings.aiChatJsonSchema
        }
      ],
      outputs: AiChatModule.outputs
    };
  }
  function datasetNodeTemplate(formData: AppSimpleEditFormType, question: any): StoreNodeItemType {
    return {
      nodeId: datasetNodeId,
      name: t(DatasetSearchModule.name),
      intro: t('app:dataset_search_tool_description'),
      avatar: DatasetSearchModule.avatar,
      flowNodeType: DatasetSearchModule.flowNodeType,
      showStatus: true,
      position: {
        x: 918.5901682164496,
        y: -227.11542247619582
      },
      version: DatasetSearchModule.version,
      inputs: [
        {
          key: NodeInputKeyEnum.datasetSelectList,
          renderTypeList: [FlowNodeInputTypeEnum.selectDataset, FlowNodeInputTypeEnum.reference],
          label: i18nT('common:core.module.input.label.Select dataset'),
          value: selectedDatasets,
          valueType: WorkflowIOValueTypeEnum.selectDataset,
          list: [],
          required: true
        },
        {
          key: NodeInputKeyEnum.datasetSimilarity,
          renderTypeList: [FlowNodeInputTypeEnum.selectDatasetParamsModal],
          label: '',
          value: formData.dataset.similarity,
          valueType: WorkflowIOValueTypeEnum.number
        },
        {
          key: NodeInputKeyEnum.datasetSearchRerankSimilarity,
          renderTypeList: [FlowNodeInputTypeEnum.hidden],
          label: '',
          value: formData.dataset.rerankSimilarity ?? formData.dataset.similarity,
          valueType: WorkflowIOValueTypeEnum.number
        },
        {
          key: NodeInputKeyEnum.datasetMaxTokens,
          renderTypeList: [FlowNodeInputTypeEnum.hidden],
          label: '',
          value: formData.dataset.limit,
          valueType: WorkflowIOValueTypeEnum.number
        },
        {
          key: NodeInputKeyEnum.datasetSearchMode,
          renderTypeList: [FlowNodeInputTypeEnum.hidden],
          label: '',
          valueType: WorkflowIOValueTypeEnum.string,
          value: formData.dataset.searchMode
        },
        {
          key: NodeInputKeyEnum.datasetSearchEmbeddingWeight,
          renderTypeList: [FlowNodeInputTypeEnum.hidden],
          label: '',
          valueType: WorkflowIOValueTypeEnum.number,
          value: formData.dataset.embeddingWeight
        },
        {
          key: NodeInputKeyEnum.datasetSearchUsingReRank,
          renderTypeList: [FlowNodeInputTypeEnum.hidden],
          label: '',
          valueType: WorkflowIOValueTypeEnum.boolean,
          value: formData.dataset.usingReRank
        },
        {
          key: NodeInputKeyEnum.datasetSearchRerankModel,
          renderTypeList: [FlowNodeInputTypeEnum.hidden],
          label: '',
          valueType: WorkflowIOValueTypeEnum.string,
          value: formData.dataset.rerankModel
        },
        {
          key: NodeInputKeyEnum.datasetSearchRerankWeight,
          renderTypeList: [FlowNodeInputTypeEnum.hidden],
          label: '',
          valueType: WorkflowIOValueTypeEnum.number,
          value: formData.dataset.rerankWeight
        },
        {
          key: NodeInputKeyEnum.datasetSearchUsingExtensionQuery,
          renderTypeList: [FlowNodeInputTypeEnum.hidden],
          label: '',
          valueType: WorkflowIOValueTypeEnum.boolean,
          value: formData.dataset.datasetSearchUsingExtensionQuery
        },
        {
          key: NodeInputKeyEnum.datasetSearchExtensionModel,
          renderTypeList: [FlowNodeInputTypeEnum.hidden],
          label: '',
          valueType: WorkflowIOValueTypeEnum.string,
          value: formData.dataset.datasetSearchExtensionModel
        },
        {
          key: NodeInputKeyEnum.datasetSearchExtensionBg,
          renderTypeList: [FlowNodeInputTypeEnum.hidden],
          label: '',
          valueType: WorkflowIOValueTypeEnum.string,
          value: formData.dataset.datasetSearchExtensionBg
        },
        {
          key: NodeInputKeyEnum.datasetUsePrivateDataset,
          renderTypeList: [FlowNodeInputTypeEnum.hidden],
          label: '',
          valueType: WorkflowIOValueTypeEnum.boolean,
          // 如果启用了私有知识库功能，自动启用 datasetUsePrivateDataset
          value:
            formData.dataset.datasetUsePrivateDataset ??
            (formData.chatConfig?.privateDatasetConfig?.enabled ? true : false)
        },
        {
          ...Input_Template_UserChatInput,
          toolDescription: i18nT('workflow:content_to_search'),
          value: question
        }
      ],
      outputs: DatasetSearchModule.outputs
    };
  }

  // Start, AiChat
  function simpleChatTemplate(formData: AppSimpleEditFormType): WorkflowType {
    return {
      nodes: [aiChatTemplate(formData)],
      edges: [
        {
          source: workflowStartNodeId,
          target: aiChatNodeId,
          sourceHandle: `${workflowStartNodeId}-source-right`,
          targetHandle: `${aiChatNodeId}-target-left`
        }
      ]
    };
  }

  // Start, Dataset search, AiChat
  function datasetTemplate(formData: AppSimpleEditFormType): WorkflowType {
    return {
      nodes: [
        aiChatTemplate(formData),
        datasetNodeTemplate(formData, [workflowStartNodeId, 'userChatInput'])
      ],
      edges: [
        {
          source: workflowStartNodeId,
          target: datasetNodeId,
          sourceHandle: `${workflowStartNodeId}-source-right`,
          targetHandle: `${datasetNodeId}-target-left`
        },
        {
          source: datasetNodeId,
          target: aiChatNodeId,
          sourceHandle: `${datasetNodeId}-source-right`,
          targetHandle: `${aiChatNodeId}-target-left`
        }
      ]
    };
  }

  // Start, Web Search, AiChat
  function webSearchTemplate(formData: AppSimpleEditFormType): WorkflowType {
    const aiChat = aiChatTemplate(formData);
    // 修改 AI Chat 的 quote 输入，连接到联网搜索节点
    const quoteInput = aiChat.inputs.find(
      (input) => input.key === NodeInputKeyEnum.aiChatDatasetQuote
    );
    if (quoteInput) {
      quoteInput.value = [webSearchNodeId, NodeOutputKeyEnum.datasetQuoteQA];
    }

    return {
      nodes: [aiChat, webSearchNodeTemplate(formData, [workflowStartNodeId, 'userChatInput'])],
      edges: [
        {
          source: workflowStartNodeId,
          target: webSearchNodeId,
          sourceHandle: `${workflowStartNodeId}-source-right`,
          targetHandle: `${webSearchNodeId}-target-left`
        },
        {
          source: webSearchNodeId,
          target: aiChatNodeId,
          sourceHandle: `${webSearchNodeId}-source-right`,
          targetHandle: `${aiChatNodeId}-target-left`
        }
      ]
    };
  }

  // Start, Dataset + Web Search (with concat), AiChat
  function datasetWithWebSearchTemplate(formData: AppSimpleEditFormType): WorkflowType {
    const aiChat = aiChatTemplate(formData);
    // 修改 AI Chat 的 quote 输入，连接到 concat 节点
    const quoteInput = aiChat.inputs.find(
      (input) => input.key === NodeInputKeyEnum.aiChatDatasetQuote
    );
    if (quoteInput) {
      quoteInput.value = [concatNodeId, NodeOutputKeyEnum.datasetQuoteQA];
    }

    return {
      nodes: [
        aiChat,
        datasetNodeTemplate(formData, [workflowStartNodeId, 'userChatInput']),
        webSearchNodeTemplate(formData, [workflowStartNodeId, 'userChatInput']),
        {
          nodeId: concatNodeId,
          name: t(DatasetConcatModule.name),
          intro: t(DatasetConcatModule.intro),
          avatar: DatasetConcatModule.avatar,
          flowNodeType: DatasetConcatModule.flowNodeType,
          showStatus: false,
          position: {
            x: 1300,
            y: 0
          },
          version: '481',
          inputs: [
            {
              key: NodeInputKeyEnum.datasetMaxTokens,
              renderTypeList: [FlowNodeInputTypeEnum.custom],
              label: i18nT('workflow:max_tokens'),
              value: 3000,
              valueType: WorkflowIOValueTypeEnum.number
            },
            {
              key: `${NodeInputKeyEnum.datasetQuoteList}_dataset`,
              renderTypeList: [FlowNodeInputTypeEnum.reference],
              label: 'dataset',
              valueType: WorkflowIOValueTypeEnum.datasetQuote,
              value: [datasetNodeId, NodeOutputKeyEnum.datasetQuoteQA]
            },
            {
              key: `${NodeInputKeyEnum.datasetQuoteList}_webSearch`,
              renderTypeList: [FlowNodeInputTypeEnum.reference],
              label: 'webSearch',
              valueType: WorkflowIOValueTypeEnum.datasetQuote,
              value: [webSearchNodeId, NodeOutputKeyEnum.datasetQuoteQA]
            }
          ],
          outputs: DatasetConcatModule.outputs
        }
      ],
      edges: [
        {
          source: workflowStartNodeId,
          target: datasetNodeId,
          sourceHandle: `${workflowStartNodeId}-source-right`,
          targetHandle: `${datasetNodeId}-target-left`
        },
        {
          source: workflowStartNodeId,
          target: webSearchNodeId,
          sourceHandle: `${workflowStartNodeId}-source-right`,
          targetHandle: `${webSearchNodeId}-target-left`
        },
        {
          source: datasetNodeId,
          target: concatNodeId,
          sourceHandle: `${datasetNodeId}-source-right`,
          targetHandle: `${concatNodeId}-target-left`
        },
        {
          source: webSearchNodeId,
          target: concatNodeId,
          sourceHandle: `${webSearchNodeId}-source-right`,
          targetHandle: `${concatNodeId}-target-left`
        },
        {
          source: concatNodeId,
          target: aiChatNodeId,
          sourceHandle: `${concatNodeId}-source-right`,
          targetHandle: `${aiChatNodeId}-target-left`
        }
      ]
    };
  }
  function webSearchNodeTemplate(
    formData: AppSimpleEditFormType,
    question: any
  ): StoreNodeItemType {
    return {
      nodeId: webSearchNodeId,
      name: t(BochaWebSearchTemplate.name),
      intro: t(BochaWebSearchTemplate.intro),
      avatar: BochaWebSearchTemplate.avatar,
      flowNodeType: BochaWebSearchTemplate.flowNodeType,
      showStatus: true,
      position: {
        x: 918.5901682164496,
        y: 100
      },
      version: BochaWebSearchTemplate.version,
      inputs: [
        {
          ...Input_Template_UserChatInput,
          toolDescription: i18nT('workflow:content_to_search'),
          value: question
        },
        {
          key: NodeInputKeyEnum.historyMaxAmount,
          renderTypeList: [FlowNodeInputTypeEnum.numberInput, FlowNodeInputTypeEnum.reference],
          valueType: WorkflowIOValueTypeEnum.number,
          label: i18nT('workflow:bocha_web_search_count'),
          value: formData.webSearch.searchCount || 10,
          min: 1,
          max: 50,
          required: true
        }
      ],
      outputs: BochaWebSearchTemplate.outputs
    };
  }

  function toolTemplates(formData: AppSimpleEditFormType): WorkflowType {
    const toolNodeId = getNanoid(6);
    const hasDataset = selectedDatasets.length > 0;
    const hasWebSearch = formData.webSearch.enabled;
    // 如果启用了私有知识库功能，即使没有固定知识库，也应该创建数据集节点
    const hasPrivateDatasetEnabled = formData.chatConfig?.privateDatasetConfig?.enabled ?? false;
    const shouldCreateDatasetNode = hasDataset || hasPrivateDatasetEnabled;
    const needConcat = shouldCreateDatasetNode && hasWebSearch;

    // Dataset tool config
    const datasetTool: WorkflowType | null = shouldCreateDatasetNode
      ? {
          nodes: [datasetNodeTemplate(formData, '')],
          edges: [
            {
              source: toolNodeId,
              target: datasetNodeId,
              sourceHandle: 'selectedTools',
              targetHandle: 'selectedTools'
            }
          ]
        }
      : null;

    // Web search tool config
    const webSearchTool: WorkflowType | null = hasWebSearch
      ? {
          nodes: [webSearchNodeTemplate(formData, '')],
          edges: [
            {
              source: toolNodeId,
              target: webSearchNodeId,
              sourceHandle: 'selectedTools',
              targetHandle: 'selectedTools'
            }
          ]
        }
      : null;

    // Concat node config (when both dataset and web search are enabled as tools)
    const concatTool: WorkflowType | null = needConcat
      ? {
          nodes: [
            {
              nodeId: concatNodeId,
              name: t(DatasetConcatModule.name),
              intro: t(DatasetConcatModule.intro),
              avatar: DatasetConcatModule.avatar,
              flowNodeType: DatasetConcatModule.flowNodeType,
              showStatus: false,
              position: {
                x: 1300,
                y: 0
              },
              version: '481',
              inputs: [
                {
                  key: NodeInputKeyEnum.datasetMaxTokens,
                  renderTypeList: [FlowNodeInputTypeEnum.custom],
                  label: i18nT('workflow:max_tokens'),
                  value: 3000,
                  valueType: WorkflowIOValueTypeEnum.number
                },
                {
                  key: `${NodeInputKeyEnum.datasetQuoteList}_dataset`,
                  renderTypeList: [FlowNodeInputTypeEnum.reference],
                  label: 'dataset',
                  valueType: WorkflowIOValueTypeEnum.datasetQuote,
                  value: [datasetNodeId, NodeOutputKeyEnum.datasetQuoteQA]
                },
                {
                  key: `${NodeInputKeyEnum.datasetQuoteList}_webSearch`,
                  renderTypeList: [FlowNodeInputTypeEnum.reference],
                  label: 'webSearch',
                  valueType: WorkflowIOValueTypeEnum.datasetQuote,
                  value: [webSearchNodeId, NodeOutputKeyEnum.datasetQuoteQA]
                }
              ],
              outputs: DatasetConcatModule.outputs
            }
          ],
          edges: [
            {
              source: datasetNodeId,
              target: concatNodeId,
              sourceHandle: `${datasetNodeId}-source-right`,
              targetHandle: `${concatNodeId}-target-left`
            },
            {
              source: webSearchNodeId,
              target: concatNodeId,
              sourceHandle: `${webSearchNodeId}-source-right`,
              targetHandle: `${concatNodeId}-target-left`
            }
          ]
        }
      : null;

    // Computed tools config
    const pluginTool: WorkflowType[] = formData.selectedTools.map((tool, i) => {
      const nodeId = getNanoid(6);
      return {
        nodes: [
          {
            nodeId,
            id: tool.id,
            pluginId: tool.pluginId,
            name: tool.name,
            intro: tool.intro,
            toolDescription: tool.toolDescription,
            avatar: tool.avatar,
            flowNodeType: tool.flowNodeType,
            showStatus: tool.showStatus,
            position: {
              x: 500 + 500 * (i + 1),
              y: 545
            },
            toolConfig: tool.toolConfig,
            pluginData: tool.pluginData,
            inputs: tool.inputs.map((input) => {
              // Special key value
              if (input.key === NodeInputKeyEnum.forbidStream) {
                input.value = true;
              }
              // Special tool
              if (
                tool.flowNodeType === FlowNodeTypeEnum.appModule &&
                input.key === NodeInputKeyEnum.history
              ) {
                return {
                  ...input,
                  value: formData.aiSettings.maxHistories
                };
              }
              return input;
            }),
            outputs: tool.outputs
          }
        ],
        edges: [
          {
            source: toolNodeId,
            target: nodeId,
            sourceHandle: 'selectedTools',
            targetHandle: 'selectedTools'
          }
        ]
      };
    });

    const config: WorkflowType = {
      nodes: [
        {
          nodeId: toolNodeId,
          name: AgentNode.name,
          intro: AgentNode.intro,
          avatar: AgentNode.avatar,
          flowNodeType: AgentNode.flowNodeType,
          showStatus: true,
          position: {
            x: 1062.1738942532802,
            y: -223.65033022650476
          },
          version: AgentNode.version,
          inputs: [
            {
              key: NodeInputKeyEnum.aiModel,
              renderTypeList: [
                FlowNodeInputTypeEnum.settingLLMModel,
                FlowNodeInputTypeEnum.reference
              ],
              label: 'core.module.input.label.aiModel',
              valueType: WorkflowIOValueTypeEnum.string,
              llmModelType: 'all',
              value: formData.aiSettings.model
            },
            {
              key: 'temperature',
              renderTypeList: [FlowNodeInputTypeEnum.hidden],
              label: '',
              value: formData.aiSettings.temperature,
              valueType: WorkflowIOValueTypeEnum.number,
              min: 0,
              max: 10,
              step: 1
            },
            {
              key: 'maxToken',
              renderTypeList: [FlowNodeInputTypeEnum.hidden],
              label: '',
              value: formData.aiSettings.maxToken,
              valueType: WorkflowIOValueTypeEnum.number,
              min: 100,
              max: 4000,
              step: 50
            },
            {
              key: 'systemPrompt',
              renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference],
              max: 3000,
              valueType: WorkflowIOValueTypeEnum.string,
              label: 'core.ai.Prompt',
              description: 'core.app.tip.systemPromptTip',
              placeholder: 'core.app.tip.chatNodeSystemPromptTip',
              value: formData.aiSettings.systemPrompt
            },
            {
              key: 'history',
              renderTypeList: [FlowNodeInputTypeEnum.numberInput, FlowNodeInputTypeEnum.reference],
              valueType: WorkflowIOValueTypeEnum.chatHistory,
              label: 'core.module.input.label.chat history',
              required: true,
              min: 0,
              max: 30,
              value: formData.aiSettings.maxHistories
            },
            {
              ...Input_Template_File_Link,
              value: [[workflowStartNodeId, NodeOutputKeyEnum.userFiles]]
            },
            {
              key: 'userChatInput',
              renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
              valueType: WorkflowIOValueTypeEnum.string,
              label: i18nT('common:core.module.input.label.user question'),
              required: true,
              value: [workflowStartNodeId, 'userChatInput']
            },
            {
              key: NodeInputKeyEnum.aiChatVision,
              renderTypeList: [FlowNodeInputTypeEnum.hidden],
              label: '',
              valueType: WorkflowIOValueTypeEnum.boolean,
              value: true
            },
            {
              key: NodeInputKeyEnum.aiChatReasoning,
              renderTypeList: [FlowNodeInputTypeEnum.hidden],
              label: '',
              valueType: WorkflowIOValueTypeEnum.boolean,
              value: formData.aiSettings.aiChatReasoning
            }
          ],
          outputs: AgentNode.outputs
        },
        // tool nodes
        ...(datasetTool ? datasetTool.nodes : []),
        ...(webSearchTool ? webSearchTool.nodes : []),
        ...(concatTool ? concatTool.nodes : []),
        ...pluginTool.map((tool) => tool.nodes).flat()
      ],
      edges: [
        {
          source: workflowStartNodeId,
          target: toolNodeId,
          sourceHandle: `${workflowStartNodeId}-source-right`,
          targetHandle: `${toolNodeId}-target-left`
        },
        // tool edges
        ...(datasetTool ? datasetTool.edges : []),
        ...(webSearchTool ? webSearchTool.edges : []),
        ...(concatTool ? concatTool.edges : []),
        ...pluginTool.map((tool) => tool.edges).flat()
      ]
    };

    // Add t
    config.nodes.forEach((node) => {
      node.name = t(node.name);
      node.intro = t(node.intro);

      node.inputs.forEach((input) => {
        input.label = t(input.label);
        input.description = t(input.description);
        input.toolDescription = t(input.toolDescription);
      });
    });

    return config;
  }

  const workflow = (() => {
    const hasTools = data.selectedTools.length > 0;
    const hasDataset = selectedDatasets.length > 0;
    const hasWebSearch = data.webSearch.enabled;
    // 如果启用了私有知识库功能，即使没有固定知识库，也应该创建数据集节点
    const hasPrivateDatasetEnabled = data.chatConfig?.privateDatasetConfig?.enabled ?? false;
    const shouldCreateDatasetNode = hasDataset || hasPrivateDatasetEnabled;

    // 有工具调用时，使用 toolTemplates（知识库和联网搜索会作为工具）
    if (hasTools) {
      return toolTemplates(data);
    }

    // 无工具调用，同时有知识库和联网搜索（作为顺序流程）
    if (shouldCreateDatasetNode && hasWebSearch) {
      return datasetWithWebSearchTemplate(data);
    }

    // 无工具调用，只有联网搜索（作为顺序流程）
    if (hasWebSearch) {
      return webSearchTemplate(data);
    }

    // 无工具调用，只有知识库（作为顺序流程）
    if (shouldCreateDatasetNode) {
      return datasetTemplate(data);
    }

    // 简单对话
    return simpleChatTemplate(data);
  })();

  return {
    nodes: [systemConfigTemplate(), workflowStartTemplate(), ...workflow.nodes],
    edges: workflow.edges,
    chatConfig: data.chatConfig
  };
}
export function filterSensitiveFormData(appForm: AppSimpleEditFormType) {
  const defaultAppForm = getDefaultAppForm();
  return {
    ...appForm,
    dataset: defaultAppForm.dataset,
    webSearch: appForm.webSearch
  };
}

export const workflowSystemVariables: EditorVariablePickerType[] = [
  {
    key: 'userId',
    label: i18nT('workflow:use_user_id'),
    required: true,
    valueType: WorkflowIOValueTypeEnum.string
  },
  {
    key: 'userName',
    label: i18nT('workflow:use_user_name'),
    required: false,
    valueType: WorkflowIOValueTypeEnum.string
  },
  {
    key: 'finalUserId',
    label: i18nT('workflow:final_user_id'),
    required: false,
    valueType: WorkflowIOValueTypeEnum.string
  },
  {
    key: 'appId',
    label: i18nT('common:core.module.http.AppId'),
    required: true,
    valueType: WorkflowIOValueTypeEnum.string
  },
  {
    key: 'chatId',
    label: i18nT('common:core.module.http.ChatId'),
    valueType: WorkflowIOValueTypeEnum.string,
    required: true
  },
  {
    key: 'responseChatItemId',
    label: i18nT('common:core.module.http.ResponseChatItemId'),
    valueType: WorkflowIOValueTypeEnum.string,
    required: true
  },
  {
    key: 'histories',
    label: i18nT('common:core.module.http.Histories'),
    required: true,
    valueType: WorkflowIOValueTypeEnum.chatHistory,
    valueDesc: chatHistoryValueDesc
  },
  // 当前时间 - 对象类型，支持展开三级菜单
  {
    key: 'cTime',
    label: i18nT('common:core.module.http.Current time'),
    required: true,
    valueType: WorkflowIOValueTypeEnum.object,
    // subMenus 用于 PromptEditor 变量选择器
    subMenus: [
      {
        key: 'cTime',
        label: i18nT('workflow:time_format_default')
      },
      {
        key: 'cTime.date',
        label: i18nT('workflow:time_format_date')
      },
      {
        key: 'cTime.iso',
        label: i18nT('workflow:time_format_iso')
      },
      {
        key: 'cTime.isoUtc',
        label: i18nT('workflow:time_format_iso_utc')
      }
    ]
  }
];

export const getAppQGuideCustomURL = (appDetail: AppDetailType | AppSchema): string => {
  return (
    appDetail?.modules
      .find((m) => m.flowNodeType === FlowNodeTypeEnum.systemConfig)
      ?.inputs.find((i) => i.key === NodeInputKeyEnum.chatInputGuide)?.value.customUrl || ''
  );
};
