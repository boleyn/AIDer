import { FlowNodeInputTypeEnum, FlowNodeTypeEnum } from '../../../node/constant';
import { type FlowNodeTemplateType } from '../../../type/node.d';
import {
  FlowNodeTemplateTypeEnum,
  NodeInputKeyEnum,
  WorkflowIOValueTypeEnum
} from '../../../constants';

export const VariableUpdateNode: FlowNodeTemplateType = {
  id: FlowNodeTypeEnum.variableUpdate,
  templateType: FlowNodeTemplateTypeEnum.tools,
  flowNodeType: FlowNodeTypeEnum.variableUpdate,
  showSourceHandle: true,
  showTargetHandle: true,
  avatar: 'core/workflow/template/variableUpdate',
  avatarLinear: 'core/workflow/template/variableUpdateLinear',
  colorSchema: 'coral',
  name: '变量更新',
  intro: '更新指定节点输出或全局变量',
  showStatus: false,
  isTool: true,
  courseUrl: '/docs/introduction/guide/dashboard/workflow/variable_update/',
  inputs: [
    {
      key: NodeInputKeyEnum.updateList,
      valueType: WorkflowIOValueTypeEnum.any,
      label: '',
      renderTypeList: [FlowNodeInputTypeEnum.hidden],
      value: [
        {
          variable: ['', ''],
          value: ['', ''],
          valueType: WorkflowIOValueTypeEnum.string,
          renderType: FlowNodeInputTypeEnum.input
        }
      ]
    }
  ],
  outputs: []
};
