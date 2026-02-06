import { FlowNodeTypeEnum } from '../../node/constant';
import { type FlowNodeTemplateType } from '../../type/node.d';
import { FlowNodeTemplateTypeEnum } from '../../constants';

export const SystemConfigNode: FlowNodeTemplateType = {
  id: FlowNodeTypeEnum.systemConfig,
  templateType: FlowNodeTemplateTypeEnum.systemInput,
  flowNodeType: FlowNodeTypeEnum.systemConfig,
  showSourceHandle: false,
  showTargetHandle: false,
  avatar: 'core/workflow/template/systemConfig',
  avatarLinear: 'core/workflow/template/systemConfigLinear',
  colorSchema: 'pink',
  name: '系统配置',
  intro: '',
  unique: true,
  forbidDelete: true,
  inputs: [],
  outputs: []
};
