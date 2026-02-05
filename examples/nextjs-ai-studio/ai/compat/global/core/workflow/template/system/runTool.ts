import {
  FlowNodeTemplateTypeEnum,
  NodeInputKeyEnum,
  WorkflowIOValueTypeEnum
} from '../../constants';
import { FlowNodeInputTypeEnum, FlowNodeTypeEnum } from '../../node/constant';
import { type FlowNodeTemplateType } from '../../type/node';
import { i18nT } from '../../../../../web/i18n/utils';

export const RunToolNode: FlowNodeTemplateType = {
  id: FlowNodeTypeEnum.tool,
  templateType: FlowNodeTemplateTypeEnum.other,
  flowNodeType: FlowNodeTypeEnum.tool,
  showSourceHandle: true,
  showTargetHandle: true,
  intro: '',
  name: '',
  showStatus: false,
  isTool: true,
  inputs: [
    {
      key: 'system_toolData',
      renderTypeList: [FlowNodeInputTypeEnum.hidden],
      valueType: WorkflowIOValueTypeEnum.object,
      label: '',
      required: false
    },
    {
      key: 'system_addInputParam',
      renderTypeList: [FlowNodeInputTypeEnum.addInputParam],
      valueType: WorkflowIOValueTypeEnum.dynamic,
      label: '',
      required: false,
      description: i18nT('common:mcp_custom_headers_desc'),
      value: {},
      customInputConfig: {
        selectValueTypeList: [WorkflowIOValueTypeEnum.string],
        showDescription: false,
        showDefaultValue: true
      }
    }
  ],
  outputs: []
};
