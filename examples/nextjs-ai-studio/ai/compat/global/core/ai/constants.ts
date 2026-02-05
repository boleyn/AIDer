export enum ChatCompletionRequestMessageRoleEnum {
  System = 'system',
  User = 'user',
  Assistant = 'assistant',
  Tool = 'tool'
}

export const getLLMDefaultUsage = () => ({
  prompt_tokens: 0,
  completion_tokens: 0,
  total_tokens: 0
});
