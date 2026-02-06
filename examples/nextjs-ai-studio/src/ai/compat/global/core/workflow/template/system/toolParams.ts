import { FlowNodeTypeEnum } from '../../node/constant';
import { type FlowNodeTemplateType } from '../../type/node';
import { FlowNodeTemplateTypeEnum } from '../../constants';

export const ToolParamsNode: FlowNodeTemplateType = {
  id: FlowNodeTypeEnum.toolParams,
  templateType: FlowNodeTemplateTypeEnum.ai,
  flowNodeType: FlowNodeTypeEnum.toolParams,
  showSourceHandle: true,
  showTargetHandle: true,
  avatar: 'core/workflow/template/toolParams',
  avatarLinear: 'core/workflow/template/toolParamsLinear',
  colorSchema: 'indigo',
  name: '工具参数',
  intro: '配置工具的自定义参数',
  isTool: true,
  inputs: [],
  outputs: []
};
