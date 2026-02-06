import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  FlowNodeTypeEnum
} from '../../../node/constant';
import { type FlowNodeTemplateType } from '../../../type/node';
import {
  WorkflowIOValueTypeEnum,
  FlowNodeTemplateTypeEnum,
  NodeOutputKeyEnum
} from '../../../constants';
import {
  Input_Template_SelectAIModel,
  Input_Template_History,
  Input_Template_UserChatInput
} from '../../input';
import { LLMModelTypeEnum } from '../../../../ai/constants';
import { i18nT } from '../../../../../../web/i18n/utils';

export const ClassifyQuestionModule: FlowNodeTemplateType = {
  id: FlowNodeTypeEnum.classifyQuestion,
  templateType: FlowNodeTemplateTypeEnum.ai,
  flowNodeType: FlowNodeTypeEnum.classifyQuestion,
  showSourceHandle: false,
  showTargetHandle: true,
  avatar: 'core/workflow/template/questionClassify',
  avatarLinear: 'core/workflow/template/questionClassifyLinear',
  colorSchema: 'purple',
  name: i18nT('workflow:question_classification'),
  intro: i18nT('workflow:intro_question_classification'),
  showStatus: true,
  version: '4.9.2',
  courseUrl: '/docs/introduction/guide/dashboard/workflow/question_classify/',
  inputs: [
    {
      ...Input_Template_SelectAIModel,
      llmModelType: LLMModelTypeEnum.classify
    },
    Input_Template_History,
    Input_Template_UserChatInput,
    {
      key: 'agents',
      renderTypeList: [FlowNodeInputTypeEnum.custom],
      valueType: WorkflowIOValueTypeEnum.any,
      label: '',
      value: [
        {
          value: 'Greeting',
          description: 'Say hello / greeting intent',
          key: 'wqre'
        },
        {
          value: 'Question regarding xxx',
          description: 'Questions about xxx usage/purchase/etc',
          key: 'sdfa'
        },
        {
          value: 'Other Questions',
          description: 'Fallback category',
          key: 'agex'
        }
      ]
    }
  ],
  outputs: [
    {
      id: NodeOutputKeyEnum.cqResult,
      key: NodeOutputKeyEnum.cqResult,
      required: true,
      label: i18nT('workflow:classification_result'),
      valueType: WorkflowIOValueTypeEnum.string,
      type: FlowNodeOutputTypeEnum.static
    }
  ]
};
