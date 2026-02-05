import { FlowNodeOutputTypeEnum, FlowNodeTypeEnum } from '../../../node/constant';
import { type FlowNodeTemplateType } from '../../../type/node';
import {
  WorkflowIOValueTypeEnum,
  FlowNodeTemplateTypeEnum,
  NodeOutputKeyEnum
} from '../../../constants';
import {
  Input_Template_SelectAIModel,
  Input_Template_History,
  Input_Template_UserChatInput,
  Input_Template_System_Prompt
} from '../../input';
import { Output_Template_Error_Message } from '../../output';
import { LLMModelTypeEnum } from '../../../../ai/constants';
import { i18nT } from '../../../../../../web/i18n/utils';

export const TaskRecognizeModule: FlowNodeTemplateType = {
  id: FlowNodeTypeEnum.taskRecognize,
  templateType: FlowNodeTemplateTypeEnum.ai,
  flowNodeType: FlowNodeTypeEnum.taskRecognize,
  showSourceHandle: false,
  showTargetHandle: true,
  avatar: 'core/workflow/template/taskRecognize',
  colorSchema: 'yellow',
  name: i18nT('workflow:task_recognize'),
  intro: i18nT('workflow:intro_task_recognize'),
  toolDescription: i18nT('workflow:intro_task_recognize'),
  showStatus: true,
  isTool: true,
  catchError: true,
  version: '4.9.2',
  inputs: [
    {
      ...Input_Template_SelectAIModel,
      llmModelType: LLMModelTypeEnum.classify
    },
    Input_Template_System_Prompt,
    Input_Template_History,
    Input_Template_UserChatInput
  ],
  outputs: [
    {
      id: NodeOutputKeyEnum.taskIsTask,
      key: NodeOutputKeyEnum.taskIsTask,
      required: true,
      label: i18nT('workflow:task_recognize_is_task'),
      valueType: WorkflowIOValueTypeEnum.boolean,
      type: FlowNodeOutputTypeEnum.source
    },
    {
      id: NodeOutputKeyEnum.taskData,
      key: NodeOutputKeyEnum.taskData,
      required: false,
      label: i18nT('workflow:task_recognize_task_data'),
      valueType: WorkflowIOValueTypeEnum.object,
      type: FlowNodeOutputTypeEnum.source
    },
    Output_Template_Error_Message
  ]
};
