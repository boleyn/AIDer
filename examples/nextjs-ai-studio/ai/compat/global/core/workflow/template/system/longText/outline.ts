import {
  FlowNodeOutputTypeEnum,
  FlowNodeTypeEnum,
  longTextOutlineValueDesc
} from '../../../node/constant';
import { type FlowNodeTemplateType } from '../../../type/node';
import {
  WorkflowIOValueTypeEnum,
  FlowNodeTemplateTypeEnum,
  NodeOutputKeyEnum
} from '../../../constants';
import {
  Input_Template_Dataset_Quote,
  Input_Template_SettingAiModel,
  Input_Template_System_Prompt,
  Input_Template_UserChatInput
} from '../../input';
import { i18nT } from '../../../../../../web/i18n/utils';
import { LLMModelTypeEnum } from '../../../../ai/constants';
import { FlowNodeInputTypeEnum } from '../../../node/constant';
import { NodeInputKeyEnum } from '../../../constants';

export const LongTextOutlineNode: FlowNodeTemplateType = {
  id: FlowNodeTypeEnum.longTextOutline,
  templateType: FlowNodeTemplateTypeEnum.article,
  flowNodeType: FlowNodeTypeEnum.longTextOutline,
  showSourceHandle: true,
  showTargetHandle: true,
  avatar: 'core/workflow/template/longTextOutline',
  colorSchema: 'orange',
  name: i18nT('workflow:longtext_outline'),
  intro: i18nT('workflow:longtext_outline_intro'),
  inputs: [
    // 模型选择
    {
      ...Input_Template_SettingAiModel,
      llmModelType: LLMModelTypeEnum.all
    },
    {
      key: NodeInputKeyEnum.aiChatTemperature,
      renderTypeList: [FlowNodeInputTypeEnum.hidden],
      label: '',
      valueType: WorkflowIOValueTypeEnum.number
    },
    {
      key: NodeInputKeyEnum.aiChatMaxToken,
      renderTypeList: [FlowNodeInputTypeEnum.hidden],
      label: '',
      valueType: WorkflowIOValueTypeEnum.number
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
      value: true
    },
    {
      key: NodeInputKeyEnum.aiChatTopP,
      renderTypeList: [FlowNodeInputTypeEnum.hidden],
      label: '',
      valueType: WorkflowIOValueTypeEnum.number
    },
    {
      key: NodeInputKeyEnum.aiChatStopSign,
      renderTypeList: [FlowNodeInputTypeEnum.hidden],
      label: '',
      valueType: WorkflowIOValueTypeEnum.string
    },
    {
      key: NodeInputKeyEnum.aiChatResponseFormat,
      renderTypeList: [FlowNodeInputTypeEnum.hidden],
      label: '',
      valueType: WorkflowIOValueTypeEnum.string
    },
    {
      key: NodeInputKeyEnum.aiChatJsonSchema,
      renderTypeList: [FlowNodeInputTypeEnum.hidden],
      label: '',
      valueType: WorkflowIOValueTypeEnum.string
    },
    // 用户问题
    Input_Template_UserChatInput,
    // 提示词
    Input_Template_System_Prompt,
    // 知识库引用
    Input_Template_Dataset_Quote
  ],
  outputs: [
    {
      id: NodeOutputKeyEnum.longTextOutline,
      key: NodeOutputKeyEnum.longTextOutline,
      label: i18nT('workflow:longtext_outline'),
      type: FlowNodeOutputTypeEnum.static,
      valueType: WorkflowIOValueTypeEnum.longTextOutline,
      valueDesc: longTextOutlineValueDesc
    },
    {
      id: NodeOutputKeyEnum.longTextOutlineExtraPrompt,
      key: NodeOutputKeyEnum.longTextOutlineExtraPrompt,
      label: i18nT('workflow:longtext_outline_extra_prompt'),
      type: FlowNodeOutputTypeEnum.static,
      valueType: WorkflowIOValueTypeEnum.string
    }
  ]
};
