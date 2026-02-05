import { type PromptTemplateItem } from '../type.d';
import { i18nT } from '../../../../web/i18n/utils';
import { getPromptByVersion } from './utils';

// 第一阶段：生成大纲文本（不使用知识库）
export const Prompt_LongTextOutlineGenerateList: PromptTemplateItem[] = [
  {
    title: i18nT('app:template.standard_template'),
    desc: i18nT('app:template.standard_template_des'),
    value: {
      ['4.9.7']: `## 任务描述
你是一个专业的内容大纲生成助手。请根据用户的标题和写作目标，生成详细的文章大纲。

## 生成要求

- 大纲应该逻辑清晰，层次分明
- 每个章节都要有明确的主题和要点
- 使用标准的大纲格式（一级、二级、三级标题）
- 为每个部分估算合理的字数
- 大纲应该完整覆盖主题内容

## 输出格式

请按照以下格式输出大纲：

# 一级标题
## 二级标题
### 三级标题
- 要点1
- 要点2

预估字数：XXX字

## 额外要求
{{extraRequirements}}


## 用户问题

{{question}}


## 回答
`
    }
  }
];

// 第一阶段：生成大纲文本（使用知识库）
export const Prompt_LongTextOutlineGenerateWithKnowledgeList: PromptTemplateItem[] = [
  {
    title: i18nT('app:template.standard_template'),
    desc: i18nT('app:template.standard_template_des'),
    value: {
      ['4.9.7']: `## 任务描述
你是一个专业的内容大纲生成助手，可以使用 <Knowledge></Knowledge> 中的内容作为大纲生成的参考。请根据用户的标题和写作目标，结合知识库内容，生成详细的文章大纲。

## 生成要求

- 大纲应该逻辑清晰，层次分明
- 每个章节都要有明确的主题和要点
- 结合 <Knowledge></Knowledge> 中的内容进行大纲设计
- 使用标准的大纲格式（一级、二级、三级标题）
- 为每个部分估算合理的字数
- 大纲应该完整覆盖主题内容
- 避免提及你是从 <Knowledge></Knowledge> 获取的知识

## 输出格式

请按照以下格式输出大纲：

# 一级标题
## 二级标题
### 三级标题
- 要点1
- 要点2

预估字数：XXX字

<Knowledge>
{{quote}}
</Knowledge>

## 用户问题

{{question}}

{{extraRequirements}}

## 回答
`
    }
  }
];

// 第三阶段：将大纲文本结构化为JSON
export const Prompt_LongTextOutlineStructureList: PromptTemplateItem[] = [
  {
    title: i18nT('app:template.standard_template'),
    desc: i18nT('app:template.standard_template_des'),
    value: {
      ['4.9.7']: `## 任务描述
请将用户提供的大纲文本转换为结构化的JSON格式，用于后续的段落写作。

## 转换要求

- 将大纲转换为扁平的段落列表，支持主章节和子章节的混合层级
- 主章节控制在3-8个，每个主章节可选0-3个子章节
- 每个段落是一个相对完整的写作单元
- 为每个段落提供内容概要和关键要点
- 添加前后文关系信息，帮助AI理解段落间的连贯性

## 输出格式要求

必须严格按照以下JSON格式返回，不要包含任何其他文本、解释或代码块标记：

[
  {
    "id": "1",
    "number": "1",
    "title": "引言",
    "level": 1,
    "description": "简要说明文章背景和写作目的，为后续内容做铺垫",
    "order": 1,
    "estimatedWords": 200,
    "keyPoints": ["背景介绍", "写作目的", "文章结构预览"],
    "contextBefore": "",
    "contextAfter": "接下来将深入探讨主要内容"
  },
  {
    "id": "1.1",
    "number": "1.1",
    "title": "背景介绍",
    "level": 2,
    "parentId": "1",
    "description": "详细介绍文章的背景信息",
    "order": 1,
    "estimatedWords": 150,
    "keyPoints": ["历史背景", "现状分析"],
    "contextBefore": "在引言的基础上",
    "contextAfter": "进一步阐述写作目的"
  },
  {
    "id": "2",
    "number": "2",
    "title": "主要内容分析",
    "level": 1,
    "description": "详细分析核心主题，提供深入的观点和论证",
    "order": 2,
    "estimatedWords": 800,
    "keyPoints": ["核心观点", "详细论证", "实例分析"],
    "contextBefore": "在引言的基础上",
    "contextAfter": "最后总结全文要点"
  }
]

## 字段说明

- id: 唯一标识符（字符串，主章节用"1","2"，子章节用"1.1","1.2"）
- number: 完整序号（字符串，与id相同，用于显示）
- title: 段落标题
- level: 章节层级（1=主章节，2=子章节）
- parentId: 父章节id（可选，仅子章节需要）
- description: 段落内容概要（1-2句话描述该段落要写什么）
- order: 在同级中的顺序（从1开始的数字）
- estimatedWords: 预估字数（数字）
- keyPoints: 关键要点数组（该段落需要涵盖的主要点）
- contextBefore: 与前一段的关系说明（可选，第一段为空）
- contextAfter: 与后一段的关系说明（可选，最后一段为空）

<OutlineText>
{{outlineText}}
</OutlineText>

## 回答
`
    }
  }
];

// 获取生成大纲的提示词
export const getLongTextOutlineGeneratePrompt = (
  version?: string,
  useKnowledge: boolean = false
) => {
  const templateList = useKnowledge
    ? Prompt_LongTextOutlineGenerateWithKnowledgeList
    : Prompt_LongTextOutlineGenerateList;
  const defaultTemplate = templateList[0].value;
  return getPromptByVersion(version, defaultTemplate);
};

// 获取结构化大纲的提示词
export const getLongTextOutlineStructurePrompt = (version?: string) => {
  const defaultTemplate = Prompt_LongTextOutlineStructureList[0].value;
  return getPromptByVersion(version, defaultTemplate);
};

// 段落生成提示词模板

// 标题生成提示词模板
export const Prompt_LongTextTitleGenerateList: PromptTemplateItem[] = [
  {
    title: i18nT('app:template.standard_template'),
    desc: i18nT('app:template.standard_template_des'),
    value: {
      ['4.9.7']: `## 任务描述
你是标题生成助手。请基于以下信息生成一个中文文档主标题（不超过20字），不需要解释。

## 用户输入
{{userInput}}

## 大纲信息
{{outline}}

## 输出要求
直接输出标题，不要包含任何解释或说明文字。

## 回答
`
    }
  }
];

// 获取标题生成的提示词
export const getLongTextTitleGeneratePrompt = (version?: string) => {
  const defaultTemplate = Prompt_LongTextTitleGenerateList[0].value;
  return getPromptByVersion(version, defaultTemplate);
};
