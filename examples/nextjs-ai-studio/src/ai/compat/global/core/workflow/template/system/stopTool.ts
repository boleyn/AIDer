import { FlowNodeTypeEnum } from '../../node/constant';
import { type FlowNodeTemplateType } from '../../type/node';
import { FlowNodeTemplateTypeEnum } from '../../constants';

export const StopToolNode: FlowNodeTemplateType = {
  id: FlowNodeTypeEnum.stopTool,
  templateType: FlowNodeTemplateTypeEnum.ai,
  flowNodeType: FlowNodeTypeEnum.stopTool,
  showSourceHandle: false,
  showTargetHandle: true,
  avatar: 'core/workflow/template/stopTool',
  avatarLinear: 'core/workflow/template/stopToolLinear',
  colorSchema: 'violet',
  name: '工具调用终止',
  intro: '结束当前工具调用流程',
  inputs: [],
  outputs: []
};
