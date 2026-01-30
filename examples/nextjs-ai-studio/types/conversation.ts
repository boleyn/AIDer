export type ConversationMessage = {
  role: "user" | "assistant" | "system" | "tool";
  content: unknown;
  name?: string;
  tool_call_id?: string;
};

export type ConversationSummary = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export type Conversation = ConversationSummary & {
  messages: ConversationMessage[];
};
