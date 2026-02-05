export type CompletionFinishReason = 'stop' | 'length' | 'tool_calls' | null;

export type ChatCompletionMessageToolCall = {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
};

export type ChatCompletionMessageParam = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: string | null | any;
  name?: string;
  tool_call_id?: string;
  tool_calls?: ChatCompletionMessageToolCall[];
};

export type ChatCompletionTool = {
  type: 'function';
  function: { name: string; description?: string; parameters?: any };
};

export type ChatCompletionCreateParamsNonStreaming = {
  model: string;
  messages: ChatCompletionMessageParam[];
  temperature?: number;
  max_tokens?: number;
  tools?: ChatCompletionTool[];
  tool_choice?: any;
  parallel_tool_calls?: boolean;
  stream?: false;
};

export type ChatCompletionCreateParamsStreaming = Omit<ChatCompletionCreateParamsNonStreaming, 'stream'> & {
  stream: true;
};

export type ChatCompletion = {
  id: string;
  choices: Array<{
    message: { role: 'assistant'; content?: string | null; tool_calls?: ChatCompletionMessageToolCall[] };
    finish_reason?: CompletionFinishReason;
  }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
};

export type CompletionUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
};

export type StreamChatType = AsyncIterable<any> & { controller?: AbortController };
export type UnStreamChatType = ChatCompletion;

export type ChatCompletionContentPartText = { type: 'text'; text: string };
export type ChatCompletionContentPartImage = {
  type: 'image_url';
  image_url: { url: string };
  key?: string;
};
export type ChatCompletionContentPartRefusal = { type: 'refusal'; refusal: string };
export type ChatCompletionContentPart = ChatCompletionContentPartText | ChatCompletionContentPartImage | ChatCompletionContentPartRefusal;

export type ChatCompletionAssistantMessageParam = ChatCompletionMessageParam;
export type SdkChatCompletionMessageParam = ChatCompletionMessageParam;

export type OpenAI = {
  RequestOptions: { headers?: Record<string, string>; path?: string };
};
