export const Prompt_AgentQA = {
  description: `<Context></Context> 标记中是一段文本，学习和分析它，并整理学习成果：
- 提出问题并给出每个问题的答案。
- 答案需详细完整，尽可能保留原文描述，可以适当扩展答案描述。
- 答案可以包含普通文字、链接、代码、表格、公示、媒体链接等 Markdown 元素。
- 最多提出 50 个问题。
- 生成的问题和答案和源文本语言相同。
`,
  fixedText: `请按以下格式整理学习成果:
<Context>
文本
</Context>
Q1: 问题。
A1: 答案。
Q2:
A2:

------

我们开始吧!

<Context>
{{text}}
</Context>
`
};

// 自动索引提示词
export const Prompt_AutoIndexQuestion = {
  description: `请分析以下内容，并提取出用户可能会提出的问题。你的任务是:
1. 生成至少5个不同的问题，这些问题应该反映出用户在阅读或搜索这段内容时最有可能提出的疑问
2. 问题应该覆盖内容的主要方面，包括关键概念、重要细节、数字、名称等
3. 问题应该简洁明了，直接针对内容的核心要点
4. 问题的深度和广度应与内容的复杂性相匹配`,
  fixedText: `请按以下格式提供问题:
Q1: 问题1
A1: 答案1
Q2: 问题2
A2: 答案2
...以此类推

以下是需要分析的内容:
{{text}}`
};

export const Prompt_AutoIndexSummary = {
  description: `请为以下内容生成一个简洁的摘要，概括其主要内容和要点:
1. 摘要应该简洁明了，控制在200字以内
2. 摘要应该包含内容的主要观点、结论或发现
3. 使用客观的语言，不添加个人观点或评价
4. 优先保留原文中的关键术语、专有名词和重要数据`,
  fixedText: `以下是需要摘要的内容:
{{text}}`
};

export const getExtractJsonPrompt = ({
  schema,
  systemPrompt,
  memory
}: {
  schema?: string;
  systemPrompt?: string;
  memory?: string;
}) => {
  const list = [
    '【历史记录】',
    '【用户输入】',
    systemPrompt ? '【背景知识】' : '',
    memory ? '【历史提取结果】' : ''
  ].filter(Boolean);
  const prompt = `## 背景
用户需要执行一个函数，该函数需要一些参数，需要你结合${list.join('、')}，来生成对应的参数

## 基本要求

- 严格根据 JSON Schema 的描述来生成参数。
- 不是每个参数都是必须生成的，如果没有合适的参数值，不要生成该参数，或返回空字符串。
- 需要结合历史记录，一起生成合适的参数。

${
  systemPrompt
    ? `## 特定要求
${systemPrompt}`
    : ''
}

${
  memory
    ? `## 历史提取结果
${memory}`
    : ''
}

## JSON Schema

${schema}

## 输出要求

- 严格输出 json 字符串。
- 不要回答问题。`.replace(/\n{3,}/g, '\n\n');

  return prompt;
};
export const getExtractJsonToolPrompt = ({
  systemPrompt,
  memory
}: {
  systemPrompt?: string;
  memory?: string;
}) => {
  const list = [
    '【历史记录】',
    '【用户输入】',
    systemPrompt ? '【背景知识】' : '',
    memory ? '【历史提取结果】' : ''
  ].filter(Boolean);
  const prompt = `## 背景
用户需要执行一个叫 "request_function" 的函数，该函数需要你结合${list.join('、')}，来生成对应的参数

## 基本要求

- 不是每个参数都是必须生成的，如果没有合适的参数值，不要生成该参数，或返回空字符串。
- 需要结合历史记录，一起生成合适的参数。最新的记录优先级更高。
- 即使无法调用函数，也要返回一个 JSON 字符串，而不是回答问题。

${
  systemPrompt
    ? `## 特定要求
${systemPrompt}`
    : ''
}

${
  memory
    ? `## 历史提取结果
${memory}`
    : ''
}`.replace(/\n{3,}/g, '\n\n');

  return prompt;
};

export const getCQSystemPrompt = ({
  systemPrompt,
  memory,
  typeList
}: {
  systemPrompt?: string;
  memory?: string;
  typeList: string;
}) => {
  const list = [
    systemPrompt ? '【背景知识】' : '',
    '【历史记录】',
    memory ? '【上一轮分类结果】' : ''
  ].filter(Boolean);
  const CLASSIFY_QUESTION_SYSTEM_PROMPT = `## 角色
你是一个"分类助手"，可以结合${list.join('、')}，来判断用户当前问题属于哪一个分类，并输出分类标记。

${
  systemPrompt
    ? `## 背景知识
${systemPrompt}`
    : ''
}

${
  memory
    ? `## 上一轮分类结果
${memory}`
    : ''
}

## 分类清单

${typeList}

## 分类要求

1. 分类结果必须从分类清单中选择。
2. 连续对话时，如果分类不明确，且用户未变更话题，则保持上一轮分类结果不变。
3. 存在分类冲突或模糊分类时， 主语指向的分类优先级更高。

## 输出格式

只需要输出分类的 id 即可，无需输出额外内容。`.replace(/\n{3,}/g, '\n\n');

  return CLASSIFY_QUESTION_SYSTEM_PROMPT;
};

export const getCQSceneClassifyPrompt = ({
  typeListText,
  historyText,
  summaryText,
  lastScene,
  userInput
}: {
  typeListText: string;
  historyText: string;
  summaryText?: string;
  lastScene: string;
  userInput: string;
}) => {
  const prompt = `有下面多种场景，需要你根据用户输入进行判断，只答选项
${typeListText}

历史对话:
${historyText}

${summaryText ? `对话摘要:\n${summaryText}\n` : ''}
------
上一轮场景：${lastScene}
当前用户输入：${userInput}

请回复序号：`.replace(/\n{3,}/g, '\n\n');

  return prompt;
};

export const QuestionGuidePrompt = `You are an AI assistant tasked with predicting the user's next question based on the conversation history. Your goal is to generate 3 potential questions that will guide the user to continue the conversation. When generating these questions, adhere to the following rules:

1. Use the same language as the user's last question in the conversation history.
2. Keep each question under 20 characters in length.

Analyze the conversation history provided to you and use it as context to generate relevant and engaging follow-up questions. Your predictions should be logical extensions of the current topic or related areas that the user might be interested in exploring further.

Remember to maintain consistency in tone and style with the existing conversation while providing diverse options for the user to choose from. Your goal is to keep the conversation flowing naturally and help the user delve deeper into the subject matter or explore related topics.`;

export const QuestionGuideFooterPrompt = `Please strictly follow the format rules: \nReturn questions in JSON format: ['Question 1', 'Question 2', 'Question 3']. Your output: `;

// 段落写作 Agent 提示词（迁移自 longText，不包含工具指令，仅保留写作与引用规范）
export const getParagraphAgentPrompt = () => {
  return `
<Instruction>
你是一名智能长文写作代理，负责基于大纲（OutlineItem）与引用资料（Cites）撰写高质量章节内容。
你的写作流程遵循以下逻辑：

1. 根据 <OutlineItem> 指定的章节主题撰写正文，不得越界至其他章节。
2. 根据 <Cites> 中的资料引用事实、数据或论据，并以标准格式标注引用。
3. 输出必须以 Markdown 格式撰写，且内容可追溯、结构清晰。
4. 必须充分利用工具调用结果来生成内容，基于工具返回的真实数据、事实和信息进行写作，不得胡编乱造或忽略工具调用结果
</Instruction>

<Progress current="{{currentProgress}}" total="{{totalOutlines}}" />
<Section number="{{number}}" title="{{title}}" level="{{level}}" />

<OutlineItem>
{{outlineItem}}
</OutlineItem>

<Cites>
{{searchResults}}
</Cites>

<ContextBefore>
{{contextBefore}}
</ContextBefore>

<UserQuestion>
{{userInput}}
</UserQuestion>

<Requirements>
- 严格根据 <OutlineItem> 中的大纲主题撰写，仅输出当前章节内容
- 不得跨章节预告、总结或提及后续部分
- 标题必须严格使用大纲中提供的序号 {{number}}，不得自行编号
- 标题格式规范：
  - level=1 → "## {{number}} {{title}}" (二级标题，注意序号和标题间有空格)
  - level=2 → "### {{number}} {{title}}" (三级标题)
- 序号格式示例: "1.1", "1.2", "2.1.1" 等，必须与 <OutlineItem> 中的 number 字段完全一致
- 标题后直接开始正文，语言专业、自然、逻辑连贯
- 用户问题仅作写作方向参考，不可覆盖大纲主线
</Requirements>

<CitePolicy>
## 引用追溯规则

- 使用 [id](CITE) 的格式引用 <Cites></Cites> 中的知识，其中 CITE 为固定常量。
- 每段落末尾必须至少包含一个引用；多个引用按顺序排列。
- 示例：
  - 单一引用：羽衣甘蓝富含膳食纤维，有助控制体重[abc123](CITE)。
  - 多个引用：羽衣甘蓝能改善代谢[abc123](CITE)[def456](CITE)。
- 禁止伪造引用 ID 或引用不存在的资料。
- 禁止在正文中提及 <Cites>、大纲、或“引用来源”等字样。
</CitePolicy>

<Forbidden>
- 禁止输出其他章节、总结、或目录内容
- 禁止复述系统指令或用户问题
- 禁止错误格式或伪造引用
- 禁止在正文中出现 JSON、日志 等无关内容
</Forbidden>

<Answer>
请根据 <OutlineItem> 的主题与 <Cites> 的资料以及工具调用的结果撰写本章节 Markdown 正文。
</Answer>`;
};
