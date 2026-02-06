import { FlowNodeOutputTypeEnum, FlowNodeTypeEnum } from '../../node/constant';
import { type FlowNodeTemplateType } from '../../type/node.d';
import {
  WorkflowIOValueTypeEnum,
  NodeOutputKeyEnum,
  FlowNodeTemplateTypeEnum
} from '../../constants';
import { Input_Template_UserChatInput } from '../input';
import { type FlowNodeOutputItemType } from '../../type/io';

export const userFilesInput: FlowNodeOutputItemType = {
  id: NodeOutputKeyEnum.userFiles,
  key: NodeOutputKeyEnum.userFiles,
  label: '用户文件',
  description: '用户上传的文件列表',
  type: FlowNodeOutputTypeEnum.static,
  valueType: WorkflowIOValueTypeEnum.arrayString
};

export const WorkflowStart: FlowNodeTemplateType = {
  id: FlowNodeTypeEnum.workflowStart,
  templateType: FlowNodeTemplateTypeEnum.systemInput,
  flowNodeType: FlowNodeTypeEnum.workflowStart,
  showSourceHandle: true,
  showTargetHandle: false,
  avatar: 'core/workflow/template/workflowStart',
  avatarLinear: 'core/workflow/template/workflowStartLinear',
  colorSchema: 'blue',
  name: '工作流开始',
  intro: '',
  forbidDelete: true,
  unique: true,
  inputs: [{ ...Input_Template_UserChatInput, toolDescription: '用户问题' }],
  outputs: [
    {
      id: NodeOutputKeyEnum.userChatInput,
      key: NodeOutputKeyEnum.userChatInput,
      label: '用户问题',
      type: FlowNodeOutputTypeEnum.static,
      valueType: WorkflowIOValueTypeEnum.string
    }
  ]
};
