import {
  FlowNodeTemplateTypeEnum,
  NodeInputKeyEnum,
  WorkflowIOValueTypeEnum
} from '../../constants';
import { FlowNodeInputTypeEnum, FlowNodeTypeEnum } from '../../node/constant';
import { type FlowNodeTemplateType } from '../../type/node';
import { i18nT } from '../../../../../web/i18n/utils';

export const RunToolSetNode: FlowNodeTemplateType = {
  id: FlowNodeTypeEnum.toolSet,
  templateType: FlowNodeTemplateTypeEnum.other,
  flowNodeType: FlowNodeTypeEnum.toolSet,
  showSourceHandle: false,
  showTargetHandle: false,
  colorSchema: 'salmon',
  isTool: true,
  intro: '',
  name: '',
  showStatus: false,
  inputs: [
    {
      key: NodeInputKeyEnum.toolSetData,
      renderTypeList: [FlowNodeInputTypeEnum.hidden],
      valueType: WorkflowIOValueTypeEnum.object,
      label: '',
      required: false
    },
    {
      key: NodeInputKeyEnum.addInputParam,
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
