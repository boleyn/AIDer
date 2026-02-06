import { i18nT } from '../../../../../web/i18n/utils';
import {
  FlowNodeTemplateTypeEnum,
  NodeInputKeyEnum,
  NodeOutputKeyEnum,
  WorkflowIOValueTypeEnum
} from '../../constants';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  FlowNodeTypeEnum
} from '../../node/constant';
import { type FlowNodeTemplateType } from '../../type/node';
import { Output_Template_Error_Message } from '../output';

export const FileStorageNode: FlowNodeTemplateType = {
  id: FlowNodeTypeEnum.fileStorage,
  templateType: FlowNodeTemplateTypeEnum.tools,
  flowNodeType: FlowNodeTypeEnum.fileStorage,
  showSourceHandle: true,
  showTargetHandle: true,
  avatar: 'core/workflow/template/fileStorage',
  avatarLinear: 'core/workflow/template/fileStorageLinear',
  colorSchema: 'teal',
  name: i18nT('workflow:file_storage'),
  intro: i18nT('workflow:file_storage_intro'),
  showStatus: true,
  isTool: true,
  catchError: true,
  version: '4.9.4',
  inputs: [
    {
      key: NodeInputKeyEnum.fileBase64,
      renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference],
      valueType: WorkflowIOValueTypeEnum.string,
      label: i18nT('workflow:file_storage_base64'),
      required: true,
      toolDescription: i18nT('workflow:file_storage_base64_tool_desc')
    },
    {
      key: NodeInputKeyEnum.fileType,
      renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference],
      valueType: WorkflowIOValueTypeEnum.string,
      label: i18nT('workflow:file_storage_type'),
      description: i18nT('workflow:file_storage_type_tip'),
      required: true,
      toolDescription: i18nT('workflow:file_storage_type_tool_desc')
    },
    {
      key: NodeInputKeyEnum.fileIsPublic,
      renderTypeList: [FlowNodeInputTypeEnum.switch, FlowNodeInputTypeEnum.reference],
      valueType: WorkflowIOValueTypeEnum.boolean,
      label: i18nT('workflow:file_storage_public'),
      value: false,
      required: true,
      toolDescription: i18nT('workflow:file_storage_public_tool_desc')
    }
  ],
  outputs: [
    {
      id: NodeOutputKeyEnum.fileStorageUrl,
      key: NodeOutputKeyEnum.fileStorageUrl,
      label: i18nT('workflow:file_storage_url'),
      description: i18nT('workflow:file_storage_url_desc'),
      valueType: WorkflowIOValueTypeEnum.string,
      type: FlowNodeOutputTypeEnum.static
    },
    {
      id: NodeOutputKeyEnum.fileStorageResult,
      key: NodeOutputKeyEnum.fileStorageResult,
      label: i18nT('workflow:file_storage_result'),
      description: i18nT('workflow:file_storage_result_desc'),
      valueType: WorkflowIOValueTypeEnum.object,
      type: FlowNodeOutputTypeEnum.static
    },
    Output_Template_Error_Message
  ]
};
