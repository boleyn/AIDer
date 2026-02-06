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

export const TaskRecognizeModule: FlowNodeTemplateType = {
  id: FlowNodeTypeEnum.taskRecognize,
  templateType: FlowNodeTemplateTypeEnum.ai,
  flowNodeType: FlowNodeTypeEnum.taskRecognize,
  showSourceHandle: false,
  showTargetHandle: true,
  avatar: 'core/workflow/template/taskRecognize',
  colorSchema: 'yellow',
  name: '任务识别',
  intro: '识别用户输入是否为可执行任务',
  toolDescription: '识别用户输入是否为可执行任务',
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
      label: '是否为任务',
      valueType: WorkflowIOValueTypeEnum.boolean,
      type: FlowNodeOutputTypeEnum.source
    },
    {
      id: NodeOutputKeyEnum.taskData,
      key: NodeOutputKeyEnum.taskData,
      required: false,
      label: '任务数据',
      valueType: WorkflowIOValueTypeEnum.object,
      type: FlowNodeOutputTypeEnum.source
    },
    Output_Template_Error_Message
  ]
};
