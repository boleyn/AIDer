import { FlowNodeInputTypeEnum, FlowNodeTypeEnum } from '../../../node/constant';
import { type FlowNodeTemplateType } from '../../../type/node';
import {
  FlowNodeTemplateTypeEnum,
  NodeInputKeyEnum,
  WorkflowIOValueTypeEnum
} from '../../../constants';
import { i18nT } from '../../../../../../web/i18n/utils';

export const ProgressNode: FlowNodeTemplateType = {
  id: FlowNodeTypeEnum.progress,
  templateType: FlowNodeTemplateTypeEnum.tools,
  flowNodeType: FlowNodeTypeEnum.progress,
  showSourceHandle: true,
  showTargetHandle: true,
  avatar: 'core/workflow/template/progress',
  colorSchema: 'green',
  name: i18nT('workflow:progress'),
  intro: i18nT('workflow:intro_progress'),
  showStatus: true,
  inputs: [
    {
      key: NodeInputKeyEnum.progressId,
      renderTypeList: [FlowNodeInputTypeEnum.numberInput, FlowNodeInputTypeEnum.reference],
      valueType: WorkflowIOValueTypeEnum.number,
      required: true,
      label: i18nT('workflow:progress_id'),
      placeholder: i18nT('workflow:progress_id_placeholder'),
      value: 1,
      min: 1
    },
    {
      key: NodeInputKeyEnum.progressTitle,
      renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference],
      valueType: WorkflowIOValueTypeEnum.string,
      required: true,
      label: i18nT('workflow:progress_title'),
      placeholder: i18nT('workflow:progress_title_placeholder'),
      maxLength: 10
    },
    {
      key: NodeInputKeyEnum.progressValue,
      renderTypeList: [FlowNodeInputTypeEnum.numberInput, FlowNodeInputTypeEnum.reference],
      valueType: WorkflowIOValueTypeEnum.number,
      required: true,
      label: i18nT('workflow:progress_progress'),
      placeholder: i18nT('workflow:progress_progress_placeholder'),
      value: 0,
      min: 0
    },
    {
      key: NodeInputKeyEnum.progressTotal,
      renderTypeList: [FlowNodeInputTypeEnum.numberInput, FlowNodeInputTypeEnum.reference],
      valueType: WorkflowIOValueTypeEnum.number,
      required: true,
      label: i18nT('workflow:progress_total'),
      placeholder: i18nT('workflow:progress_total_placeholder'),
      value: 100,
      min: 1
    }
  ],
  outputs: []
};
