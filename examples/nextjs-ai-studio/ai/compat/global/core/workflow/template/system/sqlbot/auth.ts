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
import { Output_Template_AddOutput } from '../../output';

export const SqlbotAuthNode: FlowNodeTemplateType = {
  // 节点唯一标识
  id: FlowNodeTypeEnum.sqlbotAuth,

  // 节点模板类型（交互节点）
  templateType: FlowNodeTemplateTypeEnum.interactive,

  // 节点类型
  flowNodeType: FlowNodeTypeEnum.sqlbotAuth,

  // 连接点配置（允许输入输出连接）
  showSourceHandle: true,
  showTargetHandle: true,

  // 节点图标路径
  avatar: 'core/workflow/template/httpRequest',
  colorSchema: 'purple',

  // 节点名称
  name: i18nT('app:workflow.sqlbot_auth'),

  // 节点简介
  intro: i18nT('app:workflow.sqlbot_auth_tip'),

  // 是否可作为工具调用
  isTool: true,

  // 输入配置
  inputs: [
    {
      key: NodeInputKeyEnum.description,
      renderTypeList: [FlowNodeInputTypeEnum.textarea],
      valueType: WorkflowIOValueTypeEnum.string,
      label: i18nT('app:workflow.select_description'),
      description: i18nT('app:workflow.sqlbot_auth_select_description'),
      value: '请选择要访问的数据源',
      placeholder: '请选择要访问的数据源'
    },
    {
      key: 'sqlbot_base_url',
      renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference],
      valueType: WorkflowIOValueTypeEnum.string,
      label: i18nT('app:workflow.sqlbot_base_url'),
      description: i18nT('app:workflow.sqlbot_base_url_description'),
      placeholder: 'http://10.21.81.6:8000',
      required: true
    },
    {
      key: 'manual_final_user_id',
      renderTypeList: [FlowNodeInputTypeEnum.input],
      valueType: WorkflowIOValueTypeEnum.string,
      label: i18nT('app:workflow.manual_final_user_id'),
      description: i18nT('app:workflow.manual_final_user_id_description'),
      placeholder: '留空则自动从系统变量获取',
      required: false
    }
  ],

  // 输出配置
  outputs: [
    {
      ...Output_Template_AddOutput,
      label: i18nT('app:workflow.sqlbot_extract_output'),
      description: i18nT('app:workflow.sqlbot_extract_output_description')
    },
    {
      id: NodeOutputKeyEnum.error,
      key: NodeOutputKeyEnum.error,
      label: i18nT('workflow:request_error'),
      description: i18nT('app:workflow.sqlbot_error_description'),
      valueType: WorkflowIOValueTypeEnum.object,
      type: FlowNodeOutputTypeEnum.static
    },
    {
      id: NodeOutputKeyEnum.httpRawResponse,
      key: NodeOutputKeyEnum.httpRawResponse,
      required: true,
      label: i18nT('workflow:raw_response'),
      description: i18nT('app:workflow.sqlbot_raw_response_description'),
      valueType: WorkflowIOValueTypeEnum.any,
      type: FlowNodeOutputTypeEnum.static
    }
  ]
};
