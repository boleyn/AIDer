import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  FlowNodeTypeEnum,
  longTextOutlineValueDesc,
  longTextParagraphsValueDesc,
  datasetSelectValueDesc
} from '../../../node/constant';
import { type FlowNodeTemplateType } from '../../../type/node';
import {
  WorkflowIOValueTypeEnum,
  NodeInputKeyEnum,
  NodeOutputKeyEnum,
  FlowNodeTemplateTypeEnum
} from '../../../constants';
import { Input_Template_Stream_MODE } from '../../input';
import { i18nT } from '../../../../../../web/i18n/utils';
import { LLMModelTypeEnum } from '../../../../ai/constants';
import {
  Input_Template_SettingAiModel,
  Input_Template_System_Prompt,
  Input_Template_UserChatInput
} from '../../input';

export const LongTextParagraphNode: FlowNodeTemplateType = {
  id: FlowNodeTypeEnum.longTextParagraph,
  templateType: FlowNodeTemplateTypeEnum.article,
  flowNodeType: FlowNodeTypeEnum.longTextParagraph,
  showSourceHandle: true,
  showTargetHandle: true,
  avatar: 'core/workflow/template/longTextParagraph',
  colorSchema: 'yellowGreen',
  name: i18nT('workflow:longtext_paragraph'),
  intro: i18nT('workflow:longtext_paragraph_intro'),
  inputs: [
    {
      ...Input_Template_SettingAiModel,
      llmModelType: LLMModelTypeEnum.all
    },
    {
      key: NodeInputKeyEnum.aiChatTemperature,
      renderTypeList: [FlowNodeInputTypeEnum.hidden], // Set in the pop-up window
      label: '',
      valueType: WorkflowIOValueTypeEnum.number
    },
    {
      key: NodeInputKeyEnum.aiChatMaxToken,
      renderTypeList: [FlowNodeInputTypeEnum.hidden], // Set in the pop-up window
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
    Input_Template_UserChatInput,
    Input_Template_System_Prompt,
    Input_Template_Stream_MODE,

    {
      key: NodeInputKeyEnum.datasetSelectList,
      renderTypeList: [FlowNodeInputTypeEnum.selectDataset, FlowNodeInputTypeEnum.reference],
      label: i18nT('common:core.module.input.label.Select dataset'),
      value: [],
      valueType: WorkflowIOValueTypeEnum.selectDataset,
      required: false,
      valueDesc: datasetSelectValueDesc
    },

    {
      key: NodeInputKeyEnum.longTextOutline,
      label: i18nT('workflow:longtext_outline_input'),
      renderTypeList: [FlowNodeInputTypeEnum.reference],
      valueType: WorkflowIOValueTypeEnum.longTextOutline,
      valueDesc: longTextOutlineValueDesc
    },

    {
      key: NodeInputKeyEnum.longTextOutlineExtraPrompt,
      label: i18nT('workflow:longtext_outline_extra_prompt_input'),
      renderTypeList: [FlowNodeInputTypeEnum.reference],
      valueType: WorkflowIOValueTypeEnum.string,
      required: false
    },

    {
      key: 'enableWebSearch',
      renderTypeList: [FlowNodeInputTypeEnum.switch, FlowNodeInputTypeEnum.reference],
      label: i18nT('workflow:enable_web_search'),
      value: true,
      valueType: WorkflowIOValueTypeEnum.boolean,
      required: false
    }
  ],
  outputs: [
    {
      id: NodeOutputKeyEnum.paragraphsJson,
      key: NodeOutputKeyEnum.paragraphsJson,
      label: i18nT('workflow:longtext_paragraphs_json'),
      type: FlowNodeOutputTypeEnum.static,
      valueType: WorkflowIOValueTypeEnum.longTextParagraphs,
      valueDesc: longTextParagraphsValueDesc
    },
    {
      id: NodeOutputKeyEnum.paragraphsMarkdown,
      key: NodeOutputKeyEnum.paragraphsMarkdown,
      label: i18nT('workflow:longtext_paragraphs_markdown'),
      type: FlowNodeOutputTypeEnum.static,
      valueType: WorkflowIOValueTypeEnum.string
    },
    {
      id: NodeOutputKeyEnum.answerText,
      key: NodeOutputKeyEnum.answerText,
      label: NodeOutputKeyEnum.answerText,
      type: FlowNodeOutputTypeEnum.static,
      valueType: WorkflowIOValueTypeEnum.string
    },
    {
      id: NodeOutputKeyEnum.selectedTools,
      key: NodeOutputKeyEnum.selectedTools,
      label: i18nT('workflow:selected_tools'),
      type: FlowNodeOutputTypeEnum.hidden,
      valueType: WorkflowIOValueTypeEnum.any
    }
  ]
};
