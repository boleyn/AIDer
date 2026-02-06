import { i18nT } from '../../../../../../web/i18n/utils';
import {
  FlowNodeTemplateTypeEnum,
  NodeInputKeyEnum,
  NodeOutputKeyEnum,
  WorkflowIOValueTypeEnum
} from '../../../constants';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  FlowNodeTypeEnum
} from '../../../node/constant';
import { type FlowNodeTemplateType } from '../../../type/node.d';

export const DynamicUserSelectNode: FlowNodeTemplateType = {
  id: FlowNodeTypeEnum.dynamicUserSelect,
  templateType: FlowNodeTemplateTypeEnum.interactive,
  flowNodeType: FlowNodeTypeEnum.dynamicUserSelect,
  showSourceHandle: true,
  showTargetHandle: true,
  avatar: 'core/workflow/template/userSelect', // 复用原图标
  colorSchema: 'green',
  name: i18nT('app:workflow.dynamic_user_select'),
  intro: i18nT(`app:workflow.dynamic_user_select_tip`),
  isTool: true,
  inputs: [
    {
      key: NodeInputKeyEnum.description,
      renderTypeList: [FlowNodeInputTypeEnum.textarea],
      valueType: WorkflowIOValueTypeEnum.string,
      label: i18nT('app:workflow.select_description'),
      description: i18nT('app:workflow.select_description_tip'),
      placeholder: i18nT('app:workflow.select_description_placeholder')
    },
    {
      key: NodeInputKeyEnum.userSelectOptions,
      renderTypeList: [FlowNodeInputTypeEnum.reference], // 只支持引用模式
      valueType: WorkflowIOValueTypeEnum.string, // 字符串类型
      label: i18nT('app:workflow.user_select_options'),
      description: i18nT('app:workflow.dynamic_options_description'),
      placeholder: 'EBOSS\nEBOSS开发库\n展示数据库'
    }
  ],
  outputs: [
    {
      id: NodeOutputKeyEnum.selectResult,
      key: NodeOutputKeyEnum.selectResult,
      required: true,
      label: i18nT('app:workflow.select_result'),
      valueType: WorkflowIOValueTypeEnum.string,
      type: FlowNodeOutputTypeEnum.static
    }
  ]
};
