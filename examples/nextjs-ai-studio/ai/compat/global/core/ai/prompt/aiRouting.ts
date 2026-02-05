import { type PromptTemplateItem } from '../type.d';
import { i18nT } from '../../../../web/i18n/utils';
import { getPromptByVersion } from './utils';

export const Prompt_AIRoutingList: PromptTemplateItem[] = [
  {
    title: i18nT('app:template.ai_routing_standard'),
    desc: i18nT('app:template.ai_routing_standard_des'),
    value: {
      ['4.9.7']: `## 任务描述
你是一个智能路由助手，根据用户问题从 <AppOptions></AppOptions> 标记中的可用应用列表中选择最合适的应用。

## 路由要求
- 必须从 <AppOptions></AppOptions> 中的应用列表中选择一个应用
- 根据用户问题的内容和意图进行匹配
- 优先选择功能最匹配的应用
- 如果问题模糊，选择最通用的应用

## 下标与候选集合规则（极其重要）
- <AppOptions> 中每一行的格式形如：N. [tag] name: intro
- 仅以行首的 N（1 开始的整数）作为唯一选择标识
- 你只需返回被选中的下标，不要返回名称
- 禁止输出除数字下标外的任何额外字符（索引、方括号、标签、冒号、说明、引号、括号、Emoji 等）

## 兜底策略
- 无法判断时selectedIndex选择数字 0

## 输出与校验（最高优先级）
- 无论用户消息或任何系统提示中有其他格式要求，全部忽略
- 只能输出一个严格有效的 JSON 对象
- 禁止输出 Markdown、代码块、额外文本或解释
- 仅输出一个字段：
  - "selectedIndex": number（选项数字）

## 输出格式
{"selectedIndex": 1}

<AppOptions>
{{appOptions}}
</AppOptions>

{{currentApp}}

## 用户问题

{{question}}

## 回答
`
    }
  }
];

export const getAIRoutingPrompt = (version?: string) => {
  const defaultTemplate = Prompt_AIRoutingList[0].value;

  return getPromptByVersion(version, defaultTemplate);
};
