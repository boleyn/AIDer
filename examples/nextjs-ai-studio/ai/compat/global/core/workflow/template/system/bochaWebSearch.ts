import { i18nT } from '../../../../../web/i18n/utils';
import {
  FlowNodeTemplateTypeEnum,
  NodeInputKeyEnum,
  NodeOutputKeyEnum,
  WorkflowIOValueTypeEnum
} from '../../constants';
import {
  datasetQuoteValueDesc,
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  FlowNodeTypeEnum
} from '../../node/constant';
import type { FlowNodeTemplateType } from '../../type/node.d';
import { Input_Template_UserChatInput } from '../input';
import { Output_Template_Error_Message } from '../output';

// 联网搜索 节点模板
export const BochaWebSearchTemplate: FlowNodeTemplateType = {
  id: FlowNodeTypeEnum.bochaWebSearch,
  templateType: FlowNodeTemplateTypeEnum.ai,
  flowNodeType: FlowNodeTypeEnum.bochaWebSearch,
  showSourceHandle: true,
  showTargetHandle: true,
  avatar: 'core/workflow/template/webSearch',
  colorSchema: 'yellowGreen',
  name: i18nT('workflow:online_search'),
  intro: i18nT('workflow:online_search_intro'),
  showStatus: true,
  version: '1.0.0',
  isTool: true,
  inputs: [
    // 用户问题
    Input_Template_UserChatInput,
    // API Key（密钥）
    {
      key: NodeInputKeyEnum.headerSecret,
      renderTypeList: [FlowNodeInputTypeEnum.hidden],
      valueType: WorkflowIOValueTypeEnum.object,
      label: '',
      required: false
    },
    // 搜索条数（默认10）
    {
      key: NodeInputKeyEnum.historyMaxAmount,
      renderTypeList: [FlowNodeInputTypeEnum.numberInput, FlowNodeInputTypeEnum.reference],
      valueType: WorkflowIOValueTypeEnum.number,
      label: i18nT('workflow:bocha_web_search_count'),
      value: 10,
      min: 1,
      max: 50,
      required: true
    }
  ],
  outputs: [
    // 引用结果（与知识库引用相同结构，以便前端复用引用列表）
    {
      id: NodeOutputKeyEnum.datasetQuoteQA,
      key: NodeOutputKeyEnum.datasetQuoteQA,
      label: i18nT('common:core.module.Dataset quote.label'),
      description: i18nT('workflow:special_array_format'),
      type: FlowNodeOutputTypeEnum.static,
      valueType: WorkflowIOValueTypeEnum.datasetQuote,
      valueDesc: datasetQuoteValueDesc
    },
    Output_Template_Error_Message
  ]
};
