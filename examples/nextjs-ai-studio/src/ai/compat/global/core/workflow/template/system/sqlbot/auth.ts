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
  id: FlowNodeTypeEnum.sqlbotAuth,
  templateType: FlowNodeTemplateTypeEnum.interactive,
  flowNodeType: FlowNodeTypeEnum.sqlbotAuth,
  showSourceHandle: true,
  showTargetHandle: true,
  avatar: 'core/workflow/template/httpRequest',
  colorSchema: 'purple',
  name: 'SQL Bot 鉴权',
  intro: '配置 SQL Bot 数据源鉴权',
  isTool: true,
  inputs: [
    {
      key: NodeInputKeyEnum.description,
      renderTypeList: [FlowNodeInputTypeEnum.textarea],
      valueType: WorkflowIOValueTypeEnum.string,
      label: '选择说明',
      description: '请选择要访问的数据源',
      value: '请选择要访问的数据源',
      placeholder: '请选择要访问的数据源'
    },
    {
      key: 'sqlbot_base_url',
      renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference],
      valueType: WorkflowIOValueTypeEnum.string,
      label: 'SQL Bot 服务地址',
      description: 'SQL Bot 服务 base URL',
      placeholder: 'http://10.21.81.6:8000',
      required: true
    },
    {
      key: 'manual_final_user_id',
      renderTypeList: [FlowNodeInputTypeEnum.input],
      valueType: WorkflowIOValueTypeEnum.string,
      label: '手动指定用户 ID',
      description: '留空则自动从系统变量获取',
      placeholder: '留空则自动从系统变量获取',
      required: false
    }
  ],
  outputs: [
    {
      ...Output_Template_AddOutput,
      label: '解析结果',
      description: 'SQL Bot 解析后的输出'
    },
    {
      id: NodeOutputKeyEnum.error,
      key: NodeOutputKeyEnum.error,
      label: '请求错误',
      description: '请求失败时的错误信息',
      valueType: WorkflowIOValueTypeEnum.object,
      type: FlowNodeOutputTypeEnum.static
    },
    {
      id: NodeOutputKeyEnum.httpRawResponse,
      key: NodeOutputKeyEnum.httpRawResponse,
      required: true,
      label: '原始响应',
      description: '接口原始响应内容',
      valueType: WorkflowIOValueTypeEnum.any,
      type: FlowNodeOutputTypeEnum.static
    }
  ]
};
