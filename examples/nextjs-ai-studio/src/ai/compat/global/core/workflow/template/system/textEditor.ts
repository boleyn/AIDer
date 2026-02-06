import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  FlowNodeTypeEnum
} from '../../node/constant';
import { type FlowNodeTemplateType } from '../../type/node.d';
import {
  WorkflowIOValueTypeEnum,
  NodeOutputKeyEnum,
  NodeInputKeyEnum,
  FlowNodeTemplateTypeEnum
} from '../../constants';
export const TextEditorNode: FlowNodeTemplateType = {
  id: FlowNodeTypeEnum.textEditor,
  templateType: FlowNodeTemplateTypeEnum.tools,
  flowNodeType: FlowNodeTypeEnum.textEditor,
  showSourceHandle: true,
  showTargetHandle: true,
  avatar: 'core/workflow/template/textConcat',
  avatarLinear: 'core/workflow/template/textConcatLinear',
  colorSchema: 'orange',
  name: '文本拼接',
  intro: '将多个文本或变量拼接为一段文本',
  courseUrl: '/docs/introduction/guide/dashboard/workflow/text_editor/',
  inputs: [
    {
      key: NodeInputKeyEnum.textareaInput,
      renderTypeList: [FlowNodeInputTypeEnum.textarea],
      valueType: WorkflowIOValueTypeEnum.string,
      required: true,
      label: '拼接文本',
      placeholder: '输入变量列表'
    }
  ],
  outputs: [
    {
      id: NodeOutputKeyEnum.text,
      key: NodeOutputKeyEnum.text,
      label: '拼接结果',
      type: FlowNodeOutputTypeEnum.static,
      valueType: WorkflowIOValueTypeEnum.string
    }
  ]
};
